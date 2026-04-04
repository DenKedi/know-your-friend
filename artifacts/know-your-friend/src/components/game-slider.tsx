import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface GameSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  disabled?: boolean;
  leftLabel?: string | null;
  rightLabel?: string | null;
  markers?: { value: number; label: string; color?: string; isTruth?: boolean }[];
  showValue?: boolean;
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
    if (isDragging) {
      handleMove(e.clientX);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (disabled) return;
    setIsDragging(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div className="w-full flex flex-col gap-6 py-8 select-none touch-none">
      <div className="flex justify-between items-end px-2">
        <div className="text-left font-bold text-lg max-w-[40%] text-primary leading-tight">{leftLabel}</div>
        {showValue && <div className="text-4xl font-black text-foreground">{localValue}</div>}
        <div className="text-right font-bold text-lg max-w-[40%] text-secondary leading-tight">{rightLabel}</div>
      </div>

      <div className="relative h-24 flex items-center px-4">
        {/* Track */}
        <div
          ref={trackRef}
          className={cn(
            "absolute left-4 right-4 h-4 rounded-full bg-input cursor-pointer shadow-inner",
            disabled && "cursor-default opacity-50"
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          {/* Fill */}
          <div
            className="absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-primary to-secondary pointer-events-none"
            style={{ width: `${localValue}%` }}
          />

          {/* Markers */}
          {markers.map((marker, i) => (
            <div
              key={i}
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none transition-all duration-700 ease-out",
                marker.isTruth ? "z-20 scale-125" : "z-10"
              )}
              style={{ left: `${marker.value}%` }}
            >
              <div
                className={cn(
                  "w-1 h-8 rounded-full mb-1",
                  marker.isTruth ? "bg-accent h-12 w-2" : marker.color || "bg-white"
                )}
              />
              <div
                className={cn(
                  "text-xs font-bold px-2 py-1 rounded-md shadow-sm whitespace-nowrap",
                  marker.isTruth ? "bg-accent text-accent-foreground text-sm" : "bg-card text-foreground"
                )}
              >
                {marker.label}
              </div>
            </div>
          ))}

          {/* Thumb */}
          {!disabled && (
            <div
              className={cn(
                "absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-10 h-10 bg-white rounded-full shadow-[0_0_15px_rgba(0,0,0,0.3)] border-4 border-primary transition-transform pointer-events-none",
                isDragging && "scale-125"
              )}
              style={{ left: `${localValue}%` }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
