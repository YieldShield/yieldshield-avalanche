# Pilot security and economic limits

This is experimental testnet software and has not received an independent audit. The constructors enforce local chain31337 or Fuji43113 for the pool/demo token. It must not receive assets of monetary value.

## Enforced properties

- Immutable asset/oracle/recipient identities, six-decimal backing, non-reentrant asset-moving functions, exact backing transfer verification.
- Admission reserves 150% backing for aggregate entry floors; a protected backing exit has no live-oracle dependency.
- Price validation rejects stale/future/non-positive/incomplete feed rounds. The synthetic oracle is a separate address and market.
- Junior NAV entry and withdrawals stop during protected exposure. Without that restriction, a junior could withdraw before an underwater position settles and shift its loss to remaining juniors.
- Seven-day immutable market maturity, maximum100 positions, no admission during its final60seconds. Anyone can expire a position into its owner's segregated pull-based backing claim without owner cooperation.
- Junior redemption excludes unclaimed owner backing and proportionally pays both backing and surrendered AVAX inventory.
- Positive-gain fees only, no fees on negative AVAX price movement, caller-owned positions, minimum exit delay, slippage minimums, deposit deadline.

## Material risks and exclusions

The pilot intentionally gives up continuous junior entry/liquidity. A protected holder can keep the junior market locked until the end of its finite epoch. Forced expiry forfeits all AVAX upside beyond the fixed entry backing amount; this is displayed before deposit. Junior returns include directional AVAX inventory and may be lower than capital contributed. There is no fixed APY.

The reference oracle can stop deposits and AVAX exits if unavailable; this does not stop fixed backing exit/expiry/claim. The reference market uses aDEMO as a six-decimal test unit, not a claim that a stablecoin always trades at one USD. Future real USDC support must address issuer controls/depeg risk; sAVAX needs redemption-rate and executable-price distinctions.

Wallet RPC reliability, browser signing and authenticated faucet funding are external dependencies. Frontend signatures require the user's wallet. Internal tests do not prove economic viability, regulatory suitability, commercial demand or production safety. No bridge, leverage, upgradeability, guardian, admin rescue, token launch or external yield strategy is included.
