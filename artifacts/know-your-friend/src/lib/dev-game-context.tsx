/**
 * React context that powers the dev-mode game simulator.
 * Wraps the whole app so any component can check isDevMode and
 * useGameSocket can short-circuit to the local state machine.
 */

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import {
  DEV_ROOM_CODE,
  DEFAULT_DEV_CONFIG,
  createInitialDevState,
  applyDevAction,
  jumpToPhase,
  type DevGameConfig,
  type GameRoomState,
  type OutgoingMessage,
} from "@/lib/dev-game-state";

// ─── Context shape ────────────────────────────────────────────────────────────

interface DevGameContextValue {
  isDevMode: boolean;
  devState: GameRoomState | null;
  devConfig: DevGameConfig;
  viewingAsId: string;
  /** Boot the simulator with the given config and seed sessionStorage. */
  startDevMode: (config: DevGameConfig) => void;
  /** Tear down dev mode and return to the real app. */
  stopDevMode: () => void;
  /** Process an outgoing game message through the local state machine. */
  send: (message: OutgoingMessage) => void;
  /** Directly warp state to the given phase (bypasses state machine). */
  jumpTo: (phase: GameRoomState["status"]) => void;
  /** Switch whose perspective is shown; re-writes kyf_id_DEV1 in sessionStorage. */
  setViewingAs: (playerId: string) => void;
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

type Action =
  | { type: "START"; config: DevGameConfig }
  | { type: "STOP" }
  | { type: "SEND"; message: OutgoingMessage; viewingAsId: string }
  | { type: "JUMP"; phase: GameRoomState["status"] }
  | { type: "SET_VIEWING_AS"; playerId: string };

interface DevGameInternalState {
  isDevMode: boolean;
  devState: GameRoomState | null;
  devConfig: DevGameConfig;
  viewingAsId: string;
}

function reducer(state: DevGameInternalState, action: Action): DevGameInternalState {
  switch (action.type) {
    case "START": {
      const devState = createInitialDevState(action.config);
      const firstPlayerId = devState.players[0]?.id ?? "p1";
      return {
        isDevMode: true,
        devState,
        devConfig: action.config,
        viewingAsId: firstPlayerId,
      };
    }
    case "STOP":
      return {
        isDevMode: false,
        devState: null,
        devConfig: DEFAULT_DEV_CONFIG,
        viewingAsId: "p1",
      };
    case "SEND":
      if (!state.devState) return state;
      return {
        ...state,
        devState: applyDevAction(state.devState, action.message, action.viewingAsId),
      };
    case "JUMP":
      if (!state.devState) return state;
      return { ...state, devState: jumpToPhase(state.devState, action.phase) };
    case "SET_VIEWING_AS":
      return { ...state, viewingAsId: action.playerId };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

const DevGameContext = createContext<DevGameContextValue>({
  isDevMode: false,
  devState: null,
  devConfig: DEFAULT_DEV_CONFIG,
  viewingAsId: "p1",
  startDevMode: () => {},
  stopDevMode: () => {},
  send: () => {},
  jumpTo: () => {},
  setViewingAs: () => {},
});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function DevGameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, {
    isDevMode: false,
    devState: null,
    devConfig: DEFAULT_DEV_CONFIG,
    viewingAsId: "p1",
  });

  // Keep sessionStorage in sync with viewingAsId
  useEffect(() => {
    if (state.isDevMode) {
      sessionStorage.setItem(`kyf_id_${DEV_ROOM_CODE}`, state.viewingAsId);
    }
  }, [state.isDevMode, state.viewingAsId]);

  const startDevMode = useCallback((config: DevGameConfig) => {
    dispatch({ type: "START", config });
    const firstPlayerId = `p1`;
    // Seed sessionStorage so pages can read player identity
    sessionStorage.setItem(`kyf_id_${DEV_ROOM_CODE}`, firstPlayerId);
    sessionStorage.setItem(`kyf_token_${DEV_ROOM_CODE}`, "dev-token");
  }, []);

  const stopDevMode = useCallback(() => {
    dispatch({ type: "STOP" });
    sessionStorage.removeItem(`kyf_id_${DEV_ROOM_CODE}`);
    sessionStorage.removeItem(`kyf_token_${DEV_ROOM_CODE}`);
  }, []);

  const send = useCallback(
    (message: OutgoingMessage) => {
      dispatch({ type: "SEND", message, viewingAsId: state.viewingAsId });
    },
    [state.viewingAsId],
  );

  const jumpTo = useCallback((phase: GameRoomState["status"]) => {
    dispatch({ type: "JUMP", phase });
  }, []);

  const setViewingAs = useCallback((playerId: string) => {
    dispatch({ type: "SET_VIEWING_AS", playerId });
  }, []);

  return (
    <DevGameContext.Provider
      value={{
        isDevMode: state.isDevMode,
        devState: state.devState,
        devConfig: state.devConfig,
        viewingAsId: state.viewingAsId,
        startDevMode,
        stopDevMode,
        send,
        jumpTo,
        setViewingAs,
      }}
    >
      {children}
    </DevGameContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useDevGame() {
  return useContext(DevGameContext);
}

// Re-export constants so use-game-socket can import without touching dev-game-state
export { DEV_ROOM_CODE };
