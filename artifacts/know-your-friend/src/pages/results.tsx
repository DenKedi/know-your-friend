import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useEffect, useState } from "react";

export default function Results() {
  const [match, params] = useRoute("/room/:code/results");
  const roomCode = params?.code;
  const [, setLocation] = useLocation();
  const { state } = useGameSocket(roomCode);
  const [showScores, setShowScores] = useState(false);

  useEffect(() => {
    // Add a slight delay before showing scores for dramatic effect
    const t = setTimeout(() => setShowScores(true), 500);
    return () => clearTimeout(t);
  }, []);

  if (!match || !roomCode) return null;

  if (!state || state.status !== "game_over") {
    return <div className="min-h-[100dvh] flex items-center justify-center text-xl font-bold">Loading results...</div>;
  }

  const sortedPlayers = [...state.players].sort((a, b) => b.score - a.score);
  const winner = sortedPlayers[0];

  return (
    <div className="min-h-[100dvh] bg-background p-4 md:p-8 flex flex-col items-center">
      <div className="w-full max-w-2xl text-center mt-8 mb-12 animate-in slide-in-from-top-8 duration-700">
        <h1 className="text-6xl md:text-8xl font-black text-primary uppercase tracking-tight mb-4 drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)]">
          Game Over!
        </h1>
        <div className="text-2xl md:text-3xl font-bold text-foreground">
          <span className="text-accent">{winner?.name}</span> knows everyone best.
        </div>
      </div>

      <Card className="w-full max-w-lg bg-card border-4 border-black/20 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.3)]">
        <CardHeader className="border-b border-border pb-6">
          <CardTitle className="text-3xl font-black text-center uppercase tracking-wider">
            Final Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6 px-4 md:px-8 space-y-4">
          {showScores && sortedPlayers.map((p, i) => (
            <div 
              key={p.id} 
              className="flex items-center justify-between p-4 rounded-2xl bg-input border-2 border-transparent hover:border-primary/50 transition-colors animate-in slide-in-from-bottom-8 fade-in"
              style={{ animationDelay: `${i * 200}ms`, animationFillMode: 'both' }}
            >
              <div className="flex items-center gap-4">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-xl ${
                  i === 0 ? 'bg-accent text-accent-foreground scale-110 shadow-[0_0_15px_rgba(255,215,0,0.5)]' : 
                  i === 1 ? 'bg-gray-300 text-gray-800' :
                  i === 2 ? 'bg-amber-700 text-white' : 'bg-secondary text-secondary-foreground'
                }`}>
                  {i + 1}
                </div>
                <span className="text-xl font-bold">{p.name}</span>
              </div>
              <div className="text-3xl font-black text-primary">
                {p.score}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="mt-12 flex gap-4 animate-in fade-in duration-1000 delay-1000">
        <Button 
          size="lg" 
          className="text-xl font-bold py-6 px-12 rounded-2xl"
          onClick={() => setLocation("/")}
        >
          Play Again
        </Button>
      </div>
    </div>
  );
}
