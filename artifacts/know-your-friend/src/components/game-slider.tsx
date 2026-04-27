import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SliderMarker {
  value: number;
  label: string;
  isTruth?: boolean;
}

interface GameSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  leftLabel?: string | null;
  rightLabel?: string | null;
  markers?: SliderMarker[];
  showValue?: boolean;
}

const MARKER_COLORS = [
  { bg: "#FF4B8B", text: "#fff" },
  { bg: "#00C8E8", text: "#111" },
  { bg: "#9B60FF", text: "#fff" },
  { bg: "#2ECC71", text: "#111" },
  { bg: "#FF6B35", text: "#fff" },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

export function GameSlider({
  value = 50,
  onChange,
  disabled = false,
  leftLabel,
  rightLabel,
  markers = [],
  showValue = false,
}: GameSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const handleMove = (clientX: number) => {
    if (disabled || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setLocalValue(percent);
    if (onChange) onChange(percent);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(true);
    handleMove(e.clientX);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (isDragging) handleMove(e.clientX);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  const guessMarkers = markers.filter((m) => !m.isTruth);
  const truthMarker = markers.find((m) => m.isTruth);

  return (
    <div className="w-full flex flex-col gap-2 py-4 select-none touch-none">

      {/* Marker circles above track */}
      {markers.length > 0 && (
        <div className="relative h-12 mb-1">
          {guessMarkers.map((marker, i) => {
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 bottom-0 flex flex-col items-center"
                style={{ left: `calc(${marker.value}% * 0.88 + 6%)` }}
              >
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-lg border-2 border-white/20"
                  style={{ background: color.bg, color: color.text }}
                >
                  {getInitials(marker.label)}
                </div>
                <div className="w-0.5 h-3 bg-white/40 mt-0.5" />
              </div>
            );
          })}
          {truthMarker && (
            <div
              className="absolute -translate-x-1/2 bottom-0 flex flex-col items-center z-20"
              style={{ left: `calc(${truthMarker.value}% * 0.88 + 6%)` }}
            >
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-lg border-2 border-white/30 bg-white text-black">
                ★
              </div>
              <div className="w-0.5 h-3 bg-white/70 mt-0.5" />
            </div>
          )}
        </div>
      )}

      {/* Track row */}
      <div className="relative h-10 flex items-center px-[6%]">
        <div
          ref={trackRef}
          className={cn(
            "absolute left-[6%] right-[6%] h-4 rounded-full cursor-pointer shadow-inner overflow-hidden",
            disabled
              ? "cursor-default bg-gradient-to-r from-primary/70 to-secondary/70"
              : "bg-input"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Active fill — only when interactive */}
          {!disabled && (
            <div
              className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-primary to-secondary pointer-events-none transition-all duration-150"
              style={{ width: `${localValue}%` }}
            />
          )}

          {/* Tick marks for guess markers on track */}
          {guessMarkers.map((marker, i) => {
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-6 rounded-full pointer-events-none"
                style={{ left: `${marker.value}%`, background: color.bg }}
              />
            );
          })}

          {/* Truth tick on track */}
          {truthMarker && (
            <div
              className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-6 rounded-sm bg-white pointer-events-none z-10"
              style={{ left: `${truthMarker.value}%` }}
            />
          )}
        </div>

        {/* Draggable thumb — outside the clipped track so it isn't cropped */}
        {!disabled && (
          <div
            className={cn(
              "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.4)] border-4 border-primary transition-transform pointer-events-none z-20",
              isDragging && "scale-125"
            )}
            style={{ left: `calc(${localValue}% * 0.88 + 6%)` }}
          />
        )}
      </div>

      {/* Value display */}
      {showValue && (
        <div className="text-center text-5xl font-black text-foreground mt-2 mb-1">
          {localValue}
        </div>
      )}

      {/* Left / Right labels */}
      <div className="flex justify-between items-start px-1 mt-1">
        <div className="text-left font-bold text-sm max-w-[45%] text-primary leading-tight hyphens-auto">
          {leftLabel}
        </div>
        <div className="text-right font-bold text-sm max-w-[45%] text-secondary leading-tight hyphens-auto">
          {rightLabel}
        </div>
      </div>

      {/* Legend for result mode */}
      {markers.length > 0 && (
        <div className="mt-4 space-y-1.5">
          {guessMarkers.map((marker, i) => {
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div
                  className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
                  style={{ background: color.bg, color: color.text }}
                >
                  {getInitials(marker.label)}
                </div>
                <span className="font-semibold text-foreground">{marker.label}</span>
                <span className="text-muted-foreground ml-auto font-mono text-xs">{marker.value}</span>
              </div>
            );
          })}
          {truthMarker && (
            <div className="flex items-center gap-2 text-sm border-t border-border pt-1.5 mt-1.5">
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black bg-white text-black">
                ★
              </div>
              <span className="font-bold text-foreground">{truthMarker.label}</span>
              <span className="text-foreground ml-auto font-mono font-black text-sm">{truthMarker.value}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
