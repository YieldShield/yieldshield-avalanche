import { readFileSync, writeFileSync } from "node:fs";
import { createPublicClient, http, zeroAddress } from "viem";
import { avalancheFuji } from "viem/chains";
import { artifact, terms } from "./setup-markets.mjs";
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
const pool = artifact("AlpinePool").abi,
  factory = artifact("AlpineMarket", "AlpineFactory").abi,
  vault = artifact("AlpineMarket", "AlpineDemoVault").abi;
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
  if (actual.some((n, i) => Number(n) !== Object.values(terms)[i]))
    throw new Error(`${field} terms mismatch`);
  if ((await read(address, pool, "reservedBacking")) !== 0n)
    throw new Error(`${field} expected no seeded holder exposure`);
  if ((await read(address, pool, "shares", [m.deployer])) < 500n * 10n ** 18n)
    throw new Error(`${field} seed shares missing`);
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
for (const asset of [zeroAddress, m.wrapper, m.vault])
  if ((await read(m.exchange, exchangeAbi, "inventory", [asset])) <= 0n)
    throw new Error("Missing funded exchange inventory");
if ((await read(m.backingToken, tokenAbi, "balanceOf", [m.exchange])) <= 0n)
  throw new Error("Missing exchange settlement inventory");
for (const tx of m.transactions)
  if ((await c.getTransactionReceipt({ hash: tx.hash })).status !== "success")
    throw new Error(`Unconfirmed transaction ${tx.label}`);
m.status = "deployed-and-verified";
m.verifiedAt = new Date().toISOString();
writeFileSync("config/deployment.json", JSON.stringify(m, null, 2) + "\n");
console.log(
  "Verified Fuji factory, exact asset identities, terms, funded vaults and all deployment receipts.",
);
