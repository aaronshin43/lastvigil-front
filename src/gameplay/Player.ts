/**
 * Player.ts
 * Player character (Witch) rendering and animation management
 */

import { AssetLoader } from "../core/AssetLoader";
import { WIZARD_SPRITES } from "./WizardTypes";
import type { Camera } from "../core/Camera";

type PlayerAnimationState = "idle" | "hurt";

export class Player {
  private assetLoader: AssetLoader;
  
  // Player state
  private currentHP: number = 100;
  private maxHP: number = 100;
  private animationState: PlayerAnimationState = "idle";
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  
  // Position (fixed at bottom center of screen)
  private x: number = 0;
  private y: number = 0;

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
    this.updatePosition();
    
    // Update position when screen size changes
    window.addEventListener("resize", () => this.updatePosition());
  }
  
  /**
   * Update player position based on screen size
   */
  private updatePosition() {
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight - 150; // 150px above the bottom of the screen
  }
  
  /**
   * Update HP (called from outside)
   */
  public updateHP(newHP: number, maxHP: number) {
    const oldHP = this.currentHP;
    this.currentHP = newHP;
    this.maxHP = maxHP;
    
    // Play hurt animation if HP decreases
    if (newHP < oldHP) {
      this.playHurtAnimation();
    }
  }
  
  /**
   * Play hurt animation
   */
  private playHurtAnimation() {
    this.animationState = "hurt";
    this.currentFrame = 0;
    this.frameTimer = 0;
    // console.log("💥 Player hit!");
  }
  
  /**
   * Update animation
   */
  public update(deltaTime: number) {
    const currentConfig = WIZARD_SPRITES[this.animationState];
    this.frameTimer += deltaTime;
    
    if (this.frameTimer >= currentConfig.frameDuration) {
      this.frameTimer = 0;
      this.currentFrame++;
      
      // Return to idle when hurt animation ends
      if (this.animationState === "hurt") {
        if (this.currentFrame >= WIZARD_SPRITES.hurt.frameCount) {
          this.animationState = "idle";
          this.currentFrame = 0;
        }
      }
    }
  }
  
  /**
   * Render player
   */
  public draw(ctx: CanvasRenderingContext2D, _camera: Camera) {
    // Get metadata based on current animation state
    const config = WIZARD_SPRITES[this.animationState];
    const spriteImage = this.assetLoader.getWizard(this.animationState);
    
    if (!spriteImage || !spriteImage.complete) return;
    
    // Extract current frame from sprite sheet
    const frameWidth = config.frameWidth;
    const frameHeight = config.frameHeight;
    
    const sourceX = this.currentFrame * frameWidth;
    const sourceY = 0;
    
    // Calculate rendering size
    const renderWidth = frameWidth * config.scale;
    const renderHeight = frameHeight * config.scale;
    
    // Draw at bottom center of screen (no camera influence)
    const drawX = this.x - renderWidth / 2;
    const drawY = this.y - renderHeight / 2;
    
    // Red tint effect when in hurt state
    if (this.animationState === "hurt") {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(drawX, drawY, renderWidth, renderHeight);
      ctx.restore();
    }
    
    // Draw sprite
    ctx.drawImage(
      spriteImage,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      drawX,
      drawY,
      renderWidth,
      renderHeight
    );
    
    // Draw HP bar
    this.drawHealthBar(ctx, drawX, drawY, renderWidth);
  }
  
  /**
   * Draw HP bar
   */
  private drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
    const barWidth = width;
    const barHeight = 8;
    const barY = y - 20;
    
    // Background (red)
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(x, barY, barWidth, barHeight);
    
    // HP (green)
    const hpWidth = (this.currentHP / this.maxHP) * barWidth;
    ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
    ctx.fillRect(x, barY, hpWidth, barHeight);
    
    // Border
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, barY, barWidth, barHeight);
  }
  
  /**
   * Get current HP
   */
  public getCurrentHP(): number {
    return this.currentHP;
  }
}
