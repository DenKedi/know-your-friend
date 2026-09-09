import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AnimalIcon } from "@/components/animal-icon";
import { useI18n } from "@/lib/i18n";
import type { SliderMarker, TruthRevealOrigin } from "@/components/game-slider";

type Props = {
  origin: TruthRevealOrigin;
  winners: SliderMarker[];
  onComplete: () => void;
};

// Let the overlap read before merging; keep the award visible long enough for a full room.
const OVERLAP_HOLD = 0.4;
const MERGE_AT = 0.9;
const EXPAND_AT = 1.15;
const CONTENT_AT = 1.7;
const EXIT_AT = 6.4;
const COMPLETE_AT = 6.85;

/** One shared celebration for every exact guess, originating at the settled truth circle. */
export function PerfectGuessCelebration({ origin, winners, onComplete }: Props) {
  const { t } = useI18n();
  const reducedMotion = useReducedMotion();
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const timer = window.setTimeout(() => onCompleteRef.current(), COMPLETE_AT * 1000);
    return () => window.clearTimeout(timer);
  }, []);

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const radius = Math.hypot(
    Math.max(origin.x, viewportWidth - origin.x),
    Math.max(origin.y, viewportHeight - origin.y),
  );
  const bonus = winners[0]?.bonusPoints ?? 0;

  return createPortal(
    <motion.div
      data-testid="perfect-guess-celebration"
      className="pointer-events-none fixed inset-0 z-[80] overflow-hidden text-[#fff8dc]"
      initial={{ opacity: 1 }}
      animate={{ opacity: 0 }}
      transition={{ delay: EXIT_AT, duration: COMPLETE_AT - EXIT_AT }}
    >
      {/* The expanding disc comes from the real DOM position, including on a scrolled phone. */}
      <motion.div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse at 50% 38%, #695019 0%, #292212 42%, #11131b 85%)" }}
        initial={reducedMotion ? { opacity: 0 } : { clipPath: `circle(0px at ${origin.x}px ${origin.y}px)` }}
        animate={reducedMotion ? { opacity: 0.98 } : { clipPath: `circle(${radius}px at ${origin.x}px ${origin.y}px)` }}
        transition={{ delay: EXPAND_AT, duration: reducedMotion ? 0.3 : 0.8, ease: [0.76, 0, 0.24, 1] }}
      />

      {!reducedMotion && (
        <div aria-hidden className="absolute" style={{ left: origin.x, top: origin.y }}>
          {winners.map((winner, index) => {
            const angle = (index / winners.length) * Math.PI * 2 - Math.PI / 2;
            return (
              <motion.div
                key={winner.playerId ?? index}
                className="absolute -left-[18px] -top-[18px] flex h-9 w-9 items-center justify-center rounded-full border-2 border-white/70"
                style={{ background: winner.color?.bg, color: winner.color?.text }}
                initial={{ x: 0, y: 0, scale: 1, opacity: 0 }}
                animate={{
                  x: [0, Math.cos(angle) * 30, 0],
                  y: [0, Math.sin(angle) * 30, 0],
                  scale: [1, 1.12, 0.25],
                  opacity: [0, 1, 0],
                }}
                transition={{ delay: OVERLAP_HOLD, duration: MERGE_AT - OVERLAP_HOLD + 0.25, times: [0, 0.4, 1], ease: "easeInOut" }}
              >
                <AnimalIcon animal={winner.animal} label={winner.label} />
              </motion.div>
            );
          })}
          {[0, 1].map((ring) => (
            <motion.div
              key={ring}
              className="absolute -left-5 -top-5 h-10 w-10 rounded-full border-2 border-[#ffe797]"
              initial={{ scale: 1, opacity: 0 }}
              animate={{ scale: [1, 1.8, 4 + ring * 2], opacity: [0, 0.9, 0] }}
              transition={{ delay: MERGE_AT + ring * 0.1, duration: 0.9 }}
            />
          ))}
          <motion.div
            className="absolute -left-5 -top-5 flex h-10 w-10 items-center justify-center rounded-full bg-white text-black shadow-[0_0_32px_#ffe797]"
            initial={{ scale: 1, opacity: 0 }}
            animate={{ scale: [1, 0.85, 1.8, 3], opacity: [0, 1, 1, 0] }}
            transition={{ delay: OVERLAP_HOLD, duration: 1.1, times: [0, 0.5, 0.8, 1] }}
          >★</motion.div>
        </div>
      )}

      <motion.div
        className="absolute inset-0 flex flex-col items-center justify-center gap-4 overflow-y-auto px-5 py-8 text-center sm:gap-5"
        initial={{ opacity: 0, scale: reducedMotion ? 1 : 0.85, y: reducedMotion ? 0 : 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ delay: CONTENT_AT, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
      >
        <div aria-hidden className="relative flex h-20 w-20 shrink-0 items-center justify-center sm:h-24 sm:w-24">
          {!reducedMotion && <motion.div
            className="absolute -inset-12 opacity-30"
            initial={{ rotate: 0, scale: 0.6 }}
            animate={{ rotate: 25, scale: 1 }}
            transition={{ delay: CONTENT_AT, duration: 4.8, ease: "easeOut" }}
            style={{ background: "repeating-conic-gradient(from 0deg, transparent 0deg 20deg, #ffdd7e 21deg 22deg, transparent 23deg 30deg)", maskImage: "radial-gradient(circle, transparent 24%, black 25%, transparent 70%)" }}
          />}
          <div className="absolute inset-0 rotate-12 rounded-[28%] border border-[#f8d978]/35" />
          <div className="absolute inset-0 -rotate-12 rounded-[28%] border border-[#f8d978]/35" />
          <span className="relative text-6xl text-[#ffe18b] drop-shadow-[0_0_22px_#ffc84c80] sm:text-7xl">★</span>
        </div>

        <div role="status" aria-live="polite" aria-atomic="true">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.3em] text-[#e8ce89]">
            {t("game.perfectMatch", { value: winners[0]?.value ?? 0 })}
          </p>
          <h2 className="font-display max-w-4xl text-[clamp(2.5rem,8vw,6rem)] leading-[0.95] font-black uppercase tracking-tight text-[#fff3be] drop-shadow-lg">
            {t("game.perfectGuess")}
          </h2>
          <div className="mt-4 sm:mt-5">
            <motion.div
              className="text-[clamp(4rem,12vw,7rem)] leading-none font-black tabular-nums text-[#ffdd73]"
              initial={{ scale: reducedMotion ? 1 : 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: CONTENT_AT + 0.35, type: "spring", stiffness: 240, damping: 18 }}
            >+{bonus}</motion.div>
            <p className="mt-1 text-sm font-bold uppercase tracking-[0.2em] text-[#e8ce89]">{t("game.perfectBonusLabel")}</p>
          </div>
          <span className="sr-only">{winners.map((winner) => winner.label).join(", ")}</span>
        </div>

        <div className="mt-1 flex w-full max-w-3xl flex-wrap justify-center gap-2 sm:gap-3">
          {winners.map((winner, index) => (
            <motion.div
              key={winner.playerId ?? index}
              className="flex max-w-full items-center gap-3 rounded-2xl border border-[#ffe18b]/20 bg-white/5 px-4 py-2 text-left sm:py-3"
              initial={{ opacity: 0, y: reducedMotion ? 0 : 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: CONTENT_AT + 0.55 + index * 0.09, duration: 0.35 }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-white/40" style={{ background: winner.color?.bg, color: winner.color?.text }}>
                <AnimalIcon animal={winner.animal} label={winner.label} />
              </div>
              <div className="min-w-0">
                <p className="max-w-48 truncate text-base font-extrabold">{winner.label}</p>
                <p className="text-xs font-semibold text-[#e8ce89]">{t("game.perfectTotal", { points: winner.points ?? 0 })}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>
    </motion.div>,
    document.body,
  );
}
