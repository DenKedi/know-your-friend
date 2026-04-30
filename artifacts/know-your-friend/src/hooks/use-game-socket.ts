import { useEffect, useRef, useState, useCallback } from "react";
import type { RoomState } from "@workspace/api-client-react";
import { wsUrl } from "../lib/api-base";
import { useToast } from "./use-toast";

export type GameRoomState = RoomState & {
  nextPlayerId?: string | null;
  rerollUsedThisTurn?: boolean;
  pendingGuesserIds?: string[];
  guessedPlayerIds?: string[];
};

type OutgoingMessage =
  | { type: "start_game" }
  | { type: "select_category"; categoryId: string }
  | { type: "submit_self_rating"; rating: number }
  | { type: "submit_guess"; guess: number }
  | { type: "next_turn" }
  | { type: "reroll_categories" }
  | { type: "end_game_early" };

type IncomingMessage =
  | { type: "state"; state: GameRoomState }
  | { type: "error"; message: string };

export function useGameSocket(roomCode: string | undefined) {
  const [state, setState] = useState<GameRoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const unmountedRef = useRef(false);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
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
            title: "Error",
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
        title: "Disconnected",
        description: "Trying to reconnect...",
        variant: "destructive",
      });
    }
  }, [toast]);

  return { state, error, isConnected, send };
}
