import assert from "node:assert/strict";
import test, { type TestContext } from "node:test";

// The in-memory engine uses the category cache; no database connection is opened.
process.env["DATABASE_URL"] ??= "mongodb://127.0.0.1:27017/perfect-guess-tests";
process.env["NODE_ENV"] = "production";

const {
  cleanupRoom,
  createRoom,
  forceEndGuessing,
  getRoomStateForClient,
  joinRoom,
  selectCategory,
  startGame,
  submitGuess,
  submitSelfRating,
} = await import("../src/lib/game-engine");
const { GetRoomResponse } = await import("../../../lib/api-zod/src/generated/api");

function guessingRoom(t: TestContext, rating = 73, playerCount = 4) {
  const { room } = createRoom("Self-rater", 1, "en", "fox");
  t.after(() => cleanupRoom(room.code));
  for (let index = 1; index < playerCount; index += 1) {
    assert.ok(joinRoom(room.code, `Guesser ${index}`, "owl"));
  }
  assert.equal(startGame(room), true);
  assert.equal(selectCategory(room, room.currentAvailableCategories[0]!.id), true);
  assert.equal(submitSelfRating(room, rating, [10, 80, rating]), true);
  return room;
}

test("every exact guess earns 100 base + 50 bonus and updates the transmitted totals", (t) => {
  const room = guessingRoom(t);
  const [selfRater, first, second, nearMiss] = room.players;
  first!.score = 200;
  assert.equal(submitGuess(room, selfRater!.id, 73), false);
  assert.equal(submitGuess(room, first!.id, 73, [20, 73]), true);
  assert.equal(submitGuess(room, second!.id, 73, [90, 73]), true);
  assert.equal(room.status, "guessing");
  assert.equal(submitGuess(room, nearMiss!.id, 74), true);

  assert.equal(room.status, "round_results");
  assert.deepEqual(room.roundResults?.map(({ diff, points, bonusPoints }) => ({ diff, points, bonusPoints })), [
    { diff: 0, points: 150, bonusPoints: 50 },
    { diff: 0, points: 150, bonusPoints: 50 },
    { diff: 1, points: 98, bonusPoints: 0 },
  ]);
  assert.deepEqual(room.players.map((player) => player.score), [0, 350, 150, 98]);
  assert.deepEqual(room.roundResults?.[0]?.path, [20, 73]);
  assert.deepEqual(room.roundResults?.[0]?.selfRatingPath, [10, 80, 73]);

  const transmitted = GetRoomResponse.parse(getRoomStateForClient(room));
  assert.equal(transmitted.roundResults?.[0]?.bonusPoints, 50);
  assert.equal(transmitted.players[1]?.score, 350);
  // A duplicate submission or timer callback cannot award the round again.
  assert.equal(submitGuess(room, first!.id, 73), false);
  assert.equal(forceEndGuessing(room), false);
  assert.equal(first!.score, 350);
});

test("a timed-out guesser receives no bonus or result even when truth is the default 50", (t) => {
  const room = guessingRoom(t, 50, 3);
  const [, submitted, timedOut] = room.players;
  assert.equal(submitGuess(room, submitted!.id, 50), true);
  assert.equal(forceEndGuessing(room), true);
  assert.equal(room.timedOutGuessers.has(timedOut!.id), true);
  assert.deepEqual(room.roundResults?.map((result) => result.playerId), [submitted!.id]);
  assert.deepEqual(room.players.map((player) => player.score), [0, 150, 0]);
});

test("a recorded exact value does not award a player already flagged as timed out", (t) => {
  const room = guessingRoom(t, 50, 3);
  const [, submitted, timedOut] = room.players;
  room.guesses.set(timedOut!.id, 50);
  room.timedOutGuessers.add(timedOut!.id);
  assert.equal(submitGuess(room, submitted!.id, 50), true);
  assert.deepEqual(room.roundResults?.map((result) => result.playerId), [submitted!.id]);
  assert.equal(timedOut!.score, 0);
});

for (const [rating, guess, points, bonusPoints] of [
  [0, 0, 150, 50],
  [100, 100, 150, 50],
  [50, 49, 98, 0],
  [50, 75, 50, 0],
  [0, 100, 0, 0],
] as const) {
  test(`rating ${rating}, guess ${guess} awards ${points} points including ${bonusPoints} bonus`, (t) => {
    const room = guessingRoom(t, rating, 2);
    assert.equal(submitGuess(room, room.players[1]!.id, guess), true);
    assert.equal(room.roundResults?.[0]?.points, points);
    assert.equal(room.roundResults?.[0]?.bonusPoints, bonusPoints);
    assert.equal(room.players[1]?.score, points);
  });
}
