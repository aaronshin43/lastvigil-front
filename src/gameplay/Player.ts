/**
 * Player.ts
 * 플레이어 캐릭터(Witch) 렌더링 및 애니메이션 관리
 */

import { AssetLoader } from "../core/AssetLoader";
import { WIZARD_SPRITES } from "./WizardTypes";
import type { Camera } from "../core/Camera";

type PlayerAnimationState = "idle" | "hurt";

export class Player {
  private assetLoader: AssetLoader;
  
  // 플레이어 상태
  private currentHP: number = 100;
  private maxHP: number = 100;
  private animationState: PlayerAnimationState = "idle";
  private currentFrame: number = 0;
  private frameTimer: number = 0;
  
  // 위치 (화면 하단 중앙 고정)
  private x: number = 0;
  private y: number = 0;

  constructor(assetLoader: AssetLoader) {
    this.assetLoader = assetLoader;
    this.updatePosition();
    
    // 화면 크기 변경 시 위치 업데이트
    window.addEventListener("resize", () => this.updatePosition());
  }
  
  /**
   * 화면 크기에 따라 플레이어 위치 업데이트
   */
  private updatePosition() {
    this.x = window.innerWidth / 2;
    this.y = window.innerHeight - 150; // 화면 하단에서 150px 위
  }
  
  /**
   * HP 업데이트 (외부에서 호출)
   */
  public updateHP(newHP: number, maxHP: number) {
    const oldHP = this.currentHP;
    this.currentHP = newHP;
    this.maxHP = maxHP;
    
    // HP가 감소하면 hurt 애니메이션 실행
    if (newHP < oldHP) {
      this.playHurtAnimation();
    }
  }
  
  /**
   * Hurt 애니메이션 실행
   */
  private playHurtAnimation() {
    this.animationState = "hurt";
    this.currentFrame = 0;
    this.frameTimer = 0;
    console.log("💥 플레이어 피격!");
  }
  
  /**
   * 애니메이션 업데이트
   */
  public update(deltaTime: number) {
    const currentConfig = WIZARD_SPRITES[this.animationState];
    this.frameTimer += deltaTime;
    
    if (this.frameTimer >= currentConfig.frameDuration) {
      this.frameTimer = 0;
      this.currentFrame++;
      
      // hurt 애니메이션이 끝나면 idle로 복귀
      if (this.animationState === "hurt") {
        if (this.currentFrame >= WIZARD_SPRITES.hurt.frameCount) {
          this.animationState = "idle";
          this.currentFrame = 0;
        }
      }
    }
  }
  
  /**
   * 플레이어 렌더링
   */
  public draw(ctx: CanvasRenderingContext2D, _camera: Camera) {
    // 현재 애니메이션 상태에 따른 메타데이터 가져오기
    const config = WIZARD_SPRITES[this.animationState];
    const spriteImage = this.assetLoader.getWizard(this.animationState);
    
    if (!spriteImage || !spriteImage.complete) return;
    
    // 스프라이트 시트에서 현재 프레임 추출
    const frameWidth = config.frameWidth;
    const frameHeight = config.frameHeight;
    
    const sourceX = this.currentFrame * frameWidth;
    const sourceY = 0;
    
    // 렌더링 크기 계산
    const renderWidth = frameWidth * config.scale;
    const renderHeight = frameHeight * config.scale;
    
    // 화면 중앙 하단에 그리기 (카메라 영향 없음)
    const drawX = this.x - renderWidth / 2;
    const drawY = this.y - renderHeight / 2;
    
    // Hurt 상태일 때 빨간색 틴트 효과
    if (this.animationState === "hurt") {
      ctx.save();
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = "rgba(255, 0, 0, 0.3)";
      ctx.fillRect(drawX, drawY, renderWidth, renderHeight);
      ctx.restore();
    }
    
    // 스프라이트 그리기
    ctx.drawImage(
      spriteImage,
      sourceX,
      sourceY,
      frameWidth,
      frameHeight,
      drawX,
      drawY,
      renderWidth,
      renderHeight
    );
    
    // HP 바 그리기
    this.drawHealthBar(ctx, drawX, drawY, renderWidth);
  }
  
  /**
   * HP 바 그리기
   */
  private drawHealthBar(ctx: CanvasRenderingContext2D, x: number, y: number, width: number) {
    const barWidth = width;
    const barHeight = 8;
    const barY = y - 20;
    
    // 배경 (빨간색)
    ctx.fillStyle = "rgba(255, 0, 0, 0.8)";
    ctx.fillRect(x, barY, barWidth, barHeight);
    
    // HP (초록색)
    const hpWidth = (this.currentHP / this.maxHP) * barWidth;
    ctx.fillStyle = "rgba(0, 255, 0, 0.8)";
    ctx.fillRect(x, barY, hpWidth, barHeight);
    
    // 테두리
    ctx.strokeStyle = "rgba(255, 255, 255, 0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(x, barY, barWidth, barHeight);
  }
  
  /**
   * 현재 HP 가져오기
   */
  public getCurrentHP(): number {
    return this.currentHP;
  }
}
