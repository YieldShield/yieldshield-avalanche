# Avalanche demo hosting

The public interface is https://avalanche.yieldshield.ai. The dedicated Vercel project is `yieldshield-avalanche` (`prj_JasaGB0OBYNqmMWlPIv4zbs1I7jp`) in the existing YieldShield team. No existing chain application or domain was replaced.

Initial production deployment on 11 October 2026: `dpl_Db9abQ133n8cobWfoguM8mcu3XhV`, reported READY and successfully aliased to the verified custom domain. Vercel records source commit `8d01bd329c1f5a0c0da26ae73a1fd0a56edfc349`. Subsequent source formatting and local evidence updates do not change application behavior. The immutable URL is https://yieldshield-avalanche-b4xquj7rp-noc2-6281s-projects.vercel.app (deployment protection remains enabled).

The public custom-domain browser check confirmed the app renders without sign-in, the Fuji Chainlink reference is readable, the contract manifest shows deployment awaiting test gas, and market writes are unavailable. [Desktop evidence](evidence/public-desktop.jpg).

This is a static Vite application. Build with `npm run build`, output `dist`. Hosting needs no server signer, API credential or database. `.vercelignore` excludes environment files, test signers, local build caches and private application drafts. `.env.local` and `.vercel/` are ignored local hosting metadata and must never be committed.

Fuji contracts remain deliberately undeployed under the user's instruction to prepare for later. See [operations](OPERATIONS.md) for the explicit broadcast and verification procedure. The displayed reference price and local test receipts must not be described as a completed public-chain contract deployment.
