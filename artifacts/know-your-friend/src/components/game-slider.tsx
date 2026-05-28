import React, { useState, useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

interface SliderMarker {
  value: number;
  label: string;
  isTruth?: boolean;
  /** Animal emoji from the player's scene slot. Falls back to initials if absent. */
  animal?: string;
  /** ms to delay this marker's reveal animation (slider circle, tick, legend row). */
  delayMs?: number;
  /** Special highlight for the winning guess. */
  highlight?: boolean;
  /**
   * Recorded slider extrema (first = touch-down value, last = submitted value).
   * Played back on the result screen as the marker's slide-in. When omitted or
   * containing fewer than 2 reversals, the marker dives in dramatically from
   * the far side instead (the player was "sure").
   */
  path?: number[];
  /** Override playback duration for a `path`. Default 3000ms; dive-in is always 250ms. */
  pathDurationMs?: number;
}

interface GameSliderProps {
  value?: number;
  onChange?: (value: number) => void;
  /** Fires on pointer-up with the recorded direction-reversal path (start + extrema + final, max 6 extrema). */
  onPathChange?: (path: number[]) => void;
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

const MAX_EXTREMA = 6;
const DIVE_IN_DURATION = 250;
const DEFAULT_PATH_DURATION = 3000;
const FADE_IN_MS = 220;

/** Trim a recorded reversal path to at most MAX_EXTREMA interior points by repeatedly dropping the smallest "spike". */
function downsamplePath(path: number[], maxExtrema = MAX_EXTREMA): number[] {
  if (path.length <= 2 + maxExtrema) return path;
  const out = [...path];
  while (out.length - 2 > maxExtrema) {
    let minIdx = 1;
    let minSpike = Infinity;
    for (let i = 1; i < out.length - 1; i++) {
      const mid = (out[i - 1]! + out[i + 1]!) / 2;
      const spike = Math.abs(out[i]! - mid);
      if (spike < minSpike) {
        minSpike = spike;
        minIdx = i;
      }
    }
    out.splice(minIdx, 1);
  }
  return out;
}

function buildEffectivePath(marker: SliderMarker): { path: number[]; duration: number } {
  const path = marker.path ?? [];
  // "Considering" path = start + at least 2 extrema + end.
  if (path.length >= 4) {
    return { path, duration: marker.pathDurationMs ?? DEFAULT_PATH_DURATION };
  }
  const final = marker.value;
  const from = final < 50 ? 100 : 0;
  return { path: [from, final], duration: DIVE_IN_DURATION };
}

/**
 * Ease-out cubic: fast start, decelerates toward the extremum at the end of each segment.
 * This feels human — the slider shoots out and hesitates before reversing direction.
 */
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Position along a polyline at `elapsed` ms, segment times weighted by distance, each segment eased-out. */
function pathPositionAt(path: number[], duration: number, elapsed: number): number {
  if (path.length === 0) return 0;
  if (path.length === 1 || elapsed >= duration) return path[path.length - 1]!;
  if (elapsed <= 0) return path[0]!;
  let total = 0;
  for (let i = 0; i < path.length - 1; i++) total += Math.abs(path[i + 1]! - path[i]!);
  if (total === 0) return path[0]!;
  let acc = 0;
  for (let i = 0; i < path.length - 1; i++) {
    const segTime = (Math.abs(path[i + 1]! - path[i]!) / total) * duration;
    if (segTime === 0) continue;
    if (elapsed <= acc + segTime) {
      const t = easeOutCubic((elapsed - acc) / segTime);
      return path[i]! + (path[i + 1]! - path[i]!) * t;
    }
    acc += segTime;
  }
  return path[path.length - 1]!;
}

/**
 * Returns a function mapping a marker to its current animated `{ value, opacity }`.
 * Drives a single requestAnimationFrame loop while any marker's reveal is still in progress.
 */
function useMarkerPosition(markers: readonly SliderMarker[]) {
  // Signature: re-arm the timeline whenever the round's markers change.
  const sig = markers
    .map((m) => `${m.value}|${m.delayMs ?? 0}|${(m.path ?? []).join(",")}`)
    .join(";");
  const startRef = useRef<number>(0);
  const [now, setNow] = useState(0);

  useEffect(() => {
    if (markers.length === 0) return;
    const total = markers.reduce((max, m) => {
      const { duration } = buildEffectivePath(m);
      return Math.max(max, (m.delayMs ?? 0) + duration + 50);
    }, 0);
    if (total === 0) return;
    startRef.current = performance.now();
    setNow(0);
    let raf = 0;
    const tick = () => {
      const elapsed = performance.now() - startRef.current;
      setNow(elapsed);
      if (elapsed < total) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  return (m: SliderMarker) => {
    const { path, duration } = buildEffectivePath(m);
    const delay = m.delayMs ?? 0;
    if (now < delay) return { value: path[0] ?? m.value, opacity: 0 };
    const local = now - delay;
    return {
      value: pathPositionAt(path, duration, local),
      opacity: Math.min(1, local / FADE_IN_MS),
    };
  };
}


export function GameSlider({
  value = 50,
  onChange,
  onPathChange,
  disabled = false,
  leftLabel,
  rightLabel,
  markers = [],
  showValue = false,
}: GameSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localValue, setLocalValue] = useState(value);
  // Path recording: extrema accumulated during the current drag session.
  const pathRef = useRef<number[]>([]);
  const lastDirRef = useRef<-1 | 0 | 1>(0);

  useEffect(() => {
    if (!isDragging) {
      setLocalValue(value);
    }
  }, [value, isDragging]);

  const recordPathSample = (percent: number) => {
    const path = pathRef.current;
    if (path.length === 0) {
      path.push(percent);
      lastDirRef.current = 0;
      return;
    }
    const last = path[path.length - 1]!;
    if (percent === last) return;
    const dir = percent > last ? 1 : -1;
    if (lastDirRef.current === 0) {
      // First motion since touch-down — set initial direction; track endpoint.
      lastDirRef.current = dir;
      path.push(percent);
      return;
    }
    if (dir === lastDirRef.current) {
      // Same direction: extend the trailing endpoint.
      path[path.length - 1] = percent;
    } else {
      // Direction reversal: the trailing endpoint becomes an extremum; start a new segment.
      path.push(percent);
      lastDirRef.current = dir;
    }
  };

  const handleMove = (clientX: number) => {
    if (disabled || !trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    const percent = Math.round((x / rect.width) * 100);
    setLocalValue(percent);
    recordPathSample(percent);
    if (onChange) onChange(percent);
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (disabled) return;
    pathRef.current = [];
    lastDirRef.current = 0;
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
    if (onPathChange) onPathChange(downsamplePath(pathRef.current));
  };

  const guessMarkers = markers.filter((m) => !m.isTruth);
  const truthMarker = markers.find((m) => m.isTruth);
  const getAnimatedPos = useMarkerPosition(markers);

  return (
    <div className="w-full flex flex-col gap-2 py-4 select-none touch-none">

      {/* Marker circles above track */}
      {markers.length > 0 && (
        <div className="relative h-12 mb-1">
          {guessMarkers.map((marker, i) => {
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            const { value: animValue, opacity } = getAnimatedPos(marker);
            return (
              <div
                key={i}
                className="absolute -translate-x-1/2 bottom-0 flex flex-col items-center"
                style={{
                  left: `calc(${animValue}% * 0.88 + 6%)`,
                  opacity,
                  transition: "none",
                }}
              >
                <div
                  className={cn(
                    "w-9 h-9 rounded-full flex items-center justify-center text-xs font-black shadow-lg border-2 border-white/20",
                    marker.highlight &&
                      "ring-2 ring-yellow-300 ring-offset-2 ring-offset-transparent shadow-[0_0_20px_rgba(253,224,71,0.75)] scale-110",
                  )}
                  style={{ background: color.bg, color: color.text }}
                >
                  {marker.animal ?? marker.label.substring(0, 2).toUpperCase()}
                </div>
                <div className="w-0.5 h-3 bg-white/40 mt-0.5" />
              </div>
            );
          })}
          {truthMarker && (() => {
            const { value: animValue, opacity } = getAnimatedPos(truthMarker);
            return (
              <div
                className="absolute -translate-x-1/2 bottom-0 flex flex-col items-center z-20"
                style={{
                  left: `calc(${animValue}% * 0.88 + 6%)`,
                  opacity,
                  transition: "none",
                }}
              >
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black shadow-lg border-2 border-white/30 bg-white text-black">
                  ★
                </div>
                <div className="w-0.5 h-3 bg-white/70 mt-0.5" />
              </div>
            );
          })()}
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
              className={cn(
                "absolute left-0 top-0 bottom-0 rounded-full bg-gradient-to-r from-primary to-secondary pointer-events-none",
                !isDragging && "transition-all duration-150"
              )}
              style={{ width: `${localValue}%` }}
            />
          )}

          {/* Tick marks for guess markers on track */}
          {guessMarkers.map((marker, i) => {
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            const { value: animValue, opacity } = getAnimatedPos(marker);
            return (
              <div
                key={i}
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-1 h-6 rounded-full pointer-events-none"
                style={{
                  left: `${animValue}%`,
                  background: color.bg,
                  opacity,
                  transition: "none",
                }}
              />
            );
          })}

          {/* Truth tick on track */}
          {truthMarker && (() => {
            const { value: animValue, opacity } = getAnimatedPos(truthMarker);
            return (
              <div
                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-2 h-6 rounded-sm bg-white pointer-events-none z-10"
                style={{ left: `${animValue}%`, opacity, transition: "none" }}
              />
            );
          })()}
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
          {truthMarker && (
            <div
              className="flex items-center gap-2 text-sm border-b border-border pb-1.5 mb-1.5 animate-in fade-in slide-in-from-left-2 duration-300"
              style={{
                animationDelay: `${truthMarker.delayMs ?? 0}ms`,
                animationFillMode: "both",
              }}
            >
              <div className="w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black bg-white text-black">
                ★
              </div>
              <span className="font-bold text-foreground">{truthMarker.label}</span>
              <span className="text-foreground ml-auto font-mono font-black text-sm">{truthMarker.value}</span>
            </div>
          )}
          {guessMarkers.map((marker, i) => {
            const color = MARKER_COLORS[i % MARKER_COLORS.length];
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 text-sm animate-in fade-in slide-in-from-left-2 duration-300",
                  marker.highlight && "bg-yellow-300/10 ring-1 ring-yellow-300/40 rounded-md px-1.5 py-1 -mx-1.5",
                )}
                style={{
                  animationDelay: `${marker.delayMs ?? 0}ms`,
                  animationFillMode: "both",
                }}
              >
                <div
                  className={cn(
                    "w-6 h-6 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black",
                    marker.highlight && "ring-2 ring-yellow-300",
                  )}
                  style={{ background: color.bg, color: color.text }}
                >
                  {marker.animal ?? marker.label.substring(0, 2).toUpperCase()}
                </div>
                <span className={cn("font-semibold text-foreground", marker.highlight && "text-yellow-200")}>
                  {marker.label}
                </span>
                <span className="text-muted-foreground ml-auto font-mono text-xs">{marker.value}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
