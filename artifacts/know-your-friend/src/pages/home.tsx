import { useState } from "react";
import { useLocation } from "wouter";
import { useCreateRoom, useJoinRoom } from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { LANGUAGE_OPTIONS, useI18n } from "@/lib/i18n";
import { Flag } from "@/components/flag";

export default function Home() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { language, setLanguage, t } = useI18n();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState("");

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
    <div className="min-h-[100dvh] flex items-center justify-center p-4 relative overflow-hidden bg-background">
      <div
        className="absolute inset-0 opacity-20 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle at 20% 30%, var(--color-primary) 0%, transparent 40%), radial-gradient(circle at 80% 70%, var(--color-secondary) 0%, transparent 40%)",
        }}
      />

      <Card className="w-full max-w-md relative z-10 border-2 border-border shadow-lg bg-card">
        <CardHeader className="text-center pb-6 pt-8 px-6">
          <CardTitle className="text-4xl font-black uppercase tracking-tight mb-2 text-primary leading-tight">
            Know Your<br />Friend
          </CardTitle>
          <CardDescription className="text-base text-muted-foreground font-semibold">
            {t("home.tagline")}
          </CardDescription>
        </CardHeader>

        <CardContent className="px-6 pb-8 space-y-5">
          <div className="flex gap-3 justify-center">
              {LANGUAGE_OPTIONS.map((option) => {
                const active = option.code === language;
                return (
                  <button
                    key={option.code}
                    type="button"
                    onClick={() => setLanguage(option.code)}
                    className={`overflow-hidden rounded-[4px] transition-all ${
                      active
                        ? "outline outline-2 outline-primary"
                        : "opacity-75 hover:opacity-100"
                    }`}
                    aria-pressed={active}
                    aria-label={option.label}
                    title={option.label}
                  >
                    <Flag code={option.code} className="block h-7 w-11" />
                  </button>
                );
              })}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              {t("home.nameLabel")}
            </label>
            <Input
              placeholder={t("home.namePlaceholder")}
              className="text-lg py-5 font-bold bg-input border-2 border-transparent focus:border-primary"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={15}
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>

          <div className="pt-2 space-y-3">
            <Button
              className="w-full text-lg py-6 font-bold rounded-xl hover:-translate-y-0.5 transition-transform"
              onClick={handleCreate}
              disabled={createRoom.isPending || joinRoom.isPending}
            >
              {t("home.createRoom")}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-border" />
              </div>
              <div className="relative flex justify-center text-xs uppercase font-bold tracking-wider">
                <span className="bg-card px-2 text-muted-foreground">{t("home.joinDivider")}</span>
              </div>
            </div>

            <div className="flex gap-2">
              <Input
                placeholder={t("home.roomCodePlaceholder")}
                className="text-center uppercase text-xl font-bold py-6 bg-input border-2 border-transparent focus:border-secondary"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={4}
                onKeyDown={(e) => e.key === "Enter" && handleJoin()}
              />
              <Button
                variant="secondary"
                className="py-6 px-7 text-base font-bold rounded-xl hover:-translate-y-0.5 transition-transform"
                onClick={handleJoin}
                disabled={createRoom.isPending || joinRoom.isPending}
              >
                {t("home.joinRoom")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
