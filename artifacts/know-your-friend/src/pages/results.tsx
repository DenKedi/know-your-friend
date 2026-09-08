import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { AnimalIcon } from "@/components/animal-icon";

const RESULTS_GRADIENT_START = [239, 214, 42];
const RESULTS_GRADIENT_END = [255, 125, 6];

function colorForRank(rank: number, playerCount: number) {
  const progress = playerCount <= 1 ? 0 : rank / (playerCount - 1);
  const channels = RESULTS_GRADIENT_START.map((start, index) =>
    Math.round(start + (RESULTS_GRADIENT_END[index]! - start) * progress),
  );
  return `rgb(${channels.join(", ")})`;
}

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
              const rankColor = colorForRank(i, sortedPlayers.length);
              return (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-2 py-4 animate-in slide-in-from-bottom-6 fade-in"
                  style={{ animationDelay: `${i * 150}ms`, animationFillMode: "both" }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 flex-shrink-0 text-center">
                      <div className="font-black text-2xl tabular-nums" style={{ color: rankColor }}>
                        {i + 1}
                      </div>
                      {i === 0 && (
                        <div className="text-[9px] leading-none font-black uppercase tracking-normal" style={{ color: rankColor }}>
                          {t("results.winner")}
                        </div>
                      )}
                    </div>
                    <div
                      className="w-12 h-12 rounded-full flex-shrink-0 overflow-hidden ring-2 ring-white/25"
                    >
                      <AnimalIcon animal={p.animal} label={p.name} />
                    </div>
                    <span className="font-bold text-xl truncate" style={{ color: rankColor }}>{p.name}</span>
                  </div>
                  <div className="text-3xl font-black tabular-nums flex-shrink-0 ml-2" style={{ color: rankColor }}>
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
