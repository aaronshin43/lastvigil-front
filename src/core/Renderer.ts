/**
 * Renderer.ts
 * 60fps requestAnimationFrame 루프, 캔버스 초기화/그리기 총괄
 */

import type { Effect } from "../gameplay/Effect";
import type { GazeCursor } from "../gameplay/GazeCursor";
import type { Camera } from "./Camera";

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
   * 배경 다시 그리기 (외부에서 호출 가능)
   */
  public redrawBackground(): void {
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
  }

  /**
   * 렌더링할 이펙트 배열 설정
   */
  setEffects(effects: Effect[]): void {
    this.effects = effects;
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
