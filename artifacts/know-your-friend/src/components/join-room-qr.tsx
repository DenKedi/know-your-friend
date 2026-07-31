import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { QrCode, Share2, X } from "lucide-react";
import { useI18n } from "@/lib/i18n";

interface JoinRoomQrProps {
  roomCode: string;
}

export function JoinRoomQr({ roomCode }: JoinRoomQrProps) {
  const { t } = useI18n();
  const [qrOpen, setQrOpen] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  const inviteUrl = new URL(import.meta.env.BASE_URL, window.location.origin);
  inviteUrl.searchParams.set("room", roomCode);

  const handleShare = async () => {
    const url = inviteUrl.toString();

    if (navigator.share) {
      try {
        await navigator.share({
          title: "Know Your Friend",
          text: t("lobby.joinQrReady"),
          url,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }

    try {
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      window.setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="shrink-0">
      <button
        type="button"
        onClick={() => setQrOpen((open) => !open)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-primary/30 bg-primary/10 text-primary transition-colors hover:bg-primary hover:text-primary-foreground"
        aria-label={t("lobby.createJoinQr")}
        aria-expanded={qrOpen}
        aria-controls="join-room-qr"
        title={t("lobby.createJoinQr")}
      >
        <QrCode className="h-4 w-4" />
      </button>

      {qrOpen && (
        <aside
          id="join-room-qr"
          className="fixed left-1/2 top-16 z-50 w-[min(21rem,calc(100vw-2rem))] -translate-x-1/2 border border-primary/45 bg-card/95 p-4 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-200"
          aria-label={t("lobby.joinQrReady")}
        >
          <button
            type="button"
            onClick={() => setQrOpen(false)}
            className="absolute right-3 top-3 inline-flex h-7 w-7 items-center justify-center text-foreground/50 transition-colors hover:text-foreground"
            aria-label={t("lobby.closeInvite")}
            title={t("lobby.closeInvite")}
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex flex-col items-center gap-3">
            <div className="pr-7 text-center">
              <p className="text-xl font-black tracking-tight">{t("lobby.joinQrReady")}</p>
              <p className="mt-1 text-sm leading-snug text-foreground/70">{t("lobby.joinQrHint")}</p>
            </div>
            <div
              className="w-full max-w-[22rem] border border-primary/25 bg-white p-3 shadow-xl"
              role="img"
              aria-label={`${t("lobby.joinQrReady")}: ${roomCode}`}
            >
              <QRCodeSVG className="h-auto w-full" value={inviteUrl.toString()} size={440} level="M" />
            </div>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-2 border border-primary/45 bg-primary px-4 py-2 text-xs font-black uppercase tracking-wide text-primary-foreground shadow-md transition-transform hover:-translate-y-0.5"
            >
              <Share2 className="h-4 w-4" />
              {linkCopied ? t("lobby.linkCopied") : t("lobby.shareLink")}
            </button>
          </div>
        </aside>
      )}
    </div>
  );
}