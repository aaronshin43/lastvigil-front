/**
 * Effect.ts
 * 2D 스프라이트시트 애니메이션을 처리하는 클래스
 * 폭발, 마법진 등의 VFX를 캔버스에 렌더링
 */

import { Camera } from "../core/Camera";
import type { VFXMetadata } from "./VFXTypes";

export class Effect {
  private worldX: number;
  private worldY: number;
  private image: HTMLImageElement;
  private frameWidth: number;
  private frameHeight: number;
  private frameCount: number;
  private frameDuration: number;
  private loop: boolean;
  private scale: number;

  private currentFrame: number = 0;
  private elapsedTime: number = 0;
  private isFinished: boolean = false;

  constructor(
    worldX: number,
    worldY: number,
    image: HTMLImageElement,
    metadata: VFXMetadata
  ) {
    this.worldX = worldX;
    this.worldY = worldY;
    this.image = image;
    this.frameWidth = metadata.frameWidth;
    this.frameHeight = metadata.frameHeight;
    this.frameCount = metadata.frameCount;
    this.frameDuration = metadata.frameDuration;
    this.loop = metadata.loop ?? false;
    this.scale = metadata.scale ?? 1;
  }

  /**
   * 이펙트 업데이트 (deltaTime 기반)
   * @param deltaTime 이전 프레임으로부터 경과된 시간 (ms)
   */
  update(deltaTime: number): void {
    if (this.isFinished) return;

    this.elapsedTime += deltaTime;

    // 프레임 전환
    if (this.elapsedTime >= this.frameDuration) {
      this.elapsedTime -= this.frameDuration;
      this.currentFrame++;

      // 애니메이션 종료 체크
      if (this.currentFrame >= this.frameCount) {
        if (this.loop) {
          this.currentFrame = 0; // 루프
        } else {
          this.currentFrame = this.frameCount - 1;
          this.isFinished = true; // 종료
        }
      }
    }
  }

  /**
   * 이펙트를 캔버스에 그리기
   * @param ctx 2D 렌더링 컨텍스트
   * @param camera 카메라 객체
   */
  draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    if (!this.image.complete) return; // 이미지 로드 안 됐으면 스킵

    // 월드 좌표를 스크린 좌표로 변환
    const screen = camera.worldToScreen(this.worldX, this.worldY);

    // 화면 밖이면 그리지 않음 (최적화)
    if (
      screen.x < -200 ||
      screen.x > window.innerWidth + 200 ||
      screen.y < -200 ||
      screen.y > window.innerHeight + 200
    ) {
      return;
    }

    // 스프라이트시트에서 현재 프레임의 위치 계산
    // 가정: 스프라이트시트는 가로로 프레임이 나열됨
    const sx = this.currentFrame * this.frameWidth;
    const sy = 0;

    // 그릴 위치와 크기 계산 (중심 기준)
    const drawWidth = this.frameWidth * this.scale;
    const drawHeight = this.frameHeight * this.scale;
    const drawX = screen.x - drawWidth / 2;
    const drawY = screen.y - drawHeight / 2;

    ctx.drawImage(
      this.image,
      sx,
      sy,
      this.frameWidth,
      this.frameHeight, // 소스 영역
      drawX,
      drawY,
      drawWidth,
      drawHeight // 대상 영역
    );
  }

  /**
   * 이펙트가 종료되었는지 확인
   */
  isComplete(): boolean {
    return this.isFinished;
  }

  /**
   * 이펙트 위치 설정 (월드 좌표)
   */
  setPosition(worldX: number, worldY: number): void {
    this.worldX = worldX;
    this.worldY = worldY;
  }

  /**
   * 현재 위치 반환 (월드 좌표)
   */
  getPosition(): { x: number; y: number } {
    return { x: this.worldX, y: this.worldY };
  }

  /**
   * 이펙트 리셋 (재사용 시)
   */
  reset(worldX?: number, worldY?: number): void {
    this.currentFrame = 0;
    this.elapsedTime = 0;
    this.isFinished = false;

    if (worldX !== undefined) this.worldX = worldX;
    if (worldY !== undefined) this.worldY = worldY;
  }
}
