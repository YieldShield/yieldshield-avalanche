/** Exact integer accounting, matching the immutable pool. */
export const WAD = 10n ** 18n;
export function exitPreview(amount, floor, price) {
  if (amount < 0n || floor < 0n || price <= 0n) throw new Error('Invalid quote');
  const value = amount * price / WAD;
  const gain = value > floor ? (value - floor) * WAD / price : 0n;
  const junior = gain * 1000n / 10000n;
  const recipient = gain * 100n / 10000n;
  return { avaxOut: amount - junior - 2n * recipient, fee: junior + 2n * recipient, backingOut: floor };
}
export function maxNewFloor(backing, reserved) {
  const maximum = backing * 10000n / 15000n;
  return maximum > reserved ? maximum - reserved : 0n;
}
export function safeError(error) {
  const message = error?.shortMessage || error?.message || 'The request could not be completed.';
  return message.replace(/0x[a-fA-F0-9]{128,}/g, '[transaction data]').slice(0, 280);
}
