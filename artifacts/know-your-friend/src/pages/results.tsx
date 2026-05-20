import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";

const PLACE_RING = [
  "ring-2 ring-primary/70",
  "ring-2 ring-white/40",
  "ring-1 ring-white/20",
];

export default function Results() {
  const [match, params] = useRoute("/room/:code/results");
  const roomCode = params?.code;
  const [, setLocation] = useLocation();
  const { state } = useGameSocket(roomCode);
  const [showScores, setShowScores] = useState(false);
  const { t } = useI18n();

  useEffect(() => {
    const t = setTimeout(() => setShowScores(true), 400);
    return () => clearTimeout(t);
  }, []);

  if (!match || !roomCode) return null;

  if (!state || state.status !== "game_over") {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-xl font-bold animate-pulse">{t("results.loading")}</div>
      </div>
    );
  }

  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-[100dvh] flex flex-col items-center px-4 py-10 [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">

      {/* Hero */}
      <div className="w-full max-w-lg text-center mb-10 animate-in slide-in-from-top-8 duration-700">
        <h1 className="text-6xl font-black text-primary uppercase tracking-tight mb-3">
          {t("results.title")}
        </h1>
        <p className="text-2xl font-bold text-foreground">
          {t("results.subtitle", { name: winner?.name ?? "-" })}
        </p>
      </div>

      {/* Scoreboard */}
      <div className="w-full max-w-lg">
        <div className="text-xs font-black text-center uppercase tracking-[0.3em] text-muted-foreground mb-4">
          {t("results.scoreboard")}
        </div>
        <div className="divide-y divide-white/10">
          {showScores &&
            sortedPlayers.map((p, i) => {
              const ring = PLACE_RING[i] ?? "";
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2 py-4 animate-in slide-in-from-bottom-6 fade-in"
                  style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center font-black text-base bg-white/10 ${ring}`}
                    >
                      {i + 1}
                    </div>
                    <span className="font-bold text-xl truncate">{p.name}</span>
                    {i === 0 && (
                      <span className="text-xs font-black text-primary uppercase tracking-wider flex-shrink-0">
                        {t("results.winner")}
                      </span>
                    )}
                  </div>
                  <div className="text-3xl font-black text-primary tabular-nums flex-shrink-0 ml-2">
                    {p.score}
                  </div>
                </div>
              );
            })}
        </div>
      </div>

      {/* Play again */}
      <div className="mt-10 w-full max-w-xs animate-in fade-in duration-1000 delay-700" style={{ animationFillMode: "both" }}>
        <Button
          size="lg"
          className="w-full text-lg font-black py-6 rounded-full"
          onClick={() => setLocation("/")}
        >
          {t("results.playAgain")}
        </Button>
      </div>
    </div>
  );
}
