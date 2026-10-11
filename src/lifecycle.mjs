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

/** Captures input and component lifetime, including change-away-and-back sequences. */
export function createReviewScope() {
  let revision = 0,
    context = "",
    mounted = true;
  return {
    update(value) {
      if (context !== value) {
        context = value;
        revision++;
      }
    },
    mount() {
      mounted = true;
      revision++;
    },
    dispose() {
      mounted = false;
      revision++;
    },
    capture() {
      const captured = revision;
      return () => {
        if (!mounted || captured !== revision)
          throw new Error(
            "Wallet, market or amount changed, or you left this workflow. Review again.",
          );
      };
    },
  };
}
