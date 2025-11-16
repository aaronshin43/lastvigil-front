/**
 * Effect.ts
 * Handles 2D spritesheet animations.
 * Renders VFX such as explosions and magic circles on the canvas.
 */

import type { VFXMetadata } from "./VFXTypes";
import type { Camera } from "../core/Camera";

export class Effect {
  private worldX: number; // World coordinate x
  private y: number; // Screen coordinate y (fixed position with yOffset applied)
  private image: HTMLImageElement;
  private frameWidth: number;
  private frameHeight: number;
  private frameCount: number;
  private frameDuration: number;
  private loop: boolean;
  private scale: number;

  private currentFrame: number = 0;
  private elapsedTime: number = 0;
  private isFinished: boolean = false;

  constructor(
    worldX: number, // Received as world coordinate
    y: number,
    image: HTMLImageElement,
    metadata: VFXMetadata
  ) {
    this.worldX = worldX;
    this.y = y;
    this.image = image;
    this.frameWidth = metadata.frameWidth;
    this.frameHeight = metadata.frameHeight;
    this.frameCount = metadata.frameCount;
    this.frameDuration = metadata.frameDuration;
    this.loop = metadata.loop ?? false;
    this.scale = metadata.scale ?? 1;
  }

  /**
   * Update the effect (based on deltaTime)
   * @param deltaTime Time elapsed since the last frame (ms)
   */
  update(deltaTime: number): void {
    if (this.isFinished) return;

    this.elapsedTime += deltaTime;

    // Frame transition
    if (this.elapsedTime >= this.frameDuration) {
      this.elapsedTime -= this.frameDuration;
      this.currentFrame++;

      // Check if the animation has ended
      if (this.currentFrame >= this.frameCount) {
        if (this.loop) {
          this.currentFrame = 0; // Loop
        } else {
          this.currentFrame = this.frameCount - 1;
          this.isFinished = true; // End
        }
      }
    }
  }

  /**
   * Draw the effect on the canvas
   * @param ctx 2D rendering context
   * @param camera Camera object (converts world → screen coordinates)
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.image.complete) return; // Skip if the image is not loaded

    // Convert world coordinates to screen coordinates
    const screenPos = camera.worldToScreen(this.worldX, this.y);

    // Skip drawing if outside the screen (optimization)
    const drawWidth = this.frameWidth * this.scale;
    const drawHeight = this.frameHeight * this.scale;
    const margin = 200;
    if (
      screenPos.x < -margin ||
      screenPos.x > camera.getViewportWidth() + margin
    ) {
      return;
    }

    // Calculate the position of the current frame in the spritesheet
    // Assumption: Frames are arranged horizontally in the spritesheet
    const sx = this.currentFrame * this.frameWidth;
    const sy = 0;

    // Calculate the drawing position (centered, using screen coordinates)
    const drawX = screenPos.x - drawWidth / 2;
    const drawY = screenPos.y - drawHeight / 2;

    ctx.drawImage(
      this.image,
      sx,
      sy,
      this.frameWidth,
      this.frameHeight, // Source area
      drawX,
      drawY,
      drawWidth,
      drawHeight // Target area
    );
  }

  /**
   * Check if the effect has finished
   */
  isComplete(): boolean {
    return this.isFinished;
  }

  /**
   * Set the position of the effect (world coordinates)
   */
  setPosition(worldX: number, y: number): void {
    this.worldX = worldX;
    this.y = y;
  }

  /**
   * Get the current position (world x-coordinate, screen y-coordinate)
   */
  getPosition(): { x: number; y: number } {
    return { x: this.worldX, y: this.y };
  }

  /**
   * Reset the effect (for reuse)
   */
  reset(worldX?: number, y?: number): void {
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isFinished = false;

    if (worldX !== undefined) this.worldX = worldX;
    if (y !== undefined) this.y = y;
  }
}
