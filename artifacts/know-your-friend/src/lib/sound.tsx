import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import buttonSound from "@/assets/sound/button1.mp3";
import categorySelectSound from "@/assets/sound/wood1.wav";
import characterJoiningSound from "@/assets/sound/character_joining1.wav";

export type SoundEffect =
  | "button"
  | "categorySelect"
  | "characterJoin";

type SoundContextValue = {
  isMuted: boolean;
  play: (effect: SoundEffect) => void;
  toggleMuted: () => void;
};

const SoundContext = createContext<SoundContextValue | null>(null);
const MUTE_STORAGE_KEY = "kyf_sound_muted";

export function SoundProvider({ children }: { children: ReactNode }) {
  const [isMuted, setIsMuted] = useState(() => localStorage.getItem(MUTE_STORAGE_KEY) === "true");
  const buttonAudioRef = useRef<HTMLAudioElement | null>(null);
  const categorySelectAudioRef = useRef<HTMLAudioElement | null>(null);
  const characterJoiningAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio(buttonSound);
    audio.preload = "auto";
    audio.volume = 0.22;
    buttonAudioRef.current = audio;

    return () => {
      audio.pause();
      buttonAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(categorySelectSound);
    audio.preload = "auto";
    audio.volume = 0.16;
    categorySelectAudioRef.current = audio;

    return () => {
      audio.pause();
      categorySelectAudioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = new Audio(characterJoiningSound);
    audio.preload = "auto";
    audio.volume = 0.26;
    characterJoiningAudioRef.current = audio;

    return () => {
      audio.pause();
      characterJoiningAudioRef.current = null;
    };
  }, []);

  const play = useCallback((effect: SoundEffect) => {
    if (isMuted) return;

    switch (effect) {
      case "button": {
        const audio = buttonAudioRef.current;
        if (!audio) break;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
        break;
      }
      case "categorySelect": {
        const audio = categorySelectAudioRef.current;
        if (!audio) break;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
        break;
      }
      case "characterJoin": {
        const audio = characterJoiningAudioRef.current;
        if (!audio) break;
        audio.currentTime = 0;
        void audio.play().catch(() => undefined);
        break;
      }
    }
  }, [isMuted]);

  const toggleMuted = useCallback(() => {
    setIsMuted((current) => {
      const next = !current;
      localStorage.setItem(MUTE_STORAGE_KEY, String(next));
      return next;
    });
  }, []);

  useEffect(() => {
    const playButtonSound = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target : null;
      if (!target || target.closest("[data-sound='off']")) return;
      if (target.closest("button:not(:disabled), [role='button']:not([aria-disabled='true'])")) {
        play("button");
      }
    };

    window.addEventListener("click", playButtonSound, true);
    return () => window.removeEventListener("click", playButtonSound, true);
  }, [play]);

  return (
    <SoundContext.Provider value={{ isMuted, play, toggleMuted }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSound() {
  const sound = useContext(SoundContext);

  if (!sound) {
    throw new Error("useSound must be used within a SoundProvider");
  }

  return sound;
}