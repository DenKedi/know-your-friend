import { useEffect, useRef, useState, useCallback } from "react";
import { RoomState } from "@workspace/api-client-react/src/generated/api.schemas";
import { useToast } from "./use-toast";

type OutgoingMessage =
  | { type: "start_game" }
  | { type: "select_category"; categoryId: string }
  | { type: "submit_self_rating"; rating: number }
  | { type: "submit_guess"; guess: number }
  | { type: "next_turn" };

type IncomingMessage =
  | { type: "state"; state: RoomState }
  | { type: "error"; message: string };

export function useGameSocket(roomCode: string | undefined) {
  const [state, setState] = useState<RoomState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const { toast } = useToast();

  const connect = useCallback(() => {
    if (!roomCode) return;

    const token = sessionStorage.getItem(`kyf_token_${roomCode}`);
    if (!token) {
      setError("No player token found. Please join the room first.");
      return;
    }

    const wsProtocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${wsProtocol}//${window.location.host}/ws?roomCode=${roomCode}&playerToken=${token}`;
    
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      setIsConnected(true);
      setError(null);
    };

    ws.onmessage = (event) => {
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
      setIsConnected(false);
      // Auto-reconnect
      setTimeout(() => {
        connect();
      }, 2000);
    };

    ws.onerror = () => {
      setIsConnected(false);
    };
  }, [roomCode, toast]);

  useEffect(() => {
    connect();
    return () => {
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
