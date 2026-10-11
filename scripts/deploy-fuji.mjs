import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { createPublicClient, createWalletClient, http, keccak256 } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { avalancheFuji } from "viem/chains";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
process.chdir(root);
const broadcast = process.argv.includes("--broadcast");
const manifestPath = "config/deployment.json";
const manifest = JSON.parse(readFileSync(manifestPath));
if (manifest.version !== 2)
  throw new Error("This deployment plan requires manifest version 2.");
if (manifest.chainId !== 43113)
  throw new Error("Manifest must target Fuji 43113");
const c = createPublicClient({
  chain: avalancheFuji,
  transport: http(manifest.rpcUrl),
});
if ((await c.getChainId()) !== 43113)
  throw new Error("RPC identity mismatch; stopped");
const secretPath = ".secrets/fuji-test-signer.json";
if (!existsSync(secretPath))
  throw new Error(
    "Missing dedicated test signer. See docs/OPERATIONS.md. Never reuse a mainnet signer.",
  );
const { privateKey } = JSON.parse(readFileSync(secretPath));
const account = privateKeyToAccount(privateKey);
if (account.address.toLowerCase() !== manifest.deployer.toLowerCase())
  throw new Error("Unexpected test signer");
const balance = await c.getBalance({ address: account.address });
console.log(
  JSON.stringify({
    chainId: 43113,
    deployer: account.address,
    balanceWei: String(balance),
    broadcast,
  }),
);
if (!broadcast) {
  console.log(
    "Read-only preflight complete. --broadcast is required to spend test AVAX.",
  );
  process.exit(0);
}
if (balance < 10n ** 17n)
  throw new Error(
    "Need at least 0.1 faucet-funded Fuji AVAX for gas plus 0.02 test AVAX exchange inventory. No real-money funding is permitted.",
  );
const w = createWalletClient({
  account,
  chain: avalancheFuji,
  transport: http(manifest.rpcUrl),
});
mkdirSync(".secrets/transactions", { recursive: true });
function artifact(name) {
  return JSON.parse(readFileSync(`contracts/out/${name}.sol/${name}.json`));
}
function namedArtifact(source, name) {
  return JSON.parse(readFileSync(`contracts/out/${source}.sol/${name}.json`));
}
const pool = namedArtifact("AlpinePool", "AlpinePool");
const token = namedArtifact("DemoAssets", "AlpineDemoDollar");
const scenario = namedArtifact("DemoAssets", "AlpineScenarioOracle");
const reference = namedArtifact("DemoAssets", "AlpineChainlinkOracle");
async function send(label, request) {
  const old = manifest.transactions.find((t) => t.label === label);
  if (old) {
    const receipt = await c.getTransactionReceipt({ hash: old.hash });
    if (receipt.status !== "success")
      throw new Error(`Prior ${label} was not successful`);
    return receipt;
  }
  const file = `.secrets/transactions/${label}.json`;
  let intent;
  if (existsSync(file)) intent = JSON.parse(readFileSync(file));
  else {
    const prepared = await w.prepareTransactionRequest({ ...request, account });
    const serialized = await account.signTransaction(prepared);
    intent = { hash: keccak256(serialized), serialized };
    writeFileSync(file, JSON.stringify(intent), { mode: 0o600 });
  }
  let receipt = await c
    .getTransactionReceipt({ hash: intent.hash })
    .catch(() => null);
  if (!receipt) {
    try {
      await c.sendRawTransaction({ serializedTransaction: intent.serialized });
    } catch (error) {
      const known = await c
        .getTransaction({ hash: intent.hash })
        .catch(() => null);
      if (!known) throw error;
    }
    receipt = await c.waitForTransactionReceipt({ hash: intent.hash });
  }
  if (receipt.status !== "success")
    throw new Error(`${label} reverted: ${intent.hash}`);
  manifest.transactions.push({
    label,
    hash: intent.hash,
    blockNumber: String(receipt.blockNumber),
    contractAddress: receipt.contractAddress,
  });
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
  console.log(`${label}: ${intent.hash}`);
  return receipt;
}
async function deploy(field, artifact, args = []) {
  if (manifest[field]) {
    const code = await c.getCode({ address: manifest[field] });
    if (!code || code === "0x") throw new Error(`${field} has no code`);
    return;
  }
  const { encodeDeployData } = await import("viem");
  const receipt = await send(field, {
    data: encodeDeployData({
      abi: artifact.abi,
      bytecode: artifact.bytecode.object,
      args,
    }),
  });
  if (!receipt.contractAddress) throw new Error("No contract address");
  manifest[field] = receipt.contractAddress;
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n");
}
const { setupMarkets } = await import("./setup-markets.mjs");
const { encodeFunctionData } = await import("viem");
await setupMarkets({
  manifest,
  account: account.address,
  deploy,
  save: async () =>
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + "\n"),
  call: async (label, request) =>
    request.to
      ? send(label, request)
      : send(label, {
          to: request.address,
          data: encodeFunctionData({
            abi: request.abi,
            functionName: request.functionName,
            args: request.args,
          }),
          value: request.value,
        }),
});
console.log(
  "Deployment mined. Run npm run verify:fuji before presenting the markets as verified.",
);
