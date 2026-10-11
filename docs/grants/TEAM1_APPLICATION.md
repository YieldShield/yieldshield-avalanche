# YieldShield Alpine Team1 Mini Grant application draft

Prepared 11 October 2026 for Hawig Ventures UG (haftungsbeschränkt). Proposed request: $10,000 for six weeks of additional Avalanche-specific work. The authenticated Team1 form has been filled and has not been submitted. Exact entered grant answers are preserved in [TEAM1_FORM_VALUES.json](TEAM1_FORM_VALUES.json). A new YieldShield Alpine project profile was created in Builder Hub, with David as the confirmed account member and both cofounders described in the grant narrative. No invitation was sent to Santiago.

## Project and team

YieldShield Alpine is an Avalanche-specific prototype that separates AVAX exposure from the capital accepting its downside. A holder deposits test AVAX into a seven-day protection epoch, receives a bounded backing claim, and can choose an AVAX exit under the gain-sharing terms or surrender the AVAX for reserved demo-dollar backing. Junior providers supply the loss-bearing capital and receive surrendered AVAX and a share of positive gains. At maturity all remaining positions surrender AVAX for the entry backing amount; holders must exit beforehand to retain upside. Anyone may trigger expiry settlement into the holder's claim balance. Junior entry and withdrawal pause while positions are active to prevent unfair share pricing.

The prototype is built for Fuji C-Chain, chain 43113. Its Alpine Demo Dollar is a project-issued test token with no dollar redemption and no connection to Circle USDC. Reference prices use an explicitly identified Chainlink AVAX/USD feed with freshness checks; synthetic scenarios are isolated and labeled. No new protocol token, guaranteed yield, independent audit or mainnet readiness is claimed.

Website: https://avalanche.yieldshield.ai

Repository: https://github.com/YieldShield/yieldshield-avalanche (initially private).

Applicant: Hawig Ventures UG (haftungsbeschränkt), Simmern, Germany. Contact: David Hawig, david@yieldshield.ai. Project X: https://x.com/yieldshield_ai.

David Hawig is Founder and Managing Director, building YieldShield full-time. He previously served as Director of Ecosystem at Web3 Foundation and has founded and exited two startups. His experience combines ecosystem and business development with hands-on Solidity, React and AI tooling. LinkedIn: https://www.linkedin.com/in/david-hawig-206a44b1/ ; X: https://x.com/davidhawig ; GitHub: https://github.com/Noc2.

Santiago Balaguer is Cofounder and Product Lead, with 15 years of product experience and five years in crypto, focused on clear user journeys and comprehensible risk choices. LinkedIn: https://www.linkedin.com/in/santiagobalaguer/ ; X: https://x.com/SantiBalaguer.

## Problem and Avalanche fit

AVAX holders can sell exposure or buy separate hedges, but neither makes the relationship between a protected position and its reserved backing easy to inspect. YieldShield explores a contract-level alternative: an explicit exit choice matched to separately committed first-loss capital. The product hypothesis is that users and integrators value understandable reserves and bounded settlement enough to accept gain-sharing and capital lock-up. Demand and sustainable pricing remain to be tested.

Avalanche's EVM compatibility allows the team to bring prior split-risk experience to a focused native-AVAX pilot with direct wallet transactions, public reserves and verifiable expiry behavior. Native USDC and WAVAX are the next integration candidates. BENQI sAVAX is deferred until redemption value, market discounts, withdrawal delays and liquidity can be modeled correctly; we will not treat sAVAX as instantly redeemable one-for-one AVAX.

The Alpine version is a reduced independent implementation informed by YieldShield's Base, Monad and BNB work. It has its own code, deployment identity, token registry, UI and tests. No bridge or custom L1 is required for this grant.

## Existing work and traction

Current stage: prototype. The dedicated interface is live at https://avalanche.yieldshield.ai. Validation includes 14 contract tests with 256 fuzz cases, five exact-unit arithmetic tests, three browser tests, and a signed 13-transaction local lifecycle. The local network is explicitly identified as chain 31337, not Fuji. See [local evidence](../evidence/local-journey.json). The user chose to prepare Fuji deployment for later; market writes remain disabled until deployment verification. Live Chainlink reference reads do not imply deployed protection pools.

No verified external-user, revenue, real TVL or organic-volume figures are claimed. Test scenarios and internal transactions are engineering evidence. The team is self-funded and has received no investment or grants, as confirmed on 11 October 2026. Related grant applications and chain experiments exist, but no same deliverable will be billed twice. Today's prototype is prior work, not part of the requested reimbursement.

## Requested future work

Request: $10,000, six weeks after acceptance. Estimated 100 hours at a blended $100/hour across implementation, verification and product work. The scope excludes mainnet rollout, liquidity subsidies and a claim of comprehensive external audit.

| Milestone | Additional work and acceptance evidence | Budget |
| --- | --- | --- |
| Integration hardening, weeks 1–2 | Complete native-USDC/WAVAX adapter checks, expand oracle and expiry stress cases beyond the existing suite, publish scoped threat model and deployment monitoring. Verify token identities, rounding, stale/future oracle responses and payout conservation. | $4,000 |
| Independent testnet pilot, weeks 3–4 | Recruit 10 consenting independent testers, observe 30 complete test journeys across both exits and junior claims, record usability failures and issues without counting seeded balances as adoption. Improve accessibility and transaction recovery from observed evidence. | $3,000 |
| Release and ecosystem handoff, weeks 5–6 | Resolve material pilot findings, publish reproducible Avalanche integration examples and release notes, provide a measured USDC/WAVAX readiness report and sAVAX decision record, and establish a 30-day monitoring/handoff plan. | $3,000 |

Milestone amounts and targets are proposed for organizer review. All development claimed here is additional to the application-date baseline. If another program funds an overlapping item, it will be removed or repriced before any acceptance.

## Token and release plan

AVAX pays network fees and is the protected demo exposure. Alpine Demo Dollar provides faucet-backed test settlement. Circle-issued USDC may become settlement only after issuer, freeze/blacklist, transfer and liquidity behavior are verified. WAVAX may support standard integrations; sAVAX remains a separate research decision. No governance or incentive token is needed.

The independent contracts and interface are AI-assisted and unaudited. A clearly bounded testnet release is the immediate deliverable. Real assets require independent security and economic review and an appropriate legal assessment. Public-source publication would use a reviewed package containing code, tests and reproducible instructions, with credentials and private application records excluded.

## Program checks and sources

- Current Mini Grants page: https://www.team1.network/grants — open application, up to $10,000.
- Current intake: https://build.avax.network/grants/team1-mini-grants/apply
- Team1 September 2026 program post: https://www.team1.blog/p/team1-builder-grants-backing-the
- Circle official token identities: https://developers.circle.com/stablecoins/usdc-contract-addresses
- BENQI liquid staking: https://docs.benqi.fi/benqi-liquid-staking/overview
- Fuji faucet: https://build.avax.network/console/primary-network/faucet
- Founder facts: existing Base Batches 004 draft in the team's Drive and David's confirmation on 11 October 2026.

Team1's 9 September 2026 official post explicitly states both tracks are global and ongoing, superseding the older India-only phase. The current authenticated intake has no country selection or India restriction. Selection and final eligibility remain Team1's decisions. The form contains a project profile, signed-in applicant details, optional member invitations, requested amount, summary, milestones, rationale, optional supporting link, X profile and optional Telegram. The final page says funding is discretionary and participation does not guarantee funding. Submission remains pending the applicant's final review.
