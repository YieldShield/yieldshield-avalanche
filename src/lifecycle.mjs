/** Only the newest read may publish data; wallet changes also invalidate its lease. */
export function createLatestRead() {
  let revision = 0;
  return {
    begin() {
      const captured = ++revision;
      return () => captured === revision;
    },
    invalidate() {
      revision++;
    },
  };
}
