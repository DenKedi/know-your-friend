/**
 * Scene & slot configuration for the lobby waiting-room scene.
 *
 * Coordinates are percentages of the scene container so the layout is
 * resolution-independent. (0,0) is top-left, (100,100) is bottom-right.
 *
 * `renderer` is currently a placeholder — Phase 1 uses emoji placeholders.
 * When real assets land, swap the renderer + asset fields without touching
 * the slot geometry.
 */
export type SlotRenderer = "placeholder" | "image" | "lottie" | "video";

export type LabelPlacement = "above" | "below";

export type SlotConfig = {
  id: string;
  /** Horizontal anchor in % (center of the character). */
  x: number;
  /** Vertical anchor in % (center of the character). */
  y: number;
  /** Visual scale multiplier (1 = base character size). */
  scale: number;
  /** Which way the character faces — for sprite mirroring. */
  facing: "left" | "right";
  /** Where the name label sits relative to the character. */
  labelAnchor: { x: number; y: number; placement: LabelPlacement };
  /** Phase-1 placeholder emoji; will be replaced by asset metadata. */
  placeholder: string;
  renderer?: SlotRenderer;
  /** Reserved for future asset URL / lottie JSON path. */
  assetUrl?: string;
};

export type SceneConfig = {
  id: string;
  /** Maximum players supported by this scene's slot list. */
  capacity: number;
  slots: SlotConfig[];
};

/**
 * Default 8-slot arrangement around a central campfire (approx. 50%, 60%).
 * Order = join order: first joiner takes slot[0], etc.
 */
export const DEFAULT_SCENE: SceneConfig = {
  id: "campfire-forest",
  capacity: 8,
  slots: [
    { id: "s1", x: 28, y: 78, scale: 1.0, facing: "right", placeholder: "🦊",
      labelAnchor: { x: 28, y: 90, placement: "below" } },
    { id: "s2", x: 72, y: 78, scale: 1.0, facing: "left", placeholder: "🦝",
      labelAnchor: { x: 72, y: 90, placement: "below" } },
    { id: "s3", x: 14, y: 66, scale: 0.95, facing: "right", placeholder: "🦔",
      labelAnchor: { x: 14, y: 56, placement: "above" } },
    { id: "s4", x: 86, y: 66, scale: 0.95, facing: "left", placeholder: "🦌",
      labelAnchor: { x: 86, y: 56, placement: "above" } },
    { id: "s5", x: 36, y: 50, scale: 0.85, facing: "right", placeholder: "🐻",
      labelAnchor: { x: 36, y: 40, placement: "above" } },
    { id: "s6", x: 64, y: 50, scale: 0.85, facing: "left", placeholder: "🐺",
      labelAnchor: { x: 64, y: 40, placement: "above" } },
    { id: "s7", x: 50, y: 38, scale: 0.75, facing: "right", placeholder: "🦉",
      labelAnchor: { x: 50, y: 28, placement: "above" } },
    { id: "s8", x: 50, y: 86, scale: 1.05, facing: "right", placeholder: "🐿️",
      labelAnchor: { x: 50, y: 96, placement: "below" } },
  ],
};
