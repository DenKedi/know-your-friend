import { useEffect, useRef, useState } from "react";
import { useRoute, useLocation } from "wouter";
import woodTexture from "@/assets/images/Wood-texture.png";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

// Keep the wood texture decoded in memory. When the browser re-rasterizes
// composited layers (e.g. on zoom in/out), the texture would otherwise be
// re-decoded from disk and the layer can flash empty for a frame.
const woodTextureLoader = new Image();
woodTextureLoader.decoding = "sync";
woodTextureLoader.src = woodTexture;
// Wood-toned fallback so any transient layer-cache miss shows brown instead
// of pure black bleeding through the dark scene background.
const WOOD_FALLBACK_BG = "#6b431c";
const WOOD_DARK_FALLBACK_BG = "#1a0f06";

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
    <div className="min-h-[100dvh] flex flex-col select-none">
      {/* Header */}
      <header className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between border-b border-white/10 backdrop-blur-xl bg-background/30 shrink-0 gap-2">
        <Button variant="ghost" size="sm" onClick={() => { send({ type: "leave_room" }); setLocation("/"); }} className="px-2">
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

      <main className="flex-1 flex flex-col items-center px-4 py-6 max-w-xl mx-auto w-full overflow-y-auto [text-shadow:0_2px_8px_rgba(0,0,0,0.6)]">

        {/* ── KATEGORIE WÄHLEN ─────────────────────────────────── */}
        {state.status === "category_selection" && (
          <section className="w-full">
            <h2 className="text-2xl font-black text-center leading-tight">
              {isCurrentPlayer
                ? t("game.selectCategory")
                : t("game.selectingCategory", { name: currentPlayer?.name ?? "-" })}
            </h2>
            {isCurrentPlayer && (
              <p className="text-sm text-center text-muted-foreground mt-1 mb-5">
                {t("game.selfRateHint")}
              </p>
            )}

            {isCurrentPlayer ? (
              <CategorySignpost
                categories={state.availableCategories}
                rerollAvailable={!state.rerollUsedThisTurn}
                onSelect={handleSelectCategory}
                onReroll={() => send({ type: "reroll_categories" })}
                rerollUsedLabel={t("game.rerollUsed")}
                rerollLabel={t("game.reroll")}
              />
            ) : (
              <div className="py-10 flex flex-col items-center gap-4">
                <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
                <p className="text-sm text-muted-foreground font-semibold">{t("game.waiting")}</p>
              </div>
            )}
          </section>
        )}

        {/* ── SELBSTEINSCHÄTZUNG ───────────────────────────────── */}
        {state.status === "self_rating" && (
          <section className="w-full space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tight">
                {state.currentCategoryLabel}
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                {isCurrentPlayer
                  ? t("game.whereAreYou")
                  : t("game.selfRatingOther", { name: currentPlayer?.name ?? "-" })}
              </p>
            </div>

            {isCurrentPlayer ? (
              !hasSubmitted ? (
                <>
                  {state.phaseDeadline != null && (
                    <div className="flex justify-center">
                      <CountdownTimer deadline={state.phaseDeadline} />
                    </div>
                  )}
                  <GameSlider
                    value={sliderValue}
                    onChange={setSliderValue}
                    leftLabel={state.currentCategoryLeftLabel}
                    rightLabel={state.currentCategoryRightLabel}
                    showValue
                  />
                  <Button
                    className="w-full py-6 text-lg font-black rounded-full"
                    onClick={handleSubmitRating}
                  >
                    {t("game.lockIn")}
                  </Button>
                </>
              ) : (
                <div className="py-10 text-center space-y-2">
                  <div className="text-6xl font-black text-primary">{sliderValue}</div>
                  <p className="text-muted-foreground font-semibold">{t("game.hidden")}</p>
                </div>
              )
            ) : (
              <div className="flex justify-center py-10">
                <div className="w-20 h-20 rounded-full border-8 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </section>
        )}

        {/* ── RATEN ───────────────────────────────────────────── */}
        {state.status === "guessing" && (
          <section className="w-full space-y-6">
            <div className="text-center">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tight">
                {state.currentCategoryLabel}
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                {isCurrentPlayer
                  ? t("game.friendsGuessing", { submitted: state.guessesSubmitted, total: state.guessesTotal })
                  : t("game.guessPrompt", { name: currentPlayer?.name ?? "-" })}
              </p>
            </div>

            {!isCurrentPlayer ? (
              !hasSubmitted ? (
                <>
                  {state.phaseDeadline != null && (
                    <div className="flex justify-center">
                      <CountdownTimer deadline={state.phaseDeadline} />
                    </div>
                  )}
                  <GameSlider
                    value={sliderValue}
                    onChange={setSliderValue}
                    leftLabel={state.currentCategoryLeftLabel}
                    rightLabel={state.currentCategoryRightLabel}
                    showValue
                  />
                  <Button
                    className="w-full py-6 text-lg font-black rounded-full"
                    onClick={handleSubmitGuess}
                  >
                    {t("game.submitGuess")}
                  </Button>
                </>
              ) : (
                <div className="py-6 text-center space-y-2">
                  <div className="text-5xl font-black text-primary">
                    {state.guessesSubmitted}/{state.guessesTotal}
                  </div>
                  <p className="text-muted-foreground font-semibold">{t("game.guessSubmitted")}</p>
                </div>
              )
            ) : (
              <div className="py-6 flex flex-col items-center gap-3">
                <div className="text-6xl font-black text-primary tabular-nums">
                  {state.guessesSubmitted}/{state.guessesTotal}
                </div>
                <div className="text-muted-foreground font-bold uppercase tracking-wider text-sm">
                  {t("game.guessesReceived")}
                </div>
                <div className="w-full max-w-xs bg-white/10 rounded-full h-2 mt-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{
                      width: `${state.guessesTotal > 0 ? (state.guessesSubmitted / state.guessesTotal) * 100 : 0}%`,
                    }}
                  />
                </div>
              </div>
            )}

            <PendingGuessersCard state={state} />
          </section>
        )}

        {/* ── RUNDEN-ERGEBNIS ─────────────────────────────────── */}
        {state.status === "round_results" && state.roundResults && (
          <section className="w-full space-y-6 animate-in fade-in duration-500">
            <div className="text-center">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tight">
                {t("game.reveal")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("game.revealSubtitle", {
                  name: currentPlayer?.name ?? "-",
                  category: state.currentCategoryLabel ?? "-",
                })}
              </p>
            </div>

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

            <div className="divide-y divide-white/10">
              {[...state.roundResults]
                .sort((a, b) => b.points - a.points)
                .map((r, i) => {
                  const color = colorForIndex(
                    state.roundResults!.findIndex((x) => x.playerId === r.playerId),
                  );
                  return (
                    <div
                      key={r.playerId}
                      className="px-2 py-3 flex items-center justify-between animate-in slide-in-from-bottom-4"
                      style={{
                        animationDelay: `${i * 100}ms`,
                        animationFillMode: "both",
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className="w-9 h-9 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
                          style={{ background: color.bg, color: color.text }}
                        >
                          {r.playerName.substring(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-base truncate">{r.playerName}</div>
                          <div className="text-xs text-muted-foreground">Δ {r.diff}</div>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0 ml-2">
                        <div className="font-black text-2xl text-primary tabular-nums">+{r.points}</div>
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
              className="w-full py-6 text-lg font-black rounded-full mt-2"
              onClick={handleNextTurn}
            >
              {isLastTurn ? t("game.endGame") : t("game.continue")}
            </Button>
          </section>
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
                  className={`flex items-center gap-3 px-2 py-2.5 rounded-lg ${
                    isMe ? "bg-primary/10" : ""
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

// ── Countdown Timer ────────────────────────────────────────────────────────

const TIMER_TOTAL_MS = 60_000; // mirrors GAMEPLAY_CONFIG.SELF_RATING_TIMEOUT_MS / GUESSING_TIMEOUT_MS

function CountdownTimer({ deadline }: { deadline: number }) {
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));
  const { t } = useI18n();

  useEffect(() => {
    setRemaining(Math.max(0, deadline - Date.now()));
    intervalRef.current = setInterval(() => {
      const left = Math.max(0, deadline - Date.now());
      setRemaining(left);
      if (left === 0 && intervalRef.current !== null) {
        clearInterval(intervalRef.current);
      }
    }, 200);
    return () => {
      if (intervalRef.current !== null) clearInterval(intervalRef.current);
    };
  }, [deadline]);

  const seconds = Math.ceil(remaining / 1000);
  const progress = remaining / TIMER_TOTAL_MS; // 1 → 0
  const isUrgent = remaining <= 10_000;

  // SVG ring parameters
  const r = 18;
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - progress);

  return (
    <div className={cn("flex items-center gap-2", isUrgent ? "text-destructive" : "text-muted-foreground")}>
      <svg width={48} height={48} className="shrink-0 -rotate-90">
        {/* background ring */}
        <circle cx={24} cy={24} r={r} fill="none" strokeWidth={4} className="stroke-border" />
        {/* progress ring */}
        <circle
          cx={24}
          cy={24}
          r={r}
          fill="none"
          strokeWidth={4}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          className={cn(
            "transition-all duration-200",
            isUrgent ? "stroke-destructive" : "stroke-primary",
          )}
        />
      </svg>
      <span className="tabular-nums font-black text-2xl w-10 text-center">
        {t("game.timerSeconds", { seconds })}
      </span>
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
    <div className="space-y-2 pt-2">
        {pending.length > 0 && (
          <div>
            <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mb-1">
              {t("game.pending")}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {pending.map((p) => (
                <span
                  key={p.id}
                  className="text-xs font-bold px-2.5 py-1 rounded-full bg-white/10 text-foreground"
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
      </div>
  );
}

// ── Wooden Signpost category picker ────────────────────────────────────────

type Category = {
  id: string;
  label: string;
  leftLabel: string;
  rightLabel: string;
};

const SPIN_DURATION_MS = 1200;
const SPIN_HALF_MS = 600;
const SPIN_STAGGER_MS = 110;
const ENTER_DURATION_MS = 650;
const ENTER_STAGGER_MS = 140;
const FALL_DURATION_MS = 750;
const FALL_STAGGER_MS = 80;
const FLY_OUT_DELAY_MS = 580;
const FLY_OUT_DURATION_MS = 650;
const SELECT_TOTAL_MS = FLY_OUT_DELAY_MS + FLY_OUT_DURATION_MS + 30;

function CategorySignpost({
  categories,
  rerollAvailable,
  onSelect,
  onReroll,
  rerollLabel,
  rerollUsedLabel,
}: {
  categories: Category[];
  rerollAvailable: boolean;
  onSelect: (id: string) => void;
  onReroll: () => void;
  rerollLabel: string;
  rerollUsedLabel: string;
}) {
  const [displayed, setDisplayed] = useState<Category[]>(categories);
  const [phase, setPhase] = useState<"enter" | "spin" | "idle" | "select">("enter");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const prevIdsRef = useRef<string>(categories.map((c) => c.id).join(","));

  // End the initial enter phase after the last sign's enter animation finishes.
  useEffect(() => {
    const enterEnd =
      ENTER_DURATION_MS + (categories.length - 1) * ENTER_STAGGER_MS + 40;
    const t = setTimeout(
      () => setPhase((p) => (p === "enter" ? "idle" : p)),
      enterEnd,
    );
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Trigger a spin whenever the category set actually changes.
  useEffect(() => {
    const newIds = categories.map((c) => c.id).join(",");
    if (newIds === prevIdsRef.current) return;
    prevIdsRef.current = newIds;
    // A spin from the server overrides any in-flight selection animation.
    setSelectedId(null);
    setPhase("spin");

    // Swap each slot's content at the midpoint of its own (staggered) spin,
    // so the new label appears while the sign is edge-on.
    const swaps = categories.map((_, i) =>
      setTimeout(
        () =>
          setDisplayed((prev) => {
            const next = prev.slice();
            next[i] = categories[i]!;
            return next;
          }),
        i * SPIN_STAGGER_MS + SPIN_HALF_MS,
      ),
    );

    // Idle only after the LAST sign actually finishes — prevents the
    // last sign from being cut off mid-rotation.
    const lastEnd =
      (categories.length - 1) * SPIN_STAGGER_MS + SPIN_DURATION_MS + 40;
    const done = setTimeout(() => setPhase("idle"), lastEnd);

    return () => {
      swaps.forEach(clearTimeout);
      clearTimeout(done);
    };
  }, [categories]);

  // Fire the actual selection only after the chosen sign has flown off-screen.
  useEffect(() => {
    if (phase !== "select" || !selectedId) return;
    const t = setTimeout(() => onSelect(selectedId), SELECT_TOTAL_MS);
    return () => clearTimeout(t);
  }, [phase, selectedId, onSelect]);

  // While the selection animation plays, let signs escape the narrow
  // `max-w-xl` main column — the page root already has `overflow-hidden`,
  // so the viewport edge becomes the clipping boundary.
  useEffect(() => {
    if (phase !== "select") return;
    const main = document.querySelector("main");
    if (!main) return;
    const prevOverflow = main.style.overflow;
    main.style.overflow = "visible";
    return () => {
      main.style.overflow = prevOverflow;
    };
  }, [phase]);

  const handlePick = (id: string) => {
    if (phase !== "idle" || selectedId) return;
    setSelectedId(id);
    setPhase("select");
  };

  return (
    <div className="mt-6 space-y-4" style={{ perspective: "900px" }}>
      {displayed.map((cat, i) => {
        // Alternating: idx 0 from right, 1 from left, 2 from right
        const fromRight = i % 2 === 0;
        const pointsLeft = fromRight; // arrow tip points to where the sign came from
        const enterClass = fromRight ? "sign-enter-from-right" : "sign-enter-from-left";
        const spinClass = fromRight ? "sign-spin-right" : "sign-spin-left";

        const isChosen = phase === "select" && cat.id === selectedId;
        const isFallingAside = phase === "select" && !isChosen;
        const flyOutClass = pointsLeft ? "sign-fly-out-left" : "sign-fly-out-right";
        // Non-chosen signs fall away from their own arrow side so they don't
        // pile under the chosen one.
        const fallClass = pointsLeft ? "sign-fall-right" : "sign-fall-left";

        let animClass = "";
        let delay = 0;
        if (phase === "spin") {
          animClass = spinClass;
          delay = i * SPIN_STAGGER_MS;
        } else if (phase === "enter") {
          animClass = enterClass;
          delay = i * ENTER_STAGGER_MS;
        } else if (isChosen) {
          animClass = flyOutClass;
          delay = FLY_OUT_DELAY_MS;
        } else if (isFallingAside) {
          animClass = fallClass;
          // tiny stagger based on slot index (skipping the chosen one)
          delay = i * FALL_STAGGER_MS;
        }

        return (
          <WoodenSign
            // Stable per-slot key: keeps the DOM node mounted across content
            // swaps so the spin animation isn't restarted from 0deg mid-flight.
            key={i}
            pointsLeft={pointsLeft}
            animationClass={animClass}
            delay={delay}
            zIndex={isChosen ? 30 : isFallingAside ? 1 : 5}
            textureOffsetY={[25, 58, 88][i] ?? i * 30}
            xShiftPx={i === 1 ? 52 : 0}
            shrinkRightPx={i === 1 ? 0 : 52}
            onClick={() => handlePick(cat.id)}
            title={cat.label}
            leftLabel={cat.leftLabel}
            rightLabel={cat.rightLabel}
          />
        );
      })}
      <div className="flex justify-center mt-4">
        <button
          onClick={() => {
            if (phase === "idle" && rerollAvailable) onReroll();
          }}
          disabled={!rerollAvailable || phase !== "idle"}
          title={rerollAvailable ? rerollLabel : rerollUsedLabel}
          className={cn(
            "relative w-14 h-14 rounded-full overflow-hidden disabled:opacity-40 transition-[filter,transform,opacity] duration-200",
            "hover:enabled:brightness-125 hover:enabled:[transform:rotate(30deg)]",
            phase === "spin" && rerollAvailable ? "reroll-spinning" : "",
            phase === "select" ? "opacity-0 pointer-events-none" : "",
          )}
          style={{
            backgroundColor: WOOD_FALLBACK_BG,
            backgroundImage: `url(${woodTexture})`,
            backgroundSize: "260%",
            backgroundPosition: "center 58%",
            boxShadow:
              "rgba(0,0,0,0.55) 0px 3px 10px, rgba(0,0,0,0.35) 0px -4px 0px inset, rgba(255,255,255,0.10) 0px 2px 0px inset",
            filter: "brightness(0.78) saturate(0.9)",
          }}
        >
          <span
            className="absolute inset-0 flex items-center justify-center text-2xl"
            style={{ textShadow: "0 2px 6px rgba(0,0,0,0.8)" }}
          >
            ↻
          </span>
        </button>
      </div>
    </div>
  );
}

function WoodenSign({
  pointsLeft,
  animationClass,
  delay,
  zIndex,
  textureOffsetY,
  xShiftPx,
  shrinkRightPx,
  onClick,
  title,
  leftLabel,
  rightLabel,
}: {
  pointsLeft: boolean;
  animationClass: string;
  delay: number;
  zIndex?: number;
  textureOffsetY: number;
  xShiftPx: number;
  shrinkRightPx: number;
  onClick: () => void;
  title: string;
  leftLabel: string;
  rightLabel: string;
}) {
  const clipPath = pointsLeft
    ? "polygon(52px 0, 100% 0, 100% 100%, 52px 100%, 0 50%)"
    : "polygon(0 0, calc(100% - 52px) 0, 100% 50%, calc(100% - 52px) 100%, 0 100%)";

  const bgPos = `center ${textureOffsetY}%`;

  // Depth slices: fill the sign's thickness (back → just behind front)
  const depthSlices = [-8, -5, -2, 1, 4];

  return (
    <button
      onClick={onClick}
      className={cn("relative block group", animationClass)}
      style={{
        width:
          shrinkRightPx || xShiftPx
            ? `calc(100% - ${shrinkRightPx + xShiftPx}px)`
            : "100%",
        marginLeft: xShiftPx,
        animationDelay: `${delay}ms`,
        animationFillMode: "both",
        transformOrigin: "50% 50%",
        willChange: "transform",
        transformStyle: "preserve-3d",
        zIndex,
      }}
    >
      {/* Thickness: dark wood layers filling back → middle */}
      {depthSlices.map((z) => (
        <div
          key={z}
          aria-hidden
          className="absolute inset-0 pointer-events-none"
          style={{
            clipPath,
            transform: `translateZ(${z}px)`,
            backgroundColor: WOOD_DARK_FALLBACK_BG,
            backgroundImage: `url(${woodTexture})`,
            backgroundSize: "160% auto",
            backgroundPosition: bgPos,
            backgroundRepeat: "no-repeat",
            filter: "brightness(0.15) saturate(0.4)",
          }}
        />
      ))}

      {/* Front face – full wood texture + content */}
      <div
        className="relative w-full group-hover:brightness-110 group-active:brightness-95 transition-[filter] duration-150"
        style={{
          clipPath,
          transform: "translateZ(9px)",
          backgroundColor: WOOD_FALLBACK_BG,
          backgroundImage: `url(${woodTexture})`,
          backgroundSize: "160% auto",
          backgroundPosition: bgPos,
          backgroundRepeat: "no-repeat",
          boxShadow:
            "inset 0 -5px 0 rgba(0,0,0,0.35), inset 0 2px 0 rgba(255,255,255,0.12), inset 0 0 50px rgba(0,0,0,0.2)",
          paddingTop: 18,
          paddingBottom: 20,
          paddingLeft: pointsLeft ? 68 : 22,
          paddingRight: pointsLeft ? 22 : 68,
          textAlign: pointsLeft ? "right" : "left",
        }}
      >
        <div
          className="font-black text-2xl text-amber-50 leading-tight"
          style={{ textShadow: "0 2px 4px rgba(0,0,0,0.8)" }}
        >
          {title}
        </div>
        <div
          className={cn(
            "flex items-center gap-2 mt-1 text-[11px] font-bold uppercase tracking-wider text-amber-200/80",
            pointsLeft ? "justify-end" : "justify-start",
          )}
        >
          <span>{leftLabel}</span>
          <span className="opacity-50">⇄</span>
          <span>{rightLabel}</span>
        </div>
      </div>
    </button>
  );
}
