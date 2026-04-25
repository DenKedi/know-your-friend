import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameSlider } from "@/components/game-slider";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MARKER_COLORS = [
  { bg: "#FF4B8B", text: "#fff" },
  { bg: "#00C8E8", text: "#111" },
  { bg: "#9B60FF", text: "#fff" },
  { bg: "#2ECC71", text: "#111" },
  { bg: "#FF6B35", text: "#fff" },
];

function colorForIndex(i: number) {
  return MARKER_COLORS[i % MARKER_COLORS.length]!;
}

export default function Game() {
  const [match, params] = useRoute("/room/:code/game");
  const roomCode = params?.code;
  const [, setLocation] = useLocation();
  const { state, send } = useGameSocket(roomCode);
  const [sliderValue, setSliderValue] = useState(50);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showStandings, setShowStandings] = useState(false);

  useEffect(() => {
    if (state?.status === "game_over") {
      setLocation(`/room/${roomCode}/results`);
    } else if (state?.status === "waiting") {
      setLocation(`/room/${roomCode}/lobby`);
    }
  }, [state?.status, roomCode, setLocation]);

  useEffect(() => {
    setHasSubmitted(false);
    setSliderValue(50);
  }, [state?.status, state?.currentRound, state?.currentPlayerId]);

  if (!match || !roomCode || !state) return null;

  const playerId = sessionStorage.getItem(`kyf_id_${roomCode}`);
  const me = state.players.find((p) => p.id === playerId);
  const isCurrentPlayer = state.currentPlayerId === playerId;
  const currentPlayer = state.players.find((p) => p.id === state.currentPlayerId);
  const nextPlayer = state.players.find((p) => p.id === state.nextPlayerId);

  const handleSelectCategory = (categoryId: string) => {
    send({ type: "select_category", categoryId });
  };

  const handleSubmitRating = () => {
    send({ type: "submit_self_rating", rating: sliderValue });
    setHasSubmitted(true);
  };

  const handleSubmitGuess = () => {
    send({ type: "submit_guess", guess: sliderValue });
    setHasSubmitted(true);
  };

  const handleNextTurn = () => {
    send({ type: "next_turn" });
  };

  const isLastTurn =
    state.currentRound >= state.totalRounds &&
    state.players.length > 0 &&
    state.currentPlayerId === state.players[state.players.length - 1]?.id;

  const sortedStandings = [...state.players].sort((a, b) => b.score - a.score);

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-border bg-card shrink-0">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")}>
          Verlassen
        </Button>
        <div className="flex flex-col items-center gap-1">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            Runde {state.currentRound} / {state.totalRounds}
          </span>
          <Progress
            value={(state.currentRound / state.totalRounds) * 100}
            className="w-28 h-1.5"
          />
        </div>
        <button
          onClick={() => setShowStandings(true)}
          className="font-black bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm tabular-nums hover:bg-primary/90 active:scale-95 transition-all"
          aria-label="Punktestand anzeigen"
        >
          {me?.score ?? 0} Pkt
        </button>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-5 max-w-xl mx-auto w-full overflow-y-auto">

        {/* ── KATEGORIE WÄHLEN ─────────────────────────────────── */}
        {state.status === "category_selection" && (
          <Card className="w-full bg-card border-2 border-border shadow-lg">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-xl text-center leading-tight">
                {isCurrentPlayer
                  ? "Wähle eine Kategorie"
                  : `${currentPlayer?.name} wählt eine Kategorie…`}
              </CardTitle>
              {isCurrentPlayer && (
                <p className="text-sm text-center text-muted-foreground mt-1">
                  Du bewertest dich selbst – wähl ehrlich!
                </p>
              )}
            </CardHeader>
            <CardContent className="px-4 pb-5">
              {isCurrentPlayer ? (
                <div className="space-y-2.5">
                  {state.availableCategories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => handleSelectCategory(cat.id)}
                      className="w-full text-left bg-input hover:bg-input/70 active:scale-[0.98] transition-all rounded-xl p-4 border-2 border-transparent hover:border-primary/40 group"
                    >
                      <div className="font-black text-lg text-foreground group-hover:text-primary transition-colors">
                        {cat.label}
                      </div>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-semibold text-primary truncate max-w-[42%]">
                          {cat.leftLabel}
                        </span>
                        <span className="text-muted-foreground/60 text-xs flex-shrink-0">↔</span>
                        <span className="text-xs font-semibold text-secondary truncate max-w-[42%] text-right ml-auto">
                          {cat.rightLabel}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground font-semibold">Bitte warten…</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── SELBSTEINSCHÄTZUNG ───────────────────────────────── */}
        {state.status === "self_rating" && (
          <div className="w-full space-y-4">
            <div className="text-center px-2">
              <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                {state.currentCategoryLabel}
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                {isCurrentPlayer
                  ? "Wo ordnest du dich ein?"
                  : `Psst… ${currentPlayer?.name} bewertet sich gerade`}
              </p>
            </div>

            {isCurrentPlayer ? (
              <Card className="border-2 border-border shadow-lg">
                <CardContent className="px-4 pt-4 pb-5">
                  {!hasSubmitted ? (
                    <>
                      <GameSlider
                        value={sliderValue}
                        onChange={setSliderValue}
                        leftLabel={state.currentCategoryLeftLabel}
                        rightLabel={state.currentCategoryRightLabel}
                        showValue
                      />
                      <Button
                        className="w-full py-7 text-lg font-black mt-4 rounded-xl"
                        onClick={handleSubmitRating}
                      >
                        Festlegen
                      </Button>
                    </>
                  ) : (
                    <div className="py-10 text-center space-y-2">
                      <div className="text-4xl font-black text-primary">{sliderValue}</div>
                      <p className="text-muted-foreground font-semibold">
                        Versteckt – deine Freunde raten gleich…
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex justify-center py-10">
                <div className="w-20 h-20 rounded-full border-8 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* ── RATEN ───────────────────────────────────────────── */}
        {state.status === "guessing" && (
          <div className="w-full space-y-4">
            <div className="text-center px-2">
              <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                {state.currentCategoryLabel}
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                {isCurrentPlayer
                  ? `Deine Freunde raten… (${state.guessesSubmitted}/${state.guessesTotal})`
                  : `Wo hat sich ${currentPlayer?.name} eingeschätzt?`}
              </p>
            </div>

            <Card className="border-2 border-border shadow-lg">
              <CardContent className="px-4 pt-4 pb-5">
                {!isCurrentPlayer ? (
                  !hasSubmitted ? (
                    <>
                      <GameSlider
                        value={sliderValue}
                        onChange={setSliderValue}
                        leftLabel={state.currentCategoryLeftLabel}
                        rightLabel={state.currentCategoryRightLabel}
                        showValue
                      />
                      <Button
                        className="w-full py-7 text-lg font-black mt-4 rounded-xl"
                        onClick={handleSubmitGuess}
                      >
                        Tipp abgeben
                      </Button>
                    </>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <div className="text-4xl font-black text-primary">
                        {state.guessesSubmitted}/{state.guessesTotal}
                      </div>
                      <p className="text-muted-foreground font-semibold">
                        Tipp abgegeben! Warte auf die anderen…
                      </p>
                    </div>
                  )
                ) : (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <div className="text-5xl font-black text-primary tabular-nums">
                      {state.guessesSubmitted}/{state.guessesTotal}
                    </div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider text-sm">
                      Tipps eingegangen
                    </div>
                    <div className="w-full bg-input rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${state.guessesTotal > 0 ? (state.guessesSubmitted / state.guessesTotal) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Wer fehlt noch? */}
            <PendingGuessersCard state={state} />
          </div>
        )}

        {/* ── RUNDEN-ERGEBNIS ─────────────────────────────────── */}
        {state.status === "round_results" && state.roundResults && (
          <div className="w-full space-y-4 animate-in fade-in duration-500">

            {/* Title */}
            <div className="text-center px-2">
              <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                Auflösung!
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {currentPlayer?.name} bei{" "}
                <span className="font-bold text-foreground">
                  {state.currentCategoryLabel}
                </span>
              </p>
            </div>

            {/* Slider reveal */}
            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardContent className="px-4 pt-4 pb-5">
                <GameSlider
                  disabled
                  leftLabel={state.currentCategoryLeftLabel}
                  rightLabel={state.currentCategoryRightLabel}
                  markers={[
                    ...state.roundResults.map((r) => ({
                      value: r.guess,
                      label: r.playerName,
                    })),
                    {
                      value: state.selfRating ?? 0,
                      label: currentPlayer?.name ?? "Wahrheit",
                      isTruth: true,
                    },
                  ]}
                />
              </CardContent>
            </Card>

            {/* Score rows */}
            <div className="space-y-2">
              {[...state.roundResults]
                .sort((a, b) => b.points - a.points)
                .map((r, i) => {
                  const color = colorForIndex(
                    state.roundResults!.findIndex((x) => x.playerId === r.playerId),
                  );
                  return (
                    <div
                      key={r.playerId}
                      className="bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-between animate-in slide-in-from-bottom-4"
                      style={{
                        animationDelay: `${i * 100}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {r.playerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-base truncate">{r.playerName}</div>
                          <div className="text-xs text-muted-foreground">
                            Tipp: {r.guess} · Wahrheit: {state.selfRating} · Diff: {r.diff}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-black text-xl text-primary">+{r.points}</div>
                        <div className="text-xs text-muted-foreground">Punkte</div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Next-up hint */}
            {!isLastTurn && nextPlayer && (
              <div className="text-center text-sm text-muted-foreground">
                Als Nächstes ist <span className="font-bold text-foreground">{nextPlayer.name}</span> dran
              </div>
            )}

            {/* Next button – anyone can advance */}
            <Button
              className="w-full py-6 text-lg font-black rounded-xl mt-1"
              onClick={handleNextTurn}
            >
              {isLastTurn ? "Spiel beenden" : "Weiter"}
            </Button>
          </div>
        )}
      </main>

      {/* ── PUNKTESTAND-DIALOG ──────────────────────────────────── */}
      <Dialog open={showStandings} onOpenChange={setShowStandings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">
              Punktestand
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {sortedStandings.map((p, i) => {
              const originalIdx = state.players.findIndex((pl) => pl.id === p.id);
              const color = colorForIndex(originalIdx);
              const isMe = p.id === playerId;
              return (
                <div
                  key={p.id}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border ${
                    isMe ? "border-primary bg-primary/5" : "border-border bg-card"
                  }`}
                >
                  <div className="w-7 text-center font-black text-muted-foreground tabular-nums">
                    {i + 1}.
                  </div>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black flex-shrink-0"
                    style={{ background: color.bg, color: color.text }}
                  >
                    {p.name.substring(0, 2).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0 font-bold truncate">
                    {p.name} {isMe && <span className="text-xs text-muted-foreground font-normal">(du)</span>}
                  </div>
                  <div className="font-black text-lg text-primary tabular-nums">
                    {p.score}
                  </div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function PendingGuessersCard({
  state,
}: {
  state: {
    players: { id: string; name: string }[];
    pendingGuesserIds?: string[];
    guessedPlayerIds?: string[];
    nextPlayerId?: string | null;
    currentPlayerId?: string | null;
  };
}) {
  const pending = (state.pendingGuesserIds ?? []).map((id) =>
    state.players.find((p) => p.id === id),
  ).filter(Boolean) as { id: string; name: string }[];
  const guessed = (state.guessedPlayerIds ?? []).map((id) =>
    state.players.find((p) => p.id === id),
  ).filter(Boolean) as { id: string; name: string }[];
  const nextPlayer = state.players.find((p) => p.id === state.nextPlayerId);

  if (pending.length === 0 && guessed.length === 0) return null;

  return (
    <Card className="border border-border">
      <CardContent className="px-4 py-3 space-y-2">
        {pending.length > 0 && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
              Noch offen
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pending.map((p) => (
                <span
                  key={p.id}
                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-input text-foreground border border-border"
                >
                  ⏳ {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {guessed.length > 0 && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
              Fertig
            </div>
            <div className="flex flex-wrap gap-1.5">
              {guessed.map((p) => (
                <span
                  key={p.id}
                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-primary/15 text-primary border border-primary/30"
                >
                  ✓ {p.name}
                </span>
              ))}
            </div>
          </div>
        )}
        {nextPlayer && nextPlayer.id !== state.currentPlayerId && (
          <div className="pt-1 text-xs text-muted-foreground">
            Als Nächstes dran: <span className="font-bold text-foreground">{nextPlayer.name}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
