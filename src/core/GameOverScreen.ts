/**
 * GameOverScreen.ts
 * 게임 오버 화면 관리
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
  
  // 애니메이션
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
    
    // 캔버스 크기 설정
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  
  /**
   * 게임 오버 데이터 설정
   */
  setGameOverData(finalScore: number, finalWave: number) {
    this.finalScore = finalScore;
    this.finalWave = finalWave;
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
    
    // 페이드 인 (1초)
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
   * Ease-in-out 함수
   */
  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
  }
  
  /**
   * 게임 오버 화면 그리기
   */
  draw(alpha = 1) {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    // 반투명 검은 배경
    this.ctx.fillStyle = "rgba(0, 0, 0, 0.8)";
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // "GAME OVER" 텍스트
    this.ctx.fillStyle = "#ff4444";
    this.ctx.font = "bold 80px Arial";
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    this.ctx.fillText("GAME OVER", centerX, centerY - 120);
    
    // 최종 점수
    this.ctx.fillStyle = "#ffffff";
    this.ctx.font = "bold 48px Arial";
    this.ctx.fillText(`Final Score: ${this.finalScore}`, centerX, centerY - 20);
    
    // 최종 웨이브
    this.ctx.font = "bold 36px Arial";
    this.ctx.fillText(`Wave: ${this.finalWave}`, centerX, centerY + 40);
    
    // 재시작 안내 (선택사항)
    if (this.onRestart) {
      this.ctx.fillStyle = "#aaaaaa";
      this.ctx.font = "24px Arial";
      this.ctx.fillText("Click to Restart", centerX, centerY + 120);
    }
    
    this.ctx.restore();
  }
  
  /**
   * 게임 오버 화면 표시
   */
  show(finalScore: number, finalWave: number) {
    this.setGameOverData(finalScore, finalWave);
    this.canvas.style.display = "block";
    this.startAnimation();
    
    // 클릭 이벤트 (재시작)
    if (this.onRestart) {
      this.canvas.addEventListener("click", this.handleClick);
    }
  }
  
  /**
   * 클릭 처리
   */
  private handleClick = () => {
    if (this.onRestart && !this.isAnimating) {
      this.hide();
      this.onRestart();
    }
  }
  
  /**
   * 게임 오버 화면 숨기기
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
