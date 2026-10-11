# Operations

## Prepared deployment, not yet broadcast

The owner selected **prepare deployment for later** on 11 October 2026. The dedicated new Fuji public signer is `0x59EFc921242ef1a8140b723aa3277f168eaed2EC`; balance was zero during preflight. Its private key is in an ignored owner-local `.secrets` file with mode 0600 and is never in source control, frontend code, public logs or build output. Do not fund it with real assets. The official faucet requires Builder Hub/Core authentication.

1. Obtain test AVAX for this address from https://build.avax.network/console/primary-network/faucet.
2. Build and test the checked-out source: `npm ci --ignore-scripts`, `npm run test:contracts`, `npm test`, `npm run build`.
3. Run `npm run deploy:fuji` for a read-only chain/balance preflight.
4. Once test gas is available and deployment is intended, run `npm run deploy:fuji -- --broadcast`.
5. Run `npm run verify:fuji`. Only successful verification changes manifest status to `verified` and creates `docs/evidence/fuji-verification.json`.
6. Run a separate public Fuji wallet journey before representing the release as end-to-end verified. Capture mined receipts and recipient balances; local chain evidence cannot replace it.
7. Commit the public registry/evidence separately, rebuild the website and publish the updated static output.

The deployment checks chain 43113, uses one new signer, has no mainnet mode and requires explicit broadcast. Each signed transaction is saved privately before send; an interrupted operation reuses that identical signed intent/hash. Public registry entries are written only after successful receipts. Do not delete an ambiguous intent or replace its nonce. Check the original hash onchain first.

Five contracts are deployed: aDEMO, scenario oracle, reference oracle, scenario market, reference market. A faucet call mints 10,000 valueless aDEMO; each market receives 5,000 as initial junior backing. Both creator and protocol fee recipients are the dedicated test signer for this test release, not a production governance policy. Every market's 7-day clock starts at its deployment and cannot be extended.

## Website

`npm run build` produces `dist/` for static hosting. All deployment identities are public in `config/deployment.json`; no `.env` is needed for normal operation. A generated Vercel local environment file is ignored and is not part of the application. The browser checks Fuji before transactions, requests exact token approval, uses a 0.5% quote tolerance (minimum outputs round upward so even tiny quotes stay within that bound), waits for receipts, and links to the explorer. A mature epoch stops deposits and AVAX exits; fixed backing exits, expiry settlement and backing claims remain available.

The live market must use the verified Chainlink Fuji AVAX/USD proxy `0x5498BB86BC934c8D34FDA08E81D444153d0D06aD`, 8 decimals, a 600-second advertised heartbeat, and this pilot's conservative 1,200-second maximum age. No fallback can silently turn a failed live price into synthetic data.

## Expiry and redemption

The contract caps an epoch at 100 positions. The UI scans this complete bounded set. After maturity anyone connected can use “Settle next expired position” repeatedly; each transaction settles one position. Credited backing is excluded from junior capital and stays in the contract until its owner claims it. Juniors can start withdrawal notice before settlement finishes. They cannot deposit or redeem while any protected position remains active.

A subsequent epoch requires a new market deployment and a deliberate frontend registry update. This pilot has no automatic rollover, keeper funding, insured outcome or liquidity promise. A production system would need more complete pricing, independent reviews and governance.

## Evidence and reproducibility

- `forge test --root contracts`: 14 tests, including 256 fuzz runs for reserve/native accounting, plus specific junior fairness and forced-expiry regression tests.
- `npm test`: exact-unit payoff, backing capacity, invalid-price and ceiling-rounded minimum-output tests, including tiny quotes.
- `npx playwright test`: desktop/mobile navigation, responsive overflow, no-wallet behavior, account/network change resets, undeployed-state restrictions and risk copy.
- `node scripts/local-journey.mjs`: complete signed local lifecycle, 13 mined transactions, recipient balances and zero residual backing after unwind.
- `docs/evidence/desktop.png` / `mobile.png`: local browser captures with RPC intentionally unavailable during failure-state tests. They do not depict public Fuji contract activity.

External signing, funded Fuji transactions, independent security review and real tester sessions remain milestones, not completed evidence.
