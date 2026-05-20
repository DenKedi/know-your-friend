import type { SlotConfig } from "@/lib/scene-config";

type Props = {
  slot: SlotConfig;
  /** When true, plays the pop-in enter animation. */
  isEntering: boolean;
};

/**
 * Phase-1 placeholder renderer: emoji + CSS loop.
 * When real assets land, branch on `slot.renderer` (image | lottie | video).
 */
export function AnimalCharacter({ slot, isEntering }: Props) {
  const flip = slot.facing === "left" ? "scaleX(-1)" : "scaleX(1)";
  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: `translate(-50%, -50%) scale(${slot.scale})`,
      }}
    >
      {/* Outer wrapper handles enter animation (one-shot). */}
      <div className={isEntering ? "scene-pop-in" : ""}>
        {/* Inner wrapper handles the looping idle bob. */}
        <div className="scene-bob">
          <div
            className="text-6xl leading-none select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
            style={{ transform: flip }}
            aria-hidden
          >
            {slot.placeholder}
          </div>
        </div>
      </div>
    </div>
  );
}

