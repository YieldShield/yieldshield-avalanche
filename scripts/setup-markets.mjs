import { readFileSync } from "node:fs";
import { decodeEventLog, zeroAddress } from "viem";
export const artifact = (source, name = source) =>
  JSON.parse(readFileSync(`contracts/out/${source}.sol/${name}.json`));
export const terms = {
  collateralBps: 15000,
  juniorFeeBps: 1000,
  creatorFeeBps: 100,
  epochSeconds: 604800,
  exitDelay: 60,
  juniorNotice: 120,
};
/** Shared deployment plan; executor owns signing, receipts and durable progress. */
export async function setupMarkets({
  manifest: m,
  account,
  deploy,
  call,
  save,
  local = false,
}) {
  const a = {
    token: artifact("DemoAssets", "AlpineDemoDollar"),
    scenario: artifact("DemoAssets", "AlpineScenarioOracle"),
    reference: local
      ? artifact("AlpinePool.t", "MutableOracle")
      : artifact("DemoAssets", "AlpineChainlinkOracle"),
    wrapper: artifact("AlpineMarket", "AlpineWrappedAVAX"),
    vault: artifact("AlpineMarket", "AlpineDemoVault"),
    backingVault: artifact("AlpineMarket", "AlpineBackingVault"),
    vaultOracle: artifact("AlpineMarket", "AlpineVaultOracle"),
    factory: artifact("AlpineMarket", "AlpineFactory"),
    exchange: artifact("AlpineMarket", "AlpineExchange"),
    pool: artifact("AlpinePool"),
  };
  await deploy("backingToken", a.token);
  await deploy("scenarioOracle", a.scenario);
  await deploy(
    "referenceOracle",
    a.reference,
    local ? [] : [m.chainlinkFeed, BigInt(m.maxPriceAge)],
  );
  await deploy("wrapper", a.wrapper);
  await deploy("vault", a.vault, [m.backingToken]);
  await deploy("backingVault", a.backingVault, [m.backingToken]);
  await deploy("vaultOracle", a.vaultOracle, [m.vault]);
  await deploy("factory", a.factory, [
    m.backingToken,
    account,
    m.wrapper,
    m.vault,
    m.referenceOracle,
    m.scenarioOracle,
    m.vaultOracle,
    m.backingVault,
  ]);
  await deploy("exchange", a.exchange, [m.backingToken, m.factory]);
  const run = async (label, address, abi, functionName, args = [], value) =>
    call(label, { address, abi, functionName, args, value });
  await run("seed-faucet", m.backingToken, a.token.abi, "faucet");
  for (const [label, address, amount] of [
    ["vault", m.vault, 1000_000000n],
    ["backing-vault", m.backingVault, 1000_000000n],
  ]) {
    await run(`${label}-approve`, m.backingToken, a.token.abi, "approve", [
      address,
      amount,
    ]);
    await run(`${label}-funded-deposit`, address, a.vault.abi, "deposit", [
      amount,
      account,
    ]);
  }
  await run(
    "wrapper-funded-deposit",
    m.wrapper,
    a.wrapper.abi,
    "deposit",
    [],
    10n ** 16n,
  );
  await run("factory-cash-approve", m.backingToken, a.token.abi, "approve", [
    m.factory,
    2000_000000n,
  ]);
  await run("factory-vault-approve", m.backingVault, a.vault.abi, "approve", [
    m.factory,
    500_000000n,
  ]);
  const pairs = [
    ["referencePool", zeroAddress, m.referenceOracle, m.backingToken],
    ["scenarioPool", zeroAddress, m.scenarioOracle, m.backingToken],
    ["wrappedPool", m.wrapper, m.referenceOracle, m.backingToken],
    ["vaultPool", m.vault, m.vaultOracle, m.backingToken],
    ["vaultBackingPool", zeroAddress, m.referenceOracle, m.backingVault],
  ];
  for (const [field, asset, oracle, backing] of pairs) {
    if (m[field]) continue;
    const receipt = await run(
      `${field}-factory-create`,
      m.factory,
      a.factory.abi,
      "createPoolWithBacking",
      [
        asset,
        oracle,
        backing,
        terms,
        BigInt(Math.floor(Date.now() / 1000) + 86400),
      ],
    );
    for (const log of receipt.logs) {
      try {
        const event = decodeEventLog({
          abi: a.factory.abi,
          data: log.data,
          topics: log.topics,
        });
        if (event.eventName === "PoolCreated") m[field] = event.args.pool;
      } catch {}
    }
    if (!m[field]) throw new Error(`Missing factory event for ${field}`);
    await save();
  }
  await run(
    "exchange-cash-inventory",
    m.backingToken,
    a.token.abi,
    "transfer",
    [m.exchange, 1000_000000n],
  );
  await run(
    "exchange-wrapper-inventory",
    m.wrapper,
    a.wrapper.abi,
    "transfer",
    [m.exchange, 10n ** 16n],
  );
  await run("exchange-vault-inventory", m.vault, a.vault.abi, "transfer", [
    m.exchange,
    100n * 10n ** 18n,
  ]);
  await call("exchange-native-inventory", {
    to: m.exchange,
    value: 10n ** 16n,
  });
  // No holder positions are seeded: all featured pools allow new provider entry initially.
  m.version = 2;
  m.status = local ? "local-only-verified" : "deployed-awaiting-verification";
  m.defaultTerms = terms;
  await save();
  return a;
}
