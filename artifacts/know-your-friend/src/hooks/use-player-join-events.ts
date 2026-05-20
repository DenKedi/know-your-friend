import { useEffect, useRef, useState } from "react";

/**
 * Returns the set of player IDs that should currently play their
 * "enter" animation. IDs are added when they first appear in `players`
 * and removed automatically after `durationMs`.
 *
 * On the very first render the entire current roster is treated as new
 * so existing players animate in when the lobby mounts.
 */
export function usePlayerJoinEvents(
  players: readonly { id: string }[],
  durationMs = 1200
): Set<string> {
  const [enteringIds, setEnteringIds] = useState<Set<string>>(new Set());
  const knownIdsRef = useRef<Set<string> | null>(null);

  useEffect(() => {
    const currentIds = new Set(players.map((p) => p.id));
    const known = knownIdsRef.current;
    const newlyJoined =
      known === null
        ? [...currentIds]
        : [...currentIds].filter((id) => !known.has(id));

    knownIdsRef.current = currentIds;
    if (newlyJoined.length === 0) return;

    setEnteringIds((prev) => {
      const next = new Set(prev);
      newlyJoined.forEach((id) => next.add(id));
      return next;
    });

    const timeout = setTimeout(() => {
      setEnteringIds((prev) => {
        const next = new Set(prev);
        newlyJoined.forEach((id) => next.delete(id));
        return next;
      });
    }, durationMs);

    return () => clearTimeout(timeout);
  }, [players, durationMs]);

  return enteringIds;
}
