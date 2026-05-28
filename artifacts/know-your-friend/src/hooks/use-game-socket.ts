import { useEffect, useRef, useState, useCallback } from "react";
import type { RoomState } from "@workspace/api-client-react";
import { wsUrl } from "../lib/api-base";
import { useToast } from "./use-toast";
import { useI18n } from "@/lib/i18n";
import { useDevGame, DEV_ROOM_CODE } from "@/lib/dev-game-context";

export type GameRoomState = RoomState & {
  nextPlayerId?: string | null;
  rerollUsedThisTurn?: boolean;
  pendingGuesserIds?: string[];
  guessedPlayerIds?: string[];
  /** Epoch-ms deadline for the current timed phase, or null when no timer is active. */
  phaseDeadline?: number | null;
};

type OutgoingMessage =
  | { type: "start_game" }
  | { type: "select_category"; categoryId: string }
  | { type: "submit_self_rating"; rating: number; path: number[] }
  | { type: "submit_guess"; guess: number; path: number[] }
  | { type: "next_turn" }
  | { type: "reroll_categories" }
  | { type: "end_game_early" }
  | { type: "leave_room" }
  | { type: "set_rounds_per_player"; roundsPerPlayer: number };

type IncomingMessage =
  | { type: "state"; state: GameRoomState }
  | { type: "error"; message: string };

export function useGameSocket(roomCode: string | undefined) {
  const devCtx = useDevGame();

  const [state, setState] = useState<GameRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const unmountedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();
  const { t } = useI18n();

  const connect = useCallback(() => {
    // Skip real WebSocket when dev mode is active for this room
    if (devCtx.isDevMode && roomCode === DEV_ROOM_CODE) return;
    if (!roomCode || unmountedRef.current) return;

    const token = sessionStorage.getItem(`kyf_token_${roomCode}`);
    if (!token) {
      setError("No player token found. Please join the room first.");
      return;
    }

    const url = `${wsUrl("/ws")}?roomCode=${roomCode}&playerToken=${token}`;

    if (wsRef.current && wsRef.current.readyState !== WebSocket.CLOSED) {
      wsRef.current.close();
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      if (unmountedRef.current) {
        ws.close();
        return;
      }
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
      if (unmountedRef.current) return;
      try {
        const data = JSON.parse(event.data) as IncomingMessage;
        if (data.type === "state") {
          setState(data.state);
        } else if (data.type === "error") {
          setError(data.message);
          toast({
            title: t("common.error"),
            description: data.message,
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("Failed to parse message", err);
      }
    };

    ws.onclose = () => {
      if (unmountedRef.current) return;
      setIsConnected(false);
      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current) connect();
      }, 2000);
    };

    ws.onerror = () => {
      if (unmountedRef.current) return;
      setIsConnected(false);
    };
  }, [roomCode, toast]);

  useEffect(() => {
    unmountedRef.current = false;
    connect();
    return () => {
      unmountedRef.current = true;
      if (reconnectTimerRef.current !== null) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  const send = useCallback((message: OutgoingMessage) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      toast({
        title: t("socket.disconnectedTitle"),
        description: t("socket.disconnectedDescription"),
        variant: "destructive",
      });
    }
  }, [toast]);

  // ── Dev mode short-circuit ─────────────────────────────────────────────
  if (devCtx.isDevMode && roomCode === DEV_ROOM_CODE) {
    return {
      state: devCtx.devState,
      error: null as string | null,
      isConnected: true,
      send: devCtx.send as (message: OutgoingMessage) => void,
    };
  }

  return { state, error, isConnected, send };
}
