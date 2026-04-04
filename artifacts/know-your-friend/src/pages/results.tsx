import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

const PLACE_STYLES = [
  { ring: "ring-2 ring-white/60", label: "bg-white text-black" },
  { ring: "ring-2 ring-muted-foreground/40", label: "bg-muted text-muted-foreground" },
  { ring: "", label: "bg-secondary/30 text-foreground" },
];

export default function Results() {
  const [match, params] = useRoute("/room/:code/results");
  const roomCode = params?.code;
  const [, setLocation] = useLocation();
  const { state } = useGameSocket(roomCode);
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowScores(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!match || !roomCode) return null;

  if (!state || state.status !== "game_over") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-xl font-bold animate-pulse">Lade Ergebnis…</div>
      </div>
    );
  }

  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col items-center px-4 py-8">

      {/* Hero */}
      <div className="w-full max-w-lg text-center mb-8 animate-in slide-in-from-top-8 duration-700">
        <h1 className="text-5xl font-black text-primary uppercase tracking-tight mb-3">
          Spiel vorbei!
        </h1>
        <p className="text-xl font-bold text-foreground">
          <span className="text-secondary">{winner?.name}</span> kennt seine Freunde am besten.
        </p>
      </div>

      {/* Scoreboard */}
      <Card className="w-full max-w-lg border-2 border-border shadow-lg">
        <CardHeader className="border-b border-border pb-4 pt-5 px-5">
          <CardTitle className="text-2xl font-black text-center uppercase tracking-wider">
            Endergebnis
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 py-4 space-y-2.5">
          {showScores &&
            sortedPlayers.map((p, i) => {
              const placeStyle = PLACE_STYLES[i] ?? PLACE_STYLES[2];
              return (
                <div
                  key={p.id}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl bg-input ${placeStyle.ring} animate-in slide-in-from-bottom-6 fade-in`}
                  style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className={`w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center font-black text-base ${placeStyle.label}`}
                    >
                      {i + 1}
                    </div>
                    <span className="font-bold text-lg truncate">{p.name}</span>
                    {i === 0 && (
                      <span className="text-xs font-black bg-primary text-primary-foreground px-2 py-0.5 rounded-full flex-shrink-0">
                        Sieger
                      </span>
                    )}
                  </div>
                  <div className="text-2xl font-black text-primary tabular-nums flex-shrink-0 ml-2">
                    {p.score}
                  </div>
                </div>
              );
            })}
        </CardContent>
      </Card>

      {/* Play again */}
      <div className="mt-8 w-full max-w-lg animate-in fade-in duration-1000 delay-700" style={{ animationFillMode: "both" }}>
        <Button
          size="lg"
          className="w-full text-lg font-black py-6 rounded-xl"
          onClick={() => setLocation("/")}
        >
          Nochmal spielen
        </Button>
      </div>
    </div>
  );
}
