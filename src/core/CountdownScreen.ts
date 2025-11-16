/**
 * CountdownScreen.ts
 * Countdown screen displayed before the game starts (3, 2, 1, Go!)
 */

export interface CountdownScreenOptions {
  canvasId: string;
  onComplete?: () => void;
}

export class CountdownScreen {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onComplete?: () => void;

  private isActive = false;
  private startTime = 0;
  private animationFrameId: number | null = null;

  // Countdown steps (can be dynamically set)
  private countdownSteps: string[] = ["3", "2", "1", "WAVE 1"];
  private currentStepIndex = 0;
  private stepDuration = 800; // 0.8 seconds per step
  private showBackground = true; // Whether to display the background

  constructor(options: CountdownScreenOptions) {
    this.onComplete = options.onComplete;

    const canvas = document.getElementById(options.canvasId) as HTMLCanvasElement;
    if (!canvas) {
      throw new Error(`Canvas not found: ${options.canvasId}`);
    }

    this.canvas = canvas;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Failed to get 2D context");
    }
    this.ctx = ctx;

    // Set canvas size
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  /**
   * Adjust screen size
   */
  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  /**
   * Start the countdown
   */
  start() {
    this.isActive = true;
    this.currentStepIndex = 0;
    this.startTime = performance.now();
    this.canvas.style.display = "block";
    this.animate();
  }

  /**
   * Display wave announcement (directly shows WAVE # without 3, 2, 1)
   */
  showWaveAnnouncement(waveNumber: number) {
    this.countdownSteps = [`WAVE ${waveNumber}`];
    this.stepDuration = 1300; // Display for 1.5 seconds
    this.showBackground = false; // Text only, no background
    this.isActive = true;
    this.currentStepIndex = 0;
    this.startTime = performance.now();
    this.canvas.style.display = "block";
    this.animate();
  }

  /**
   * Initial game start countdown (3, 2, 1, WAVE 1)
   */
  startInitialCountdown(onComplete: () => void) {
    this.onComplete = onComplete;
    this.countdownSteps = ["3", "2", "1", "WAVE 1"];
    this.stepDuration = 800; // 0.8 seconds per step
    this.showBackground = true; // Background is displayed for the initial countdown
    this.start();
  }

  /**
   * Animation loop
   */
  private animate = () => {
    if (!this.isActive) return;

    const elapsed = performance.now() - this.startTime;
    const totalDuration = this.countdownSteps.length * this.stepDuration;

    // Countdown complete
    if (elapsed >= totalDuration) {
      this.hide();
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }

    // Calculate the current step
    this.currentStepIndex = Math.floor(elapsed / this.stepDuration);

    // Progress within the current step (0~1)
    const stepProgress = (elapsed % this.stepDuration) / this.stepDuration;

    this.draw(stepProgress);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Draw the countdown
   */
  private draw(stepProgress: number) {
    // Clear the background
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Display black background only for the initial countdown
    if (this.showBackground) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // Current text
    const text = this.countdownSteps[this.currentStepIndex];

    // Animation effects
    // 1. Fade-in (0-0.2 seconds)
    let alpha = Math.min(stepProgress / 0.25, 1);

    // 2. Scale effect (starts large and shrinks)
    const scale = 1 + (1 - stepProgress) * 0.5; // 1.5 → 1.0

    // 3. Special effect for WAVE
    const isWave = text.startsWith("WAVE");
    const baseSize = isWave ? 100 : 240; // Reduce font size for WAVE: 160 → 100
    const fontSize = baseSize * scale;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // Text style
    this.ctx.font = `bold ${fontSize}px "Arial Black", sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";

    // WAVE has a dark fantasy concept, others are gold
    if (isWave) {
      // Outline (dark red)
      this.ctx.strokeStyle = "#8B0000";
      this.ctx.lineWidth = 12;
      this.ctx.strokeText(text, centerX, centerY);

      // Fill (red + orange gradient - dark fantasy)
      const gradient = this.ctx.createLinearGradient(centerX, centerY - fontSize/2, centerX, centerY + fontSize/2);
      gradient.addColorStop(0, "#FF4444");
      gradient.addColorStop(0.5, "#FF6600");
      gradient.addColorStop(1, "#CC0000");
      this.ctx.fillStyle = gradient;
      this.ctx.fillText(text, centerX, centerY);

      // Shadow effect
      this.ctx.shadowColor = "#FF4444";
      this.ctx.shadowBlur = 30;
      this.ctx.fillText(text, centerX, centerY);
    } else {
      // Outline (black)
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 10;
      this.ctx.strokeText(text, centerX, centerY);

      // Fill (gold gradient)
      const gradient = this.ctx.createLinearGradient(centerX, centerY - fontSize/2, centerX, centerY + fontSize/2);
      gradient.addColorStop(0, "#FFD700");
      gradient.addColorStop(0.5, "#FFA500");
      gradient.addColorStop(1, "#FFD700");
      this.ctx.fillStyle = gradient;
      this.ctx.fillText(text, centerX, centerY);

      // Shadow effect
      this.ctx.shadowColor = "#FFA500";
      this.ctx.shadowBlur = 20;
      this.ctx.fillText(text, centerX, centerY);
    }

    this.ctx.restore();
  }

  /**
   * Hide the countdown
   */
  hide() {
    this.isActive = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.canvas.style.display = "none";
  }

  /**
   * Cleanup
   */
  dispose() {
    this.hide();
    window.removeEventListener("resize", () => this.resize());
  }
}
