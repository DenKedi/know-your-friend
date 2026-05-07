/**
 * DEV PREVIEW — navigate to /dev to preview game screens with mock data.
 * Not shown in production builds (see App.tsx for the import.meta.env.DEV guard).
 */

import { useState } from "react";
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
import { useI18n } from "@/lib/i18n";
import type { GameRoomState } from "@/hooks/use-game-socket";

// ─── colour palette shared with game.tsx ────────────────────────────────────
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

// ─── place styles shared with results.tsx ───────────────────────────────────
const PLACE_STYLES = [
  { ring: "ring-2 ring-white/60", label: "bg-white text-black" },
  { ring: "ring-2 ring-muted-foreground/40", label: "bg-muted text-muted-foreground" },
  { ring: "", label: "bg-secondary/30 text-foreground" },
];

// ─── screen descriptors ─────────────────────────────────────────────────────
type ScreenId =
  | "category_selection_current"
  | "category_selection_other"
  | "self_rating_current"
  | "self_rating_submitted"
  | "self_rating_other"
  | "guessing_guesser"
  | "guessing_submitted"
  | "guessing_current"
  | "round_results"
  | "game_over";

const SCREENS: { id: ScreenId; label: string; group: string }[] = [
  { id: "category_selection_current", label: "You pick", group: "Category Selection" },
  { id: "category_selection_other", label: "Waiting", group: "Category Selection" },
  { id: "self_rating_current", label: "Rate yourself", group: "Self Rating" },
  { id: "self_rating_submitted", label: "Submitted", group: "Self Rating" },
  { id: "self_rating_other", label: "Waiting", group: "Self Rating" },
  { id: "guessing_guesser", label: "Submit guess", group: "Guessing" },
  { id: "guessing_submitted", label: "Guess sent", group: "Guessing" },
  { id: "guessing_current", label: "Waiting for guesses", group: "Guessing" },
  { id: "round_results", label: "Round Results", group: "Round Results" },
  { id: "game_over", label: "Final Results", group: "Final Results" },
];

// ─── mock data ───────────────────────────────────────────────────────────────
const MOCK_PLAYERS = [
  { id: "p1", name: "Alice", score: 47, isHost: true },
  { id: "p2", name: "Bob", score: 31, isHost: false },
  { id: "p3", name: "Carol", score: 22, isHost: false },
  { id: "p4", name: "Dave", score: 58, isHost: false },
];

const MOCK_CATEGORIES = [
  { id: "c1", label: "Introversion vs. Extraversion", leftLabel: "Introvert", rightLabel: "Extravert" },
  { id: "c2", label: "Risk Tolerance", leftLabel: "Risk-Averse", rightLabel: "Risk-Taker" },
  { id: "c3", label: "Punctuality", leftLabel: "Always Late", rightLabel: "Always Early" },
];

function randomInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

interface MockConfig {
  selfRating: number;
  sliderValue: number;
  guessesSubmitted: number;
  guessesTotal: number;
  rerollUsed: boolean;
  currentRound: number;
  totalRounds: number;
}

function defaultConfig(): MockConfig {
  return {
    selfRating: 67,
    sliderValue: 50,
    guessesSubmitted: 2,
    guessesTotal: 3,
    rerollUsed: false,
    currentRound: 2,
    totalRounds: 5,
  };
}

function randomConfig(): MockConfig {
  return {
    selfRating: randomInt(10, 90),
    sliderValue: randomInt(10, 90),
    guessesSubmitted: randomInt(0, 3),
    guessesTotal: 3,
    rerollUsed: Math.random() > 0.5,
    currentRound: randomInt(1, 5),
    totalRounds: randomInt(3, 8),
  };
}

// ─── PendingGuessersCard (copy from game.tsx) ────────────────────────────────
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
  const pending = (state.pendingGuesserIds ?? [])
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as { id: string; name: string }[];
  const guessed = (state.guessedPlayerIds ?? [])
    .map((id) => state.players.find((p) => p.id === id))
    .filter(Boolean) as { id: string; name: string }[];
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

// ─── build a full GameRoomState from screen + config ─────────────────────────
function buildMockState(screen: ScreenId, cfg: MockConfig): GameRoomState & { __playerId: string } {
  const isCurrent =
    screen === "category_selection_current" ||
    screen === "self_rating_current" ||
    screen === "self_rating_submitted" ||
    screen === "guessing_current";

  const playerId = isCurrent ? "p1" : "p2";
  const currentPlayerId = "p1";

  const roundResults = [
    { playerId: "p2", playerName: "Bob",   guess: cfg.selfRating - 8,  selfRating: cfg.selfRating, diff: 8,  points: 6 },
    { playerId: "p3", playerName: "Carol", guess: cfg.selfRating + 15, selfRating: cfg.selfRating, diff: 15, points: 3 },
    { playerId: "p4", playerName: "Dave",  guess: cfg.selfRating - 2,  selfRating: cfg.selfRating, diff: 2,  points: 9 },
  ];

  const statusMap: Record<ScreenId, GameRoomState["status"]> = {
    category_selection_current: "category_selection",
    category_selection_other:   "category_selection",
    self_rating_current:        "self_rating",
    self_rating_submitted:      "self_rating",
    self_rating_other:          "self_rating",
    guessing_guesser:           "guessing",
    guessing_submitted:         "guessing",
    guessing_current:           "guessing",
    round_results:              "round_results",
    game_over:                  "game_over",
  };

  return {
    __playerId: playerId,
    roomCode:   "DEMO",
    language:   "en",
    status:     statusMap[screen],
    players:    MOCK_PLAYERS,
    currentRound:  cfg.currentRound,
    totalRounds:   cfg.totalRounds,
    currentPlayerId,
    currentCategory:          MOCK_CATEGORIES[0]!.id,
    currentCategoryLabel:     MOCK_CATEGORIES[0]!.label,
    currentCategoryLeftLabel: MOCK_CATEGORIES[0]!.leftLabel,
    currentCategoryRightLabel: MOCK_CATEGORIES[0]!.rightLabel,
    selfRating:         cfg.selfRating,
    guessesSubmitted:   cfg.guessesSubmitted,
    guessesTotal:       cfg.guessesTotal,
    roundResults:       screen === "round_results" ? roundResults : null,
    availableCategories: MOCK_CATEGORIES,
    nextPlayerId:  "p2",
    rerollUsedThisTurn: cfg.rerollUsed,
    pendingGuesserIds: ["p3"],
    guessedPlayerIds:  ["p2", "p4"],
  };
}

// ─── GameScreenPreview ────────────────────────────────────────────────────────
function GameScreenPreview({
  screen,
  cfg,
}: {
  screen: ScreenId;
  cfg: MockConfig;
}) {
  const { t } = useI18n();
  const mockState = buildMockState(screen, cfg);
  const playerId = mockState.__playerId;
  const me = mockState.players.find((p) => p.id === playerId);
  const isCurrentPlayer = mockState.currentPlayerId === playerId;
  const currentPlayer = mockState.players.find((p) => p.id === mockState.currentPlayerId);
  const nextPlayer = mockState.players.find((p) => p.id === mockState.nextPlayerId);

  const [localSlider, setLocalSlider] = useState(cfg.sliderValue);
  const [showStandings, setShowStandings] = useState(false);

  const sortedStandings = [...mockState.players].sort((a, b) => b.score - a.score);
  const hasSubmitted = screen === "self_rating_submitted" || screen === "guessing_submitted";
  const isLastTurn = mockState.currentRound >= mockState.totalRounds &&
    mockState.players.length > 0 &&
    mockState.currentPlayerId === mockState.players[mockState.players.length - 1]?.id;

  // ── Final Results (game_over) ───────────────────────────────────────────
  if (screen === "game_over") {
    const sortedPlayers = [...mockState.players].sort((a, b) => b.score - a.score);
    const winner = sortedPlayers[0];

    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-lg text-center mb-8 animate-in slide-in-from-top-8 duration-700">
          <h1 className="text-5xl font-black text-primary uppercase tracking-tight mb-3">
            {t("results.title")}
          </h1>
          <p className="text-xl font-bold text-foreground">
            {t("results.subtitle", { name: winner?.name ?? "-" })}
          </p>
        </div>

        <Card className="w-full max-w-lg border-2 border-border shadow-lg">
          <CardHeader className="border-b border-border pb-4 pt-5 px-5">
            <CardTitle className="text-2xl font-black text-center uppercase tracking-wider">
              {t("results.scoreboard")}
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 py-4 space-y-2.5">
            {sortedPlayers.map((p, i) => {
              const placeStyle = PLACE_STYLES[i] ?? PLACE_STYLES[2]!;
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
                        {t("results.winner")}
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

        <div
          className="mt-8 w-full max-w-lg animate-in fade-in duration-1000 delay-700"
          style={{ animationFillMode: "both" }}
        >
          <Button size="lg" className="w-full text-lg font-black py-6 rounded-xl" disabled>
            {t("results.playAgain")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Game layout (all other screens) ────────────────────────────────────────
  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="px-4 py-3 flex items-center justify-between border-b border-border bg-card shrink-0 gap-2">
        <Button variant="ghost" size="sm" className="px-2" disabled>
          {t("game.leave")}
        </Button>
        <div className="flex flex-col items-center gap-1 flex-1 min-w-0">
          <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
            {t("game.roundCounter", {
              current: mockState.currentRound,
              total: mockState.totalRounds,
            })}
          </span>
          <Progress
            value={(mockState.currentRound / mockState.totalRounds) * 100}
            className="w-28 h-1.5"
          />
        </div>
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setShowStandings(true)}
            className="font-black bg-primary text-primary-foreground px-3 py-1.5 rounded-full text-sm tabular-nums hover:bg-primary/90 active:scale-95 transition-all"
          >
            {me?.score ?? 0} {t("game.pointsSuffix")}
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center px-4 py-5 max-w-xl mx-auto w-full overflow-y-auto">

        {/* ── CATEGORY SELECTION ─────────────────────────────── */}
        {mockState.status === "category_selection" && (
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
                  {mockState.availableCategories.map((cat) => (
                    <button
                      key={cat.id}
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
                    disabled={mockState.rerollUsedThisTurn}
                    className="w-full mt-1 font-bold"
                  >
                    {mockState.rerollUsedThisTurn ? t("game.rerollUsed") : t("game.reroll")}
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

        {/* ── SELF RATING ─────────────────────────────────────── */}
        {mockState.status === "self_rating" && (
          <div className="w-full space-y-4">
            <div className="text-center px-2">
              <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                {mockState.currentCategoryLabel}
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
                        value={localSlider}
                        onChange={setLocalSlider}
                        leftLabel={mockState.currentCategoryLeftLabel}
                        rightLabel={mockState.currentCategoryRightLabel}
                        showValue
                      />
                      <Button className="w-full py-7 text-lg font-black mt-4 rounded-xl">
                        {t("game.lockIn")}
                      </Button>
                    </>
                  ) : (
                    <div className="py-10 text-center space-y-2">
                      <div className="text-4xl font-black text-primary">{localSlider}</div>
                      <p className="text-muted-foreground font-semibold">{t("game.hidden")}</p>
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

        {/* ── GUESSING ────────────────────────────────────────── */}
        {mockState.status === "guessing" && (
          <div className="w-full space-y-4">
            <div className="text-center px-2">
              <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                {mockState.currentCategoryLabel}
              </h2>
              <p className="text-base text-muted-foreground mt-1">
                {isCurrentPlayer
                  ? t("game.friendsGuessing", {
                      submitted: mockState.guessesSubmitted,
                      total: mockState.guessesTotal,
                    })
                  : t("game.guessPrompt", { name: currentPlayer?.name ?? "-" })}
              </p>
            </div>

            <Card className="border-2 border-border shadow-lg">
              <CardContent className="px-4 pt-4 pb-5">
                {!isCurrentPlayer ? (
                  !hasSubmitted ? (
                    <>
                      <GameSlider
                        value={localSlider}
                        onChange={setLocalSlider}
                        leftLabel={mockState.currentCategoryLeftLabel}
                        rightLabel={mockState.currentCategoryRightLabel}
                        showValue
                      />
                      <Button className="w-full py-7 text-lg font-black mt-4 rounded-xl">
                        {t("game.submitGuess")}
                      </Button>
                    </>
                  ) : (
                    <div className="py-6 text-center space-y-2">
                      <div className="text-4xl font-black text-primary">
                        {mockState.guessesSubmitted}/{mockState.guessesTotal}
                      </div>
                      <p className="text-muted-foreground font-semibold">
                        {t("game.guessSubmitted")}
                      </p>
                    </div>
                  )
                ) : (
                  <div className="py-6 flex flex-col items-center gap-3">
                    <div className="text-5xl font-black text-primary tabular-nums">
                      {mockState.guessesSubmitted}/{mockState.guessesTotal}
                    </div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider text-sm">
                      {t("game.guessesReceived")}
                    </div>
                    <div className="w-full bg-input rounded-full h-2 mt-2">
                      <div
                        className="bg-primary h-2 rounded-full transition-all duration-500"
                        style={{
                          width: `${mockState.guessesTotal > 0
                            ? (mockState.guessesSubmitted / mockState.guessesTotal) * 100
                            : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <PendingGuessersCard state={mockState} />
          </div>
        )}

        {/* ── ROUND RESULTS ───────────────────────────────────── */}
        {mockState.status === "round_results" && mockState.roundResults && (
          <div className="w-full space-y-4 animate-in fade-in duration-500">
            <div className="text-center px-2">
              <h2 className="text-2xl font-black text-primary uppercase tracking-tight">
                {t("game.reveal")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                {t("game.revealSubtitle", {
                  name: currentPlayer?.name ?? "-",
                  category: mockState.currentCategoryLabel ?? "-",
                })}
              </p>
            </div>

            <Card className="border-2 border-border shadow-lg overflow-hidden">
              <CardContent className="px-4 pt-4 pb-5">
                <GameSlider
                  disabled
                  leftLabel={mockState.currentCategoryLeftLabel}
                  rightLabel={mockState.currentCategoryRightLabel}
                  markers={[
                    ...mockState.roundResults.map((r) => ({
                      value: r.guess,
                      label: r.playerName,
                    })),
                    {
                      value: mockState.selfRating ?? 0,
                      label: currentPlayer?.name ?? t("game.truth"),
                      isTruth: true,
                    },
                  ]}
                />
              </CardContent>
            </Card>

            <div className="space-y-2">
              {[...mockState.roundResults]
                .sort((a, b) => b.points - a.points)
                .map((r, i) => {
                  const color = colorForIndex(
                    mockState.roundResults!.findIndex((x) => x.playerId === r.playerId),
                  );
                  return (
                    <div
                      key={r.playerId}
                      className="bg-card rounded-xl border border-border px-4 py-3 flex items-center justify-between animate-in slide-in-from-bottom-4"
                      style={{ animationDelay: `${i * 100}ms`, animationFillMode: "both" }}
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
                              truth: mockState.selfRating ?? 0,
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

            {!isLastTurn && nextPlayer && (
              <div className="text-center text-sm text-muted-foreground">
                {t("game.nextUp", { name: nextPlayer.name })}
              </div>
            )}

            <Button className="w-full py-6 text-lg font-black rounded-xl mt-1" disabled>
              {isLastTurn ? t("game.endGame") : t("game.continue")}
            </Button>
          </div>
        )}
      </main>

      {/* Standings dialog */}
      <Dialog open={showStandings} onOpenChange={setShowStandings}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight text-center">
              {t("game.standings")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {sortedStandings.map((p, i) => {
              const originalIdx = mockState.players.findIndex((pl) => pl.id === p.id);
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
                    {p.name}{" "}
                    {isMe && (
                      <span className="text-xs text-muted-foreground font-normal">
                        ({t("common.you")})
                      </span>
                    )}
                  </div>
                  <div className="font-black text-lg text-primary tabular-nums">{p.score}</div>
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Dev toolbar ─────────────────────────────────────────────────────────────
function DevToolbar({
  cfg,
  onCfgChange,
  onRandomize,
  onReset,
}: {
  cfg: MockConfig;
  onCfgChange: (patch: Partial<MockConfig>) => void;
  onRandomize: () => void;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-3 text-xs">
      {/* Round */}
      <label className="flex items-center gap-1.5 text-muted-foreground font-semibold">
        Round
        <input
          type="number"
          min={1}
          max={cfg.totalRounds}
          value={cfg.currentRound}
          onChange={(e) => onCfgChange({ currentRound: Number(e.target.value) })}
          className="w-12 rounded border border-border bg-input px-1.5 py-0.5 text-foreground text-xs"
        />
        /
        <input
          type="number"
          min={1}
          max={20}
          value={cfg.totalRounds}
          onChange={(e) => onCfgChange({ totalRounds: Number(e.target.value) })}
          className="w-12 rounded border border-border bg-input px-1.5 py-0.5 text-foreground text-xs"
        />
      </label>

      {/* Self rating */}
      <label className="flex items-center gap-1.5 text-muted-foreground font-semibold">
        Self rating
        <input
          type="number"
          min={0}
          max={100}
          value={cfg.selfRating}
          onChange={(e) => onCfgChange({ selfRating: Number(e.target.value) })}
          className="w-14 rounded border border-border bg-input px-1.5 py-0.5 text-foreground text-xs"
        />
      </label>

      {/* Guesses */}
      <label className="flex items-center gap-1.5 text-muted-foreground font-semibold">
        Guesses
        <input
          type="number"
          min={0}
          max={cfg.guessesTotal}
          value={cfg.guessesSubmitted}
          onChange={(e) => onCfgChange({ guessesSubmitted: Number(e.target.value) })}
          className="w-12 rounded border border-border bg-input px-1.5 py-0.5 text-foreground text-xs"
        />
        /
        <input
          type="number"
          min={1}
          max={10}
          value={cfg.guessesTotal}
          onChange={(e) => onCfgChange({ guessesTotal: Number(e.target.value) })}
          className="w-12 rounded border border-border bg-input px-1.5 py-0.5 text-foreground text-xs"
        />
      </label>

      {/* Reroll used */}
      <label className="flex items-center gap-1.5 text-muted-foreground font-semibold cursor-pointer select-none">
        <input
          type="checkbox"
          checked={cfg.rerollUsed}
          onChange={(e) => onCfgChange({ rerollUsed: e.target.checked })}
          className="accent-primary"
        />
        Reroll used
      </label>

      <div className="flex gap-2 ml-auto">
        <Button size="sm" variant="outline" onClick={onRandomize} className="text-xs h-7 px-3">
          Randomize
        </Button>
        <Button size="sm" variant="ghost" onClick={onReset} className="text-xs h-7 px-3">
          Reset
        </Button>
      </div>
    </div>
  );
}

// ─── Main Dev page ────────────────────────────────────────────────────────────
export default function Dev() {
  const [selectedScreen, setSelectedScreen] = useState<ScreenId>("category_selection_current");
  const [cfg, setCfg] = useState<MockConfig>(defaultConfig());
  const [previewKey, setPreviewKey] = useState(0);

  const handleCfgChange = (patch: Partial<MockConfig>) => setCfg((c) => ({ ...c, ...patch }));

  const handleRandomize = () => {
    setCfg(randomConfig());
    setPreviewKey((k) => k + 1);
  };

  const handleReset = () => {
    setCfg(defaultConfig());
    setPreviewKey((k) => k + 1);
  };

  // Group screens by group label
  const groups = SCREENS.reduce<Record<string, typeof SCREENS>>(
    (acc, s) => ({ ...acc, [s.group]: [...(acc[s.group] ?? []), s] }),
    {},
  );

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* ── Dev chrome ─────────────────────────────────────────────────────── */}
      <div className="sticky top-0 z-50 bg-card border-b-2 border-primary/30 shadow-lg">
        {/* Top bar */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-border">
          <span className="font-black text-primary uppercase tracking-widest text-xs bg-primary/10 px-2 py-0.5 rounded-full">
            DEV PREVIEW
          </span>
          <span className="text-xs text-muted-foreground hidden sm:block">
            Preview game screens with mock data — buttons are non-functional
          </span>
          <a href="/" className="ml-auto text-xs text-muted-foreground underline hover:text-foreground">
            ← Back to app
          </a>
        </div>

        {/* Screen selector */}
        <div className="flex flex-wrap gap-1 px-4 py-2.5 border-b border-border">
          {Object.entries(groups).map(([group, screens]) => (
            <div key={group} className="flex items-center gap-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground/60 mr-0.5 hidden sm:block">
                {group}:
              </span>
              {screens.map((s) => (
                <button
                  key={s.id}
                  onClick={() => { setSelectedScreen(s.id); setPreviewKey((k) => k + 1); }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                    selectedScreen === s.id
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-input text-foreground border-border hover:border-primary/50"
                  }`}
                >
                  {s.label}
                </button>
              ))}
              <span className="text-border mx-1 hidden sm:block">|</span>
            </div>
          ))}
        </div>

        {/* Config toolbar */}
        <DevToolbar
          cfg={cfg}
          onCfgChange={handleCfgChange}
          onRandomize={handleRandomize}
          onReset={handleReset}
        />
      </div>

      {/* ── Preview area ────────────────────────────────────────────────────── */}
      <div className="flex-1">
        <GameScreenPreview key={previewKey} screen={selectedScreen} cfg={cfg} />
      </div>
    </div>
  );
}
