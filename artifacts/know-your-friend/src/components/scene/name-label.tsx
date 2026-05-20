import type { LabelPlacement } from "@/lib/scene-config";

type Props = {
  name: string;
  isHost?: boolean;
  x: number;
  y: number;
  placement: LabelPlacement;
  /** Stagger after the character pops in. */
  delayMs?: number;
};

export function NameLabel({ name, isHost, x, y, placement, delayMs = 200 }: Props) {
  const translateY = placement === "above" ? "-100%" : "0%";
  return (
    <div
      className="pointer-events-none absolute z-20"
      style={{
        left: `${x}%`,
        top: `${y}%`,
        transform: `translate(-50%, ${translateY})`,
      }}
    >
      <div className="scene-label-in" style={{ animationDelay: `${delayMs}ms` }}>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-background/70 backdrop-blur-md px-3 py-1 text-xs font-bold text-foreground shadow-lg border border-white/10 whitespace-nowrap">
          {name}
          {isHost && (
            <span className="text-[9px] bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full uppercase font-black leading-none">
              Host
            </span>
          )}
        </span>
      </div>
    </div>
  );
}

