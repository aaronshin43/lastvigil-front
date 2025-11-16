/**
 * GameOverScreen.ts
 * Manages the game over screen
 */

export interface GameOverScreenOptions {
  canvasId: string;
  onRestart?: () => void;
}

export class GameOverScreen {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onRestart?: () => void;

  private finalScore: number = 0;
  private finalWave: number = 0;

  // Animation
  private animationStartTime = 0;
  private isAnimating = false;
  private animationFrameId: number | null = null;

  constructor(options: GameOverScreenOptions) {
    this.onRestart = options.onRestart;

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
   * Set game over data
   */
  setGameOverData(finalScore: number, finalWave: number) {
    this.finalScore = finalScore;
    this.finalWave = finalWave;
  }

  /**
   * Adjust screen size
   */
  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (!this.isAnimating) {
      this.draw();
    }
  }

  /**
   * Start animation
   */
  private startAnimation() {
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.animate();
  }

  /**
   * Animation loop
   */
  private animate = () => {
    const elapsed = performance.now() - this.animationStartTime;

    // Fade-in (1 second)
    if (elapsed >= 1000) {
      this.isAnimating = false;
      this.draw(1);
      return;
    }

    const alpha = elapsed / 1000;
    this.draw(alpha);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }

  /**
   * Draw the game over screen
   */
  draw(alpha = 1) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;

    // Semi-transparent black background
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    // "GAME OVER" text
    this.ctx.fillStyle = "#ff4444";
    this.ctx.font = "bold 80px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("GAME OVER", centerX, centerY - 120);

    // Final score
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 48px Arial";
    this.ctx.fillText(`Final Score: ${this.finalScore}`, centerX, centerY - 20);

    // Final wave
    this.ctx.font = "bold 36px Arial";
    this.ctx.fillText(`Wave: ${this.finalWave}`, centerX, centerY + 40);

    // Restart prompt (optional)
    if (this.onRestart) {
      this.ctx.fillStyle = "#aaaaaa";
      this.ctx.font = "24px Arial";
      this.ctx.fillText("Click to Restart", centerX, centerY + 120);
    }

    this.ctx.restore();
  }

  /**
   * Display the game over screen
   */
  show(finalScore: number, finalWave: number) {
    this.setGameOverData(finalScore, finalWave);
    this.canvas.style.display = "block";
    this.startAnimation();

    // Click event (restart)
    if (this.onRestart) {
      this.canvas.addEventListener("click", this.handleClick);
    }
  }

  /**
   * Handle click
   */
  private handleClick = () => {
    if (this.onRestart && !this.isAnimating) {
      this.hide();
      this.onRestart();
    }
  }

  /**
   * Hide the game over screen
   */
  hide() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isAnimating = false;
    this.canvas.style.display = "none";
    this.canvas.removeEventListener("click", this.handleClick);
  }
}
