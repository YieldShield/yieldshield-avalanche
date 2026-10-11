import test from "node:test";
import assert from "node:assert/strict";
import { createLatestRead } from "../src/lifecycle.mjs";
const deferred = () => {
  let resolve;
  const promise = new Promise((r) => {
    resolve = r;
  });
  return { promise, resolve };
};
test("late background reads cannot overwrite the confirmed position refresh", async () => {
  const gate = createLatestRead(),
    oldRead = deferred(),
    confirmedRead = deferred();
  let displayed = { balance: 0, openPositions: 0 },
    loading = false;
  const refresh = async (request) => {
    const current = gate.begin();
    loading = true;
    const data = await request.promise;
    if (current()) {
      displayed = data;
      loading = false;
    }
  };
  const beforeTx = refresh(oldRead),
    afterTx = refresh(confirmedRead);
  confirmedRead.resolve({ balance: 900, openPositions: 1 });
  await afterTx;
  oldRead.resolve({ balance: 1000, openPositions: 0 });
  await beforeTx;
  assert.deepEqual(displayed, { balance: 900, openPositions: 1 });
  assert.equal(loading, false);
});
