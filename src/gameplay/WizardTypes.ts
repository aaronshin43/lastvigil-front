/**
 * WizardTypes.ts
 * Wizard 스프라이트 메타데이터 정의
 */

export interface WizardMetadata {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number; // ms
  scale: number;
}

/**
 * Wizard 애니메이션 설정
 */
export const WIZARD_SPRITES = {
  idle: {
    path: "/assets/sprites/Wizard/Wizard_idle.png",
    frameWidth: 1000, // 6000 / 6
    frameHeight: 1000,
    frameCount: 6,
    frameDuration: 150,
    scale: 0.7,
  } as WizardMetadata,
  
  hurt: {
    path: "/assets/sprites/Wizard/Wizard_hurt.png",
    frameWidth: 1000, // 3000 / 3
    frameHeight: 1000,
    frameCount: 4,
    frameDuration: 100,
    scale: 0.7,
  } as WizardMetadata,
  
  attack: {
    path: "/assets/sprites/Wizard/Wizard_attack.png",
    frameWidth: 1000,
    frameHeight: 1000,
    frameCount: 6,
    frameDuration: 120,
    scale: 0.7,
  } as WizardMetadata,
  
  attack2: {
    path: "/assets/sprites/Wizard/Wizard_attack2.png",
    frameWidth: 1000,
    frameHeight: 1000,
    frameCount: 6,
    frameDuration: 120,
    scale: 0.7,
  } as WizardMetadata,
};

/**
 * Wizard Idle 애니메이션 설정 (하위 호환성)
 */
export const WIZARD_SPRITE: WizardMetadata = WIZARD_SPRITES.idle;
