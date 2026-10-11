# Avalanche demo hosting

The public interface is https://avalanche.yieldshield.ai. The dedicated Vercel project is `yieldshield-avalanche` (`prj_JasaGB0OBYNqmMWlPIv4zbs1I7jp`) in the existing YieldShield team. No existing chain application or domain was replaced.

Current application release: `becea03cd1e198ac716177e6120549bb59ef37ae` on `codex/avalanche-mini-grant`. Deployment `dpl_EdeebnutL2mAdQTuofETuNdA5KWw` is READY at https://yieldshield-avalanche-em32ca2kb-noc2-6281s-projects.vercel.app and aliased to the public custom domain. Vercel metadata was checked against this exact commit, repository and branch.

The current release fixes transaction-review replay, stale account reads, route/input invalidation, chain-time readiness and final signing checks. Ten JavaScript tests, 32 Solidity tests, the production build, 48 native lifecycle transactions and 44 distinct CUA browser transaction receipts pass. [E2E_REPORT.md](E2E_REPORT.md) records the complete paths and limitations. Earlier keyboard, responsive navigation, form, favicon and draft-continuity checks remain in [UI_REVIEW.md](UI_REVIEW.md).

Post-deployment browser verification loaded `/protect` from the custom domain with production bundle `/assets/index-Bi7pYs4U.js`, all four icon links, no local test wallet and the correct Fuji deployment gate. Desktop content width equalled the viewport; at 390px phone size the content stayed within 375px with no horizontal page overflow. Evidence: [desktop](evidence/e2e/published-protect-desktop.jpg), [phone](evidence/e2e/published-protect-mobile.jpg).

The application includes dedicated holder protection and capital-provider workflows, partial exits, holder ownership transfer, separate fee claims, actual funded exchange and vault/wrapper conversions, two backing choices, native factory creation and full supporting routes. [FEATURE_PARITY.md](FEATURE_PARITY.md) records the reference feature comparison and intentional economic differences.

Protocol validation from the preceding feature release (unchanged by the current UI fixes): production build, 32 Solidity tests including two 256-run fuzz regressions, five exact-unit arithmetic tests, eight automated browser tests and 48 confirmed local-chain lifecycle transactions. The browser tests include two signed local-chain workflow/race cases. [Local transaction evidence](evidence/local-journey.json) identifies source hashes and ten verified workflow scenarios. These tests do not constitute a security audit or a Fuji contract deployment.

Initial production deployment on 11 October 2026: `dpl_Db9abQ133n8cobWfoguM8mcu3XhV`, reported READY and successfully aliased to the verified custom domain. Vercel records source commit `8d01bd329c1f5a0c0da26ae73a1fd0a56edfc349`. Subsequent source formatting and local evidence updates do not change application behavior. The immutable URL is https://yieldshield-avalanche-b4xquj7rp-noc2-6281s-projects.vercel.app (deployment protection remains enabled).

The public custom-domain browser check confirmed direct loading of protection, provider, trading, market/detail, position/detail, portfolio, activity, creation, faucet, assets, status, explanation, scenarios and legal routes. Every workflow remains visibly gated on Fuji deployment. Public desktop and phone layouts passed; the 390px phone viewport had a 375px content width with no page overflow. [Protection desktop](evidence/parity-protect-desktop.jpg) and [protection mobile](evidence/parity-protect-mobile.jpg).

Local browser review also verified invalid-pool rejection, missing-wallet feedback, wallet-context guards, and Protect → Trade → Faucet → Trade → Protect continuity with the selected wrapped asset and exact entered amount retained, including browser back/forward navigation. No real wallet extension was installed for the manual browser checks; native transaction proof is separately recorded.

This is a static Vite application. Build with `npm run build`, output `dist`. Hosting needs no server signer, API credential or database. `.vercelignore` excludes environment files, test signers, local manifests/build caches and private application drafts. `.env.local` and `.vercel/` are ignored local hosting metadata and must never be committed. Local-chain mode additionally requires Vite development mode and cannot activate in this production build. Existing deployment protection was retained; the custom production domain remains public.

Fuji contracts remain deliberately undeployed under the user's instruction to prepare for later. See [operations](OPERATIONS.md) for the explicit broadcast and verification procedure. The displayed reference price and local test receipts must not be described as a completed public-chain contract deployment.

Later documentation and screenshot commits do not alter the application source deployed above. Grant submissions remain on hold for user review.
