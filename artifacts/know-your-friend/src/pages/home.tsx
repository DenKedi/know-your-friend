import { useEffect, useRef, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { useCreateRoom, useGetRoom, useJoinRoom } from "@workspace/api-client-react";
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
import { SoundToggle } from "@/components/sound-toggle";
import { ANIMAL_OPTIONS, type AnimalId } from "@/lib/scene-config";

export default function Home() {
  const [, setLocation] = useLocation();
  const search = useSearch();
  const { toast } = useToast();
  const { language, setLanguage, t } = useI18n();
  const [name, setName] = useState("");
  const [animal, setAnimal] = useState<AnimalId>("fox");
  const [roomCode, setRoomCode] = useState("");
  const [pendingAction, setPendingAction] = useState<"create" | "join" | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(false);
  const formRef = useRef<HTMLDivElement>(null);
  const roomCodeInputRef = useRef<HTMLInputElement>(null);
  const inviteRoomCode = new URLSearchParams(search).get("room")?.trim().toUpperCase() ?? "";
  const normalizedRoomCode = roomCode.trim().toUpperCase();

  useEffect(() => {
    if (inviteRoomCode.length !== 4) return;
    setRoomCode(inviteRoomCode);
    setPendingAction("join");
  }, [inviteRoomCode]);

  const focusForm = () => {
    const el = formRef.current;
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 72;
      window.scrollTo({ top, behavior: "smooth" });
    }
    window.setTimeout(() => roomCodeInputRef.current?.focus(), 400);
  };

  const createRoom = useCreateRoom();
  const joinRoom = useJoinRoom();
  const { data: joiningRoom } = useGetRoom(normalizedRoomCode, {
    query: {
      enabled: pendingAction === "join" && normalizedRoomCode.length === 4,
      refetchInterval: 1500,
      retry: false,
    },
  });

  const claimedAnimals = new Map<AnimalId, string>();
  for (const player of joiningRoom?.players ?? []) {
    if (ANIMAL_OPTIONS.some((option) => option.id === player.animal)) {
      claimedAnimals.set(player.animal as AnimalId, player.name);
    }
  }
  const selectedAnimalClaimed = claimedAnimals.has(animal);
  const noAnimalsAvailable = pendingAction === "join" && claimedAnimals.size === ANIMAL_OPTIONS.length;

  useEffect(() => {
    if (pendingAction === "join" && claimedAnimals.has(animal)) {
      const availableAnimal = ANIMAL_OPTIONS.find((option) => !claimedAnimals.has(option.id));
      if (availableAnimal) setAnimal(availableAnimal.id);
    }
  }, [animal, claimedAnimals, pendingAction]);

  const handleCreate = () => {
    createRoom.mutate(
      { data: { hostName: name.trim(), animal, totalRounds: 5, language } },
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
    joinRoom.mutate(
      { roomCode: roomCode.toUpperCase(), data: { playerName: name.trim(), animal } },
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

  const requestCreate = () => setPendingAction("create");

  const requestJoin = () => {
    if (!roomCode.trim() || roomCode.trim().length !== 4) {
      toast({ title: t("home.invalidCode"), variant: "destructive" });
      return;
    }
    setPendingAction("join");
  };

  const submitName = () => {
    if (!name.trim()) {
      toast({ title: t("home.nameRequired"), variant: "destructive" });
      return;
    }
    if (pendingAction === "join" && selectedAnimalClaimed) {
      toast({ title: t("home.animalUnavailable"), variant: "destructive" });
      return;
    }

    if (pendingAction === "create") {
      handleCreate();
    } else if (pendingAction === "join") {
      handleJoin();
    }
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
            <SoundToggle />
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

          {/* Join room — code input + button side by side, no box border */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">
              {t("home.joinPrompt")}
            </label>
            <div className="flex gap-2 items-center">
              <Input
                ref={roomCodeInputRef}
                placeholder={t("home.roomCodePlaceholder")}
                className="text-center uppercase text-xl font-black tracking-[0.35em] py-4 bg-transparent border-0 border-b-2 border-white/25 rounded-none focus:border-secondary focus-visible:ring-0 focus-visible:ring-offset-0 px-0 placeholder:text-foreground/30 placeholder:tracking-normal shadow-none"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                onKeyDown={(e) => e.key === "Enter" && requestJoin()}
              />
              <Button
                variant="secondary"
                className="py-4 px-6 text-base font-bold rounded-full hover:-translate-y-0.5 transition-transform shrink-0"
                onClick={requestJoin}
                disabled={createRoom.isPending || joinRoom.isPending}
              >
                {t("home.joinRoom")}
              </Button>
            </div>
          </div>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <span className="flex-1 border-t border-white/12" />
            <span className="text-[10px] uppercase font-bold tracking-[0.22em] text-foreground/40">
              {t("home.joinDivider")}
            </span>
            <span className="flex-1 border-t border-white/12" />
          </div>

          {/* Create room — full-width gradient pill */}
          <button
            type="button"
            onClick={requestCreate}
            disabled={createRoom.isPending || joinRoom.isPending}
            className="group relative w-full overflow-hidden rounded-full py-4 text-base font-extrabold tracking-wide text-primary-foreground shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          >
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              aria-hidden
            />
            <span className="relative">{t("home.createRoom")}</span>
          </button>

        </div>
      </main>

      <Dialog open={pendingAction !== null} onOpenChange={(open) => !open && setPendingAction(null)}>
        <DialogContent className="max-w-sm gap-5 rounded-[28px] border-primary/30 bg-background/95 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-7 [&>button:last-child]:right-5 [&>button:last-child]:top-5 [&>button:last-child]:rounded-full [&>button:last-child]:bg-white/5 [&>button:last-child]:p-1 [&>button:last-child]:opacity-100">
          <DialogHeader className="pr-8 text-left">
            <DialogTitle className="text-3xl font-black tracking-tight">
              {t("home.namePromptTitle")}
            </DialogTitle>
            <DialogDescription className="text-base leading-snug text-foreground/65">
              {pendingAction === "join" ? t("home.joinNamePrompt") : t("home.createNamePrompt")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">
              {t("home.nameLabel")}
            </label>
            <Input
              autoFocus
              placeholder={t("home.namePlaceholder")}
              className="h-12 rounded-2xl border border-white/15 bg-white/[0.06] px-4 text-lg font-bold shadow-none placeholder:text-foreground/35 focus:border-primary focus-visible:ring-1 focus-visible:ring-primary focus-visible:ring-offset-0"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
              onKeyDown={(e) => e.key === "Enter" && submitName()}
            />
          </div>

          <div className="space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-foreground/50">
              {t("home.animalLabel")}
            </p>
            <div className="grid grid-cols-4 gap-3">
              {ANIMAL_OPTIONS.map((option) => {
                const selected = option.id === animal;
                const claimedBy = claimedAnimals.get(option.id);
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setAnimal(option.id)}
                    aria-pressed={selected}
                    aria-label={option.label}
                    title={claimedBy ? t("home.animalClaimedBy", { name: claimedBy }) : option.label}
                    disabled={Boolean(claimedBy)}
                    className={`flex aspect-square w-full max-w-16 justify-self-center items-center justify-center rounded-full border text-2xl transition-all duration-200 ${
                      claimedBy
                        ? "cursor-not-allowed border-white/10 bg-white/[0.025] opacity-30 grayscale"
                        : selected
                          ? "border-primary bg-primary/20 ring-2 ring-primary/70 ring-offset-2 ring-offset-background shadow-lg shadow-primary/20 scale-110"
                          : "border-white/15 bg-white/[0.05] hover:-translate-y-0.5 hover:border-primary/50 hover:bg-white/[0.1]"
                    }`}
                  >
                    <span aria-hidden>{option.emoji}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={submitName}
            disabled={createRoom.isPending || joinRoom.isPending || selectedAnimalClaimed || noAnimalsAvailable}
            className="group relative w-full overflow-hidden rounded-full py-4 text-base font-extrabold tracking-wide text-primary-foreground shadow-xl transition-all hover:-translate-y-0.5 hover:shadow-2xl active:translate-y-0 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(135deg, hsl(var(--primary)) 0%, hsl(var(--accent)) 100%)" }}
          >
            <span className="relative">{pendingAction === "join" ? t("home.joinRoom") : t("home.createRoom")}</span>
          </button>
        </DialogContent>
      </Dialog>

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

