import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect } from "react";

export default function Lobby() {
  const [match, params] = useRoute("/room/:code/lobby");
  const roomCode = params?.code;
  const [, setLocation] = useLocation();
  const { state, send, isConnected } = useGameSocket(roomCode);

  useEffect(() => {
    if (state?.status && state.status !== "waiting") {
      setLocation(`/room/${roomCode}/game`);
    }
  }, [state?.status, roomCode, setLocation]);

  if (!match || !roomCode) return null;

  if (!state) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-xl font-bold animate-pulse">Verbinde…</div>
      </div>
    );
  }

  const playerId = sessionStorage.getItem(`kyf_id_${roomCode}`);
  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost;

  return (
    <div className="min-h-[100dvh] px-4 py-8 flex flex-col items-center">

      {/* Room code hero */}
      <div className="w-full max-w-lg text-center mb-8">
        <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
          Raum-Code
        </p>
        <div className="text-6xl font-black text-primary tracking-[0.2em] bg-card inline-block px-8 py-4 rounded-2xl border-2 border-border shadow-lg">
          {roomCode}
        </div>
        <p className="text-sm text-muted-foreground mt-3">
          Teile diesen Code mit deinen Freunden
        </p>
      </div>

      {/* Players */}
      <Card className="w-full max-w-lg border-2 border-border shadow-lg">
        <CardHeader className="pb-3 pt-5 px-5">
          <CardTitle className="text-xl font-black flex items-center justify-between">
            <span>Spieler ({state.players.length})</span>
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-muted-foreground"}`} />
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-5">
          <div className="grid grid-cols-2 gap-2.5 mb-6">
            {state.players.map((p) => (
              <div
                key={p.id}
                className="bg-input px-4 py-3 rounded-xl font-bold text-base flex items-center justify-between gap-2"
              >
                <span className="truncate">{p.name}</span>
                {p.isHost && (
                  <span className="text-[10px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase font-black flex-shrink-0">
                    Host
                  </span>
                )}
              </div>
            ))}
          </div>

          {isHost ? (
            <Button
              className="w-full py-6 text-xl font-black uppercase tracking-wider rounded-xl"
              onClick={() => send({ type: "start_game" })}
              disabled={state.players.length < 2}
            >
              {state.players.length < 2
                ? "Warte auf Spieler…"
                : "Spiel starten!"}
            </Button>
          ) : (
            <div className="text-center p-5 bg-input rounded-xl border-2 border-dashed border-muted-foreground/40">
              <p className="text-base font-bold animate-pulse text-muted-foreground">
                Warte auf den Host…
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
