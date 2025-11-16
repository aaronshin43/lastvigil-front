/**
 * VFXTypes.ts
 * Sprite metadata definition for each VFX effect
 */

export interface VFXMetadata {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number; // ms
  loop?: boolean;
  scale?: number;
  yOffset?: number; // Y-axis offset (adjusted from default 0.7, e.g., -0.3 = 40% of screen height)
}

export interface VFXConfig {
  [key: string]: VFXMetadata;
}

/**
 * All VFX type definitions
 */
export const VFX_TYPES: VFXConfig = {
  fireHammerRed: {
    path: "/assets/vfx/fire_hammer_red-sheet.png",
    frameWidth: 128,
    frameHeight: 144,
    frameCount: 19,
    frameDuration: 60,
    loop: false,
    scale: 3,
    yOffset: -0.1,
  },
  fireSlash: {
    path: "/assets/vfx/fire_slash-sheet.png",
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 19,
    frameDuration: 50,
    loop: false,
    scale: 3,
    yOffset: -0.05,
  },
  fireVortexRed: {
    path: "/assets/vfx/fire_vortex_red-sheet.png",
    frameWidth: 96,
    frameHeight: 144,
    frameCount: 27,
    frameDuration: 45,
    loop: false,
    scale: 3,
    yOffset: -0.08,
  },
  fireHurricaneBlue: {
    path: "/assets/vfx/fire_hurricane_blue-sheet.png",
    frameWidth: 128,
    frameHeight: 100,
    frameCount: 17,
    frameDuration: 60,
    loop: false,
    scale: 3,
  },
  meteorShowerRed: {
    path: "/assets/vfx/meteor_shower-red-sheet.png",
    frameWidth: 253,
    frameHeight: 192,
    frameCount: 24,
    frameDuration: 60,
    loop: false,
    scale: 3,
    yOffset: 0.1,
  },
  tornado: {
    path: "/assets/vfx/tornado-sheet.png",
    frameWidth: 105,
    frameHeight: 100,
    frameCount: 14,
    frameDuration: 60,
    loop: false,
    scale: 3,
  },
  lightningV1: {
    path: "/assets/vfx/lightning_v1-sheet.png",
    frameWidth: 64,
    frameHeight: 156,
    frameCount: 17,
    frameDuration: 50,
    loop: false,
    scale: 3.5,
    yOffset: -0.15,
  },
  lightningV2: {
    path: "/assets/vfx/lightning_v2-sheet.png",
    frameWidth: 64,
    frameHeight: 256,
    frameCount: 8,
    frameDuration: 60,
    loop: false,
    scale: 2,
    yOffset: -0.15,
  },
  skyBeam: {
    path: "/assets/vfx/sky_beam-sheet.png",
    frameWidth: 64,
    frameHeight: 256,
    frameCount: 20,
    frameDuration: 30,
    loop: false,
    scale: 2.5,
    yOffset: -0.2, 
  },
};

/**
 * Get configuration by VFX ID
 */
export function getVFXConfig(vfxId: string): VFXMetadata | null {
  return VFX_TYPES[vfxId] || null;
}

/**
 * List of all VFX IDs
 */
export function getAllVFXIds(): string[] {
  return Object.keys(VFX_TYPES);
}
