import type { WebSocket } from "ws";
import { WebSocketServer } from "ws";
import type { IncomingMessage } from "http";
import { logger } from "./logger";
import {
  getRoom,
  getPlayerByToken,
  startGame,
  selectCategory,
  submitSelfRating,
  submitGuess,
  nextTurn,
  rerollCategories,
  endGameAfterCurrentRound,
  leaveRoom,
  getRoomStateForClient,
} from "./game-engine";
import { GAMEPLAY_CONFIG } from "./gameplay-config";

const roomClients = new Map<string, Map<string, WebSocket>>();

// ── Phase timers ───────────────────────────────────────────────────────────
const roomTimers = new Map<string, ReturnType<typeof setTimeout>>();

function clearRoomTimer(roomCode: string): void {
  const id = roomTimers.get(roomCode);
  if (id !== undefined) {
    clearTimeout(id);
    roomTimers.delete(roomCode);
  }
}

/**
 * Schedule an auto-submit timer for the current phase of a room.
 * Called after every phase transition – clears any existing timer and sets
 * a new one that matches the current phase.
 */
function schedulePhaseTimer(roomCode: string): void {
  clearRoomTimer(roomCode);

  const room = getRoom(roomCode);
  if (!room || !room.phaseDeadline) return;

  const delayMs = Math.max(0, room.phaseDeadline - Date.now());

  if (room.status === "self_rating") {
    roomTimers.set(
      roomCode,
      setTimeout(() => {
        const r = getRoom(roomCode);
        if (!r || r.status !== "self_rating") return;
        logger.info({ roomCode }, "self_rating timer expired – auto-submitting");
        submitSelfRating(r, GAMEPLAY_CONFIG.DEFAULT_SLIDER_VALUE);
        broadcastState(roomCode);
        schedulePhaseTimer(roomCode); // transition to guessing → schedule guessing timer
      }, delayMs),
    );
  } else if (room.status === "guessing") {
    roomTimers.set(
      roomCode,
      setTimeout(() => {
        const r = getRoom(roomCode);
        if (!r || r.status !== "guessing") return;
        logger.info({ roomCode }, "guessing timer expired – auto-submitting remaining players");
        const currentPlayer = r.players[r.currentPlayerIndex];
        for (const player of r.players) {
          if (player.id === currentPlayer?.id) continue;
          if (!r.guesses.has(player.id)) {
            submitGuess(r, player.id, GAMEPLAY_CONFIG.DEFAULT_SLIDER_VALUE);
            if (r.status !== "guessing") break; // computeRoundResults finished early
          }
        }
        broadcastState(roomCode);
      }, delayMs),
    );
  }
}

function broadcastToRoom(roomCode: string, message: unknown): void {
  const clients = roomClients.get(roomCode);
  if (!clients) return;
  const payload = JSON.stringify(message);
  for (const [, ws] of clients) {
    if (ws.readyState === 1) {
      ws.send(payload);
    }
  }
}

function sendState(ws: WebSocket, roomCode: string, viewerPlayerId?: string): void {
  const room = getRoom(roomCode);
  if (!room) {
    ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
    return;
  }
  ws.send(JSON.stringify({ type: "state", state: getRoomStateForClient(room, viewerPlayerId) }));
}

function broadcastState(roomCode: string): void {
  const room = getRoom(roomCode);
  if (!room) return;
  const state = getRoomStateForClient(room);
  broadcastToRoom(roomCode, { type: "state", state });
}

export function attachWebSocketServer(wss: WebSocketServer): void {
  wss.on("connection", (ws: WebSocket, req: IncomingMessage) => {
    const url = new URL(req.url ?? "", `http://localhost`);
    const roomCode = url.searchParams.get("roomCode");
    const playerToken = url.searchParams.get("playerToken");

    if (!roomCode || !playerToken) {
      ws.send(JSON.stringify({ type: "error", message: "Missing roomCode or playerToken" }));
      ws.close();
      return;
    }

    const room = getRoom(roomCode);
    if (!room) {
      ws.send(JSON.stringify({ type: "error", message: "Room not found" }));
      ws.close();
      return;
    }

    const player = getPlayerByToken(room, playerToken);
    if (!player) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid token" }));
      ws.close();
      return;
    }

    if (!roomClients.has(roomCode)) {
      roomClients.set(roomCode, new Map());
    }
    roomClients.get(roomCode)!.set(player.id, ws);

    logger.info({ roomCode, playerId: player.id, playerName: player.name }, "Player connected");

    sendState(ws, roomCode, player.id);

    broadcastToRoom(roomCode, {
      type: "state",
      state: getRoomStateForClient(room, player.id),
    });

    ws.on("message", (raw) => {
      let msg: { type: string; [key: string]: unknown };
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
        return;
      }

      const currentRoom = getRoom(roomCode);
      if (!currentRoom) {
        ws.send(JSON.stringify({ type: "error", message: "Room no longer exists" }));
        return;
      }

      const currentPlayer = getPlayerByToken(currentRoom, playerToken);
      if (!currentPlayer) {
        ws.send(JSON.stringify({ type: "error", message: "Player not found" }));
        return;
      }

      const activeTurnPlayer = currentRoom.players[currentRoom.currentPlayerIndex];

      switch (msg.type) {
        case "start_game": {
          if (!currentPlayer.isHost) {
            ws.send(JSON.stringify({ type: "error", message: "Only the host can start the game" }));
            return;
          }
          const ok = startGame(currentRoom);
          if (!ok) {
            ws.send(JSON.stringify({ type: "error", message: "Cannot start game" }));
            return;
          }
          broadcastState(roomCode);
          break;
        }
        case "select_category": {
          if (activeTurnPlayer?.id !== currentPlayer.id) {
            ws.send(JSON.stringify({ type: "error", message: "Not your turn" }));
            return;
          }
          const categoryId = typeof msg.categoryId === "string" ? msg.categoryId : "";
          const ok = selectCategory(currentRoom, categoryId);
          if (!ok) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid category" }));
            return;
          }
          broadcastState(roomCode);
          schedulePhaseTimer(roomCode);
          break;
        }
        case "submit_self_rating": {
          if (activeTurnPlayer?.id !== currentPlayer.id) {
            ws.send(JSON.stringify({ type: "error", message: "Not your turn" }));
            return;
          }
          const rating = typeof msg.rating === "number" ? msg.rating : -1;
          const ok = submitSelfRating(currentRoom, rating);
          if (!ok) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid rating" }));
            return;
          }
          broadcastState(roomCode);
          schedulePhaseTimer(roomCode);
          break;
        }
        case "submit_guess": {
          if (activeTurnPlayer?.id === currentPlayer.id) {
            ws.send(JSON.stringify({ type: "error", message: "You cannot guess your own rating" }));
            return;
          }
          const guess = typeof msg.guess === "number" ? msg.guess : -1;
          const ok = submitGuess(currentRoom, currentPlayer.id, guess);
          if (!ok) {
            ws.send(JSON.stringify({ type: "error", message: "Invalid guess or already submitted" }));
            return;
          }
          broadcastState(roomCode);
          break;
        }
        case "next_turn": {
          // If someone else already advanced the turn (race condition where
          // multiple players hit "Weiter" at once), silently ignore instead
          // of showing a misleading "Cannot advance turn" error.
          if (currentRoom.status !== "round_results") {
            return;
          }
          const ok = nextTurn(currentRoom);
          if (!ok) {
            return;
          }
          broadcastState(roomCode);
          clearRoomTimer(roomCode);
          break;
        }
        case "reroll_categories": {
          if (activeTurnPlayer?.id !== currentPlayer.id) {
            ws.send(JSON.stringify({ type: "error", message: "Nur der aktuelle Spieler kann neu würfeln" }));
            return;
          }
          const ok = rerollCategories(currentRoom);
          if (!ok) {
            ws.send(JSON.stringify({ type: "error", message: "Du hast in dieser Runde schon neu gewürfelt" }));
            return;
          }
          broadcastState(roomCode);
          break;
        }
        case "end_game_early": {
          if (!currentPlayer.isHost) {
            ws.send(JSON.stringify({ type: "error", message: "Nur der Host kann das Spiel abkürzen" }));
            return;
          }
          const ok = endGameAfterCurrentRound(currentRoom);
          if (!ok) {
            ws.send(JSON.stringify({ type: "error", message: "Spiel kann gerade nicht abgekürzt werden" }));
            return;
          }
          broadcastState(roomCode);
          break;
        }
        case "leave_room": {
          // Remove from tracked clients first so the leaving player doesn't
          // receive the broadcast sent to remaining players.
          const clients = roomClients.get(roomCode);
          if (clients) {
            clients.delete(currentPlayer.id);
            if (clients.size === 0) {
              roomClients.delete(roomCode);
            }
          }
          const { success, roomDeleted } = leaveRoom(currentRoom, currentPlayer.id);
          if (!success) return;
          ws.close(1000, "left_room");
          if (!roomDeleted) {
            broadcastState(roomCode);
          }
          logger.info({ roomCode, playerId: currentPlayer.id }, "Player left room");
          break;
        }
        default:
          ws.send(JSON.stringify({ type: "error", message: `Unknown message type: ${msg.type}` }));
      }
    });

    ws.on("close", () => {
      const clients = roomClients.get(roomCode);
      if (clients) {
        clients.delete(player.id);
        if (clients.size === 0) {
          roomClients.delete(roomCode);
          clearRoomTimer(roomCode);
        }
      }
      logger.info({ roomCode, playerId: player.id }, "Player disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, roomCode, playerId: player.id }, "WebSocket error");
    });
  });
}
