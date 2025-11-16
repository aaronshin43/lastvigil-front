/**
 * Camera.ts
 * 월드(맵) 좌표와 화면 좌표 간 변환을 담당하는 카메라 클래스
 * 맵 스크롤 시 카메라 오프셋을 관리
 */

export interface CameraConfig {
  worldWidth: number; // 맵의 실제 너비 (픽셀)
  viewportWidth?: number; // 뷰포트 너비 (기본: window.innerWidth)
  viewportHeight?: number; // 뷰포트 높이 (기본: window.innerHeight)
}

export class Camera {
  private offsetX: number = 0;
  private offsetY: number = 0;
  private worldWidth: number;
  private viewportWidth: number;
  private viewportHeight: number;

  constructor(config: CameraConfig) {
    this.worldWidth = config.worldWidth;
    this.viewportWidth = config.viewportWidth ?? window.innerWidth;
    this.viewportHeight = config.viewportHeight ?? window.innerHeight;
  }

  /**
   * 카메라 X축 이동 (스크롤)
   * @param deltaX 이동량 (양수: 오른쪽, 음수: 왼쪽)
   */
  moveX(deltaX: number): void {
    // const oldOffset = this.offsetX;
    this.offsetX += deltaX;
    this.clampOffset();
    
    // 🔍 디버깅: 실제로 이동했는지 확인
    // if (oldOffset !== this.offsetX) {
    //   console.log(`📹 Camera.moveX(${deltaX}): ${oldOffset.toFixed(0)} → ${this.offsetX.toFixed(0)}`);
    // }
  }

  /**
   * 카메라 X 오프셋 설정
   */
  setOffsetX(offset: number): void {
    this.offsetX = offset;
    this.clampOffset();
  }

  /**
   * 카메라 오프셋을 맵 경계 내로 제한
   */
  private clampOffset(): void {
    const maxOffset = Math.max(0, this.worldWidth - this.viewportWidth);
    this.offsetX = Math.max(0, Math.min(this.offsetX, maxOffset));
  }

  /**
   * 월드 좌표 → 화면 좌표 변환
   */
  worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: worldX - this.offsetX,
      y: worldY - this.offsetY,
    };
  }

  /**
   * 화면 좌표 → 월드 좌표 변환
   */
  screenToWorld(screenX: number, screenY: number): { x: number; y: number } {
    return {
      x: screenX + this.offsetX,
      y: screenY + this.offsetY,
    };
  }

  /**
   * 현재 카메라 X 오프셋 반환
   */
  getOffsetX(): number {
    return this.offsetX;
  }

  /**
   * 현재 카메라 Y 오프셋 반환
   */
  getOffsetY(): number {
    return this.offsetY;
  }

  /**
   * 월드 너비 반환
   */
  getWorldWidth(): number {
    return this.worldWidth;
  }

  /**
   * 뷰포트 너비 반환
   */
  getViewportWidth(): number {
    return this.viewportWidth;
  }

  /**
   * 뷰포트 높이 반환
   */
  getViewportHeight(): number {
    return this.viewportHeight;
  }

  /**
   * 화면 크기 변경 시 업데이트
   */
  updateViewportSize(width: number, height: number): void {
    this.viewportWidth = width;
    this.viewportHeight = height;
    this.clampOffset(); // 경계 재조정
  }

  /**
   * 카메라가 특정 월드 X 좌표를 화면 중앙에 오도록 이동
   */
  centerOnWorldX(worldX: number): void {
    this.offsetX = worldX - this.viewportWidth / 2;
    this.clampOffset();
  }

  /**
   * 맵 스크롤 가능 여부 확인
   */
  canScroll(): boolean {
    return this.worldWidth > this.viewportWidth;
  }
}
