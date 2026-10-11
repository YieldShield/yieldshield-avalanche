# YieldShield Alpine

An Avalanche Fuji pilot for AVAX exposure and explicit first-loss backing. A focused $10,000 Team1 Mini Grant project with its own codebase, asset registry, tests, website and deployment process.

## Current status — 11 October 2026

The web application and contracts are implemented and tested. **Public Fuji contracts are not deployed yet.** The new test-only signer is unfunded and the owner chose to prepare deployment for later. The app shows this status and disables market writes until a deployment is independently read back and marked verified. The live Chainlink AVAX/USD reference can be read without deploying our contracts.

- Chain: Fuji C-Chain, **43113**; gas/exposure asset: native test AVAX.
- Backing: **Alpine Demo Dollar (aDEMO)**, a newly issued 6-decimal valueless test token, not Circle USDC.
- Two distinct markets: live Chainlink reference; deterministic synthetic scenario (25 → 35 → 15 every 120 seconds).
- Mainnet native USDC/WAVAX and BENQI sAVAX are researched future integrations, not active assets. No new YieldShield token is necessary.
- No independent security audit, external adoption, funding award or mainnet readiness is claimed.

## How the bounded pilot works

Junior providers seed backing before protected exposure opens. The market admits test AVAX only when it has 150% of all entry floors in backing. A holder can withdraw their AVAX after a 60-second delay, paying fees only on positive realized gain (10% junior, 1% creator, 1% protocol), or surrender all AVAX for the fixed entry amount of aDEMO.

**Each market lasts seven days and admits at most 100 positions. Before its maturity, holders must choose an exit to retain AVAX upside. At maturity every unclosed position settles to its fixed entry backing amount and surrenders ALL AVAX, including any subsequent upside, to juniors.** Anyone can settle each expired position; the owner receives pull-based backing credit. Unclaimed credits remain segregated from junior capital.

Junior deposits and withdrawals pause while ANY protected position is active. This avoids unfair entry/exit around unrealized shortfalls. After all positions close or expire, juniors can redeem a proportional basket of aDEMO and junior AVAX after a 120-second notice. The notice is not a guarantee of immediate liquidity. No rolling epoch or automatic renewal is implemented.

## Run and verify

Node 24 and Foundry with Solidity 0.8.35 are used.

```sh
npm ci --ignore-scripts
npm run dev
npm run build
npm test
npm run test:contracts
npx playwright test
```

The static output is `dist/`. The website uses public RPC and the visitor's injected wallet; it has no server signer. Browser tests verify desktop/mobile layouts, disclosures, the interactive scenario model, the undeployed state and missing-wallet behavior. They are **not browser-signed Fuji transaction evidence**.

For the signed local lifecycle test, start `anvil --host 127.0.0.1 --port 8547 --silent` and run `node scripts/local-journey.mjs`. It creates disposable keys in memory, funds them on localhost, and verifies recipient balances through a full unwind. [Evidence](docs/evidence/local-journey.json) is explicitly **chain 31337, not Fuji**.

See [operations](docs/OPERATIONS.md), [research and budget](docs/RESEARCH_AND_SCOPE.md), [security notes](docs/SECURITY.md), and [provenance](docs/PROVENANCE.md).

## License

MIT, copyright YieldShield. Original implementation informed by the existing YieldShield product design. OpenZeppelin, React, viem and Vite retain their upstream licenses. No private deployment registry or credentials were imported from the other chain projects.
