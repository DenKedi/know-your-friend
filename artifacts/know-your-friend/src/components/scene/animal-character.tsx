import { AnimalIcon } from "@/components/animal-icon";
import { getAnimalEmoji, type SlotConfig } from "@/lib/scene-config";

type Props = {
  slot: SlotConfig;
  animal?: string;
  name: string;
  isHost: boolean;
  /** When true, plays the pop-in enter animation. */
  isEntering: boolean;
};

export function AnimalCharacter({ slot, animal, name, isHost, isEntering }: Props) {
  const flip = slot.facing === "left" ? "scaleX(-1)" : "scaleX(1)";
  const fallback = getAnimalEmoji(animal) ?? slot.placeholder;
  const isLabelAbove = slot.labelAnchor.placement === "above";

  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        transform: "translate(-50%, -50%)",
      }}
    >
      <div className={`flex flex-col items-center gap-0.5 ${isLabelAbove ? "flex-col-reverse" : ""}`}>
        <div className={isEntering ? "scene-pop-in" : ""}>
          <div className="scene-bob">
            <div
              className="h-[clamp(2.75rem,10vw,5rem)] w-[clamp(2.75rem,10vw,5rem)] select-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.5)]"
              style={{ transform: `${flip} scale(${slot.scale})` }}
            >
              <AnimalIcon animal={animal} label={fallback} />
            </div>
          </div>
        </div>
        <div className="scene-label-in" style={{ animationDelay: `${isEntering ? 250 : 0}ms` }}>
          <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-background/70 px-2 py-0.5 text-[clamp(0.625rem,1.8vw,0.75rem)] font-bold text-foreground shadow-lg backdrop-blur-md whitespace-nowrap">
            {name}
            {isHost && (
              <span className="rounded-full bg-primary px-1 py-px text-[8px] font-black uppercase leading-none text-primary-foreground">
                Host
              </span>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}

