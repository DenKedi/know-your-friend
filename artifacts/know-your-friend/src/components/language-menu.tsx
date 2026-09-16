import { useState } from "react";
import { Flag } from "@/components/flag";
import { LANGUAGE_OPTIONS, type LanguageCode, useI18n } from "@/lib/i18n";

export function LanguageMenu({ onLanguageChange }: { onLanguageChange?: (language: LanguageCode) => void }) {
  const { language, setLanguage } = useI18n();
  const [open, setOpen] = useState(false);
  const currentLanguage = LANGUAGE_OPTIONS.find((option) => option.code === language) ?? LANGUAGE_OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-background/40 p-1.5 transition-colors hover:border-primary/50 hover:bg-primary/10"
        aria-label={currentLanguage.label}
        aria-expanded={open}
        aria-controls="player-language-menu"
        title={currentLanguage.label}
      >
        <Flag code={language} className="h-full w-full rounded-sm" />
      </button>
      {open && (
        <div
          id="player-language-menu"
          className="absolute right-0 top-full z-50 mt-2 min-w-36 rounded-2xl border border-primary/30 bg-background/95 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-2xl animate-in fade-in zoom-in-95 slide-in-from-top-2 duration-150"
          role="menu"
        >
          {LANGUAGE_OPTIONS.map((option) => {
            const active = option.code === language;
            return (
              <button
                key={option.code}
                type="button"
                onClick={() => {
                  setLanguage(option.code);
                  onLanguageChange?.(option.code);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left text-sm font-semibold transition-colors hover:bg-white/10 ${
                  active ? "text-primary" : "text-foreground"
                }`}
                role="menuitemradio"
                aria-checked={active}
              >
                <Flag code={option.code} className="h-3.5 w-5 rounded-[2px]" />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}