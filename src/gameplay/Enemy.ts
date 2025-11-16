/**
 * Enemy.ts
 * 서버로부터 받은 데이터를 기반으로 적을 렌더링하는 "멍청한" 렌더러
 * 게임 로직은 서버에서 처리, 프론트엔드는 그리기만 담당
 */

import { AssetLoader } from "../core/AssetLoader";
import { Camera } from "../core/Camera";
import type { EnemyTypeConfig } from "./EnemyTypes";

type AnimationState = "walk" | "hurt" | "death";

/**
 * 서버로부터 받는 적 상태 데이터
 */
export interface EnemyStateData {
  id: string;
  typeId: string;
  worldX: number; // 월드 좌표 x (픽셀)
  worldY: number; // 월드 좌표 y (픽셀)
  currentHP: number;
  maxHP: number;
  animationState: AnimationState;
  currentFrame: number;
  isDead: boolean;
}

/**
 * Enemy 클래스 - 순수 렌더링 전용
 * 서버가 보내는 상태를 받아서 화면에 그리기만 함
 */
export class Enemy {
  public id: string;
  public typeConfig: EnemyTypeConfig;

  // 서버로부터 받은 상태 (월드 좌표)
  public worldX: number = 0;
  public worldY: number = 0;
  public currentHP: number = 0;
  public maxHP: number = 0;
  public animationState: AnimationState = "walk";
  public currentFrame: number = 0;
  public isDead: boolean = false;

  private assetLoader: AssetLoader;
  private scale: number;

  // 프론트엔드 애니메이션 관리
  private localCurrentFrame: number = 0;
  private frameTimer: number = 0;
  private previousAnimationState: AnimationState = "walk";

  constructor(
    id: string,
    typeConfig: EnemyTypeConfig,
    assetLoader: AssetLoader
  ) {
    this.id = id;
    this.typeConfig = typeConfig;
    this.assetLoader = assetLoader;
    this.maxHP = typeConfig.stats.maxHP;
    this.currentHP = this.maxHP;
    this.scale = typeConfig.stats.scale;
  }

  /**
   * 서버로부터 받은 상태로 업데이트
   */
  public updateFromServer(data: EnemyStateData): void {
    // 서버로부터 받은 월드 좌표를 그대로 사용
    this.worldX = data.worldX;
    this.worldY = data.worldY;
    this.currentHP = data.currentHP;
    this.maxHP = data.maxHP;

    // 애니메이션 상태가 변경되면 프레임 리셋
    if (this.animationState !== data.animationState) {
      this.previousAnimationState = this.animationState;
      this.animationState = data.animationState;
      this.localCurrentFrame = 0;
      this.frameTimer = 0;
    }

    this.isDead = data.isDead;
  }

  /**
   * 애니메이션 프레임 업데이트 (deltaTime in ms)
   */
  public updateAnimation(deltaTime: number): void {
    const spriteConfig = this.typeConfig.sprites[this.animationState];

    // death 애니메이션이 이미 마지막 프레임에 도달했으면 업데이트하지 않음
    if (
      this.animationState === "death" &&
      this.localCurrentFrame >= spriteConfig.frameCount - 1
    ) {
      return;
    }

    this.frameTimer += deltaTime;

    if (this.frameTimer >= spriteConfig.frameDuration) {
      this.frameTimer -= spriteConfig.frameDuration;
      this.localCurrentFrame++;

      // death 애니메이션은 마지막 프레임에서 멈춤
      if (this.animationState === "death") {
        if (this.localCurrentFrame >= spriteConfig.frameCount) {
          this.localCurrentFrame = spriteConfig.frameCount - 1;
        }
      } else {
        // 다른 애니메이션은 루프
        if (this.localCurrentFrame >= spriteConfig.frameCount) {
          this.localCurrentFrame = 0;
        }
      }
    }
  }

  /**
   * 캔버스에 그리기
   */
  public draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
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

    const spriteConfig = this.typeConfig.sprites[this.animationState];
    const image = this.assetLoader.getImageByPath(spriteConfig.path);

    if (!image) {
      // 이미지 로드 안됨 - 디버그용 원 그리기
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(screen.x, screen.y, 20, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const frameWidth = spriteConfig.frameWidth;
    const frameHeight = spriteConfig.frameHeight;

    // death 애니메이션은 역순으로 재생 (스프라이트 시트가 역순으로 되어있음)
    let frameIndex = this.localCurrentFrame;
    if (this.animationState === "death") {
      frameIndex = spriteConfig.frameCount - 1 - this.localCurrentFrame;
    }

    const sx = frameIndex * frameWidth;
    const sy = 0;

    const renderWidth = frameWidth * this.scale;
    const renderHeight = frameHeight * this.scale;

    ctx.drawImage(
      image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      screen.x - renderWidth / 2,
      screen.y - renderHeight / 2,
      renderWidth,
      renderHeight
    );

    // HP 바 그리기
    if (!this.isDead) {
      this.drawHealthBar(ctx, screen.x, screen.y);
    }
  }

  /**
   * HP 바 그리기
   */
  private drawHealthBar(
    ctx: CanvasRenderingContext2D,
    screenX: number,
    screenY: number
  ): void {
    const barWidth = 50;
    const barHeight = 5;
    const barX = screenX - barWidth / 2;
    const barY = screenY - 40;

    // 배경 (빨강)
    ctx.fillStyle = "red";
    ctx.fillRect(barX, barY, barWidth, barHeight);

    // HP (초록)
    const hpRatio = this.currentHP / this.maxHP;
    ctx.fillStyle = "lime";
    ctx.fillRect(barX, barY, barWidth * hpRatio, barHeight);

    // 테두리
    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barWidth, barHeight);
  }

  /**
   * 간단한 getter들
   */
  public getIsDead(): boolean {
    return this.isDead;
  }
}
