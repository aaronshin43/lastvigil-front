/**
 * LandingScreen.ts
 * 게임 시작 전 랜딩 화면 관리
 */

export interface LandingScreenOptions {
  canvasId: string;
  onStart: () => void;
}

export class LandingScreen {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private onStart: () => void;

  // 이미지들
  private landingBg: HTMLImageElement | null = null;
  private flourishOrnament: HTMLImageElement | null = null;
  private landingTitle: HTMLImageElement | null = null;
  private startButton: HTMLImageElement | null = null;

  // 버튼 영역
  private buttonRect = { x: 0, y: 0, width: 0, height: 0 };
  private isHovering = false;

  // 애니메이션 상태
  private animationStartTime = 0;
  private isAnimating = false;
  private animationFrameId: number | null = null;

  // 버튼 플로팅 애니메이션
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

    // 캔버스 크기 설정
    this.resize();
    window.addEventListener("resize", () => this.resize());

    // 마우스 이벤트
    this.canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    this.canvas.addEventListener("click", (e) => this.handleClick(e));
  }

  /**
   * 이미지 설정
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
   * 화면 크기 조정
   */
  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    if (!this.isAnimating) {
      this.draw();
    }
  }

  /**
   * 애니메이션 시작
   */
  private startAnimation() {
    this.isAnimating = true;
    this.animationStartTime = performance.now();
    this.animate();
  }

  /**
   * 애니메이션 루프
   */
  private animate = () => {
    const elapsed = performance.now() - this.animationStartTime;

    // 애니메이션 완료 (총 2.5초)
    if (elapsed >= 2500) {
      this.isAnimating = false;
      // 플로팅 애니메이션 시작
      this.startFloating();
      return;
    }

    // 단계별 알파값 계산
    const bgAlpha = this.easeInOut(Math.min(elapsed / 1500, 1)); // 0-1.2초: 배경
    const ornamentAlpha = this.easeInOut(
      Math.max(0, Math.min((elapsed - 1000) / 800, 1))
    ); // 1.0-1.7초: 장식+타이틀
    const buttonAlpha = this.easeInOut(
      Math.max(0, Math.min((elapsed - 1500) / 600, 1))
    ); // 1.5-2.1초: 버튼

    // Y 오프셋 계산 (아래에서 위로 올라오는 효과)
    const ornamentYOffset = 40 * (1 - ornamentAlpha); // 50px 아래에서 시작
    const buttonYOffset = 30 * (1 - buttonAlpha); // 50px 아래에서 시작

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
   * 플로팅 애니메이션 시작
   */
  private startFloating() {
    this.isFloating = true;
    this.floatingStartTime = performance.now();
    this.floatingAnimate();
  }

  /**
   * 플로팅 애니메이션 루프
   */
  private floatingAnimate = () => {
    if (!this.isFloating) return;

    const elapsed = performance.now() - this.floatingStartTime;
    // 사인파를 이용한 부드러운 상하 움직임 (2초 주기, ±15px)
    const floatOffset = Math.sin(elapsed / 500) * 10;

    this.draw(1, 1, 1, 0, floatOffset);
    this.animationFrameId = requestAnimationFrame(this.floatingAnimate);
  };

  /**
   * Ease-in-out 함수
   */
  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }

  /**
   * 랜딩 화면 그리기
   */
  draw(
    bgAlpha = 1,
    ornamentAlpha = 1,
    buttonAlpha = 1,
    ornamentYOffset = 0,
    buttonYOffset = 0
  ) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    // 검은 배경
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;

    // 1. 배경 이미지 (landing.png) - 페이드 인 (비율 유지하며 확대)
    if (this.landingBg && this.landingBg.complete) {
      this.ctx.save();
      this.ctx.globalAlpha = bgAlpha;

      // 이미지 비율 계산
      const imgRatio =
        this.landingBg.naturalWidth / this.landingBg.naturalHeight;
      const canvasRatio = this.canvas.width / this.canvas.height;

      let drawWidth, drawHeight, offsetX, offsetY;

      // cover 방식: 화면을 꽉 채우되 비율 유지
      if (imgRatio > canvasRatio) {
        // 이미지가 더 넓음 -> 높이를 기준으로 맞춤
        drawHeight = this.canvas.height;
        drawWidth = drawHeight * imgRatio;
        offsetX = (this.canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        // 이미지가 더 좁음 -> 너비를 기준으로 맞춤
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

    // 2. 장식 (flourishOrnamentNoBack.png) - 페이드 인 + 아래에서 위로
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

    // 3. 타이틀 (landingTitle.png) - 장식과 함께 페이드 인 + 아래에서 위로
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

    // 4. 시작 버튼 (StartButton.png) - 페이드 인 + 아래에서 위로
    if (this.startButton && this.startButton.complete) {
      this.ctx.save();
      this.ctx.globalAlpha = buttonAlpha * (this.isHovering ? 0.8 : 1);
      const buttonWidth = 450;
      const buttonHeight =
        (this.startButton.naturalHeight / this.startButton.naturalWidth) *
        buttonWidth;
      const buttonX = centerX - buttonWidth / 2 + 10;
      const buttonY = centerY + 200 + buttonYOffset;

      // 버튼 영역 저장 (클릭 감지용)
      this.buttonRect = {
        x: buttonX,
        y: buttonY,
        width: buttonWidth,
        height: buttonHeight,
      };

      // 호버 효과
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
   * 마우스 이동 처리
   */
  private handleMouseMove(e: MouseEvent) {
    // 애니메이션 중에는 호버 효과 비활성화
    if (this.isAnimating) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 버튼 영역 체크
    const wasHovering = this.isHovering;
    this.isHovering = this.isPointInButton(mouseX, mouseY);

    // 호버 상태 변경 시 다시 그리기
    if (wasHovering !== this.isHovering) {
      this.canvas.style.cursor = this.isHovering ? "pointer" : "default";
      // 플로팅 중이 아니면 한 번만 그리기
      if (!this.isFloating) {
        this.draw();
      }
    }
  }

  /**
   * 클릭 처리
   */
  private handleClick(e: MouseEvent) {
    // 애니메이션 중에는 클릭 비활성화
    if (this.isAnimating) return;

    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    // 버튼 클릭 체크
    if (this.isPointInButton(mouseX, mouseY)) {
      this.onStart();
    }
  }

  /**
   * 점이 버튼 안에 있는지 확인
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
   * 랜딩 화면 숨기기
   */
  hide() {
    // 애니메이션 정리
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    this.isAnimating = false;
    this.isFloating = false;
    this.canvas.style.display = "none";
  }

  /**
   * 랜딩 화면 보이기
   */
  show() {
    this.canvas.style.display = "block";
    this.startAnimation();
  }
}
