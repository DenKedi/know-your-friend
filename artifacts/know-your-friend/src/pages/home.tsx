import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { useCreateRoom, useJoinRoom } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { LANGUAGE_OPTIONS, useI18n } from "@/lib/i18n";
import { Flag } from "@/components/flag";
import fireIcon from "@/assets/icons/Fire_1.png";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, setLanguage, t } = useI18n();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  const focusForm = () => {
    const el = formRef.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
    }
    window.setTimeout(() => nameInputRef.current?.focus(), 400);
  };

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();

  const handleCreate = () => {
    if (!name.trim()) {
      toast({ title: t("home.nameRequired"), variant: "destructive" });
      return;
    }
    createRoom.mutate(
      { data: { hostName: name, totalRounds: 5, language } },
      {
        onSuccess: (data) => {
          sessionStorage.setItem(`kyf_token_${data.roomCode}`, data.playerToken);
          sessionStorage.setItem(`kyf_id_${data.roomCode}`, data.playerId);
          setLocation(`/room/${data.roomCode}/lobby`);
        },
        onError: (err) => {
          toast({
            title: t("home.createFailed"),
            description: err instanceof Error ? err.message : t("home.unknownError"),
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleJoin = () => {
    if (!name.trim()) {
      toast({ title: t("home.nameRequired"), variant: "destructive" });
      return;
    }
    if (!roomCode.trim() || roomCode.length !== 4) {
      toast({ title: t("home.invalidCode"), variant: "destructive" });
      return;
    }
    joinRoom.mutate(
      { roomCode: roomCode.toUpperCase(), data: { playerName: name } },
      {
        onSuccess: (data) => {
          sessionStorage.setItem(`kyf_token_${data.roomCode}`, data.playerToken);
          sessionStorage.setItem(`kyf_id_${data.roomCode}`, data.playerId);
          setLocation(`/room/${data.roomCode}/lobby`);
        },
        onError: (err) => {
          toast({
            title: t("home.joinFailed"),
            description: err instanceof Error ? err.message : t("home.unknownError"),
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="min-h-[100dvh] relative">
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/25 border-b border-white/10">
        <div className="mx-auto max-w-5xl px-5 sm:px-8 h-14 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl shadow-lg overflow-hidden"
              aria-hidden
            >
              <img src={fireIcon} alt="" className="h-full w-full object-cover" />
            </span>
            <span className="font-extrabold tracking-tight text-sm sm:text-base">Know Your Friend</span>
          </div>

          <nav className="flex items-center gap-2">
            <button
              type="button"
              onClick={focusForm}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg active:translate-y-0"
              style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden><path d="M8 5v14l11-7z"/></svg>
              {t("home.headerPlay")}
            </button>
            <button
              type="button"
              onClick={() => setTutorialOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-semibold text-foreground/90 border border-white/15 bg-white/5 backdrop-blur-md transition-all hover:bg-white/10"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 fill-current" aria-hidden>
                <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm1 15h-2v-2h2v2zm1.07-7.75l-.9.92C12.45 10.9 12 11.5 12 13h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26A1.49 1.49 0 0 0 12 6a1.5 1.5 0 0 0-1.5 1.5h-2A3.5 3.5 0 0 1 12 4a3.5 3.5 0 0 1 2.07 6.25z"/>
              </svg>
              <span className="hidden sm:inline">{t("home.headerTutorial")}</span>
            </button>
          </nav>
        </div>
      </header>

      {/* ── Main ───────────────────────────────────────────────── */}
      <main className="relative z-10 mx-auto max-w-sm px-5 pt-12 sm:pt-20 pb-16 flex flex-col items-center gap-8">

        {/* Hero */}
        <div className="text-center w-full -mt-4 sm:-mt-6">
          <h1 className="text-5xl sm:text-6xl font-black uppercase tracking-tight leading-[0.95] drop-shadow-lg">
            <span
              className="block bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 60%, hsl(var(--foreground)) 100%)" }}
            >Know Your</span>
            <span className="block text-foreground">Friend</span>
          </h1>
          <p className="mt-3 text-sm font-semibold tracking-widest uppercase text-foreground/50">
            {t("home.tagline")}
          </p>
        </div>

        {/* Form area — no box, elements breathe freely */}
        <div ref={formRef} className="w-full flex flex-col gap-5">

          {/* Language row */}
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">
              {t("home.languageLabel")}
            </span>
            <div className="flex gap-2">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = option.code === language;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setLanguage(option.code)}
                    aria-pressed={active}
                    aria-label={option.label}
                    title={option.label}
                    className={`relative h-8 w-8 rounded-full overflow-hidden transition-all duration-200 ${
                      active
                        ? "ring-2 ring-primary ring-offset-1 ring-offset-transparent scale-115 shadow-lg shadow-primary/30"
                        : "opacity-55 hover:opacity-90 hover:scale-105"
                    }`}
                  >
                    <Flag code={option.code} className="absolute inset-0 h-full w-full" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Name input — underline only, no box */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">
              {t("home.nameLabel")}
            </label>
            <Input
              ref={nameInputRef}
              placeholder={t("home.namePlaceholder")}
              className="text-xl py-5 font-bold bg-transparent border-0 border-b-2 border-white/25 rounded-none focus:border-primary focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-foreground/35 shadow-none"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          {/* Create room — full-width gradient pill */}
          <button
            type="button"
            onClick={handleCreate}
            disabled={createRoom.isPending || joinRoom.isPending}
            className="group relative w-full overflow-hidden rounded-full py-4 text-base font-extrabold tracking-wide text-primary-foreground shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed mt-1"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          >
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              aria-hidden
            />
            <span className="relative">{t("home.createRoom")}</span>
          </button>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="flex-1 border-t border-white/12" />
            <span className="text-[10px] uppercase font-bold tracking-[0.22em] text-foreground/40">
              {t("home.joinDivider")}
            </span>
            <span className="flex-1 border-t border-white/12" />
          </div>

          {/* Join row — code input + button side by side, no box border */}
          <div className="flex gap-2 items-center">
            <Input
              placeholder={t("home.roomCodePlaceholder")}
              className="text-center uppercase text-xl font-black tracking-[0.35em] py-4 bg-transparent border-0 border-b-2 border-white/25 rounded-none focus:border-secondary focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-foreground/30 placeholder:tracking-normal shadow-none"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={4}
              onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            />
            <Button
              variant="secondary"
              className="py-4 px-6 text-base font-bold rounded-full hover:-translate-y-0.5 transition-transform shrink-0"
              onClick={handleJoin}
              disabled={createRoom.isPending || joinRoom.isPending}
            >
              {t("home.joinRoom")}
            </Button>
          </div>

        </div>
      </main>

      {/* ── Tutorial Dialog ────────────────────────────────────── */}
      <Dialog open={tutorialOpen} onOpenChange={setTutorialOpen}>
        <DialogContent className="max-w-lg border-white/15 bg-card/85 backdrop-blur-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black tracking-tight">
              {t("home.tutorialTitle")}
            </DialogTitle>
            <DialogDescription className="text-foreground/70">
              {t("home.tutorialIntro")}
            </DialogDescription>
          </DialogHeader>

          <ol className="mt-2 space-y-3">
            {[1, 2, 3, 4].map((n) => (
              <li key={n} className="flex gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                <span
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-sm font-black text-primary-foreground shadow-md"
                  style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
                  aria-hidden
                >{n}</span>
                <div className="min-w-0">
                  <p className="font-bold leading-tight">{t(`home.tutorialStep${n}Title`)}</p>
                  <p className="text-sm text-foreground/70 mt-0.5">{t(`home.tutorialStep${n}`)}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mt-4 flex justify-end">
            <DialogClose asChild>
              <button
                type="button"
                className="rounded-full px-5 py-2 text-sm font-bold text-primary-foreground shadow-md transition-all hover:-translate-y-0.5"
                style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
              >
                {t("home.tutorialClose")}
              </button>
            </DialogClose>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

