/**
 * Camera.ts
 * 월드 좌표와 스크린 좌표 간 변환을 담당
 * 카메라가 바라보는 월드의 위치를 관리
 */

export interface CameraConfig {
  worldWidth: number; // 전체 맵 너비
  worldHeight: number; // 전체 맵 높이
  viewWidth?: number; // 뷰포트 너비 (기본: window.innerWidth)
  viewHeight?: number; // 뷰포트 높이 (기본: window.innerHeight)
  smoothSpeed?: number; // 카메라 이동 부드러움 (0~1, 기본: 0.1)
}

export class Camera {
  // 카메라의 월드 좌표 (카메라 중심점)
  private x: number = 0;
  private y: number = 0;

  // 목표 위치 (서버로부터 받음)
  private targetX: number = 0;
  private targetY: number = 0;

  // 부드러운 이동
  private smoothSpeed: number;

  // 월드 및 뷰포트 크기
  private worldWidth: number;
  private worldHeight: number;
  private viewWidth: number;
  private viewHeight: number;

  constructor(config: CameraConfig) {
    this.worldWidth = config.worldWidth;
    this.worldHeight = config.worldHeight;
    this.viewWidth = config.viewWidth ?? window.innerWidth;
    this.viewHeight = config.viewHeight ?? window.innerHeight;
    this.smoothSpeed = config.smoothSpeed ?? 0.1;
  }

  /**
   * 서버로부터 받은 카메라 위치 설정
   */
  public setTarget(worldX: number, worldY: number): void {
    this.targetX = worldX;
    this.targetY = worldY;
  }

  /**
   * 카메라 위치를 목표로 부드럽게 이동
   */
  public update(): void {
    this.x += (this.targetX - this.x) * this.smoothSpeed;
    this.y += (this.targetY - this.y) * this.smoothSpeed;

    // 카메라가 맵 밖으로 나가지 않도록 제한
    this.x = Math.max(
      this.viewWidth / 2,
      Math.min(this.x, this.worldWidth - this.viewWidth / 2)
    );
    this.y = Math.max(
      this.viewHeight / 2,
      Math.min(this.y, this.worldHeight - this.viewHeight / 2)
    );
  }

  /**
   * 월드 좌표 → 스크린 좌표 변환
   */
  public worldToScreen(
    worldX: number,
    worldY: number
  ): { x: number; y: number } {
    return {
      x: worldX - (this.x - this.viewWidth / 2),
      y: worldY - (this.y - this.viewHeight / 2),
    };
  }

  /**
   * 스크린 좌표 → 월드 좌표 변환
   */
  public screenToWorld(
    screenX: number,
    screenY: number
  ): { x: number; y: number } {
    return {
      x: screenX + (this.x - this.viewWidth / 2),
      y: screenY + (this.y - this.viewHeight / 2),
    };
  }

  /**
   * 현재 카메라의 월드 좌표 반환
   */
  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  /**
   * 화면 크기 변경 시 호출
   */
  public resize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
  }

  /**
   * 월드 크기 변경
   */
  public setWorldSize(width: number, height: number): void {
    this.worldWidth = width;
    this.worldHeight = height;
  }
}
