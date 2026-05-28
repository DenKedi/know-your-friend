/**
 * Dev-mode game state machine.
 * Runs the full game loop in-browser without a WebSocket / backend.
 * Only imported in DEV builds via dev-game-context.tsx.
 */

import type { RoomState, GuessResult } from "@workspace/api-client-react";

// ─── Shared type mirrors (avoids circular import with use-game-socket) ────────

export type GameRoomState = RoomState & {
  nextPlayerId?: string | null;
  rerollUsedThisTurn?: boolean;
  pendingGuesserIds?: string[];
  guessedPlayerIds?: string[];
  phaseDeadline?: number | null;
};

export type OutgoingMessage =
  | { type: "start_game" }
  | { type: "select_category"; categoryId: string }
  | { type: "submit_self_rating"; rating: number; path: number[] }
  | { type: "submit_guess"; guess: number; path: number[] }
  | { type: "next_turn" }
  | { type: "reroll_categories" }
  | { type: "end_game_early" }
  | { type: "leave_room" }
  | { type: "set_rounds_per_player"; roundsPerPlayer: number };

// ─── Config ───────────────────────────────────────────────────────────────────

export const DEV_ROOM_CODE = "DEV1";

export interface DevGameConfig {
  playerNames: string[];
  roundsPerPlayer: number;
  language: "en" | "de";
}

export const DEFAULT_DEV_CONFIG: DevGameConfig = {
  playerNames: ["Alice", "Bob", "Carol", "Dave"],
  roundsPerPlayer: 3,
  language: "en",
};

// ─── Mock categories ──────────────────────────────────────────────────────────

const CATS_A = [
  { id: "dev-c1", label: "Introversion vs. Extraversion", leftLabel: "Introvert", rightLabel: "Extravert" },
  { id: "dev-c2", label: "Risk Tolerance", leftLabel: "Risk-Averse", rightLabel: "Risk-Taker" },
  { id: "dev-c3", label: "Punctuality", leftLabel: "Always Late", rightLabel: "Always Early" },
];

const CATS_B = [
  { id: "dev-c4", label: "Tidiness", leftLabel: "Messy", rightLabel: "Very Tidy" },
  { id: "dev-c5", label: "Adventurousness", leftLabel: "Homebody", rightLabel: "Adventure-Seeker" },
  { id: "dev-c6", label: "Night Owl vs. Early Bird", leftLabel: "Night Owl", rightLabel: "Early Bird" },
];

const ALL_CATS = [...CATS_A, ...CATS_B];

function catById(id: string) {
  return ALL_CATS.find((c) => c.id === id) ?? CATS_A[0]!;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Stash for the current round's self-rating path so we can echo it into round_results.
let devSelfRatingPath: number[] = [];

function computeResults(
  state: GameRoomState,
  realGuesserId: string,
  realGuess: number,
  realGuessPath: number[] = [],
  selfRatingPath: number[] = [],
): GuessResult[] {
  const selfRating = state.selfRating ?? 50;
  const guessers = state.players.filter((p) => p.id !== state.currentPlayerId);
  return guessers.map((p) => {
    const guess =
      p.id === realGuesserId
        ? realGuess
        : randomInt(Math.max(0, selfRating - 35), Math.min(100, selfRating + 35));
    const diff = Math.abs(guess - selfRating);
    const points = Math.max(0, 100 - diff * 2);
    // Synthesize a believable drag path for mock players so the result animation has variety.
    const path =
      p.id === realGuesserId
        ? realGuessPath
        : [guess > 50 ? 20 : 80, guess > 50 ? 70 : 30, guess > 50 ? 40 : 60, guess];
    return {
      playerId: p.id,
      playerName: p.name,
      guess,
      selfRating,
      diff,
      points,
      path,
      selfRatingPath,
    };
  });
}

function awardPoints(
  players: GameRoomState["players"],
  results: GuessResult[],
): GameRoomState["players"] {
  return players.map((p) => {
    const r = results.find((r) => r.playerId === p.id);
    return r ? { ...p, score: p.score + r.points } : p;
  });
}

// ─── Factory ──────────────────────────────────────────────────────────────────

export function createInitialDevState(config: DevGameConfig): GameRoomState {
  const players = config.playerNames.map((name, i) => ({
    id: `p${i + 1}`,
    name,
    score: 0,
    isHost: i === 0,
  }));

  return {
    roomCode: DEV_ROOM_CODE,
    language: config.language,
    status: "waiting",
    players,
    currentRound: 1,
    totalRounds: config.roundsPerPlayer * players.length,
    roundsPerPlayer: config.roundsPerPlayer,
    currentPlayerId: null,
    currentCategory: null,
    currentCategoryLabel: null,
    currentCategoryLeftLabel: null,
    currentCategoryRightLabel: null,
    selfRating: null,
    guessesSubmitted: 0,
    guessesTotal: 0,
    roundResults: null,
    availableCategories: [],
    // GameRoomState extras
    nextPlayerId: null,
    rerollUsedThisTurn: false,
    pendingGuesserIds: [],
    guessedPlayerIds: [],
    phaseDeadline: null,
  };
}

// ─── Jump to phase (bypass state machine) ────────────────────────────────────

export function jumpToPhase(
  state: GameRoomState,
  targetPhase: GameRoomState["status"],
): GameRoomState {
  const cat = CATS_A[0]!;
  const selfRating = 65;

  const base = {
    rerollUsedThisTurn: false,
    pendingGuesserIds: [] as string[],
    guessedPlayerIds: [] as string[],
    phaseDeadline: null as number | null,
  };

  switch (targetPhase) {
    case "waiting":
      return {
        ...state,
        ...base,
        status: "waiting",
        currentPlayerId: null,
        nextPlayerId: null,
        currentCategory: null,
        currentCategoryLabel: null,
        currentCategoryLeftLabel: null,
        currentCategoryRightLabel: null,
        selfRating: null,
        guessesSubmitted: 0,
        guessesTotal: 0,
        roundResults: null,
        availableCategories: [],
        currentRound: 1,
        players: state.players.map((p) => ({ ...p, score: 0 })),
      };

    case "category_selection":
      return {
        ...state,
        ...base,
        status: "category_selection",
        currentPlayerId: state.players[0]?.id ?? null,
        nextPlayerId: state.players[1]?.id ?? null,
        availableCategories: CATS_A,
        currentCategory: null,
        currentCategoryLabel: null,
        currentCategoryLeftLabel: null,
        currentCategoryRightLabel: null,
        selfRating: null,
        guessesSubmitted: 0,
        guessesTotal: 0,
        roundResults: null,
      };

    case "self_rating":
      return {
        ...state,
        ...base,
        status: "self_rating",
        currentPlayerId: state.players[0]?.id ?? null,
        nextPlayerId: state.players[1]?.id ?? null,
        availableCategories: CATS_A,
        currentCategory: cat.id,
        currentCategoryLabel: cat.label,
        currentCategoryLeftLabel: cat.leftLabel,
        currentCategoryRightLabel: cat.rightLabel,
        selfRating: null,
        guessesSubmitted: 0,
        guessesTotal: state.players.length - 1,
        roundResults: null,
        phaseDeadline: Date.now() + 60_000,
      };

    case "guessing":
      return {
        ...state,
        ...base,
        status: "guessing",
        currentPlayerId: state.players[0]?.id ?? null,
        nextPlayerId: state.players[1]?.id ?? null,
        availableCategories: CATS_A,
        currentCategory: cat.id,
        currentCategoryLabel: cat.label,
        currentCategoryLeftLabel: cat.leftLabel,
        currentCategoryRightLabel: cat.rightLabel,
        selfRating,
        guessesSubmitted: 0,
        guessesTotal: state.players.length - 1,
        roundResults: null,
        pendingGuesserIds: state.players.slice(1).map((p) => p.id),
        phaseDeadline: Date.now() + 60_000,
      };

    case "round_results": {
      const mockSelfRatingPath = [30, 70, 50, selfRating];
      const results = computeResults(
        { ...state, selfRating, currentPlayerId: state.players[0]?.id ?? null },
        state.players[1]?.id ?? "",
        selfRating - 10,
        [25, 70, 40, 55, selfRating - 10],
        mockSelfRatingPath,
      );
      return {
        ...state,
        ...base,
        status: "round_results",
        currentPlayerId: state.players[0]?.id ?? null,
        nextPlayerId: state.players[1]?.id ?? null,
        availableCategories: CATS_A,
        currentCategory: cat.id,
        currentCategoryLabel: cat.label,
        currentCategoryLeftLabel: cat.leftLabel,
        currentCategoryRightLabel: cat.rightLabel,
        selfRating,
        guessesSubmitted: state.players.length - 1,
        guessesTotal: state.players.length - 1,
        roundResults: results,
        guessedPlayerIds: state.players.slice(1).map((p) => p.id),
      };
    }

    case "game_over": {
      const mockScores = [120, 85, 60, 40, 25, 15, 8, 0];
      return {
        ...state,
        ...base,
        status: "game_over",
        currentPlayerId: null,
        nextPlayerId: null,
        roundResults: null,
        players: state.players.map((p, i) => ({ ...p, score: mockScores[i] ?? 0 })),
      };
    }

    default:
      return state;
  }
}

// ─── State machine ────────────────────────────────────────────────────────────

/**
 * Process a single outgoing message and return the next dev state.
 * @param viewingAsId - the player ID the dev is currently viewing as (for guess attribution)
 */
export function applyDevAction(
  state: GameRoomState,
  message: OutgoingMessage,
  viewingAsId = "p1",
): GameRoomState {
  switch (message.type) {
    case "start_game": {
      if (state.status !== "waiting") return state;
      return {
        ...state,
        status: "category_selection",
        currentPlayerId: state.players[0]?.id ?? null,
        nextPlayerId: state.players[1]?.id ?? null,
        availableCategories: CATS_A,
        rerollUsedThisTurn: false,
        currentRound: 1,
      };
    }

    case "select_category": {
      if (state.status !== "category_selection") return state;
      const cat = catById(message.categoryId);
      return {
        ...state,
        status: "self_rating",
        currentCategory: cat.id,
        currentCategoryLabel: cat.label,
        currentCategoryLeftLabel: cat.leftLabel,
        currentCategoryRightLabel: cat.rightLabel,
        selfRating: null,
        phaseDeadline: Date.now() + 60_000,
      };
    }

    case "submit_self_rating": {
      if (state.status !== "self_rating") return state;
      devSelfRatingPath = message.path;
      const guessers = state.players.filter((p) => p.id !== state.currentPlayerId);
      return {
        ...state,
        status: "guessing",
        selfRating: message.rating,
        guessesSubmitted: 0,
        guessesTotal: guessers.length,
        pendingGuesserIds: guessers.map((p) => p.id),
        guessedPlayerIds: [],
        phaseDeadline: Date.now() + 60_000,
      };
    }

    case "submit_guess": {
      if (state.status !== "guessing") return state;
      // All fake players auto-guess → immediately go to round_results
      const results = computeResults(state, viewingAsId, message.guess, message.path, devSelfRatingPath);
      const updatedPlayers = awardPoints(state.players, results);
      return {
        ...state,
        status: "round_results",
        guessesSubmitted: state.guessesTotal,
        roundResults: results,
        players: updatedPlayers,
        guessedPlayerIds: state.players
          .filter((p) => p.id !== state.currentPlayerId)
          .map((p) => p.id),
        pendingGuesserIds: [],
        phaseDeadline: null,
      };
    }

    case "next_turn": {
      if (state.status !== "round_results") return state;
      const idx = state.players.findIndex((p) => p.id === state.currentPlayerId);
      const nextIdx = (idx + 1) % state.players.length;
      const newRound = state.currentRound + (nextIdx === 0 ? 1 : 0);

      if (newRound > state.totalRounds) {
        return {
          ...state,
          status: "game_over",
          currentPlayerId: null,
          nextPlayerId: null,
          roundResults: null,
        };
      }

      return {
        ...state,
        status: "category_selection",
        currentPlayerId: state.players[nextIdx]!.id,
        nextPlayerId: state.players[(nextIdx + 1) % state.players.length]?.id ?? null,
        currentRound: newRound,
        currentCategory: null,
        currentCategoryLabel: null,
        currentCategoryLeftLabel: null,
        currentCategoryRightLabel: null,
        selfRating: null,
        guessesSubmitted: 0,
        guessesTotal: 0,
        roundResults: null,
        availableCategories: CATS_A,
        rerollUsedThisTurn: false,
        pendingGuesserIds: [],
        guessedPlayerIds: [],
        phaseDeadline: null,
      };
    }

    case "reroll_categories": {
      if (state.rerollUsedThisTurn) return state;
      return {
        ...state,
        availableCategories: CATS_B,
        rerollUsedThisTurn: true,
      };
    }

    case "end_game_early": {
      return {
        ...state,
        status: "game_over",
        currentPlayerId: null,
        nextPlayerId: null,
        roundResults: null,
      };
    }

    case "set_rounds_per_player": {
      const rpp = message.roundsPerPlayer;
      return {
        ...state,
        roundsPerPlayer: rpp,
        totalRounds: rpp * state.players.length,
      };
    }

    default:
      return state;
  }
}
