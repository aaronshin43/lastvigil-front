/**
 * MagicCircleTypes.ts
 * Magic circle sprite metadata definition
 * 4 magic circle designs visible in the image
 */

export interface MagicCircleMetadata {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number; // ms per frame
}

// 4 magic circles are arranged horizontally in the sprite sheet
export const MAGIC_CIRCLE_TYPES = {
  circle1: {
    path: "/assets/sprites/Magic_Circle/Magic_Circle.png",
    frameWidth: 838, // Width of each magic circle (estimated value, adjust to actual image size if needed)
    frameHeight: 838, // Height of each magic circle
    frameCount: 7, // 4 different designs
    frameDuration: 100, // Duration of each frame (ms)
  },
} as const;

export type MagicCircleType = keyof typeof MAGIC_CIRCLE_TYPES;
