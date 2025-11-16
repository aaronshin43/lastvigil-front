/**
 * GazeCursor.ts
 * 시선 커서 객체 - 60fps 스무딩 및 캔버스 그리기 담당
 * 서버로부터 받은 시선 데이터를 부드럽게 보간하여 화면에 표시
 */

export interface GazeCursorConfig {
  radius?: number; // 커서 반지름 (기본: 55)
  chaseSpeed?: number; // 추격 속도 0~1 (기본: 0.08)
  fillColor?: string; // 내부 채우기 색상 (기본: 반투명 검정)
  strokeColor?: string; // 테두리 색상 (기본: 파란색)
  strokeWidth?: number; // 테두리 두께 (기본: 2)
  initialX?: number; // 초기 X 좌표
  initialY?: number; // 초기 Y 좌표
}

export class GazeCursor {
  private radius: number;
  private chaseSpeed: number;
  private fillColor: string;
  private strokeColor: string;
  private strokeWidth: number;

  // 목표 위치 (서버로부터 받은 데이터)
  private targetX: number;
  private targetY: number;

  // 현재 위치 (화면에 표시되는 실제 위치, 스무딩 적용)
  private currentX: number;
  private currentY: number;

  constructor(config: GazeCursorConfig = {}) {
    this.radius = config.radius ?? 55;
    this.chaseSpeed = config.chaseSpeed ?? 0.08;
    this.fillColor = config.fillColor ?? "rgba(0, 0, 0, 0.1)";
    this.strokeColor = config.strokeColor ?? "#0066FF";
    this.strokeWidth = config.strokeWidth ?? 2;

    // 초기 위치 설정
    this.targetX = config.initialX ?? 0;
    this.targetY = config.initialY ?? 0;
    this.currentX = this.targetX;
    this.currentY = this.targetY;
  }

  /**
   * 서버로부터 받은 시선 데이터로 목표 위치 업데이트
   * @param x 목표 X 좌표
   * @param y 목표 Y 좌표
   */
  setTarget(x: number, y: number): void {
    // 화면 경계 제한
    this.targetX = Math.max(
      this.radius,
      Math.min(x, window.innerWidth - this.radius)
    );
    this.targetY = Math.max(
      this.radius,
      Math.min(y, window.innerHeight - this.radius)
    );
  }

  /**
   * 시선 커서 업데이트 (매 프레임 호출)
   * 현재 위치를 목표 위치로 부드럽게 이동 (선형 보간)
   */
  update(): void {
    // 선형 보간을 사용한 부드러운 추적
    this.currentX += (this.targetX - this.currentX) * this.chaseSpeed;
    this.currentY += (this.targetY - this.currentY) * this.chaseSpeed;
  }

  /**
   * 시선 커서를 캔버스에 그리기
   * @param ctx 2D 렌더링 컨텍스트
   */
  draw(ctx: CanvasRenderingContext2D): void {
    // 반투명 원형 배경
    ctx.fillStyle = this.fillColor;
    ctx.beginPath();
    ctx.arc(this.currentX, this.currentY, this.radius, 0, 2 * Math.PI);
    ctx.fill();

    // 테두리
    ctx.strokeStyle = this.strokeColor;
    ctx.lineWidth = this.strokeWidth;
    ctx.beginPath();
    ctx.arc(this.currentX, this.currentY, this.radius, 0, 2 * Math.PI);
    ctx.stroke();
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
   * 커서 반지름 반환
   */
  getRadius(): number {
    return this.radius;
  }

  /**
   * 추격 속도 설정
   */
  setChaseSpeed(speed: number): void {
    this.chaseSpeed = Math.max(0, Math.min(1, speed)); // 0~1 범위로 제한
  }

  /**
   * 커서 색상 변경 (상태 표시용)
   */
  setColors(fillColor: string, strokeColor: string): void {
    this.fillColor = fillColor;
    this.strokeColor = strokeColor;
  }

  /**
   * 화면 경계 체크 및 제한
   * @param canvasWidth 캔버스 너비
   * @param canvasHeight 캔버스 높이
   */
  clampToBounds(canvasWidth: number, canvasHeight: number): void {
    this.targetX = Math.max(
      this.radius,
      Math.min(this.targetX, canvasWidth - this.radius)
    );
    this.targetY = Math.max(
      this.radius,
      Math.min(this.targetY, canvasHeight - this.radius)
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
