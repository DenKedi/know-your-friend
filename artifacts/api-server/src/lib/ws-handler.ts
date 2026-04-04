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
  getRoomStateForClient,
} from "./game-engine";

const roomClients = new Map<string, Map<string, WebSocket>>();

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
          const ok = nextTurn(currentRoom);
          if (!ok) {
            ws.send(JSON.stringify({ type: "error", message: "Cannot advance turn" }));
            return;
          }
          broadcastState(roomCode);
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
        }
      }
      logger.info({ roomCode, playerId: player.id }, "Player disconnected");
    });

    ws.on("error", (err) => {
      logger.error({ err, roomCode, playerId: player.id }, "WebSocket error");
    });
  });
}
