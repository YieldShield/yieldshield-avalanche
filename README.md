![YieldShield Alpine — AVAX exposure. Explicit first-loss backing.](.github/assets/banner.png)

# YieldShield Alpine

A distinct Avalanche implementation of YieldShield's split-risk markets: protected holders, capital providers, funded test trading, vault conversions and independently created pools.

## Current status — 12 October 2026

**Fuji contracts are deployed and verified.** Deployment `fuji-2026-10-12T18-48-56Z-8bd0c9` (26 transactions from commit `64f4a13`) passed `verify:fuji`, and the public frontend now enables writes against it. The addresses are in [config/deployment.json](config/deployment.json). A second test account completed a 19-transaction Fuji journey ([evidence](docs/evidence/fuji-e2e.json)). Featured markets accept protection until 11 November 2026 and then need replacements. Local test-chain and browser evidence must not be presented as Fuji activity. No grant award, external investment, independent audit, mainnet readiness or real adoption is claimed.

The implemented catalog contains three protected assets and two backing choices:

| Token | Role | Decimals | Actual backing |
|---|---|---:|---|
| Fuji AVAX | Native protection and exchange asset; gas |18| Native test-network asset |
| awAVAX | Wrapped protection and exchange asset |18| 1:1 deposited Fuji AVAX; **not canonical WAVAX** |
| vaDEMO | Protected vault receipts; exchange asset |18| ERC-4626 claims on aDEMO actually held by its vault |
| aDEMO | Junior backing and exchange settlement |6| Valueless faucet token; **not USDC or dollar redeemable** |
| bvaDEMO | Selectable vault-receipt junior backing |6| Separate funded ERC-4626 aDEMO vault |

sAVAX and Circle USDC remain researched references, not active integrations. No new YieldShield governance token is required.

## Product workflows

- Discover five featured markets, inspect terms and create a custom market with approved asset/backing pairs. Creation atomically credits the 500-backing-unit seed to its creator as provider shares.
- Review a holder deposit, then manage partial/full asset or backing exits, transfer ownership, settle matured positions and claim segregated backing credit.
- Provide capital, request/cancel withdrawal notice, redeem a proportional backing/asset basket, and independently claim earned gain fees. Creator/protocol fees are also pulled separately.
- Buy or sell against actually funded exchange inventory with 0.3% fees, maximum spend/minimum proceeds and deadlines. Purchase confirmation carries the exact asset and amount into protection.
- Wrap/unwrap AVAX and deposit/redeem both funded vaults with output limits. Faucet and funding detours retain the intended role, market and amount.
- Inspect portfolio, local transaction history, exact token identities, network status and a clearly labeled scenario calculator.

All pages have direct URLs, including `/protect`, `/provide`, `/markets`, `/pools/:key`, `/positions`, `/positions/:pool:id`, `/trade`, `/create-pool`, `/portfolio`, `/activity`, `/faucet`, `/assets`, `/status`, `/how-it-works` and `/legal`. Browser Back/Forward and fresh deep links are supported.

## Material economic differences

Provider entry/redemption **freezes while any protected position remains open**, preventing unrealized-loss NAV arbitrage. A finite, immutable epoch bounds this freeze: anyone can settle each remaining position after maturity. Forced settlement surrenders the remaining asset and its upside for the fixed entry-backing claim. Featured markets use the 30-day maximum epoch; factory-created epochs allow 1–30 days. Matured markets are shown as closed and need replacements. Notice does not guarantee immediate liquidity.

Partial exits preserve the proportional entry basis of the remaining position. Fees apply only to positive gains on the withdrawn slice. Rewards, creator/protocol fees, surrendered principal and unclaimed backing are separately accounted. A vault-backed floor is a fixed number of bvaDEMO receipts; the underlying aDEMO redeemable for those receipts can change. There is no fixed dollar guarantee or promised yield.

## Run and verify

```sh
npm ci --ignore-scripts
npm run dev                 # public pending-Fuji preview at 127.0.0.1:5181
npm run build               # static output: dist/
npm test
npm run test:contracts
npm run test:browser         # public routes, mobile, wallet and context regressions
```

For local transactions only:

```sh
anvil --host 127.0.0.1 --port 8547 --silent
node scripts/local-journey.mjs --browser-ready
node scripts/local-web.mjs   # isolated local-chain preview at 127.0.0.1:5184
ALPINE_LOCAL_E2E=1 npm run test:browser -- tests/browser/local-lifecycle.spec.ts
```

The local journey confirms 48 transactions and writes source-hash-bound [evidence](docs/evidence/local-journey.json). Its optional browser-ready mode resets the disposable chain after recording evidence and prepares fresh markets. Browser tests use Anvil's publicly known local development accounts through an injected test provider; no private keys are embedded in the app or committed. Production builds cannot enable the local-chain configuration.

See [operations](docs/OPERATIONS.md), [security](docs/SECURITY.md), [research](docs/RESEARCH_AND_SCOPE.md), and [provenance](docs/PROVENANCE.md).

## License

MIT, copyright YieldShield. Independently authored from YieldShield's existing product design. OpenZeppelin, React, React Router, viem and Vite retain their upstream licenses. No credentials, private deployment registry or historical contracts were imported from the other chain projects.
