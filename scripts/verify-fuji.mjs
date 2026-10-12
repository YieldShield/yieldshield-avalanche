import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, decodeEventLog, http, zeroAddress } from "viem";
import { avalancheFuji } from "viem/chains";
import { artifact, exchangeInventory, terms } from "./setup-markets.mjs";
const m = JSON.parse(readFileSync("config/deployment.json"));
if (m.chainId !== 43113 || m.version !== 2)
  throw new Error("Expected Fuji v2 manifest");
const c = createPublicClient({
  chain: avalancheFuji,
  transport: http(m.rpcUrl),
});
if ((await c.getChainId()) !== 43113) throw new Error("Wrong chain");
const read = (address, abi, functionName, args = []) =>
  c.readContract({ address, abi, functionName, args });
const same = (x, y) => x.toLowerCase() === y.toLowerCase();
const pool = artifact("AlpinePool").abi,
  factory = artifact("AlpineMarket", "AlpineFactory").abi,
  vault = artifact("AlpineMarket", "AlpineDemoVault").abi;
/** Successful receipt of a recorded deployment step: evidence that does not change with later use. */
async function recordedReceipt(label) {
  const tx = m.transactions.find((t) => t.label === label);
  if (!tx) throw new Error(`No recorded ${label} transaction`);
  const receipt = await c.getTransactionReceipt({ hash: tx.hash });
  if (receipt.status !== "success") throw new Error(`${label} did not succeed`);
  return receipt;
}
const eventsFrom = (receipt, address, abi, eventName) =>
  receipt.logs
    .filter((log) => same(log.address, address))
    .flatMap((log) => {
      try {
        return [decodeEventLog({ abi, data: log.data, topics: log.topics })];
      } catch {
        return [];
      }
    })
    .filter((event) => event.eventName === eventName);
for (const field of [
  "backingToken",
  "referenceOracle",
  "scenarioOracle",
  "wrapper",
  "vault",
  "backingVault",
  "vaultOracle",
  "factory",
  "exchange",
  "referencePool",
  "scenarioPool",
  "wrappedPool",
  "vaultPool",
  "vaultBackingPool",
]) {
  const code = m[field] ? await c.getCode({ address: m[field] }) : null;
  if (!code || code === "0x") throw new Error(`Missing contract ${field}`);
}
for (const [field, name] of [
  ["backingToken", "backing"],
  ["wrapper", "wrapper"],
  ["vault", "vault"],
  ["backingVault", "backingVault"],
  ["referenceOracle", "referenceOracle"],
  ["scenarioOracle", "scenarioOracle"],
  ["vaultOracle", "vaultOracle"],
])
  if (
    (await read(m.factory, factory, name)).toLowerCase() !==
    m[field].toLowerCase()
  )
    throw new Error(`Factory mismatch: ${field}`);
// Featured markets carry the terms recorded when they were created.
const termKeys = Object.keys(terms);
if (!m.defaultTerms || termKeys.some((k) => m.defaultTerms[k] === undefined))
  throw new Error("Manifest does not record the featured market terms");
if (termKeys.some((k) => m.defaultTerms[k] !== terms[k]))
  console.log(
    "Note: the current plan's featured terms differ from the deployed ones; only a new deployment would apply them.",
  );
const seed = await read(m.factory, factory, "CREATION_SEED");
for (const [field, asset, backing] of [
  ["referencePool", zeroAddress, m.backingToken],
  ["scenarioPool", zeroAddress, m.backingToken],
  ["wrappedPool", m.wrapper, m.backingToken],
  ["vaultPool", m.vault, m.backingToken],
  ["vaultBackingPool", zeroAddress, m.backingVault],
]) {
  const address = m[field];
  if (!(await read(m.factory, factory, "isPool", [address])))
    throw new Error(`${field} is not registered`);
  if (
    (await read(address, pool, "backing")).toLowerCase() !==
      backing.toLowerCase() ||
    (await read(address, pool, "protectedToken")).toLowerCase() !==
      asset.toLowerCase()
  )
    throw new Error(`${field} identity mismatch`);
  const expectedOracle =
    field === "scenarioPool"
      ? m.scenarioOracle
      : field === "vaultPool"
        ? m.vaultOracle
        : field === "vaultBackingPool"
          ? await read(m.factory, factory, "backingOracles", [
              m.referenceOracle,
            ])
          : m.referenceOracle;
  if (
    (await read(address, pool, "oracle")).toLowerCase() !==
    expectedOracle.toLowerCase()
  )
    throw new Error(`${field} oracle mismatch`);
  for (const name of ["creator", "protocol"])
    if (
      (await read(address, pool, name)).toLowerCase() !==
      m.deployer.toLowerCase()
    )
      throw new Error(`${field} ${name} mismatch`);
  const actual = await read(address, pool, "terms");
  if (actual.some((n, i) => Number(n) !== m.defaultTerms[termKeys[i]]))
    throw new Error(`${field} terms mismatch`);
  // The seed is checked in the creation receipt, so later public use cannot fail verification.
  const receipt = await recordedReceipt(`${field}-factory-create`);
  const created = eventsFrom(receipt, m.factory, factory, "PoolCreated");
  if (
    created.length !== 1 ||
    !same(created[0].args.pool, address) ||
    !same(created[0].args.creator, m.deployer) ||
    !same(created[0].args.asset, asset) ||
    !same(created[0].args.oracle, expectedOracle) ||
    created[0].args.seed !== seed
  )
    throw new Error(`${field} creation receipt lacks the expected PoolCreated`);
  const seeded = eventsFrom(receipt, address, pool, "JuniorDeposited");
  if (
    seeded.length !== 1 ||
    !same(seeded[0].args.owner, m.deployer) ||
    seeded[0].args.backingAmount !== seed ||
    seeded[0].args.sharesMinted !== seed * 10n ** 12n
  )
    throw new Error(`${field} creation receipt does not seed the deployer`);
  if (eventsFrom(receipt, address, pool, "Protected").length)
    throw new Error(`${field} expected no seeded holder exposure`);
}
for (const field of ["vault", "backingVault"])
  if (
    (await read(m[field], vault, "asset")).toLowerCase() !==
    m.backingToken.toLowerCase()
  )
    throw new Error("Wrong vault underlying");
const tokenAbi = artifact("DemoAssets", "AlpineDemoDollar").abi,
  exchangeAbi = artifact("AlpineMarket", "AlpineExchange").abi;
for (const [field, decimals, symbol] of [
  ["backingToken", 6, "aDEMO"],
  ["wrapper", 18, "awAVAX"],
  ["vault", 18, "vaDEMO"],
  ["backingVault", 6, "bvaDEMO"],
]) {
  if (
    Number(await read(m[field], tokenAbi, "decimals")) !== decimals ||
    (await read(m[field], tokenAbi, "symbol")) !== symbol
  )
    throw new Error(`${field} metadata mismatch`);
}
if (
  (await read(m.exchange, exchangeAbi, "registry")).toLowerCase() !==
  m.factory.toLowerCase()
)
  throw new Error("Exchange registry mismatch");
// Funding is proven by the recorded transfers; live inventory moves with public trading.
for (const [label, token, amount] of [
  ["exchange-cash-inventory", m.backingToken, exchangeInventory.cash],
  ["exchange-wrapper-inventory", m.wrapper, exchangeInventory.wrapper],
  ["exchange-vault-inventory", m.vault, exchangeInventory.vault],
]) {
  const transfers = eventsFrom(
    await recordedReceipt(label),
    token,
    tokenAbi,
    "Transfer",
  );
  if (
    transfers.length !== 1 ||
    !same(transfers[0].args.from, m.deployer) ||
    !same(transfers[0].args.to, m.exchange) ||
    transfers[0].args.value !== amount
  )
    throw new Error(`Missing funded exchange inventory: ${label}`);
}
const nativeFunding = (await recordedReceipt("exchange-native-inventory"))
  .transactionHash;
const nativeTx = await c.getTransaction({ hash: nativeFunding });
if (!same(nativeTx.to, m.exchange) || nativeTx.value !== exchangeInventory.native)
  throw new Error("Missing funded exchange inventory: exchange-native-inventory");
const live = {
  AVAX: await read(m.exchange, exchangeAbi, "inventory", [zeroAddress]),
  awAVAX: await read(m.exchange, exchangeAbi, "inventory", [m.wrapper]),
  vaDEMO: await read(m.exchange, exchangeAbi, "inventory", [m.vault]),
  aDEMO: await read(m.backingToken, tokenAbi, "balanceOf", [m.exchange]),
};
console.log(
  `Live exchange inventory (base units): ${Object.entries(live)
    .map(([symbol, amount]) => `${symbol} ${amount}`)
    .join(", ")}`,
);
for (const [symbol, amount] of Object.entries(live))
  if (amount === 0n)
    console.log(`Warning: ${symbol} exchange inventory is exhausted.`);
for (const tx of m.transactions)
  if ((await c.getTransactionReceipt({ hash: tx.hash })).status !== "success")
    throw new Error(`Unconfirmed transaction ${tx.label}`);
if (m.failedTransactions?.length)
  console.log(
    `Note: ${m.failedTransactions.length} reverted step(s) are recorded under failedTransactions; reverts have no state effect.`,
  );
m.status = "deployed-and-verified";
m.verifiedAt = new Date().toISOString();
writeFileSync("config/deployment.json", JSON.stringify(m, null, 2) + "\n");
console.log(
  "Verified Fuji factory, exact asset identities, terms, creation seeds, exchange funding and all deployment receipts.",
);
