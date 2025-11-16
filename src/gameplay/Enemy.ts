/**
 * Enemy.ts
 * A "dumb" renderer that renders enemies based on data received from the server.
 * Game logic is handled on the server, the frontend is only responsible for drawing.
 */

import { AssetLoader } from "../core/AssetLoader";
import type { Camera } from "../core/Camera";
import type { EnemyTypeConfig } from "./EnemyTypes";

type AnimationState = "walk" | "hurt" | "death";

// Total map width (3 times the screen width)
const WORLD_WIDTH = 2148;

/**
 * Enemy state data received from the server
 */
export interface EnemyStateData {
  id: string;
  typeId: string;
  x: number; // Normalized x coordinate based on entire map (0.0~1.0)
  y: number; // Normalized y coordinate based on screen (0.0~1.0)
  currentHP: number;
  maxHP: number;
  animationState: AnimationState;
  currentFrame: number;
  isDead: boolean;
}

/**
 * Enemy class - Purely for rendering
 * Receives state from the server and only draws it on the screen.
 */
export class Enemy {
  public id: string;
  public typeConfig: EnemyTypeConfig;

  // State received from the server
  public x: number = 0;
  public y: number = 0;
  public currentHP: number = 0;
  public maxHP: number = 0;
  public animationState: AnimationState = "walk";
  public currentFrame: number = 0;
  public isDead: boolean = false;

  private assetLoader: AssetLoader;
  private scale: number;

  // Frontend animation management
  private localCurrentFrame: number = 0;
  private frameTimer: number = 0;

  constructor(
    id: string,
    typeConfig: EnemyTypeConfig,
    assetLoader: AssetLoader
  ) {
    this.id = id;
    this.typeConfig = typeConfig;
    this.assetLoader = assetLoader;
    this.maxHP = typeConfig.stats.maxHP;
    this.currentHP = this.maxHP;
    this.scale = typeConfig.stats.scale;
  }

  /**
   * Update state based on data received from the server
   */
  public updateFromServer(data: EnemyStateData): void {
    // x: Convert normalized coordinate (0~1) based on entire map to world coordinates
    this.x = data.x * WORLD_WIDTH;
    // y: Convert normalized coordinate (0~1) based on screen to screen coordinates
    this.y = data.y * window.innerHeight;
    this.currentHP = data.currentHP;
    this.maxHP = data.maxHP;

    // Reset frame if animation state changes
    if (this.animationState !== data.animationState) {
      this.animationState = data.animationState;
      this.localCurrentFrame = 0;
      this.frameTimer = 0;
    }

    this.isDead = data.isDead;
  }

  /**
   * Update animation frames (deltaTime in ms)
   */
  public updateAnimation(deltaTime: number): void {
    const spriteConfig = this.typeConfig.sprites[this.animationState];

    // If death animation has already reached the last frame, do not update
    if (
      this.animationState === "death" &&
      this.localCurrentFrame >= spriteConfig.frameCount - 1
    ) {
      return;
    }

    this.frameTimer += deltaTime;

    if (this.frameTimer >= spriteConfig.frameDuration) {
      this.frameTimer -= spriteConfig.frameDuration;
      this.localCurrentFrame++;

      // Death animation stops at the last frame
      if (this.animationState === "death") {
        if (this.localCurrentFrame >= spriteConfig.frameCount) {
          this.localCurrentFrame = spriteConfig.frameCount - 1;
        }
      } else {
        // Other animations loop
        if (this.localCurrentFrame >= spriteConfig.frameCount) {
          this.localCurrentFrame = 0;
        }
      }
    }
  }

  /**
   * Draw on canvas (apply camera offset)
   */
  public draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // World coordinates → Screen coordinates conversion
    const screenPos = camera.worldToScreen(this.x, this.y);

    // 🔍 Debugging: Log enemy position (only for the first enemy)
    // if (this.id.endsWith('0')) {
    //   console.log(`👾 Enemy draw: id=${this.id}, world(${this.x.toFixed(0)}, ${this.y.toFixed(0)}) → screen(${screenPos.x.toFixed(0)}, ${screenPos.y.toFixed(0)})`);
    // }

    // Skip drawing if outside the screen (optimization)
    const margin = 200;
    if (
      screenPos.x < -margin ||
      screenPos.x > camera.getViewportWidth() + margin
    ) {
      // if (this.id.endsWith('0')) {
      //   console.log(`🚫 Enemy ${this.id} culled: screenX=${screenPos.x.toFixed(0)}, viewport=${camera.getViewportWidth()}`);
      // }
      return;
    }

    const spriteConfig = this.typeConfig.sprites[this.animationState];
    const image = this.assetLoader.getImageByPath(spriteConfig.path);

    if (!image) {
      // Image not loaded - Draw debug circle
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const frameWidth = spriteConfig.frameWidth;
    const frameHeight = spriteConfig.frameHeight;

    // Death animation plays in reverse (sprite sheet is in reverse order)
    let frameIndex = this.localCurrentFrame;
    if (this.animationState === "death") {
      frameIndex = spriteConfig.frameCount - 1 - this.localCurrentFrame;
    }

    const sx = frameIndex * frameWidth;
    const sy = 0;

    const renderWidth = frameWidth * this.scale;
    const renderHeight = frameHeight * this.scale;

    ctx.drawImage(
      image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      screenPos.x - renderWidth / 2,
      screenPos.y - renderHeight / 2,
      renderWidth,
      renderHeight
    );

    // Draw HP bar
    if (!this.isDead) {
      this.drawHealthBar(ctx, screenPos.x, screenPos.y);
    }
  }

  /**
   * Draw HP bar (pixel art style, adjusted to mob size)
   */
  private drawHealthBar(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    // Pixel art settings
    ctx.imageSmoothingEnabled = false;

    // Adjust segment size based on scale (smaller mobs = smaller HP bars)
    const baseSegmentSize = Math.max(
      6,
      Math.min(10, Math.round(this.scale * 14))
    );
    const segmentWidth = baseSegmentSize;
    const segmentHeight = baseSegmentSize;
    const segmentGap = 1;

    // Adjust number of segments based on HP (minimum 5, maximum 10)
    let numSegments: number;
    if (this.maxHP <= 50) {
      numSegments = 5; // Weak mobs like slimes
    } else if (this.maxHP <= 100) {
      numSegments = 6; // Skeletons, orcs, etc.
    } else if (this.maxHP <= 200) {
      numSegments = 8; // Strong mobs
    } else {
      numSegments = 10; // Boss level
    }

    const totalWidth = numSegments * (segmentWidth + segmentGap) - segmentGap;

    const barX = screenX - totalWidth / 2 - 15;
    // Slightly above the mob center (near the head)
    const barY = screenY - 60;

    const hpRatio = Math.max(0, this.currentHP / this.maxHP);
    const filledSegments = Math.ceil(hpRatio * numSegments);

    // Draw each segment
    for (let i = 0; i < numSegments; i++) {
      const segX = barX + i * (segmentWidth + segmentGap);
      const isFilled = i < filledSegments;

      // Outer border (black, 1 pixel)
      ctx.fillStyle = "#000000";
      ctx.fillRect(segX, barY, segmentWidth, segmentHeight);

      // Inner area
      const innerX = segX + 1;
      const innerY = barY + 1;
      const innerWidth = segmentWidth - 2;
      const innerHeight = segmentHeight - 2;

      if (isFilled) {
        // Determine HP color
        let mainColor, lightColor, darkColor;
        if (hpRatio > 0.6) {
          mainColor = "#44ff44"; // Green
          lightColor = "#88ff88";
          darkColor = "#22aa22";
        } else if (hpRatio > 0.3) {
          mainColor = "#ffdd44"; // Yellow
          lightColor = "#ffee88";
          darkColor = "#cc9922";
        } else {
          mainColor = "#ff4444"; // Red
          lightColor = "#ff8888";
          darkColor = "#cc2222";
        }

        // Main color
        ctx.fillStyle = mainColor;
        ctx.fillRect(innerX, innerY, innerWidth, innerHeight);

        // Top highlight (1 pixel)
        ctx.fillStyle = lightColor;
        ctx.fillRect(innerX, innerY, innerWidth, 1);

        // Bottom shadow (1 pixel)
        ctx.fillStyle = darkColor;
        ctx.fillRect(innerX, innerY + innerHeight - 1, innerWidth, 1);
      } else {
        // Empty segment (dark gray)
        ctx.fillStyle = "#2a2a3a";
        ctx.fillRect(innerX, innerY, innerWidth, innerHeight);
      }
    }

    ctx.imageSmoothingEnabled = true;
  }

  /**
   * Simple getters
   */
  public getIsDead(): boolean {
    return this.isDead;
  }
}
