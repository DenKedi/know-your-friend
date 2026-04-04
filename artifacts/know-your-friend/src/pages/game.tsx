import { useEffect, useState } from "react";
import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GameSlider } from "@/components/game-slider";
import { Progress } from "@/components/ui/progress";

export default function Game() {
  const [match, params] = useRoute("/room/:code/game");
  const roomCode = params?.code;
  const [, setLocation] = useLocation();
  const { state, send, isConnected } = useGameSocket(roomCode);
  const [sliderValue, setSliderValue] = useState(50);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  useEffect(() => {
    if (state?.status === "game_over") {
      setLocation(`/room/${roomCode}/results`);
    } else if (state?.status === "waiting") {
      setLocation(`/room/${roomCode}/lobby`);
    }
  }, [state?.status, roomCode, setLocation]);

  useEffect(() => {
    // Reset submission state on phase change
    setHasSubmitted(false);
    setSliderValue(50);
  }, [state?.status, state?.currentRound]);

  if (!match || !roomCode || !state) return null;

  const playerId = sessionStorage.getItem(`kyf_id_${roomCode}`);
  const me = state.players.find(p => p.id === playerId);
  const isCurrentPlayer = state.currentPlayerId === playerId;
  const currentPlayer = state.players.find(p => p.id === state.currentPlayerId);
  const isHost = me?.isHost;

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

  const leaveRoom = () => {
    setLocation("/");
  };

  return (
    <div className="min-h-[100dvh] flex flex-col bg-background">
      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-border bg-card">
        <Button variant="ghost" size="sm" onClick={leaveRoom}>Leave</Button>
        <div className="flex flex-col items-center">
          <span className="text-xs font-bold text-muted-foreground uppercase">Round {state.currentRound} of {state.totalRounds}</span>
          <Progress value={(state.currentRound / state.totalRounds) * 100} className="w-32 h-2 mt-1" />
        </div>
        <div className="font-bold bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm">
          {me?.score || 0} pts
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center p-4 max-w-3xl mx-auto w-full mt-4 md:mt-8">
        
        {state.status === "category_selection" && (
          <Card className="w-full bg-card border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
            <CardHeader>
              <CardTitle className="text-2xl text-center">
                {isCurrentPlayer ? "Pick a Category" : "Waiting for " + currentPlayer?.name + " to pick..."}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {isCurrentPlayer ? (
                <div className="space-y-3">
                  {state.availableCategories.map(cat => (
                    <Button 
                      key={cat.id} 
                      variant="outline" 
                      className="w-full justify-start text-lg py-6 h-auto font-bold"
                      onClick={() => handleSelectCategory(cat.id)}
                    >
                      {cat.label}
                      <span className="ml-auto text-xs text-muted-foreground font-normal">
                        {cat.leftLabel} ↔ {cat.rightLabel}
                      </span>
                    </Button>
                  ))}
                </div>
              ) : (
                <div className="py-12 flex justify-center">
                  <div className="animate-pulse w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center">
                    <div className="w-8 h-8 rounded-full bg-primary" />
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {state.status === "self_rating" && (
          <div className="w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tight">{state.currentCategoryLabel}</h2>
              <p className="text-lg font-medium text-muted-foreground">
                {isCurrentPlayer ? "Where do you place yourself?" : `Shhh... ${currentPlayer?.name} is rating themselves`}
              </p>
            </div>

            {isCurrentPlayer ? (
              <Card className="border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
                <CardContent className="pt-6">
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
                        className="w-full py-8 text-xl font-bold mt-8"
                        onClick={handleSubmitRating}
                      >
                        Lock it in
                      </Button>
                    </>
                  ) : (
                    <div className="py-12 text-center text-xl font-bold text-muted-foreground">
                      Rating hidden. Waiting for friends to guess...
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex justify-center py-20">
                <div className="w-32 h-32 rounded-full border-8 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}

        {state.status === "guessing" && (
          <div className="w-full space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tight">{state.currentCategoryLabel}</h2>
              <p className="text-lg font-medium text-muted-foreground">
                {isCurrentPlayer 
                  ? `Your friends are guessing... (${state.guessesSubmitted}/${state.guessesTotal})` 
                  : `Where did ${currentPlayer?.name} place themselves?`}
              </p>
            </div>

            <Card className="border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
              <CardContent className="pt-6">
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
                        className="w-full py-8 text-xl font-bold mt-8"
                        onClick={handleSubmitGuess}
                      >
                        Submit Guess
                      </Button>
                    </>
                  ) : (
                    <div className="py-12 text-center text-xl font-bold text-muted-foreground">
                      Guess submitted! Waiting for others... ({state.guessesSubmitted}/{state.guessesTotal})
                    </div>
                  )
                ) : (
                  <div className="py-12 flex flex-col items-center">
                    <div className="text-5xl font-black mb-4 text-primary">
                      {state.guessesSubmitted} / {state.guessesTotal}
                    </div>
                    <div className="text-muted-foreground font-bold uppercase tracking-wider">Guesses in</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {state.status === "round_results" && state.roundResults && (
          <div className="w-full space-y-6 animate-in fade-in zoom-in duration-500">
            <div className="text-center space-y-2">
              <h2 className="text-3xl font-black text-primary uppercase tracking-tight">The Truth Revealed!</h2>
              <p className="text-lg font-medium text-muted-foreground">Category: {state.currentCategoryLabel}</p>
            </div>

            <Card className="border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)] overflow-hidden">
              <CardContent className="pt-8 pb-8">
                <GameSlider 
                  disabled
                  leftLabel={state.currentCategoryLeftLabel}
                  rightLabel={state.currentCategoryRightLabel}
                  markers={[
                    ...state.roundResults.map((r, i) => ({
                      value: r.guess,
                      label: r.playerName,
                      color: `bg-chart-${(i % 5) + 1}`
                    })),
                    {
                      value: state.selfRating || 0,
                      label: `${currentPlayer?.name}'s rating`,
                      isTruth: true
                    }
                  ]}
                />
              </CardContent>
            </Card>

            <div className="grid gap-3 mt-8">
              {state.roundResults.sort((a, b) => b.points - a.points).map((r, i) => (
                <div 
                  key={r.playerId} 
                  className="bg-card p-4 rounded-xl border-2 border-border flex items-center justify-between animate-in slide-in-from-bottom-4"
                  style={{ animationDelay: `${i * 150}ms`, animationFillMode: 'both' }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center font-black text-secondary-foreground">
                      {i + 1}
                    </div>
                    <span className="font-bold text-lg">{r.playerName}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-black text-xl text-primary">+{r.points} pts</div>
                    <div className="text-xs text-muted-foreground font-bold">Diff: {r.diff}</div>
                  </div>
                </div>
              ))}
            </div>

            {(isHost || isCurrentPlayer) && (
              <Button 
                className="w-full py-8 text-xl font-bold mt-4"
                onClick={handleNextTurn}
              >
                {state.currentRound >= state.totalRounds ? "Finish Game" : "Next Round"}
              </Button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
