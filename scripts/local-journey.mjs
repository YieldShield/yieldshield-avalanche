import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createPublicClient, createWalletClient, http, parseEther } from "viem";
import { generatePrivateKey, privateKeyToAccount } from "viem/accounts";
import { foundry } from "viem/chains";
const rpc = "http://127.0.0.1:8547";
const c = createPublicClient({ chain: foundry, transport: http(rpc) });
if ((await c.getChainId()) !== 31337)
  throw new Error("Local journey only runs on chain31337");
const a = privateKeyToAccount(generatePrivateKey()),
  b = privateKeyToAccount(generatePrivateKey());
for (const account of [a, b])
  await c.request({
    method: "anvil_setBalance",
    params: [account.address, "0x56bc75e2d63100000"],
  });
const w = createWalletClient({
    account: a,
    chain: foundry,
    transport: http(rpc),
  }),
  u = createWalletClient({ account: b, chain: foundry, transport: http(rpc) });
const artifact = (source, name) =>
  JSON.parse(readFileSync(`contracts/out/${source}.sol/${name}.json`));
const poolA = artifact("AlpinePool", "AlpinePool"),
  tokenA = artifact("DemoAssets", "AlpineDemoDollar"),
  oracleA = artifact("DemoAssets", "AlpineScenarioOracle");
const tx = [];
async function mined(label, promise) {
  const hash = await promise;
  const receipt = await c.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`${label} failed`);
  tx.push({ label, hash, block: String(receipt.blockNumber) });
  return receipt;
}
async function deploy(label, artifact, args = []) {
  return (
    await mined(
      label,
      w.deployContract({
        abi: artifact.abi,
        bytecode: artifact.bytecode.object,
        args,
      }),
    )
  ).contractAddress;
}
const backing = await deploy("deploy-demo-token", tokenA),
  oracle = await deploy("deploy-scenario-oracle", oracleA),
  pool = await deploy("deploy-pool", poolA, [
    backing,
    oracle,
    a.address,
    a.address,
  ]);
await mined(
  "faucet",
  w.writeContract({
    address: backing,
    abi: tokenA.abi,
    functionName: "faucet",
  }),
);
await mined(
  "approve-backing",
  w.writeContract({
    address: backing,
    abi: tokenA.abi,
    functionName: "approve",
    args: [pool, 1000_000000n],
  }),
);
await mined(
  "seed-junior",
  w.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "depositJunior",
    args: [1000_000000n, 1n],
  }),
);
const block = await c.getBlock();
await mined(
  "open-protected-position",
  u.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "protect",
    args: [25_000000n, block.timestamp + 300n],
    value: parseEther("1"),
  }),
);
await c.request({ method: "evm_increaseTime", params: [61] });
await c.request({ method: "evm_mine", params: [] });
await mined(
  "backing-exit",
  u.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "exitBacking",
    args: [1n],
  }),
);
const received = await c.readContract({
  address: backing,
  abi: tokenA.abi,
  functionName: "balanceOf",
  args: [b.address],
});
if (received !== 25_000000n) throw new Error("Backing recipient mismatch");
await mined(
  "open-expiry-position",
  u.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "protect",
    args: [1n, (await c.getBlock()).timestamp + 300n],
    value: parseEther("1"),
  }),
);
const maturity = await c.readContract({
  address: pool,
  abi: poolA.abi,
  functionName: "maturity",
});
await c.request({
  method: "evm_setNextBlockTimestamp",
  params: [Number(maturity)],
});
await c.request({ method: "evm_mine", params: [] });
await mined(
  "permissionless-expiry",
  w.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "settleExpired",
    args: [2n],
  }),
);
await mined(
  "junior-notice",
  w.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "requestJuniorWithdrawal",
  }),
);
await c.request({ method: "evm_increaseTime", params: [121] });
await c.request({ method: "evm_mine", params: [] });
const shares = await c.readContract({
  address: pool,
  abi: poolA.abi,
  functionName: "shares",
  args: [a.address],
});
await mined(
  "junior-basket-redemption",
  w.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "withdrawJunior",
    args: [shares, 950_000000n, parseEther("2")],
  }),
);
const claimBefore = await c.readContract({
  address: pool,
  abi: poolA.abi,
  functionName: "claimableBacking",
  args: [b.address],
});
await mined(
  "claim-expired-backing",
  u.writeContract({
    address: pool,
    abi: poolA.abi,
    functionName: "claimBacking",
  }),
);
const finalBalance = await c.readContract({
  address: backing,
  abi: tokenA.abi,
  functionName: "balanceOf",
  args: [b.address],
});
if (finalBalance !== received + claimBefore)
  throw new Error("Claim recipient mismatch");
const remaining = await c.readContract({
  address: backing,
  abi: tokenA.abi,
  functionName: "balanceOf",
  args: [pool],
});
if (remaining !== 0n) throw new Error("Unexpected balance after full unwind");
const evidence = {
  runAt: new Date().toISOString(),
  chainId: 31337,
  network: "Anvil localhost; NOT Avalanche Fuji",
  contracts: { backing, oracle, pool },
  transactions: tx,
  checks: {
    initialBackingExit: String(received),
    expiredBackingClaim: String(claimBefore),
    finalOwnerBacking: String(finalBalance),
    poolBackingAfterFullUnwind: String(remaining),
  },
  limitations: [
    "Internal local transaction evidence only",
    "No external users or public Fuji deployment proven",
  ],
};
mkdirSync("docs/evidence", { recursive: true });
writeFileSync(
  "docs/evidence/local-journey.json",
  JSON.stringify(evidence, null, 2) + "\n",
);
console.log(JSON.stringify(evidence, null, 2));
