/**
 * Renderer.ts
 * Manages the 60fps requestAnimationFrame loop and handles canvas initialization/drawing.
 */

import type { Effect } from "../gameplay/Effect";
import type { GazeCursor } from "../gameplay/GazeCursor";
import type { Camera } from "./Camera";
import type { AssetLoader } from "./AssetLoader";
import { WIZARD_SPRITES } from "../gameplay/WizardTypes";

export interface RendererConfig {
  backgroundCanvasId: string;
  gameCanvasId: string;
  backgroundColor?: string;
  camera: Camera;
  assetLoader: AssetLoader;
}

export class Renderer {
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;
  private gameCanvas: HTMLCanvasElement;
  private gameCtx: CanvasRenderingContext2D;
  private camera: Camera;
  private assetLoader: AssetLoader;

  private backgroundColor: string;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  // Background image
  private backgroundImage: HTMLImageElement | null = null;

  // Witch state (fixed position, HP received from the server)
  private witchX: number = 0.01; // Normalized x-coordinate (fixed value)
  private witchY: number = 0.8; // Normalized y-coordinate (fixed value)
  private witchHP: number = 100; // Current HP
  private witchMaxHP: number = 100; // Maximum HP
  private witchIsDead: boolean = false;

  // Wizard animation state
  private wizardCurrentFrame: number = 0;
  private wizardElapsedTime: number = 0;
  private wizardAnimationState: "idle" | "hurt" | "attack" | "attack2" = "idle";
  private previousWitchHP: number = 100; // For detecting HP changes

  // Objects to render (injected externally)
  private effects: Effect[] = [];
  private gazeCursor: GazeCursor | null = null;

  constructor(config: RendererConfig) {
    // Initialize background canvas
    this.backgroundCanvas = document.getElementById(
      config.backgroundCanvasId
    ) as HTMLCanvasElement;
    if (!this.backgroundCanvas) {
      throw new Error(
        `Canvas with id "${config.backgroundCanvasId}" not found`
      );
    }
    this.backgroundCtx = this.backgroundCanvas.getContext("2d")!;

    // Initialize game object canvas
    this.gameCanvas = document.getElementById(
      config.gameCanvasId
    ) as HTMLCanvasElement;
    if (!this.gameCanvas) {
      throw new Error(`Canvas with id "${config.gameCanvasId}" not found`);
    }
    this.gameCtx = this.gameCanvas.getContext("2d")!;

    this.backgroundColor = config.backgroundColor || "#000000";
    this.camera = config.camera;
    this.assetLoader = config.assetLoader;

    // Set canvas size
    this.resizeCanvases();

    // Window resize event
    window.addEventListener("resize", () => this.resizeCanvases());
  }

  /**
   * Adjust canvas size to match window size
   */
  private resizeCanvases(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.backgroundCanvas.width = width;
    this.backgroundCanvas.height = height;
    this.gameCanvas.width = width;
    this.gameCanvas.height = height;

    // Redraw background
    if (this.backgroundImage) {
      this.drawBackground();
    }
  }

  /**
   * Set background image
   */
  setBackgroundImage(image: HTMLImageElement): void {
    this.backgroundImage = image;
    this.drawBackground();
  }

  /**
   * Update Witch HP (received from the server, position is fixed)
   */
  updateWitchHP(currentHP: number, maxHP: number, isDead: boolean): void {
    // Trigger hurt animation if HP decreases
    if (currentHP < this.previousWitchHP && currentHP > 0) {
      this.wizardAnimationState = "hurt";
      this.wizardCurrentFrame = 0;
      this.wizardElapsedTime = 0;
      // console.log("💥 Player hit!");
    }

    this.previousWitchHP = currentHP;
    this.witchHP = currentHP;
    this.witchMaxHP = maxHP;
    this.witchIsDead = isDead;
  }

  /**
   * Trigger attack animation (randomly selects attack or attack2)
   */
  playAttackAnimation(): void {
    // Ignore if already attacking or in hurt animation
    if (
      this.wizardAnimationState === "attack" ||
      this.wizardAnimationState === "attack2" ||
      this.wizardAnimationState === "hurt"
    ) {
      return;
    }

    // Randomly select attack or attack2
    const attackType = Math.random() < 0.5 ? "attack" : "attack2";
    this.wizardAnimationState = attackType;
    this.wizardCurrentFrame = 0;
    this.wizardElapsedTime = 0;
    // console.log(`⚔️ Attack animation triggered: ${attackType}`);
  }

  /**
   * Redraw background (can be called externally)
   */
  public redrawBackground(deltaTime?: number): void {
    // Update Wizard animation
    if (deltaTime !== undefined) {
      this.updateWizardAnimation(deltaTime);
    }
    this.drawBackground();
  }

  /**
   * Draw background image (based on Camera)
   */
  private drawBackground(): void {
    this.backgroundCtx.clearRect(
      0,
      0,
      this.backgroundCanvas.width,
      this.backgroundCanvas.height
    );

    if (
      !this.backgroundImage ||
      !this.backgroundImage.complete ||
      this.backgroundImage.naturalWidth === 0
    ) {
      // Draw solid background if no image
      this.backgroundCtx.fillStyle = this.backgroundColor;
      this.backgroundCtx.fillRect(
        0,
        0,
        this.backgroundCanvas.width,
        this.backgroundCanvas.height
      );
      return;
    }

    // Draw background image to match world size
    const worldWidth = this.camera.getWorldWidth();
    const viewportHeight = this.backgroundCanvas.height;

    // Set to fill the screen
    const imageWidth = worldWidth;
    const imageHeight = viewportHeight; // Match screen height (ignore aspect ratio)

    // Apply camera offset (background scrolls with the world)
    const cameraOffset = -this.camera.getOffsetX();

    this.backgroundCtx.drawImage(
      this.backgroundImage,
      cameraOffset,
      0, // Remove yOffset, draw from the top
      imageWidth,
      imageHeight
    );

    // Draw Wizard (using coordinates received from the server)
    const wizardImage = this.assetLoader.getWizard(this.wizardAnimationState);
    if (
      wizardImage &&
      wizardImage.complete &&
      wizardImage.naturalWidth > 0 &&
      !this.witchIsDead
    ) {
      const currentConfig = WIZARD_SPRITES[this.wizardAnimationState];
      const drawWidth = currentConfig.frameWidth * currentConfig.scale;
      const drawHeight = currentConfig.frameHeight * currentConfig.scale;

      // Convert normalized coordinates from the server to screen coordinates
      const worldWidth = this.camera.getWorldWidth();
      const worldX = this.witchX * worldWidth;
      const worldY = this.witchY * viewportHeight;

      // Convert world coordinates to screen coordinates (apply camera offset)
      const wizardX = worldX + cameraOffset;
      const wizardY = worldY - drawHeight / 2; // Center alignment

      // Calculate source coordinates for the current frame
      const srcX = this.wizardCurrentFrame * currentConfig.frameWidth;
      const srcY = 0;

      this.backgroundCtx.drawImage(
        wizardImage,
        srcX,
        srcY,
        currentConfig.frameWidth,
        currentConfig.frameHeight,
        wizardX,
        wizardY,
        drawWidth,
        drawHeight
      );

      // Draw HP bar
      this.drawWitchHealthBar(wizardX, wizardY, drawWidth);
    }
  }

  /**
   * Draw Witch HP bar (pixel art style)
   */
  private drawWitchHealthBar(x: number, y: number, width: number): void {
    // Enable pixel art style
    this.backgroundCtx.imageSmoothingEnabled = false;

    const segmentWidth = 20; // Width of each segment
    const segmentHeight = 18; // Height of each segment
    const segmentGap = 2; // Gap between segments
    const numSegments = 10; // Total number of segments (10 slots)
    const hpPerSegment = 10; // HP per segment
    const totalWidth = numSegments * (segmentWidth + segmentGap);

    const barX = x + (width - totalWidth) / 2;
    const barY = y + 225; // Display above the Witch

    // Calculate the number of filled segments (10 HP per slot)
    const filledSegments = Math.floor(this.witchHP / hpPerSegment);
    const partialSegment = (this.witchHP % hpPerSegment) / hpPerSegment;
    const hpRatio = Math.max(0, this.witchHP / this.witchMaxHP);

    // Draw heart icon (pixel style)
    const heartX = barX - 22;
    const heartY = barY + 1;
    this.drawPixelHeart(heartX, heartY, hpRatio);

    // Draw each segment
    for (let i = 0; i < numSegments; i++) {
      const segX = barX + i * (segmentWidth + segmentGap);

      let fillAmount = 0;
      if (i < filledSegments) {
        fillAmount = 1; // Fully filled
      } else if (i === filledSegments && partialSegment > 0) {
        fillAmount = partialSegment; // Partially filled
      }

      this.drawHPSegment(
        segX,
        barY,
        segmentWidth,
        segmentHeight,
        fillAmount,
        hpRatio
      );
    }

    this.backgroundCtx.imageSmoothingEnabled = true;
  }

  /**
   * Draw a single HP segment (pixel art style)
   */
  private drawHPSegment(
    x: number,
    y: number,
    width: number,
    height: number,
    fillAmount: number,
    hpRatio: number
  ): void {
    // Outer border (black, 2px)
    this.backgroundCtx.fillStyle = "#000000";
    this.backgroundCtx.fillRect(x, y, width, height);

    // Inner area
    const innerX = x + 2;
    const innerY = y + 2;
    const innerWidth = width - 4;
    const innerHeight = height - 4;

    if (fillAmount > 0) {
      // Determine HP colors
      let mainColor, lightColor, darkColor;
      if (hpRatio > 0.6) {
        // Green tones
        mainColor = "#ff5555"; // Bright red
        lightColor = "#ffaaaa"; // Very bright red (top highlight)
        darkColor = "#cc3333"; // Dark red (bottom shadow)
      } else if (hpRatio > 0.3) {
        // Yellow tones
        mainColor = "#ff5555";
        lightColor = "#ffaaaa";
        darkColor = "#cc3333";
      } else {
        // Red tones
        mainColor = "#ff5555";
        lightColor = "#ffaaaa";
        darkColor = "#cc3333";
      }

      // Adjust width for partially filled segments
      const fillWidth = innerWidth * fillAmount;

      // Main color (most of the area)
      this.backgroundCtx.fillStyle = mainColor;
      this.backgroundCtx.fillRect(innerX, innerY, fillWidth, innerHeight);

      // Top highlight (bright color, 2-3px)
      this.backgroundCtx.fillStyle = lightColor;
      this.backgroundCtx.fillRect(innerX, innerY, fillWidth, 3);

      // Bottom shadow (dark color, 2px)
      this.backgroundCtx.fillStyle = darkColor;
      this.backgroundCtx.fillRect(
        innerX,
        innerY + innerHeight - 2,
        fillWidth,
        2
      );

      // Fill empty parts if any
      if (fillAmount < 1) {
        const emptyDark = "#3d3d5c";
        const emptyLight = "#5a5a7a";
        const emptyX = innerX + fillWidth;
        const emptyWidth = innerWidth - fillWidth;

        this.backgroundCtx.fillStyle = emptyDark;
        this.backgroundCtx.fillRect(emptyX, innerY, emptyWidth, innerHeight);

        this.backgroundCtx.fillStyle = emptyLight;
        this.backgroundCtx.fillRect(emptyX, innerY, emptyWidth, 2);
      }
    } else {
      // Completely empty segment (dark gray)
      const emptyDark = "#3d3d5c"; // Dark purplish gray
      const emptyLight = "#5a5a7a"; // Light purplish gray (highlight)

      this.backgroundCtx.fillStyle = emptyDark;
      this.backgroundCtx.fillRect(innerX, innerY, innerWidth, innerHeight);

      // Top highlight
      this.backgroundCtx.fillStyle = emptyLight;
      this.backgroundCtx.fillRect(innerX, innerY, innerWidth, 2);
    }
  }

  /**
   * Draw pixel heart icon
   */
  private drawPixelHeart(x: number, y: number, hpRatio: number): void {
    const pixelSize = 2;

    // Heart pixel pattern (8x7)
    const heartPattern = [
      [0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ];

    // Determine heart color
    let heartColor;
    if (hpRatio > 0.6) {
      heartColor = "#ff3366"; // Bright pink-red
    } else if (hpRatio > 0.3) {
      heartColor = "#ff3366"; // Bright pink-red
    } else if (hpRatio > 0) {
      heartColor = "#ff3366"; // Bright pink-red
    } else {
      heartColor = "#666666"; // Gray (dead)
    }

    for (let row = 0; row < heartPattern.length; row++) {
      for (let col = 0; col < heartPattern[row].length; col++) {
        if (heartPattern[row][col] === 1) {
          // Main heart color
          this.backgroundCtx.fillStyle = heartColor;
          this.backgroundCtx.fillRect(
            x + col * pixelSize,
            y + row * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }

  /**
   * Set the array of effects to render
   */
  setEffects(effects: Effect[]): void {
    this.effects = effects;
  }

  /**
   * Getter for Witch state
   */
  getWitchState(): {
    hp: number;
    maxHP: number;
    isDead: boolean;
  } {
    return {
      hp: this.witchHP,
      maxHP: this.witchMaxHP,
      isDead: this.witchIsDead,
    };
  }

  /**
   * Set gaze cursor
   */
  setGazeCursor(cursor: GazeCursor): void {
    this.gazeCursor = cursor;
  }

  /**
   * Clear the game canvas
   */
  clear(): void {
    this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  /**
   * Start the rendering loop
   */
  start(): void {
    if (this.isRunning) {
      console.warn("Renderer is already running");
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
    console.log("Renderer started");
  }

  /**
   * Stop the rendering loop
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log("Renderer stopped");
  }

  /**
   * Main animation loop (60fps)
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Update Wizard animation
    this.updateWizardAnimation(deltaTime);

    // Redraw background (reflect camera movement)
    this.drawBackground();

    // Clear the game canvas
    this.clear();

    // Update and draw gaze cursor
    if (this.gazeCursor) {
      this.gazeCursor.update(deltaTime);
      this.gazeCursor.draw(this.gameCtx);
    }

    // Update and draw effects
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.update(deltaTime);
      effect.draw(this.gameCtx, this.camera);

      // Remove completed effects
      if (effect.isComplete()) {
        this.effects.splice(i, 1);
      }
    }

    // Request next frame
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Update Wizard animation frames
   */
  private updateWizardAnimation(deltaTime: number): void {
    const currentConfig = WIZARD_SPRITES[this.wizardAnimationState];
    this.wizardElapsedTime += deltaTime;

    if (this.wizardElapsedTime >= currentConfig.frameDuration) {
      this.wizardElapsedTime -= currentConfig.frameDuration;
      this.wizardCurrentFrame++;

      // Return to idle after hurt animation ends
      if (this.wizardAnimationState === "hurt") {
        if (this.wizardCurrentFrame >= WIZARD_SPRITES.hurt.frameCount) {
          this.wizardAnimationState = "idle";
          this.wizardCurrentFrame = 0;
        }
      }
      // Return to idle after attack animation ends
      else if (this.wizardAnimationState === "attack") {
        if (this.wizardCurrentFrame >= WIZARD_SPRITES.attack.frameCount) {
          this.wizardAnimationState = "idle";
          this.wizardCurrentFrame = 0;
        }
      }
      // Return to idle after attack2 animation ends
      else if (this.wizardAnimationState === "attack2") {
        if (this.wizardCurrentFrame >= WIZARD_SPRITES.attack2.frameCount) {
          this.wizardAnimationState = "idle";
          this.wizardCurrentFrame = 0;
        }
      } else {
        // Loop idle animation
        this.wizardCurrentFrame =
          this.wizardCurrentFrame % currentConfig.frameCount;
      }
    }
  }

  /**
   * Get canvas size
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.gameCanvas.width,
      height: this.gameCanvas.height,
    };
  }

  /**
   * Get game context
   */
  getGameContext(): CanvasRenderingContext2D {
    return this.gameCtx;
  }

  /**
   * Cleanup (free memory)
   */
  dispose(): void {
    this.stop();
    window.removeEventListener("resize", () => this.resizeCanvases());
    this.effects = [];
    this.gazeCursor = null;
    this.backgroundImage = null;
  }
}
