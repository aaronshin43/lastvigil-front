/**
 * Enemy.ts
 * 서버로부터 받은 데이터를 기반으로 적을 렌더링하는 "멍청한" 렌더러
 * 게임 로직은 서버에서 처리, 프론트엔드는 그리기만 담당
 */

import { AssetLoader } from "../core/AssetLoader";
import type { EnemyTypeConfig } from "./EnemyTypes";

type AnimationState = "walk" | "hurt" | "death";

/**
 * 서버로부터 받는 적 상태 데이터
 */
export interface EnemyStateData {
  id: string;
  typeId: string;
  x: number; // 정규화된 x 좌표 (0.0~1.0)
  y: number; // 정규화된 y 좌표 (0.0~1.0)
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

  // 서버로부터 받은 상태
  public x: number = 0;
  public y: number = 0;
  public currentHP: number = 0;
  public maxHP: number = 0;
  public animationState: AnimationState = "walk";
  public currentFrame: number = 0;
  public isDead: boolean = false;

  private assetLoader: AssetLoader;
  private scale: number;

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
    // 정규화된 좌표(0~1)를 픽셀 좌표로 변환
    this.x = data.x * window.innerWidth;
    this.y = data.y * window.innerHeight;
    this.currentHP = data.currentHP;
    this.maxHP = data.maxHP;
    this.animationState = data.animationState;
    this.currentFrame = data.currentFrame;
    this.isDead = data.isDead;
  }

  /**
   * 캔버스에 그리기
   */
  public draw(ctx: CanvasRenderingContext2D): void {
    const spriteConfig = this.typeConfig.sprites[this.animationState];
    const image = this.assetLoader.getImageByPath(spriteConfig.path);

    if (!image) {
      // 이미지 로드 안됨 - 디버그용 원 그리기
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(this.x, this.y, 20, 0, Math.PI * 2);
      ctx.fill();
      return;
    }

    const frameWidth = spriteConfig.frameWidth;
    const frameHeight = spriteConfig.frameHeight;
    const sx = this.currentFrame * frameWidth;
    const sy = 0;

    const renderWidth = frameWidth * this.scale;
    const renderHeight = frameHeight * this.scale;

    ctx.drawImage(
      image,
      sx,
      sy,
      frameWidth,
      frameHeight,
      this.x - renderWidth / 2,
      this.y - renderHeight / 2,
      renderWidth,
      renderHeight
    );

    // HP 바 그리기
    if (!this.isDead) {
      this.drawHealthBar(ctx);
    }
  }

  /**
   * HP 바 그리기
   */
  private drawHealthBar(ctx: CanvasRenderingContext2D): void {
    const barWidth = 50;
    const barHeight = 5;
    const barX = this.x - barWidth / 2;
    const barY = this.y - 40;

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
