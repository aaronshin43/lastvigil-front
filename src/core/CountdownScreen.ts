/**
 * CountdownScreen.ts
 * 게임 시작 전 카운트다운 화면 (3, 2, 1, Go!)
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
  
  // 카운트다운 단계 (동적으로 설정 가능)
  private countdownSteps: string[] = ["3", "2", "1", "WAVE 1"];
  private currentStepIndex = 0;
  private stepDuration = 800; // 각 단계마다 0.8초
  private showBackground = true; // 배경 표시 여부

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
    
    // 캔버스 크기 설정
    this.resize();
    window.addEventListener("resize", () => this.resize());
  }
  
  /**
   * 화면 크기 조정
   */
  private resize() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }
  
  /**
   * 카운트다운 시작
   */
  start() {
    this.isActive = true;
    this.currentStepIndex = 0;
    this.startTime = performance.now();
    this.canvas.style.display = "block";
    this.animate();
  }
  
  /**
   * 웨이브 공지 표시 (3, 2, 1 없이 바로 WAVE # 표시)
   */
  showWaveAnnouncement(waveNumber: number) {
    this.countdownSteps = [`WAVE ${waveNumber}`];
    this.stepDuration = 1300; // 1.5초 동안 표시
    this.showBackground = false; // 배경 없이 텍스트만
    this.isActive = true;
    this.currentStepIndex = 0;
    this.startTime = performance.now();
    this.canvas.style.display = "block";
    this.animate();
  }
  
  /**
   * 초기 게임 시작 카운트다운 (3, 2, 1, WAVE 1)
   */
  startInitialCountdown(onComplete: () => void) {
    this.onComplete = onComplete;
    this.countdownSteps = ["3", "2", "1", "WAVE 1"];
    this.stepDuration = 800; // 각 단계마다 0.8초
    this.showBackground = true; // 초기 카운트다운은 배경 있음
    this.start();
  }
  
  /**
   * 애니메이션 루프
   */
  private animate = () => {
    if (!this.isActive) return;
    
    const elapsed = performance.now() - this.startTime;
    const totalDuration = this.countdownSteps.length * this.stepDuration;
    
    // 카운트다운 완료
    if (elapsed >= totalDuration) {
      this.hide();
      if (this.onComplete) {
        this.onComplete();
      }
      return;
    }
    
    // 현재 단계 계산
    this.currentStepIndex = Math.floor(elapsed / this.stepDuration);
    
    // 현재 단계 내에서의 진행도 (0~1)
    const stepProgress = (elapsed % this.stepDuration) / this.stepDuration;
    
    this.draw(stepProgress);
    this.animationFrameId = requestAnimationFrame(this.animate);
  }
  
  /**
   * 카운트다운 그리기
   */
  private draw(stepProgress: number) {
    // 배경 클리어
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // 초기 카운트다운만 검은 배경 표시
    if (this.showBackground) {
      this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // 현재 텍스트
    const text = this.countdownSteps[this.currentStepIndex];
    
    // 애니메이션 효과
    // 1. 페이드 인 (0-0.2초)
    let alpha = Math.min(stepProgress / 0.25, 1);
    
    // 2. 스케일 효과 (처음엔 크고 점점 작아짐)
    const scale = 1 + (1 - stepProgress) * 0.5; // 1.5 → 1.0
    
    // 3. WAVE 는 특별한 효과
    const isWave = text.startsWith("WAVE");
    const baseSize = isWave ? 100 : 240; // WAVE 폰트 크기 축소: 160 → 100
    const fontSize = baseSize * scale;
    
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    
    // 텍스트 스타일
    this.ctx.font = `bold ${fontSize}px "Arial Black", sans-serif`;
    this.ctx.textAlign = "center";
    this.ctx.textBaseline = "middle";
    
    // WAVE 는 다크 판타지 컨셉, 나머지는 금색
    if (isWave) {
      // 외곽선 (진한 빨간색)
      this.ctx.strokeStyle = "#8B0000";
      this.ctx.lineWidth = 12;
      this.ctx.strokeText(text, centerX, centerY);
      
      // 채우기 (붉은색 + 주황색 그라데이션 - 다크 판타지)
      const gradient = this.ctx.createLinearGradient(centerX, centerY - fontSize/2, centerX, centerY + fontSize/2);
      gradient.addColorStop(0, "#FF4444");
      gradient.addColorStop(0.5, "#FF6600");
      gradient.addColorStop(1, "#CC0000");
      this.ctx.fillStyle = gradient;
      this.ctx.fillText(text, centerX, centerY);
      
      // 그림자 효과
      this.ctx.shadowColor = "#FF4444";
      this.ctx.shadowBlur = 30;
      this.ctx.fillText(text, centerX, centerY);
    } else {
      // 외곽선 (검은색)
      this.ctx.strokeStyle = "#000000";
      this.ctx.lineWidth = 10;
      this.ctx.strokeText(text, centerX, centerY);
      
      // 채우기 (금색 그라데이션)
      const gradient = this.ctx.createLinearGradient(centerX, centerY - fontSize/2, centerX, centerY + fontSize/2);
      gradient.addColorStop(0, "#FFD700");
      gradient.addColorStop(0.5, "#FFA500");
      gradient.addColorStop(1, "#FFD700");
      this.ctx.fillStyle = gradient;
      this.ctx.fillText(text, centerX, centerY);
      
      // 그림자 효과
      this.ctx.shadowColor = "#FFA500";
      this.ctx.shadowBlur = 20;
      this.ctx.fillText(text, centerX, centerY);
    }
    
    this.ctx.restore();
  }
  
  /**
   * 카운트다운 숨기기
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
   * 정리
   */
  dispose() {
    this.hide();
    window.removeEventListener("resize", () => this.resize());
  }
}
