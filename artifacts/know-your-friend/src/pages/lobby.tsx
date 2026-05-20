import { useRoute, useLocation } from "wouter";
import { useGameSocket } from "@/hooks/use-game-socket";
import { Button } from "@/components/ui/button";
import { useEffect } from "react";
import { getLanguageOption, useI18n } from "@/lib/i18n";
import { LobbyCharacterLayer } from "@/components/scene/lobby-character-layer";
import fireIcon from "@/assets/icons/Fire_1.png";

export default function Lobby() {
  const [match, params] = useRoute("/room/:code/lobby");
  const roomCode = params?.code;
  const [, setLocation] = useLocation();
  const { state, send, isConnected } = useGameSocket(roomCode);
  const { t } = useI18n();

  useEffect(() => {
    if (state?.status && state.status !== "waiting") {
      setLocation(`/room/${roomCode}/game`);
    }
  }, [state?.status, roomCode, setLocation]);

  if (!match || !roomCode) return null;

  if (!state) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center">
        <div className="text-xl font-bold animate-pulse">{t("lobby.connecting")}</div>
      </div>
    );
  }

  const playerId = sessionStorage.getItem(`kyf_id_${roomCode}`);
  const me = state.players.find((p) => p.id === playerId);
  const isHost = me?.isHost;
  const langOption = getLanguageOption(state.language);
  const roundsPerPlayer = state.roundsPerPlayer ?? 5;

  const handleLeave = () => {
    send({ type: "leave_room" });
    setLocation("/");
  };

  return (
    <>
      <LobbyCharacterLayer players={state.players} />

      <div className="min-h-[100dvh] flex flex-col">
        {/* ── Header ───────────────────────────────────────────── */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/30 border-b border-white/10">
          <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl shadow-lg overflow-hidden"
                aria-hidden
              >
                <img src={fireIcon} alt="" className="h-full w-full object-cover" />
              </span>
              <div className="flex items-baseline gap-2 min-w-0">
                <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-widest text-foreground/50">
                  {t("lobby.roomCode")}
                </span>
                <span className="text-xl sm:text-2xl font-black text-primary tracking-[0.18em] truncate">
                  {roomCode}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className="text-base leading-none select-none"
                aria-label={langOption.label}
                title={langOption.label}
              >
                {langOption.flag}
              </span>

              <div className="flex items-center gap-1.5">
                <span className="hidden sm:inline text-[10px] font-bold uppercase text-foreground/50 tracking-wider">
                  Rounds
                </span>
                {isHost ? (
                  <select
                    value={roundsPerPlayer}
                    onChange={(e) =>
                      send({ type: "set_rounds_per_player", roundsPerPlayer: Number(e.target.value) })
                    }
                    className="bg-background/60 backdrop-blur-md text-foreground text-xs font-black rounded-lg px-2 py-1 border border-white/10 outline-none cursor-pointer appearance-none text-center"
                    aria-label="Rounds per player"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                      <option key={n} value={n}>{n}×</option>
                    ))}
                  </select>
                ) : (
                  <span className="text-xs font-black text-foreground/80">{roundsPerPlayer}×</span>
                )}
              </div>

              {/* Waiting indicator — collapses when enough players are present */}
              {isHost && state.players.length < 2 && (
                <span className="hidden sm:inline text-xs font-bold text-foreground/60 animate-pulse">
                  {t("lobby.waitingForPlayers")}
                </span>
              )}
              {!isHost && (
                <span className="hidden sm:inline text-xs font-bold text-foreground/60 animate-pulse">
                  {t("lobby.waitingForHost")}
                </span>
              )}

              <span
                className={`w-2.5 h-2.5 rounded-full ${isConnected ? "bg-green-500" : "bg-muted-foreground"}`}
                aria-label={isConnected ? "connected" : "disconnected"}
              />

              <button
                type="button"
                onClick={handleLeave}
                className="p-1.5 rounded-full text-foreground/60 hover:text-destructive hover:bg-white/5 transition-colors"
                aria-label={state.players.length === 1 ? t("lobby.abandonRoom") : t("lobby.leaveRoom")}
                title={state.players.length === 1 ? t("lobby.abandonRoom") : t("lobby.leaveRoom")}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4 fill-current" aria-hidden>
                  <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                </svg>
              </button>
            </div>
          </div>
        </header>

        {/* Spacer — keeps the campfire visible */}
        <div className="flex-1" />

        {/* ── Bottom action ────────────────────────────────────── */}
        <div className="px-4 pb-6 pt-3">
          <div className="mx-auto max-w-md flex flex-col items-center gap-3">
            {isHost && (
              <Button
                className="w-full max-w-xs py-6 text-base font-black uppercase tracking-wider rounded-full shadow-2xl"
                onClick={() => send({ type: "start_game" })}
                disabled={state.players.length < 2}
              >
                {t("lobby.startGame")}
              </Button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
