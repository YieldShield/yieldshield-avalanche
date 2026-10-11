import { useRef } from "react";
/** A late RPC response must never revive a review for changed inputs or wallet. */
export function useReviewGuard(values: unknown[]) {
  const revision = useRef("");
  revision.current = JSON.stringify(values);
  return () => {
    const captured = revision.current;
    return () => {
      if (revision.current !== captured)
        throw new Error("Wallet, market or amount changed. Review again.");
    };
  };
}
