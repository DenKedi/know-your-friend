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
    return <div className="min-h-[100dvh] flex items-center justify-center text-xl font-bold">Connecting...</div>;
  }

  const playerId = sessionStorage.getItem(`kyf_id_${roomCode}`);
  const me = state.players.find(p => p.id === playerId);
  const isHost = me?.isHost;

  return (
    <div className="min-h-[100dvh] p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl text-center mb-8 pt-8">
        <h2 className="text-xl font-bold text-muted-foreground uppercase tracking-widest mb-2">Room Code</h2>
        <div className="text-6xl md:text-8xl font-black text-primary tracking-widest bg-card inline-block px-8 py-4 rounded-3xl border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
          {roomCode}
        </div>
      </div>

      <Card className="w-full max-w-lg bg-card border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Players ({state.players.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {state.players.map(p => (
              <div key={p.id} className="bg-input p-3 rounded-xl font-bold text-lg flex items-center justify-between">
                <span>{p.name}</span>
                {p.isHost && <span className="text-xs bg-primary text-primary-foreground px-2 py-1 rounded-full uppercase">Host</span>}
              </div>
            ))}
          </div>

          <div className="pt-8">
            {isHost ? (
              <Button 
                className="w-full py-8 text-2xl font-black uppercase tracking-wider animate-pulse hover:animate-none hover:-translate-y-1 transition-transform"
                onClick={() => send({ type: "start_game" })}
                disabled={state.players.length < 2}
              >
                {state.players.length < 2 ? "Waiting for players..." : "Start Game!"}
              </Button>
            ) : (
              <div className="text-center p-6 bg-input rounded-xl border-2 border-dashed border-muted-foreground/50">
                <p className="text-xl font-bold animate-pulse text-muted-foreground">Waiting for host to start...</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
