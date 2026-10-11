# End-to-end verification

Date: 11 October 2026.

## Scope and environment

The test follows funding, acquisition, protection, position management, capital provision, claims and market creation through the application, checking confirmed chain state rather than treating a signature as success.

Signed Avalanche browser transactions use the real application with an explicitly enabled development-only wallet on isolated Anvil chain 31337. The adapter uses unlocked disposable local accounts, checks the exact localhost origin and chain, and is absent from the production build. It is separate from any installed wallet extension.

Fuji deployment remains deferred. No Fuji contract deployment or public-chain transaction is claimed. Actual Core/MetaMask extension confirmation screens are outside this verification.

## Signed browser results

The completed CUA journey produced **44 browser-initiated transactions with successful receipts**, separately identified from 26 local setup transactions and the 48-transaction native scripted journey. [Receipt evidence](evidence/e2e/browser-receipts.json) records methods, accounts, hashes, source hashes and final contract assertions.

| Path | Observed result |
|---|---|
| Funding and acquisition | Faucet funding; native, wrapped and vault-receipt buys/sells; wrapping/unwrapping; both protected-vault and backing-vault deposits/redemptions. |
| Holder lifecycle | Protection, partial asset and backing exits, ownership transfer and the new owner's close. |
| Provider lifecycle | Capital provision, notice, gain-fee claim and withdrawal. |
| Factory and fees | Custom bvaDEMO-backed pool with 160% collateral, 12% provider fee, 2% creator fee and one-day term; native protection and gain exit; creator/provider claims. |
| Maturity | Third-party settlement, full provider redemption, then the holder's separate 0.025 bvaDEMO credit claim; final provider shares, reserved backing and holder credit all zero. |
| Clock skew | Chain advanced to maturity while the workstation remained about a day earlier; the UI exposed settlement from chain time. [Evidence](evidence/e2e/skewed-clock.json). |
| Delayed approval | Leaving protection while allowance signing was paused allowed the allowance to finish but stopped the hidden protection transaction. The pool's position count and reserves confirm no extra deposit. |
| Wallet/network change | Network-change event cleared wallet, balances and quote; reconnect required a fresh review before a successful wrap. |
| Unknown receipt | Real 120-second confirmation timeout retained the hash and removed Confirm. Restoring mining confirmed that exact transaction. [Evidence](evidence/e2e/unknown-receipt.json). |

Historical Activity entries marked unknown require manually checking their transaction link; automatic reconciliation is not implemented or claimed. [Browser success screenshot](evidence/e2e/browser-conversion-success.jpg).

## Public application checks

- Missing-wallet connection reports an actionable message and can be dismissed.
- Invalid market selection blocks the workflow and recovers to the market catalogue without retaining the invalid query.
- Provider → acquisition → faucet → acquisition → provider preserves the selected backing-vault market and exact six-decimal amount. The conversion amount and original provider amount remain independent.
- Public writes remain visibly disabled while Fuji contracts await deployment.
- After publishing, the custom domain served the expected production bundle, four icon links and no test-wallet controls. Desktop and 390px phone views had no horizontal page overflow; screenshots and exact release identity are in [HOSTING.md](HOSTING.md).

## Recovery fixes

Each fix is committed separately. The release prevents older background reads replacing confirmed balances, invalidates transaction reviews when a route or input context changes, consumes reviews before signing to prevent replay after an unknown receipt, uses chain timestamps for financial readiness and deadlines, and clears resolved errors on a fresh review.

| Commit | Fix |
|---|---|
| `44c7019` | Keep older background responses from replacing confirmed account data. |
| `e2cad3b` | Invalidate reviews after route unmount or an input changes away and back. |
| `07b5b10` | Consume a review before signing so an uncertain receipt cannot replay it. |
| `fb9ae80` | Read financial readiness and quote deadlines from chain time. |
| `99db444` | Clear resolved errors when reviewing another operation. |
| `9be366c` | Recheck wallet and review context after simulation, immediately before signing. |

Development-wallet setup and test evidence are separate commits from these application fixes.

## Final checks

- 10 JavaScript tests pass, including delayed responses, route/input changes, review replay and final pre-sign scope checks.
- 32 Solidity tests pass, including two 256-run fuzz tests.
- TypeScript checking and the Vite production build pass.
- The separate native scripted lifecycle completed 48 successful transactions.
- Production output contains no local-wallet bridge or local RPC markers. The Fuji manifest is unchanged: `awaiting-testnet-gas`, no deployed project addresses, no transactions.
- Browser evidence identifies application source commit `d7f468c9d22dfa0f363ff9855b918eba1e86a885`; evidence commit `25a57c33a15de43761d33fe12e65eb9f436897dc` adds only the capture script and records.

Native lifecycle receipts remain in [local-journey.json](evidence/local-journey.json). The final application source and production deployment are recorded in [HOSTING.md](HOSTING.md).

Grant applications remain held for user review. This is functional verification, not a security audit.
