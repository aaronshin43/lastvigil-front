/**
 * Enemy.ts
 * 서버로부터 받은 데이터를 기반으로 적을 렌더링하는 "멍청한" 렌더러
 * 게임 로직은 서버에서 처리, 프론트엔드는 그리기만 담당
 */

import { AssetLoader } from "../core/AssetLoader";
import type { Camera } from "../core/Camera";
import type { EnemyTypeConfig } from "./EnemyTypes";

type AnimationState = "walk" | "hurt" | "death";

// 맵 전체 너비 (화면 너비의 3배)
const WORLD_WIDTH = 2148;

/**
 * 서버로부터 받는 적 상태 데이터
 */
export interface EnemyStateData {
  id: string;
  typeId: string;
  x: number; // 맵 전체 기준 정규화 x 좌표 (0.0~1.0)
  y: number; // 화면 기준 정규화 y 좌표 (0.0~1.0)
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

  // 프론트엔드 애니메이션 관리
  private localCurrentFrame: number = 0;
  private frameTimer: number = 0;

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
    // x: 맵 전체 기준 정규화 좌표(0~1)를 월드 좌표로 변환
    this.x = data.x * WORLD_WIDTH;
    // y: 화면 기준 정규화 좌표(0~1)를 화면 좌표로 변환
    this.y = data.y * window.innerHeight;
    this.currentHP = data.currentHP;
    this.maxHP = data.maxHP;

    // 애니메이션 상태가 변경되면 프레임 리셋
    if (this.animationState !== data.animationState) {
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
   * 캔버스에 그리기 (카메라 오프셋 적용)
   */
  public draw(ctx: CanvasRenderingContext2D, camera: Camera): void {
    // 월드 좌표 → 화면 좌표 변환
    const screenPos = camera.worldToScreen(this.x, this.y);

    // 🔍 디버깅: 적 위치 로그 (첫 번째 적만)
    if (this.id.endsWith('0')) {
      console.log(`👾 Enemy draw: id=${this.id}, world(${this.x.toFixed(0)}, ${this.y.toFixed(0)}) → screen(${screenPos.x.toFixed(0)}, ${screenPos.y.toFixed(0)})`);
    }

    // 화면 밖이면 그리지 않음 (최적화)
    const margin = 200;
    if (
      screenPos.x < -margin ||
      screenPos.x > camera.getViewportWidth() + margin
    ) {
      if (this.id.endsWith('0')) {
        console.log(`🚫 Enemy ${this.id} culled: screenX=${screenPos.x.toFixed(0)}, viewport=${camera.getViewportWidth()}`);
      }
      return;
    }

    const spriteConfig = this.typeConfig.sprites[this.animationState];
    const image = this.assetLoader.getImageByPath(spriteConfig.path);

    if (!image) {
      // 이미지 로드 안됨 - 디버그용 원 그리기
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(screenPos.x, screenPos.y, 20, 0, Math.PI * 2);
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
      screenPos.x - renderWidth / 2,
      screenPos.y - renderHeight / 2,
      renderWidth,
      renderHeight
    );

    // HP 바 그리기
    if (!this.isDead) {
      this.drawHealthBar(ctx, screenPos.x, screenPos.y);
    }
  }

  /**
   * HP 바 그리기
   */
  private drawHealthBar(ctx: CanvasRenderingContext2D, screenX: number, screenY: number): void {
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
