/**
 * Central gameplay configuration.
 *
 * All tunable game-feel constants live here so it is easy to experiment
 * with different presets without hunting through multiple files.
 *
 * To test a different "version", duplicate the GAMEPLAY_CONFIG export below,
 * give it a descriptive name (e.g. FAST_CONFIG), and swap the import in
 * game-engine.ts / ws-handler.ts.
 */

export interface GameplayConfig {
  // ── Timer durations ────────────────────────────────────────────────────
  /** How long the active player has to set their self-rating slider (ms). */
  SELF_RATING_TIMEOUT_MS: number;
  /** How long each guesser has to submit their guess (ms). */
  GUESSING_TIMEOUT_MS: number;

  // ── Room defaults ──────────────────────────────────────────────────────
  /** Minimum players required to start a game. */
  MIN_PLAYERS_TO_START: number;
  /** Maximum players allowed in a single room. */
  MAX_PLAYERS: number;

  // ── Category selection ─────────────────────────────────────────────────
  /** Number of categories presented to the active player each turn. */
  CATEGORIES_PER_TURN: number;

  // ── Scoring ────────────────────────────────────────────────────────────
  /** Maximum points awarded for a perfect guess (diff = 0). */
  MAX_POINTS_PER_ROUND: number;
  /** Points deducted per absolute unit of distance from the truth. */
  POINTS_PER_DIFF_UNIT: number;

  // ── Slider defaults ────────────────────────────────────────────────────
  /** Value that is automatically submitted when a phase timer expires. */
  DEFAULT_SLIDER_VALUE: number;
}

/** Standard 60-second-per-phase configuration (production default). */
export const GAMEPLAY_CONFIG: GameplayConfig = {
  SELF_RATING_TIMEOUT_MS: 60_000,
  GUESSING_TIMEOUT_MS: 60_000,

  MIN_PLAYERS_TO_START: 2,
  MAX_PLAYERS: 8,

  CATEGORIES_PER_TURN: 3,

  MAX_POINTS_PER_ROUND: 100,
  POINTS_PER_DIFF_UNIT: 2,

  DEFAULT_SLIDER_VALUE: 50,
};

/** Fast 20-second config – useful for local testing / demos. */
export const FAST_CONFIG: GameplayConfig = {
  ...GAMEPLAY_CONFIG,
  SELF_RATING_TIMEOUT_MS: 20_000,
  GUESSING_TIMEOUT_MS: 20_000,
};
