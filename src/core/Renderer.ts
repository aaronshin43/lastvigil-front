/**
 * Renderer.ts
 * 60fps requestAnimationFrame 루프, 캔버스 초기화/그리기 총괄
 */

import type { Effect } from "../gameplay/Effect";
import type { GazeCursor } from "../gameplay/GazeCursor";
import type { Camera } from "./Camera";
import { WIZARD_SPRITE } from "../gameplay/WizardTypes";

export interface RendererConfig {
  backgroundCanvasId: string;
  gameCanvasId: string;
  backgroundColor?: string;
  camera: Camera;
}

export class Renderer {
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;
  private gameCanvas: HTMLCanvasElement;
  private gameCtx: CanvasRenderingContext2D;
  private camera: Camera;

  private backgroundColor: string;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  // 배경 이미지
  private backgroundImage: HTMLImageElement | null = null;
  private wizardImage: HTMLImageElement | null = null;

  // Witch 상태 (고정 위치, HP만 서버로부터 받음)
  private witchX: number = 0.01; // 정규화된 x 좌표 (고정값)
  private witchY: number = 0.8; // 정규화된 y 좌표 (고정값)
  private witchHP: number = 100; // 현재 HP
  private witchMaxHP: number = 100; // 최대 HP
  private witchIsDead: boolean = false;

  // Wizard 애니메이션 상태
  private wizardCurrentFrame: number = 0;
  private wizardElapsedTime: number = 0;

  // 렌더링할 객체들 (외부에서 주입)
  private effects: Effect[] = [];
  private gazeCursor: GazeCursor | null = null;

  constructor(config: RendererConfig) {
    // 배경 캔버스 초기화
    this.backgroundCanvas = document.getElementById(
      config.backgroundCanvasId
    ) as HTMLCanvasElement;
    if (!this.backgroundCanvas) {
      throw new Error(
        `Canvas with id "${config.backgroundCanvasId}" not found`
      );
    }
    this.backgroundCtx = this.backgroundCanvas.getContext("2d")!;

    // 게임 객체 캔버스 초기화
    this.gameCanvas = document.getElementById(
      config.gameCanvasId
    ) as HTMLCanvasElement;
    if (!this.gameCanvas) {
      throw new Error(`Canvas with id "${config.gameCanvasId}" not found`);
    }
    this.gameCtx = this.gameCanvas.getContext("2d")!;

    this.backgroundColor = config.backgroundColor || "#000000";
    this.camera = config.camera;

    // 캔버스 크기 설정
    this.resizeCanvases();

    // 윈도우 리사이즈 이벤트
    window.addEventListener("resize", () => this.resizeCanvases());
  }

  /**
   * 캔버스 크기를 윈도우 크기에 맞추기
   */
  private resizeCanvases(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.backgroundCanvas.width = width;
    this.backgroundCanvas.height = height;
    this.gameCanvas.width = width;
    this.gameCanvas.height = height;

    // 배경 다시 그리기
    if (this.backgroundImage) {
      this.drawBackground();
    }
  }

  /**
   * 배경 이미지 설정
   */
  setBackgroundImage(image: HTMLImageElement): void {
    this.backgroundImage = image;
    this.drawBackground();
  }

  /**
   * 성 이미지 설정
   */
  setWizardImage(image: HTMLImageElement): void {
    this.wizardImage = image;
    this.drawBackground();
  }

  /**
   * Witch HP 업데이트 (서버로부터 받음, 위치는 고정)
   */
  updateWitchHP(currentHP: number, maxHP: number, isDead: boolean): void {
    this.witchHP = currentHP;
    this.witchMaxHP = maxHP;
    this.witchIsDead = isDead;
  }

  /**
   * 배경 다시 그리기 (외부에서 호출 가능)
   */
  public redrawBackground(deltaTime?: number): void {
    // Wizard 애니메이션 업데이트
    if (deltaTime !== undefined) {
      this.updateWizardAnimation(deltaTime);
    }
    this.drawBackground();
  }

  /**
   * 배경 이미지 그리기 (Camera 기반)
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
      // 이미지가 없으면 단색 배경
      this.backgroundCtx.fillStyle = this.backgroundColor;
      this.backgroundCtx.fillRect(
        0,
        0,
        this.backgroundCanvas.width,
        this.backgroundCanvas.height
      );
      return;
    }

    // 배경 이미지를 월드 크기에 맞춰 그리기
    const worldWidth = this.camera.getWorldWidth();
    const viewportHeight = this.backgroundCanvas.height;

    // 화면을 꽉 채우도록 설정
    const imageWidth = worldWidth;
    const imageHeight = viewportHeight; // 화면 높이에 맞춤 (종횡비 무시)

    // 카메라 오프셋 적용 (배경이 월드와 함께 스크롤)
    const cameraOffset = -this.camera.getOffsetX();

    this.backgroundCtx.drawImage(
      this.backgroundImage,
      cameraOffset,
      0, // yOffset 제거, 상단부터 그리기
      imageWidth,
      imageHeight
    );

    // Wizard 그리기 (서버에서 받은 witch 좌표 사용)
    if (
      this.wizardImage &&
      this.wizardImage.complete &&
      this.wizardImage.naturalWidth > 0 &&
      !this.witchIsDead
    ) {
      const drawWidth = WIZARD_SPRITE.frameWidth * WIZARD_SPRITE.scale;
      const drawHeight = WIZARD_SPRITE.frameHeight * WIZARD_SPRITE.scale;

      // 서버로부터 받은 정규화된 좌표를 화면 좌표로 변환
      const worldWidth = this.camera.getWorldWidth();
      const worldX = this.witchX * worldWidth;
      const worldY = this.witchY * viewportHeight;

      // 월드 좌표를 화면 좌표로 변환 (카메라 오프셋 적용)
      const wizardX = worldX + cameraOffset;
      const wizardY = worldY - drawHeight / 2; // 중심 정렬

      // 현재 프레임의 소스 좌표 계산
      const srcX = this.wizardCurrentFrame * WIZARD_SPRITE.frameWidth;
      const srcY = 0;

      this.backgroundCtx.drawImage(
        this.wizardImage,
        srcX,
        srcY,
        WIZARD_SPRITE.frameWidth,
        WIZARD_SPRITE.frameHeight,
        wizardX,
        wizardY,
        drawWidth,
        drawHeight
      );

      // HP 바 그리기
      this.drawWitchHealthBar(wizardX, wizardY, drawWidth);
    }
  }

  /**
   * Witch HP 바 그리기
   */
  private drawWitchHealthBar(x: number, y: number, width: number): void {
    const barWidth = Math.min(width * 0.8, 150); // Witch 크기의 80% 또는 최대 150px
    const barHeight = 10;
    const barX = x + (width - barWidth) / 2;
    const barY = y + 230; // Witch 위쪽에 표시

    // 배경 (발간)
    this.backgroundCtx.fillStyle = "rgba(0, 0, 0, 0.5)";
    this.backgroundCtx.fillRect(
      barX - 2,
      barY - 2,
      barWidth + 4,
      barHeight + 4
    );

    // HP 바 배경 (빨간색)
    this.backgroundCtx.fillStyle = "#8B0000";
    this.backgroundCtx.fillRect(barX, barY, barWidth, barHeight);

    // 현재 HP (초록색)
    const hpRatio = Math.max(0, this.witchHP / this.witchMaxHP);
    this.backgroundCtx.fillStyle = "#00FF00";
    this.backgroundCtx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // 테두리
    this.backgroundCtx.strokeStyle = "white";
    this.backgroundCtx.lineWidth = 2;
    this.backgroundCtx.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * 렌더링할 이펙트 배열 설정
   */
  setEffects(effects: Effect[]): void {
    this.effects = effects;
  }

  /**
   * Witch 상태 getter
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
   * 시선 커서 설정
   */
  setGazeCursor(cursor: GazeCursor): void {
    this.gazeCursor = cursor;
  }

  /**
   * 게임 캔버스 클리어
   */
  clear(): void {
    this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  /**
   * 렌더링 루프 시작
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
   * 렌더링 루프 중지
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
   * 메인 애니메이션 루프 (60fps)
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Wizard 애니메이션 업데이트
    this.updateWizardAnimation(deltaTime);

    // 배경 다시 그리기 (카메라 이동 반영)
    this.drawBackground();

    // 게임 캔버스 클리어
    this.clear();

    // 시선 커서 업데이트 및 그리기
    if (this.gazeCursor) {
      this.gazeCursor.update();
      this.gazeCursor.draw(this.gameCtx);
    }

    // 이펙트 업데이트 및 그리기
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.update(deltaTime);
      effect.draw(this.gameCtx, this.camera);

      // 완료된 이펙트 제거
      if (effect.isComplete()) {
        this.effects.splice(i, 1);
      }
    }

    // 다음 프레임 요청
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Wizard 애니메이션 프레임 업데이트
   */
  private updateWizardAnimation(deltaTime: number): void {
    if (!this.wizardImage) return;

    this.wizardElapsedTime += deltaTime;

    if (this.wizardElapsedTime >= WIZARD_SPRITE.frameDuration) {
      this.wizardElapsedTime -= WIZARD_SPRITE.frameDuration;
      this.wizardCurrentFrame =
        (this.wizardCurrentFrame + 1) % WIZARD_SPRITE.frameCount;
      console.log(
        `🧙 Wizard frame: ${
          this.wizardCurrentFrame
        }, elapsed: ${this.wizardElapsedTime.toFixed(1)}ms`
      );
    }
  }

  /**
   * 캔버스 크기 반환
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.gameCanvas.width,
      height: this.gameCanvas.height,
    };
  }

  /**
   * 현재 FPS 계산 (디버그용)
   */
  getFPS(): number {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    return deltaTime > 0 ? 1000 / deltaTime : 0;
  }

  /**
   * 게임 컨텍스트 가져오기
   */
  getGameContext(): CanvasRenderingContext2D {
    return this.gameCtx;
  }

  /**
   * 정리 (메모리 해제)
   */
  dispose(): void {
    this.stop();
    window.removeEventListener("resize", () => this.resizeCanvases());
    this.effects = [];
    this.gazeCursor = null;
    this.backgroundImage = null;
  }
}
