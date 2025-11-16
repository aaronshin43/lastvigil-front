/**
 * Camera.ts
 * A camera class responsible for converting between world (map) coordinates and screen coordinates.
 * Manages camera offsets during map scrolling.
 */

export interface CameraConfig {
  worldWidth: number; // Actual width of the map (in pixels)
  viewportWidth?: number; // Viewport width (default: window.innerWidth)
  viewportHeight?: number; // Viewport height (default: window.innerHeight)
}

export class Camera {
  private offsetX: number = 0;
  private offsetY: number = 0;
  private worldWidth: number;
  private viewportWidth: number;
  private viewportHeight: number;

  constructor(config: CameraConfig) {
    this.worldWidth = config.worldWidth;
    this.viewportWidth = config.viewportWidth ?? window.innerWidth;
    this.viewportHeight = config.viewportHeight ?? window.innerHeight;
  }

  /**
   * Move the camera along the X-axis (scroll).
   * @param deltaX Amount to move (positive: right, negative: left)
   */
  moveX(deltaX: number): void {
    // const oldOffset = this.offsetX;
    this.offsetX += deltaX;
    this.clampOffset();

    // 🔍 Debugging: Check if the camera actually moved
    // if (oldOffset !== this.offsetX) {
    //   console.log(`📹 Camera.moveX(${deltaX}): ${oldOffset.toFixed(0)} → ${this.offsetX.toFixed(0)}`);
    // }
  }

  /**
   * Set the camera's X offset.
   */
  setOffsetX(offset: number): void {
    this.offsetX = offset;
    this.clampOffset();
  }

  /**
   * Clamp the camera offset within the map boundaries.
   */
  private clampOffset(): void {
    const maxOffset = Math.max(0, this.worldWidth - this.viewportWidth);
    this.offsetX = Math.max(0, Math.min(this.offsetX, maxOffset));
  }

  /**
   * Convert world coordinates to screen coordinates.
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.offsetX,
      y: worldY - this.offsetY,
    };
  }

  /**
   * Convert screen coordinates to world coordinates.
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.offsetX,
      y: screenY + this.offsetY,
    };
  }

  /**
   * Get the current camera X offset.
   */
  getOffsetX(): number {
    return this.offsetX;
  }

  /**
   * Get the current camera Y offset.
   */
  getOffsetY(): number {
    return this.offsetY;
  }

  /**
   * Get the world width.
   */
  getWorldWidth(): number {
    return this.worldWidth;
  }

  /**
   * Get the viewport width.
   */
  getViewportWidth(): number {
    return this.viewportWidth;
  }

  /**
   * Get the viewport height.
   */
  getViewportHeight(): number {
    return this.viewportHeight;
  }

  /**
   * Update the viewport size when the screen size changes.
   */
  updateViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.clampOffset(); // Recalculate boundaries
  }

  /**
   * Move the camera so that a specific world X coordinate is centered on the screen.
   */
  centerOnWorldX(worldX: number): void {
    this.offsetX = worldX - this.viewportWidth / 2;
    this.clampOffset();
  }

  /**
   * Check if the map can be scrolled.
   */
  canScroll(): boolean {
    return this.worldWidth > this.viewportWidth;
  }
}
