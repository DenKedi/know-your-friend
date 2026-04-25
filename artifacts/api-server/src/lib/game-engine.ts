import { randomBytes } from "crypto";
import { getCategories, type Category } from "./categories-store";

export type { Category };

export interface Player {
  id: string;
  name: string;
  score: number;
  isHost: boolean;
  token: string;
}

export interface GuessResult {
  playerId: string;
  playerName: string;
  guess: number;
  selfRating: number;
  diff: number;
  points: number;
}

export type GameStatus =
  | "waiting"
  | "category_selection"
  | "self_rating"
  | "guessing"
  | "round_results"
  | "game_over";

export interface Room {
  code: string;
  hostId: string;
  players: Player[];
  status: GameStatus;
  currentRound: number;
  totalRounds: number;
  currentPlayerIndex: number;
  currentCategory: Category | null;
  currentAvailableCategories: Category[];
  selfRating: number | null;
  guesses: Map<string, number>;
  roundResults: GuessResult[] | null;
  usedCategoryIds: Set<string>;
}


const rooms = new Map<string, Room>();

function generateCode(): string {
  return randomBytes(2).toString("hex").toUpperCase();
}

function generateId(): string {
  return randomBytes(8).toString("hex");
}

function generateToken(): string {
  return randomBytes(16).toString("hex");
}

function pickCategoriesForTurn(room: Room): void {
  const all = getCategories();
  let remaining = all.filter((c) => !room.usedCategoryIds.has(c.id));
  // If we've exhausted them all (e.g., long game), reset the used pool so the game can continue.
  if (remaining.length === 0) {
    room.usedCategoryIds = new Set();
    remaining = all;
  }
  const shuffled = [...remaining].sort(() => Math.random() - 0.5);
  room.currentAvailableCategories = shuffled.slice(0, Math.min(3, shuffled.length));
}

export function createRoom(hostName: string, totalRounds: number): { room: Room; player: Player } {
  let code: string;
  do {
    code = generateCode();
  } while (rooms.has(code));

  const hostId = generateId();
  const hostToken = generateToken();

  const host: Player = {
    id: hostId,
    name: hostName,
    score: 0,
    isHost: true,
    token: hostToken,
  };

  const room: Room = {
    code,
    hostId,
    players: [host],
    status: "waiting",
    currentRound: 0,
    totalRounds,
    currentPlayerIndex: 0,
    currentCategory: null,
    currentAvailableCategories: [],
    selfRating: null,
    guesses: new Map(),
    roundResults: null,
    usedCategoryIds: new Set(),
  };

  rooms.set(code, room);
  return { room, player: host };
}

export function joinRoom(
  roomCode: string,
  playerName: string
): { room: Room; player: Player } | null {
  const room = rooms.get(roomCode);
  if (!room) return null;
  if (room.status !== "waiting") return null;

  const playerId = generateId();
  const playerToken = generateToken();

  const player: Player = {
    id: playerId,
    name: playerName,
    score: 0,
    isHost: false,
    token: playerToken,
  };

  room.players.push(player);
  return { room, player };
}

export function getRoom(roomCode: string): Room | undefined {
  return rooms.get(roomCode);
}

export function getPlayerByToken(room: Room, token: string): Player | undefined {
  return room.players.find((p) => p.token === token);
}

export function startGame(room: Room): boolean {
  if (room.status !== "waiting") return false;
  if (room.players.length < 2) return false;

  room.status = "category_selection";
  room.currentRound = 1;
  room.currentPlayerIndex = 0;
  room.usedCategoryIds = new Set();
  pickCategoriesForTurn(room);
  return true;
}

export function selectCategory(room: Room, categoryId: string): boolean {
  if (room.status !== "category_selection") return false;

  const category = getCategories().find((c) => c.id === categoryId);
  if (!category) return false;

  room.currentCategory = category;
  room.usedCategoryIds.add(categoryId);
  room.status = "self_rating";
  room.selfRating = null;
  room.guesses = new Map();
  return true;
}

export function submitSelfRating(room: Room, rating: number): boolean {
  if (room.status !== "self_rating") return false;
  if (rating < 0 || rating > 100) return false;

  room.selfRating = rating;
  room.status = "guessing";
  return true;
}

export function submitGuess(room: Room, playerId: string, guess: number): boolean {
  if (room.status !== "guessing") return false;
  if (guess < 0 || guess > 100) return false;

  const currentPlayer = room.players[room.currentPlayerIndex];
  if (!currentPlayer || playerId === currentPlayer.id) return false;

  room.guesses.set(playerId, guess);

  const guessersCount = room.players.length - 1;
  if (room.guesses.size >= guessersCount) {
    computeRoundResults(room);
  }
  return true;
}

function computeRoundResults(room: Room): void {
  const selfRating = room.selfRating ?? 50;
  const results: GuessResult[] = [];

  for (const player of room.players) {
    const currentPlayer = room.players[room.currentPlayerIndex];
    if (!currentPlayer || player.id === currentPlayer.id) continue;

    const guess = room.guesses.get(player.id) ?? 50;
    const diff = Math.abs(guess - selfRating);
    const points = Math.max(0, 100 - diff * 2);

    player.score += points;
    results.push({
      playerId: player.id,
      playerName: player.name,
      guess,
      selfRating,
      diff,
      points,
    });
  }

  room.roundResults = results;
  room.status = "round_results";
}

export function nextTurn(room: Room): boolean {
  if (room.status !== "round_results") return false;

  const nextPlayerIndex = room.currentPlayerIndex + 1;

  if (nextPlayerIndex >= room.players.length) {
    if (room.currentRound >= room.totalRounds) {
      room.status = "game_over";
      return true;
    }
    room.currentRound += 1;
    room.currentPlayerIndex = 0;
  } else {
    room.currentPlayerIndex = nextPlayerIndex;
  }

  room.status = "category_selection";
  room.currentCategory = null;
  room.selfRating = null;
  room.guesses = new Map();
  room.roundResults = null;
  pickCategoriesForTurn(room);
  return true;
}

export function getRoomStateForClient(room: Room, _viewerPlayerId?: string) {
  const currentPlayer = room.players[room.currentPlayerIndex];

  // Determine who has and hasn't submitted (during guessing phase)
  const guessedPlayerIds = Array.from(room.guesses.keys());
  const pendingGuesserIds = room.players
    .filter((p) => p.id !== currentPlayer?.id && !room.guesses.has(p.id))
    .map((p) => p.id);

  // Who is the next rated player (the one taking the next turn)?
  const nextPlayerIndex = room.currentPlayerIndex + 1;
  const nextRatedPlayer =
    nextPlayerIndex < room.players.length
      ? room.players[nextPlayerIndex]
      : room.players[0];

  return {
    roomCode: room.code,
    status: room.status,
    players: room.players.map((p) => ({
      id: p.id,
      name: p.name,
      score: p.score,
      isHost: p.isHost,
    })),
    currentRound: room.currentRound,
    totalRounds: room.totalRounds,
    currentPlayerId: currentPlayer?.id ?? null,
    nextPlayerId: nextRatedPlayer?.id ?? null,
    currentCategory: room.currentCategory?.id ?? null,
    currentCategoryLabel: room.currentCategory?.label ?? null,
    currentCategoryLeftLabel: room.currentCategory?.leftLabel ?? null,
    currentCategoryRightLabel: room.currentCategory?.rightLabel ?? null,
    selfRating:
      room.status === "round_results" || room.status === "game_over"
        ? room.selfRating
        : null,
    guessesSubmitted: room.guesses.size,
    guessesTotal: Math.max(0, room.players.length - 1),
    guessedPlayerIds,
    pendingGuesserIds,
    roundResults: room.roundResults,
    availableCategories: room.currentAvailableCategories,
  };
}

export function cleanupRoom(roomCode: string): void {
  rooms.delete(roomCode);
}
