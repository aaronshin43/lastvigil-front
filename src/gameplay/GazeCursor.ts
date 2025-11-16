/**
 * GazeCursor.ts
 * 시선 커서 객체 - Magic Circle 스프라이트 애니메이션 적용
 * 서버로부터 받은 시선 데이터를 부드럽게 보간하여 화면에 표시
 */

import type { AssetLoader } from "../core/AssetLoader";

export interface GazeCursorConfig {
  size?: number; // 커서 크기 (기본: 110)
  chaseSpeed?: number; // 추격 속도 0~1 (기본: 0.08)
  initialX?: number; // 초기 X 좌표
  initialY?: number; // 초기 Y 좌표
  assetLoader: AssetLoader; // AssetLoader 필수
}

export class GazeCursor {
  private size: number;
  private chaseSpeed: number;
  private assetLoader: AssetLoader;

  // 목표 위치 (서버로부터 받은 데이터)
  private targetX: number;
  private targetY: number;

  // 현재 위치 (화면에 표시되는 실제 위치, 스무딩 적용)
  private currentX: number;
  private currentY: number;

  // 애니메이션 관련
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  private spriteImage: HTMLImageElement | null = null;
  private frameWidth: number = 512;
  private frameHeight: number = 512;
  private frameCount: number = 4;
  private frameDuration: number = 150;

  constructor(config: GazeCursorConfig) {
    this.size = config.size ?? 220;
    this.chaseSpeed = config.chaseSpeed ?? 0.08;
    this.assetLoader = config.assetLoader;

    // 초기 위치 설정
    this.targetX = config.initialX ?? 0;
    this.targetY = config.initialY ?? 0;
    this.currentX = this.targetX;
    this.currentY = this.targetY;

    // 스프라이트 로드
    this.loadSprite();
  }

  /**
   * Magic Circle 스프라이트 로드
   */
  private loadSprite(): void {
    this.spriteImage = this.assetLoader.getMagicCircle();
    const metadata = this.assetLoader.getMagicCircleMetadata();

    if (metadata) {
      this.frameWidth = metadata.frameWidth;
      this.frameHeight = metadata.frameHeight;
      this.frameCount = metadata.frameCount;
      this.frameDuration = metadata.frameDuration;
    }
  }

  /**
   * 서버로부터 받은 시선 데이터로 목표 위치 업데이트
   * @param x 목표 X 좌표
   * @param y 목표 Y 좌표
   */
  setTarget(x: number, y: number): void {
    const halfSize = this.size / 2;
    // 화면 경계 제한
    this.targetX = Math.max(
      halfSize,
      Math.min(x, window.innerWidth - halfSize)
    );
    this.targetY = Math.max(
      halfSize,
      Math.min(y, window.innerHeight - halfSize)
    );
  }

  /**
   * 시선 커서 업데이트 (매 프레임 호출)
   * 현재 위치를 목표 위치로 부드럽게 이동 및 애니메이션 업데이트
   * @param deltaTime 이전 프레임으로부터 경과 시간 (ms)
   */
  update(deltaTime: number = 16): void {
    // 선형 보간을 사용한 부드러운 추적
    this.currentX += (this.targetX - this.currentX) * this.chaseSpeed;
    this.currentY += (this.targetY - this.currentY) * this.chaseSpeed;

    // 애니메이션 프레임 업데이트
    this.frameTimer += deltaTime;
    if (this.frameTimer >= this.frameDuration) {
      this.currentFrame = (this.currentFrame + 1) % this.frameCount;
      this.frameTimer = 0;
    }
  }

  /**
   * 시선 커서를 캔버스에 그리기
   * @param ctx 2D 렌더링 컨텍스트
   */
  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.spriteImage) return;

    const halfSize = this.size / 2;

    // 스프라이트시트에서 현재 프레임 추출
    ctx.drawImage(
      this.spriteImage,
      this.currentFrame * this.frameWidth, // source X
      0, // source Y
      this.frameWidth, // source width
      this.frameHeight, // source height
      this.currentX - halfSize, // destination X
      this.currentY - halfSize, // destination Y
      this.size, // destination width
      this.size // destination height
    );
  }

  /**
   * 현재 위치 반환 (다른 게임 객체에서 참조용)
   */
  getPosition(): { x: number; y: number } {
    return { x: this.currentX, y: this.currentY };
  }

  /**
   * 목표 위치 반환
   */
  getTargetPosition(): { x: number; y: number } {
    return { x: this.targetX, y: this.targetY };
  }

  /**
   * 커서 위치를 즉시 설정 (초기화 또는 리셋 시)
   */
  setPosition(x: number, y: number): void {
    this.currentX = x;
    this.currentY = y;
    this.targetX = x;
    this.targetY = y;
  }

  /**
   * 커서 반지름 반환 (충돌 체크용)
   */
  getRadius(): number {
    return this.size / 2;
  }

  /**
   * 추격 속도 설정
   */
  setChaseSpeed(speed: number): void {
    this.chaseSpeed = Math.max(0, Math.min(1, speed)); // 0~1 범위로 제한
  }

  /**
   * 커서 크기 설정
   */
  setSize(size: number): void {
    this.size = size;
  }

  /**
   * 화면 경계 체크 및 제한
   * @param canvasWidth 캔버스 너비
   * @param canvasHeight 캔버스 높이
   */
  clampToBounds(canvasWidth: number, canvasHeight: number): void {
    const halfSize = this.size / 2;
    this.targetX = Math.max(
      halfSize,
      Math.min(this.targetX, canvasWidth - halfSize)
    );
    this.targetY = Math.max(
      halfSize,
      Math.min(this.targetY, canvasHeight - halfSize)
    );
  }

  /**
   * 화면 가장자리 근접 여부 체크
   * @param canvasWidth 캔버스 너비
   * @param threshold 가장자리 임계값 (0~1, 예: 0.1 = 10%)
   * @returns 'left', 'right', 'top', 'bottom', 또는 null
   */
  checkEdgeProximity(
    canvasWidth: number,
    canvasHeight: number,
    threshold: number = 0.1
  ): string | null {
    const normalizedX = this.currentX / canvasWidth;
    const normalizedY = this.currentY / canvasHeight;

    if (normalizedX < threshold) return "left";
    if (normalizedX > 1 - threshold) return "right";
    if (normalizedY < threshold) return "top";
    if (normalizedY > 1 - threshold) return "bottom";

    return null;
  }
}
