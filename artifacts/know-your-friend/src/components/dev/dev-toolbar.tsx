/**
 * Floating dev HUD – only visible when the game simulator is active.
 * Mounted inside <WouterRouter> so it can use useLocation for navigation.
 */

import { useState } from "react";
import { useLocation } from "wouter";
import { useDevGame } from "@/lib/dev-game-context";
import { DEV_ROOM_CODE } from "@/lib/dev-game-state";
import type { GameRoomState } from "@/lib/dev-game-state";

// ─── Phase metadata ───────────────────────────────────────────────────────────

const PHASES: { value: GameRoomState["status"]; label: string }[] = [
  { value: "waiting", label: "Lobby" },
  { value: "category_selection", label: "Category" },
  { value: "self_rating", label: "Self-Rate" },
  { value: "guessing", label: "Guessing" },
  { value: "round_results", label: "Results" },
  { value: "game_over", label: "Game Over" },
];

const PHASE_COLORS: Record<GameRoomState["status"], string> = {
  waiting: "bg-zinc-600",
  category_selection: "bg-blue-600",
  self_rating: "bg-amber-500",
  guessing: "bg-violet-600",
  round_results: "bg-emerald-600",
  game_over: "bg-rose-600",
};

// ─── Next-phase defaults ──────────────────────────────────────────────────────

/** Determine what message "Next Phase" should send for a given status. */
function getNextPhaseAction(
  status: GameRoomState["status"],
  availableCategories: GameRoomState["availableCategories"],
): Parameters<ReturnType<typeof useDevGame>["send"]>[0] | null {
  switch (status) {
    case "waiting":
      return { type: "start_game" };
    case "category_selection":
      return { type: "select_category", categoryId: availableCategories[0]?.id ?? "dev-c1" };
    case "self_rating":
      return { type: "submit_self_rating", rating: 50, path: [50, 80, 25, 60, 35, 50] };
    case "guessing":
      return { type: "submit_guess", guess: 50, path: [50, 25, 70, 40, 55, 50] };
    case "round_results":
      return { type: "next_turn" };
    case "game_over":
      return null;
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

export function DevToolbar() {
  const { isDevMode, devState, send, jumpTo, stopDevMode, setViewingAs, viewingAsId } =
    useDevGame();
  const [, navigate] = useLocation();
  const [expanded, setExpanded] = useState(true);

  if (!isDevMode || !devState) return null;

  const status = devState.status;
  const phaseColor = PHASE_COLORS[status];
  const nextAction = getNextPhaseAction(status, devState.availableCategories);
  const roundDisplay = `${devState.currentRound} / ${devState.totalRounds}`;

  const handleNextPhase = () => {
    if (nextAction) send(nextAction);
  };

  const handleJumpTo = (phase: GameRoomState["status"]) => {
    jumpTo(phase);
    // Navigate to the appropriate page
    if (phase === "waiting") {
      navigate(`/room/${DEV_ROOM_CODE}/lobby`);
    } else if (phase === "game_over") {
      navigate(`/room/${DEV_ROOM_CODE}/results`);
    } else {
      navigate(`/room/${DEV_ROOM_CODE}/game`);
    }
  };

  const handleViewAs = (playerId: string) => {
    setViewingAs(playerId);
    // Force page re-mount so it re-reads sessionStorage
    const [currentPath] = [window.location.pathname];
    navigate("/");
    requestAnimationFrame(() => navigate(currentPath));
  };

  const handleReset = () => {
    stopDevMode();
    navigate("/dev");
  };

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-[100] font-mono text-xs select-none"
      style={{ fontFamily: "ui-monospace, monospace" }}
    >
      {/* Expand/collapse handle */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="absolute -top-5 left-1/2 -translate-x-1/2 bg-zinc-900/90 border border-zinc-700 text-zinc-400 px-3 py-0.5 rounded-t text-[10px] font-bold hover:text-white transition-colors"
      >
        {expanded ? "▼ DEV" : "▲ DEV"}
      </button>

      {expanded && (
        <div className="bg-zinc-900/95 border-t border-zinc-700 backdrop-blur-sm px-3 py-2 flex flex-wrap items-center gap-2">
          {/* Phase badge */}
          <span
            className={`${phaseColor} text-white font-bold px-2.5 py-1 rounded text-[10px] uppercase tracking-wider shrink-0`}
          >
            {PHASES.find((p) => p.value === status)?.label ?? status}
          </span>

          {/* Round counter */}
          <span className="text-zinc-400 shrink-0">
            Round <span className="text-white font-bold">{roundDisplay}</span>
          </span>

          {/* ── Actions ── */}

          {/* Next Phase */}
          <button
            onClick={handleNextPhase}
            disabled={!nextAction}
            className="bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white px-2.5 py-1 rounded font-bold transition-colors shrink-0"
          >
            ▶ Next Phase
          </button>

          {/* Jump to dropdown */}
          <select
            onChange={(e) => handleJumpTo(e.target.value as GameRoomState["status"])}
            value={status}
            className="bg-zinc-800 border border-zinc-600 text-zinc-200 px-2 py-1 rounded text-[11px] cursor-pointer shrink-0"
          >
            {PHASES.map((p) => (
              <option key={p.value} value={p.value}>
                Jump → {p.label}
              </option>
            ))}
          </select>

          {/* View As */}
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-zinc-400">View as</span>
            <select
              value={viewingAsId}
              onChange={(e) => handleViewAs(e.target.value)}
              className="bg-zinc-800 border border-zinc-600 text-zinc-200 px-2 py-1 rounded text-[11px] cursor-pointer"
            >
              {devState.players.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.isHost ? "(host)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Separator */}
          <div className="hidden sm:block h-4 w-px bg-zinc-700 mx-1" />

          {/* Quick phase shortcuts */}
          <div className="hidden sm:flex gap-1">
            {PHASES.map((p) => (
              <button
                key={p.value}
                onClick={() => handleJumpTo(p.value)}
                className={`px-2 py-0.5 rounded text-[10px] font-bold transition-colors ${
                  status === p.value
                    ? `${PHASE_COLORS[p.value]} text-white`
                    : "bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Reset */}
          <button
            onClick={handleReset}
            className="ml-auto bg-rose-900/60 hover:bg-rose-800/70 border border-rose-700/50 text-rose-300 px-2.5 py-1 rounded font-bold transition-colors shrink-0"
          >
            ✕ Reset
          </button>
        </div>
      )}
    </div>
  );
}
