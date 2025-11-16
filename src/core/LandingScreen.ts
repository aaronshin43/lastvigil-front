/**
 * LandingScreen.ts
 * Manages the landing screen before the game starts
 */

export interface LandingScreenOptions {
  canvasId: string;
  onStart: () => void;
}

export class LandingScreen {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStart: () => void;

  // Images
  private landingBg: HTMLImageElement | null = null;
  private flourishOrnament: HTMLImageElement | null = null;
  private landingTitle: HTMLImageElement | null = null;
  private startButton: HTMLImageElement | null = null;

  // Button area
  private buttonRect = { x: 0, y: 0, width: 0, height: 0 };
  private isHovering = false;

  // Animation state
  private animationStartTime = 0;
  private isAnimating = false;
  private animationFrameId: number | null = null;

  // Button floating animation
  private floatingStartTime = 0;
  private isFloating = false;

  constructor(options: LandingScreenOptions) {
    this.onStart = options.onStart;

    const canvas = document.getElementById(
      options.canvasId
    ) as HTMLCanvasElement;
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

    // Mouse events
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
  }

  /**
   * Set images
   */
  setImages(images: {
    landing: HTMLImageElement;
    flourishOrnament: HTMLImageElement;
    landingTitle: HTMLImageElement;
    startButton: HTMLImageElement;
  }) {
    this.landingBg = images.landing;
    this.flourishOrnament = images.flourishOrnament;
    this.landingTitle = images.landingTitle;
    this.startButton = images.startButton;
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

    // Animation complete (total 2.5 seconds)
    if (elapsed >= 2500) {
      this.isAnimating = false;
      // Start floating animation
      this.startFloating();
      return;
    }

    // Calculate alpha values for each stage
    const bgAlpha = this.easeInOut(Math.min(elapsed / 1500, 1)); // 0-1.2s: Background
    const ornamentAlpha = this.easeInOut(
      Math.max(0, Math.min((elapsed - 1000) / 800, 1))
    ); // 1.0-1.7s: Ornament + Title
    const buttonAlpha = this.easeInOut(
      Math.max(0, Math.min((elapsed - 1500) / 600, 1))
    ); // 1.5-2.1s: Button

    // Calculate Y offsets (rising effect)
    const ornamentYOffset = 40 * (1 - ornamentAlpha); // Starts 50px below
    const buttonYOffset = 30 * (1 - buttonAlpha); // Starts 50px below

    this.draw(
      bgAlpha,
      ornamentAlpha,
      buttonAlpha,
      ornamentYOffset,
      buttonYOffset
    );
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Start floating animation
   */
  private startFloating() {
    this.isFloating = true;
    this.floatingStartTime = performance.now();
    this.floatingAnimate();
  }

  /**
   * Floating animation loop
   */
  private floatingAnimate = () => {
    if (!this.isFloating) return;

    const elapsed = performance.now() - this.floatingStartTime;
    // Smooth up-and-down movement using sine wave (2s cycle, ±15px)
    const floatOffset = Math.sin(elapsed / 500) * 10;

    this.draw(1, 1, 1, 0, floatOffset);
    this.animationFrameId = requestAnimationFrame(this.floatingAnimate);
  };

  /**
   * Ease-in-out function
   */
  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * Draw the landing screen
   */
  draw(
    bgAlpha = 1,
    ornamentAlpha = 1,
    buttonAlpha = 1,
    ornamentYOffset = 0,
    buttonYOffset = 0
  ) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // Black background
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // 1. Background image (landing.png) - Fade-in (scaled to fit)
    if (this.landingBg && this.landingBg.complete) {
      this.ctx.save();
      this.ctx.globalAlpha = bgAlpha;

      // Calculate image ratio
      const imgRatio =
        this.landingBg.naturalWidth / this.landingBg.naturalHeight;
      const canvasRatio = this.canvas.width / this.canvas.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      // Cover mode: Fill the screen while maintaining aspect ratio
      if (imgRatio > canvasRatio) {
        // Image is wider -> Fit by height
        drawHeight = this.canvas.height;
        drawWidth = drawHeight * imgRatio;
        offsetX = (this.canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        // Image is narrower -> Fit by width
        drawWidth = this.canvas.width;
        drawHeight = drawWidth / imgRatio;
        offsetX = 0;
        offsetY = (this.canvas.height - drawHeight) / 2;
      }

      this.ctx.drawImage(
        this.landingBg,
        offsetX,
        offsetY,
        drawWidth,
        drawHeight
      );
      this.ctx.restore();
    }

    // 2. Ornament (flourishOrnamentNoBack.png) - Fade-in + Rising effect
    if (this.flourishOrnament && this.flourishOrnament.complete) {
      this.ctx.save();
      this.ctx.globalAlpha = ornamentAlpha;
      const ornamentWidth = 600;
      const ornamentHeight =
        (this.flourishOrnament.naturalHeight /
          this.flourishOrnament.naturalWidth) *
        ornamentWidth;
      const ornamentX = centerX - ornamentWidth / 2;
      const ornamentY = centerY - 340 + ornamentYOffset;

      this.ctx.drawImage(
        this.flourishOrnament,
        ornamentX,
        ornamentY,
        ornamentWidth,
        ornamentHeight
      );
      this.ctx.restore();
    }

    // 3. Title (landingTitle.png) - Fade-in + Rising effect with ornament
    if (this.landingTitle && this.landingTitle.complete) {
      this.ctx.save();
      this.ctx.globalAlpha = ornamentAlpha;
      const titleWidth = 1200;
      const titleHeight =
        (this.landingTitle.naturalHeight / this.landingTitle.naturalWidth) *
        titleWidth;
      const titleX = centerX - titleWidth / 2;
      const titleY = centerY - 310 + ornamentYOffset;

      this.ctx.drawImage(
        this.landingTitle,
        titleX,
        titleY,
        titleWidth,
        titleHeight
      );
      this.ctx.restore();
    }

    // 4. Start button (StartButton.png) - Fade-in + Rising effect
    if (this.startButton && this.startButton.complete) {
      this.ctx.save();
      this.ctx.globalAlpha = buttonAlpha * (this.isHovering ? 0.8 : 1);
      const buttonWidth = 450;
      const buttonHeight =
        (this.startButton.naturalHeight / this.startButton.naturalWidth) *
        buttonWidth;
      const buttonX = centerX - buttonWidth / 2 + 10;
      const buttonY = centerY + 200 + buttonYOffset;

      // Save button area (for click detection)
      this.buttonRect = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      };

      // Hover effect
      if (this.isHovering) {
        this.ctx.drawImage(
          this.startButton,
          buttonX - 5,
          buttonY - 5,
          buttonWidth + 10,
          buttonHeight + 10
        );
      } else {
        this.ctx.drawImage(
          this.startButton,
          buttonX,
          buttonY,
          buttonWidth,
          buttonHeight
        );
      }
      this.ctx.restore();
    }
  }

  /**
   * Handle mouse movement
   */
  private handleMouseMove(e: MouseEvent) {
    // Disable hover effect during animation
    if (this.isAnimating) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check button area
    const wasHovering = this.isHovering;
    this.isHovering = this.isPointInButton(mouseX, mouseY);

    // Redraw if hover state changes
    if (wasHovering !== this.isHovering) {
      this.canvas.style.cursor = this.isHovering ? "pointer" : "default";
      // Redraw only once if not floating
      if (!this.isFloating) {
        this.draw();
      }
    }
  }

  /**
   * Handle click
   */
  private handleClick(e: MouseEvent) {
    // Disable click during animation
    if (this.isAnimating) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // Check button click
    if (this.isPointInButton(mouseX, mouseY)) {
      this.onStart();
    }
  }

  /**
   * Check if a point is inside the button
   */
  private isPointInButton(x: number, y: number): boolean {
    return (
      x >= this.buttonRect.x &&
      x <= this.buttonRect.x + this.buttonRect.width &&
      y >= this.buttonRect.y &&
      y <= this.buttonRect.y + this.buttonRect.height
    );
  }

  /**
   * Hide the landing screen
   */
  hide() {
    // Clean up animation
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isAnimating = false;
    this.isFloating = false;
    this.canvas.style.display = "none";
  }

  /**
   * Show the landing screen
   */
  show() {
    this.canvas.style.display = "block";
    this.startAnimation();
  }
}
