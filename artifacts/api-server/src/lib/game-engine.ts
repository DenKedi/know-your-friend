import { randomBytes } from "crypto";

export interface Category {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
}

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

export const CATEGORIES: Category[] = [
  { id: "ordentlich", label: "Ordentlichkeit", leftLabel: "Messie", rightLabel: "Ordnungsqueen" },
  { id: "puenktlich", label: "Pünktlichkeit", leftLabel: "Chronisch zu spät", rightLabel: "Immer pünktlich" },
  { id: "sportlich", label: "Sportlichkeit", leftLabel: "Couchpotato", rightLabel: "Fitnessjunkie" },
  { id: "gespraechig", label: "Gesprächigkeit", leftLabel: "Schweiger", rightLabel: "Redet ohne Pause" },
  { id: "risikofreudig", label: "Risikobereitschaft", leftLabel: "Supersicher", rightLabel: "Adrenalin-Junkie" },
  { id: "romantisch", label: "Romantik", leftLabel: "Pragmatiker", rightLabel: "Hopeless Romantic" },
  { id: "humorvoll", label: "Humor", leftLabel: "Stockernst", rightLabel: "Comedian" },
  { id: "kreativ", label: "Kreativität", leftLabel: "Pragmatiker", rightLabel: "Superkreativ" },
  { id: "ehrgeizig", label: "Ehrgeiz", leftLabel: "Entspannt", rightLabel: "Workaholic" },
  { id: "offen", label: "Offenheit", leftLabel: "Geheimniskrämer", rightLabel: "Offenes Buch" },
  { id: "sparsam", label: "Sparsamkeit", leftLabel: "Lebemann", rightLabel: "Sparfuchs" },
  { id: "technikaffin", label: "Technikaffinität", leftLabel: "Analog-Liebhaber", rightLabel: "Tech-Nerd" },
  { id: "sozial", label: "Geselligkeit", leftLabel: "Einsiedler", rightLabel: "Partylöwe" },
  { id: "optimistisch", label: "Lebenseinstellung", leftLabel: "Pessimist", rightLabel: "Optimist" },
  { id: "musikgeschmack", label: "Musikwissen", leftLabel: "Kennt nur Hits", rightLabel: "Musikenzyklopädie" },
];

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
  const remaining = CATEGORIES.filter((c) => !room.usedCategoryIds.has(c.id));
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

  const category = CATEGORIES.find((c) => c.id === categoryId);
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

export function getRoomStateForClient(room: Room, viewerPlayerId?: string) {
  const currentPlayer = room.players[room.currentPlayerIndex];

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
    currentCategory: room.currentCategory?.id ?? null,
    currentCategoryLabel: room.currentCategory?.label ?? null,
    currentCategoryLeftLabel: room.currentCategory?.leftLabel ?? null,
    currentCategoryRightLabel: room.currentCategory?.rightLabel ?? null,
    selfRating: room.status === "round_results" || room.status === "game_over" ? room.selfRating : null,
    guessesSubmitted: room.guesses.size,
    guessesTotal: Math.max(0, room.players.length - 1),
    roundResults: room.roundResults,
    availableCategories: room.currentAvailableCategories,
  };
}

export function cleanupRoom(roomCode: string): void {
  rooms.delete(roomCode);
}
