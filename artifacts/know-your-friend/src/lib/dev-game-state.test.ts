import assert from "node:assert/strict";
import test from "node:test";
import {
  applyDevAction,
  createInitialDevState,
  createPerfectGuessPreview,
  DEFAULT_DEV_CONFIG,
  jumpToPhase,
} from "./dev-game-state";

function guessingState(rating: number) {
  const state = createInitialDevState({ ...DEFAULT_DEV_CONFIG, playerNames: ["Self-rater", "Guesser"] });
  return { ...jumpToPhase(state, "guessing"), selfRating: rating };
}

for (const [rating, guess, points, bonusPoints] of [
  [73, 73, 150, 50],
  [0, 0, 150, 50],
  [100, 100, 150, 50],
  [73, 74, 98, 0],
  [50, 75, 50, 0],
  [0, 100, 0, 0],
] as const) {
  test(`dev scoring matches production: rating ${rating}, guess ${guess}`, () => {
    const state = guessingState(rating);
    const result = applyDevAction(state, { type: "submit_guess", guess, path: [50, guess] }, "p2");
    assert.equal(result.status, "round_results");
    assert.equal(result.roundResults?.[0]?.points, points);
    assert.equal(result.roundResults?.[0]?.bonusPoints, bonusPoints);
    assert.deepEqual(result.players.map((player) => player.score), [0, points]);
    assert.equal(applyDevAction(result, { type: "submit_guess", guess, path: [] }, "p2"), result);
  });
}

test("preview can produce no, one, multiple, or all perfect guesses with correct totals", () => {
  const state = createInitialDevState(DEFAULT_DEV_CONFIG);
  const before = structuredClone(state);
  for (const count of [0, 1, 2, Infinity]) {
    const preview = createPerfectGuessPreview(state, count);
    assert.equal(preview.roundResults?.filter((result) => result.bonusPoints === 50).length, Math.min(3, count));
    assert.equal(preview.roundResults?.some((result) => result.playerId === preview.currentPlayerId), false);
    for (const result of preview.roundResults ?? []) {
      assert.equal(preview.players.find((player) => player.id === result.playerId)?.score, result.points);
      assert.equal(result.path?.at(-1), result.guess);
      assert.equal(result.selfRatingPath?.at(-1), preview.selfRating);
    }
  }
  assert.deepEqual(state, before);
});

test("repeated previews replace awarded points and preserve the scores from previous rounds", () => {
  const state = createInitialDevState(DEFAULT_DEV_CONFIG);
  state.players = state.players.map((player, index) => ({ ...player, score: [300, 200, 100, 50][index]! }));
  const first = createPerfectGuessPreview(state, 2);
  const second = createPerfectGuessPreview(first, 2);
  const none = createPerfectGuessPreview(second, 0);
  const again = createPerfectGuessPreview(none, 2);
  assert.deepEqual(first.players.map((player) => player.score), [300, 350, 250, 110]);
  assert.deepEqual(second.players, first.players);
  assert.deepEqual(again.players, first.players);
});

test("regular result jumps award points once and can be replaced by perfect previews", () => {
  const state = createInitialDevState(DEFAULT_DEV_CONFIG);
  const regular = jumpToPhase(state, "round_results");
  for (const result of regular.roundResults ?? []) {
    assert.equal(regular.players.find((player) => player.id === result.playerId)?.score, result.points);
  }
  const perfect = createPerfectGuessPreview(regular, Infinity);
  assert.deepEqual(perfect.players.map((player) => player.score), [0, 150, 150, 150]);
});

test("preview retains the active self-rater and handles exact guesses at slider endpoints", () => {
  for (const rating of [0, 100]) {
    const state = { ...createInitialDevState(DEFAULT_DEV_CONFIG), currentPlayerId: "p2", selfRating: rating };
    const preview = createPerfectGuessPreview(state, 1);
    assert.equal(preview.currentPlayerId, "p2");
    assert.equal(preview.players.find((player) => player.id === "p2")?.score, 0);
    assert.equal(preview.roundResults?.filter((result) => result.diff === 0).length, 1);
    assert.equal(preview.roundResults?.[0]?.playerId, "p1");
  }
});
