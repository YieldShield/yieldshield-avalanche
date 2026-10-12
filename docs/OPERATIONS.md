# Operations

## Fuji deployment is deferred

The owner selected **prepare deployment for later** on 11 October 2026. The dedicated public test signer is `0x59EFc921242ef1a8140b723aa3277f168eaed2EC`. Its private key remains in an ignored owner-local `.secrets` file, never in source, browser code or logs. Only faucet-funded test AVAX may be used.

1. Build and verify the exact checkout: `npm ci --ignore-scripts`, `npm run test:contracts`, `npm test`, `npm run build`.
2. `npm run deploy:fuji` performs a read-only preflight of the chain, balance, git commit and artifact freshness. It does not broadcast.
3. After the owner resumes deployment and faucet funding is available, `npm run deploy:fuji -- --broadcast` executes the prepared plan. It requires at least 0.1 Fuji AVAX for gas and 0.02 AVAX of funded exchange inventory; actual total gas requirements may be higher.
4. `npm run verify:fuji` checks chain 43113 and compares every deployed contract's runtime code with `contracts/out`, with immutables masked. This covers the singletons, the five pools and the factory-created backing oracles. It checks factory registration and wiring (including `protocol()`), exchange `backing()` and `registry()`, the reference oracle's `feed()` and `maxAge()` against the manifest, asset and backing identities, and the featured terms recorded in the manifest. It also checks that every featured market still accepts protection, warning when one closes within three days, and that all receipts succeeded. It then marks the manifest `deployed-and-verified`. Creation seeds and exchange funding are checked from the recorded creation and funding receipts, not live balances, so verification can be repeated after public protections or trades. A `deploy:fuji -- --broadcast` rerun with nothing left to send keeps the current status. Only newly mined steps reset the status to `deployed-awaiting-verification`.
5. Run a public wallet journey and save confirmed receipt/balance evidence before describing Fuji as end-to-end verified. Commit public registry/evidence separately, rebuild and deploy the website.

The public manifest records mined successful operations (label, hash, nonce, block, gas). Scripts have no mainnet mode.

The first broadcast also records `source` in the manifest: the git commit (`git rev-parse HEAD`), the compiler, and the creation and runtime bytecode hashes of every planned artifact. Broadcasting is refused when `contracts/out` was not compiled from the current sources, when contract sources have uncommitted changes, or, on a resume, when any artifact differs from the recorded build.

### Signed intents and resuming

The first broadcast gives the manifest a `deploymentId`. Every transaction is signed and saved privately as an intent in `.secrets/transactions/<deploymentId>/<label>.json` (mode 600) before it is sent. Each intent is bound to chain 43113, the signer, its nonce, the hash of target, value and calldata and, for contract creations, the artifact bytecode hash. A `deadline` argument is chosen at signing time (chain time plus one hour) and excluded from the payload hash. A rerun refuses any stored intent that does not match the current step exactly, explaining the mismatch and where the intent stands on chain.

A rerun resumes each stored intent according to its chain state:

- **Mined successfully:** recorded, unless the signer has sent later transactions, which marks the intent as left over from an earlier attempt.
- **Pending:** waited for; it is never replaced.
- **Unknown to the node with its nonce still unused:** rebroadcast unchanged. It is re-signed at the same nonce only if its deadline is within five minutes of chain time or the node rejects it. The script logs the re-signing, and the superseded hash remains watched.
- **Mined but reverted:** recorded under `failedTransactions`, and the run stops. Inspect the revert, fix its cause, then run `npm run deploy:fuji -- --broadcast --retry-reverted <label>`. The step is signed again at the next nonce, and the reverted intent is kept as `<label>.reverted-nonce-<n>.json`.
- **Nonce consumed by another transaction:** the run stops.

Never delete or edit an intent that may be pending or mined, never casually replace a nonce, and do not send other transactions from the test signer during a deployment.

**Starting over** (for example after contract changes): restore the pre-deployment manifest with every contract field `null`, `transactions: []`, and no `deploymentId` or `failedTransactions`, for example `git checkout <pre-deployment commit> -- config/deployment.json`. The next broadcast creates a new deployment folder, so old intents are never consulted. An emptied manifest that keeps the old `deploymentId` stops at the first intent that already mined.

## Version 2 deployment plan

The shared `setup-markets.mjs` plan deploys the aDEMO faucet token, separate scenario/reference oracles, awAVAX, vaDEMO, bvaDEMO, vault oracle, factory (including backing-unit adapters), and funded exchange. The factory creates five featured markets: reference AVAX, synthetic AVAX, wrapped AVAX, protected vault receipts, and reference AVAX backed by bvaDEMO. Every creation seeds 500 units of selected backing and credits corresponding provider shares to the creator.

The seed faucet provides 10,000 aDEMO. Each vault receives a real 1,000 aDEMO deposit through `depositBounded`. That deposit must mint exactly one aDEMO's worth of shares per aDEMO: 1,000 vaDEMO (decimals offset 12) or 1,000 bvaDEMO (offset 0). Without that bound, anyone who first deposited 1 unit and donated aDEMO could make the seed mint dust and break the bvaDEMO-backed market. If such a donation lands first, the seed reverts or fails gas estimation. The vault's rate then stays skewed, so start over rather than retrying. Exchange inventory receives 1,000 aDEMO, 0.01 native AVAX, 0.01 awAVAX and 100 vaDEMO. These are finite balances. **No holder positions are seeded** so initial testers can provide capital immediately. Creator/protocol fee recipients are the dedicated test signer for this pilot.

The factory registers at most 32 markets. Ten slots are reserved for the protocol account (featured markets and their replacements after maturity); community wallets share the other 22, at most two per wallet. Each market allows at most 100 concurrently open positions and a 0.01 backing-unit minimum entry claim. Closed positions free their slot. It allows approved asset/oracle/backing combinations and bounded immutable terms; no arbitrary token can be listed. The factory's 500 unit seed is provider capital, not a listing fee. Fixed epochs are not renewed automatically. Featured markets therefore use the 30-day contract maximum (`epochSeconds` 2,592,000) and mature 30 days after creation. `verify:fuji` prints each closing date and fails once a featured market can no longer accept protection, which means replacement markets are needed. Custom markets keep their creator's 1–30 day choice.

## Website and wallet behavior

`npm run build` produces `dist/`. Public identities live in `config/deployment.json`; no secret environment variable is needed. Vercel's local environment files and private grant records remain excluded. Deep routes rewrite to the SPA entrypoint. The app verifies wallet chain/account, rejects unknown market selections, discards stale asynchronous reviews, uses exact approvals, binds price limits and transaction deadlines, and records transaction hashes before waiting for confirmation.

Reference pricing uses Fuji Chainlink AVAX/USD `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`, 8 decimals, with a 1,200 second maximum age. No failed reference read becomes a synthetic price. Vault-backed quotes convert nominal aDEMO value into actual backing-vault share units. The six-decimal bvaDEMO collateral and eighteen-decimal vaDEMO exposure vault have different contract addresses and metadata.

## Expiry and provider liquidity

Provider entry and redemption freeze while any protected position remains, which in a featured market can last up to its 30-day maturity. Any account may settle a matured position from its detail page; provider cards expose an outstanding settlement queue. Owners then claim their separately reserved backing credit. Provider notice can begin before exposure clears. Redemption returns a proportional basket of selected backing and surrendered protected assets; earned fees are independent claims.

At maturity the remaining protected asset and any upside are forfeited for the fixed entry claim. Partial exits before maturity retain the remainder's original opening time and proportional basis. Existing backing claims remain independent of oracle availability.

## Reproducible local evidence

- Solidity suite: 32 tests, including two 256 case fuzz regressions and specific fairness, expiry, partial-exit, rewards, transfer, factory, vault-unit, funding and deadline cases.
- Exact-unit math: 5 tests, including tiny minimum-output rounding.
- Public browser suite: direct routes at390px, nested funding continuation, Back/Forward, invalid pool rejection, missing-wallet feedback, scenario interaction, storage denial, and account/network resets.
- Local signed lifecycle: 48 confirmed transactions, source hashes in `docs/evidence/local-journey.json`, explicitly chain 31337. No Fuji broadcast.
- Isolated browser transaction test: faucet → provider deposit → funded buy → protection → partial gain exit → reward claim → activity → disconnect. Delayed-RPC regression proves an old asset quote cannot revive after selection changes.

Start local Anvil on 8547, run `node scripts/local-journey.mjs --browser-ready`, then `node scripts/local-web.mjs` on 5184. The browser-ready option resets the disposable chain after evidence capture and creates fresh markets. Local chain state and `.local` files are ignored. Private keys are never needed in browser source.
