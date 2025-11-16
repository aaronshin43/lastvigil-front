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
 * Wizard Idle 애니메이션 설정
 */
export const WIZARD_SPRITE: WizardMetadata = {
  path: "/assets/sprites/Wizard/Wizard_idle.png",
  frameWidth: 1000, // 6000 / 6
  frameHeight: 1000,
  frameCount: 6,
  frameDuration: 150,
  scale: 0.7,
};
