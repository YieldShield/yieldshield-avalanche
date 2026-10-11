import test from "node:test";
import assert from "node:assert/strict";
import { exitPreview, maxNewFloor, WAD } from "../src/math.mjs";
test("exits use only realized positive gains and precise units", () => {
  assert.deepEqual(exitPreview(WAD, 25_000000n, 50_000000n), {
    avaxOut: 940000000000000000n,
    fee: 60000000000000000n,
    backingOut: 25_000000n,
  });
  assert.equal(exitPreview(WAD, 25_000000n, 15_000000n).fee, 0n);
});
test("entry capacity is conservative under rounding", () => {
  assert.equal(maxNewFloor(1000_000000n, 100_000000n), 566666666n);
  assert.equal(maxNewFloor(100_000000n, 100_000000n), 0n);
});
test("invalid price cannot silently become a live quote", () => {
  assert.throws(() => exitPreview(WAD, 25_000000n, 0n));
});
