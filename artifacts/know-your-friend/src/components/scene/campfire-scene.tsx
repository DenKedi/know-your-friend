import type { ReactNode } from "react";
import campfireBg from "@/assets/animations/Campfire_shooting_sparks_into_sky_202605201528.mp4";

type Props = {
  children: ReactNode;
};

/**
 * Persistent campfire scene wrapper. Mounted ONCE at the App root,
 * outside of <Switch>, so the video element survives route changes
 * (Home → Lobby → Game) without remounting — the campfire keeps
 * playing seamlessly.
 *
 * Phase 2 will split this into a still-image background + a small
 * fire-loop video clipped to the flame region. The single-video
 * implementation here is the contract the rest of the scene system
 * builds against; swapping it in won't affect children or overlays.
 */
export function CampfireScene({ children }: Props) {
  return (
    <div className="min-h-[100dvh] relative overflow-hidden bg-background text-foreground">
      {/* Campfire video background — persistent across routes */}
      <video
        className="fixed inset-0 h-full w-full object-cover z-0"
        src={campfireBg}
        autoPlay
        loop
        muted
        playsInline
        aria-hidden
      />

      {/* Warm gradient tint — lighter in the centre so the fire breathes */}
      <div
        className="fixed inset-0 z-[1] bg-gradient-to-b from-background/60 via-background/40 to-background/80"
        aria-hidden
      />

      {/* Colour blobs */}
      <div
        className="pointer-events-none fixed -top-32 -left-24 z-[2] h-[28rem] w-[28rem] rounded-full opacity-40 blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(var(--primary) / 0.55), transparent 70%)" }}
        aria-hidden
      />
      <div
        className="pointer-events-none fixed -bottom-40 -right-24 z-[2] h-[30rem] w-[30rem] rounded-full opacity-35 blur-3xl"
        style={{ background: "radial-gradient(closest-side, hsl(var(--secondary) / 0.6), transparent 70%)" }}
        aria-hidden
      />

      {/* Route content (foreground) — sits above background, below modal portals */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
