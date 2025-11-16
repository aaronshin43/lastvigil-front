/**
 * GazeCursor.ts
 * Gaze cursor object - Applies Magic Circle sprite animation
 * Smoothly interpolates gaze data received from the server and displays it on the screen
 */

import type { AssetLoader } from "../core/AssetLoader";

export interface GazeCursorConfig {
  size?: number; // Cursor size (default: 110)
  chaseSpeed?: number; // Chase speed 0~1 (default: 0.08)
  initialX?: number; // Initial X coordinate
  initialY?: number; // Initial Y coordinate
  assetLoader: AssetLoader; // AssetLoader required
}

export class GazeCursor {
  private size: number;
  private chaseSpeed: number;
  private assetLoader: AssetLoader;

  // Target position (data received from server)
  private targetX: number;
  private targetY: number;

  // Current position (actual position displayed on screen, smoothing applied)
  private currentX: number;
  private currentY: number;

  // Animation related
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private spriteImage: HTMLImageElement | null = null;
  private frameWidth: number = 512;
  private frameHeight: number = 512;
  private frameCount: number = 4;
  private frameDuration: number = 150;

  constructor(config: GazeCursorConfig) {
    this.size = config.size ?? 220;
    this.chaseSpeed = config.chaseSpeed ?? 0.08;
    this.assetLoader = config.assetLoader;

    // Set initial position
    this.targetX = config.initialX ?? 0;
    this.targetY = config.initialY ?? 0;
    this.currentX = this.targetX;
    this.currentY = this.targetY;

    // Load sprite
    this.loadSprite();
  }

  /**
   * Load Magic Circle sprite
   */
  private loadSprite(): void {
    this.spriteImage = this.assetLoader.getMagicCircle();
    const metadata = this.assetLoader.getMagicCircleMetadata();

    if (metadata) {
      this.frameWidth = metadata.frameWidth;
      this.frameHeight = metadata.frameHeight;
      this.frameCount = metadata.frameCount;
      this.frameDuration = metadata.frameDuration;
    }
  }

  /**
   * Update target position with gaze data received from server
   * @param x Target X coordinate
   * @param y Target Y coordinate
   */
  setTarget(x: number, y: number): void {
    const halfSize = this.size / 2;
    // Limit to screen boundaries
    this.targetX = Math.max(
      halfSize,
      Math.min(x, window.innerWidth - halfSize)
    );
    this.targetY = Math.max(
      halfSize,
      Math.min(y, window.innerHeight - halfSize)
    );
  }

  /**
   * Update gaze cursor (called every frame)
   * Smoothly move current position to target position and update animation
   * @param deltaTime Time elapsed from previous frame (ms)
   */
  update(deltaTime: number = 16): void {
    // Smooth tracking using linear interpolation
    this.currentX += (this.targetX - this.currentX) * this.chaseSpeed;
    this.currentY += (this.targetY - this.currentY) * this.chaseSpeed;

    // Update animation frame
    this.frameTimer += deltaTime;
    if (this.frameTimer >= this.frameDuration) {
      this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      this.frameTimer = 0;
    }
  }

  /**
   * Draw gaze cursor on canvas
   * @param ctx 2D rendering context
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.spriteImage) return;

    const halfSize = this.size / 2;

    // Extract current frame from sprite sheet
    ctx.drawImage(
      this.spriteImage,
      this.currentFrame * this.frameWidth, // source X
      0, // source Y
      this.frameWidth, // source width
      this.frameHeight, // source height
      this.currentX - halfSize, // destination X
      this.currentY - halfSize, // destination Y
      this.size, // destination width
      this.size // destination height
    );
  }

  /**
   * Return current position (for reference by other game objects)
   */
  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }

  /**
   * Return target position
   */
  getTargetPosition(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  /**
   * Set cursor position immediately (for initialization or reset)
   */
  setPosition(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * Return cursor radius (for collision checking)
   */
  getRadius(): number {
    return this.size / 2;
  }

  /**
   * Set chase speed
   */
  setChaseSpeed(speed: number): void {
    this.chaseSpeed = Math.max(0, Math.min(1, speed)); // Limit to 0~1 range
  }

  /**
   * Set cursor size
   */
  setSize(size: number): void {
    this.size = size;
  }

  /**
   * Check and limit to screen boundaries
   * @param canvasWidth Canvas width
   * @param canvasHeight Canvas height
   */
  clampToBounds(canvasWidth: number, canvasHeight: number): void {
    const halfSize = this.size / 2;
    this.targetX = Math.max(
      halfSize,
      Math.min(this.targetX, canvasWidth - halfSize)
    );
    this.targetY = Math.max(
      halfSize,
      Math.min(this.targetY, canvasHeight - halfSize)
    );
  }

  /**
   * Check proximity to screen edge
   * @param canvasWidth Canvas width
   * @param canvasHeight Canvas height
   * @param threshold Edge threshold (0~1, e.g., 0.1 = 10%)
   * @returns 'left', 'right', 'top', 'bottom', or null
   */
  checkEdgeProximity(
    canvasWidth: number,
    canvasHeight: number,
    threshold: number = 0.1
  ): string | null {
    const normalizedX = this.currentX / canvasWidth;
    const normalizedY = this.currentY / canvasHeight;

    if (normalizedX < threshold) return "left";
    if (normalizedX > 1 - threshold) return "right";
    if (normalizedY < threshold) return "top";
    if (normalizedY > 1 - threshold) return "bottom";

    return null;
  }
}
