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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useI18n } from "@/lib/i18n";

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
  const { t } = useI18n();
  const [sliderValue, setSliderValue] = useState(50);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [showStandings, setShowStandings] = useState(false);
  const [showEndConfirm, setShowEndConfirm] = useState(false);

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
  const isHost = me?.isHost ?? false;
  const canEndEarly =
    isHost &&
    state.status !== "waiting" &&
    state.status !== "game_over" &&
    state.currentRound < state.totalRounds;

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-border bg-card shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => setLocation("/")} className="px-2">
          {t("game.leave")}
        </Button>
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("game.roundCounter", { current: state.currentRound, total: state.totalRounds })}
          </span>
          <Progress
            value={(state.currentRound / state.totalRounds) * 100}
            className="w-28 h-1.5"
          />
        </div>
        <div className="flex items-center gap-1.5">
          {canEndEarly && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEndConfirm(true)}
              className="px-2 text-xs font-bold text-muted-foreground hover:text-destructive"
              title={t("game.shortenTitle")}
            >
              {t("game.shorten")}
            </Button>
          )}
          <button
            onClick={() => setShowStandings(true)}
            className="font-black bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm tabular-nums hover:bg-primary/90 active:scale-95 transition-all"
            aria-label={t("game.standings")}
          >
            {me?.score ?? 0} {t("game.pointsSuffix")}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-5 max-w-xl mx-auto w-full overflow-y-auto">

        {/* ── KATEGORIE WÄHLEN ─────────────────────────────────── */}
        {state.status === "category_selection" && (
          <Card className="w-full bg-card border-2 border-border shadow-lg">
            <CardHeader className="pb-3 pt-5 px-5">
              <CardTitle className="text-xl text-center leading-tight">
                {isCurrentPlayer
                  ? t("game.selectCategory")
                  : t("game.selectingCategory", { name: currentPlayer?.name ?? "-" })}
              </CardTitle>
              {isCurrentPlayer && (
                <p className="text-sm text-center text-muted-foreground mt-1">
                  {t("game.selfRateHint")}
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
                      <div className="flex items-center justify-between gap-2 mt-1">
                        <span className="text-xs font-semibold text-primary truncate">
                          {cat.leftLabel}
                        </span>
                        <span className="text-xs font-semibold text-secondary truncate text-right">
                          {cat.rightLabel}
                        </span>
                      </div>
                    </button>
                  ))}
                  <Button
                    variant="outline"
                    onClick={() => send({ type: "reroll_categories" })}
                    disabled={state.rerollUsedThisTurn}
                    className="w-full mt-1 font-bold"
                  >
                    {state.rerollUsedThisTurn ? t("game.rerollUsed") : t("game.reroll")}
                  </Button>
                </div>
              ) : (
                <div className="py-8 flex flex-col items-center gap-4">
                  <div className="w-14 h-14 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                  <p className="text-sm text-muted-foreground font-semibold">{t("game.waiting")}</p>
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
                  ? t("game.whereAreYou")
                  : t("game.selfRatingOther", { name: currentPlayer?.name ?? "-" })}
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
                        {t("game.lockIn")}
                      </Button>
                    </>
                  ) : (
                    <div className="py-10 text-center space-y-2">
                      <div className="text-4xl font-black text-primary">{sliderValue}</div>
                      <p className="text-muted-foreground font-semibold">
                        {t("game.hidden")}
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
                  ? t("game.friendsGuessing", { submitted: state.guessesSubmitted, total: state.guessesTotal })
                  : t("game.guessPrompt", { name: currentPlayer?.name ?? "-" })}
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
                        {t("game.submitGuess")}
                      </Button>
                    </>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <div className="text-4xl font-black text-primary">
                        {state.guessesSubmitted}/{state.guessesTotal}
                      </div>
                      <p className="text-muted-foreground font-semibold">
                        {t("game.guessSubmitted")}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <div className="text-5xl font-black text-primary tabular-nums">
                      {state.guessesSubmitted}/{state.guessesTotal}
                    </div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider text-sm">
                      {t("game.guessesReceived")}
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
                {t("game.reveal")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("game.revealSubtitle", {
                  name: currentPlayer?.name ?? "-",
                  category: state.currentCategoryLabel ?? "-",
                })}
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
                      label: currentPlayer?.name ?? t("game.truth"),
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
                            {t("game.guessLine", {
                              guess: r.guess,
                              truth: state.selfRating ?? 0,
                              diff: r.diff,
                            })}
                          </div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-black text-xl text-primary">+{r.points}</div>
                        <div className="text-xs text-muted-foreground">{t("game.points")}</div>
                      </div>
                    </div>
                  );
                })}
            </div>

            {/* Next-up hint */}
            {!isLastTurn && nextPlayer && (
              <div className="text-center text-sm text-muted-foreground">
                {t("game.nextUp", { name: nextPlayer.name })}
              </div>
            )}

            {/* Next button – anyone can advance */}
            <Button
              className="w-full py-6 text-lg font-black rounded-xl mt-1"
              onClick={handleNextTurn}
            >
              {isLastTurn ? t("game.endGame") : t("game.continue")}
            </Button>
          </div>
        )}
      </main>

      {/* ── ABKÜRZEN-BESTÄTIGUNG ───────────────────────────────── */}
      <AlertDialog open={showEndConfirm} onOpenChange={setShowEndConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("game.shortenConfirmTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("game.shortenConfirmDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("game.shortenConfirmCancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                send({ type: "end_game_early" });
                setShowEndConfirm(false);
              }}
            >
              {t("game.shortenConfirmAccept")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── PUNKTESTAND-DIALOG ──────────────────────────────────── */}
      <Dialog open={showStandings} onOpenChange={setShowStandings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">
              {t("game.standings")}
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
                    {p.name} {isMe && <span className="text-xs text-muted-foreground font-normal">({t("common.you")})</span>}
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
  const { t } = useI18n();
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
              {t("game.pending")}
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
              {t("game.done")}
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
            {t("game.nextTurnLabel", { name: nextPlayer.name })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
