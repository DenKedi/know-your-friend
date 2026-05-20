import { useMemo } from "react";
import type { SlotConfig } from "@/lib/scene-config";

type MinimalPlayer = { id: string; name: string; isHost: boolean };

export type SlotAssignment<P extends MinimalPlayer = MinimalPlayer> = {
  slot: SlotConfig;
  player: P;
};

/**
 * Deterministic player → slot mapping based on join order.
 * The server appends new players to the end of `players[]`, so index N
 * is stable for player N across renders and reloads.
 *
 * Players beyond `slots.length` are dropped in Phase 1 (hard cap).
 */
export function usePlayerSlots<P extends MinimalPlayer>(
  players: readonly P[],
  slots: readonly SlotConfig[]
): SlotAssignment<P>[] {
  return useMemo(
    () =>
      players
        .slice(0, slots.length)
        .map((player, i) => ({ player, slot: slots[i] })),
    [players, slots]
  );
}
