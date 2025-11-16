/**
 * MagicCircleTypes.ts
 * 마법진 스프라이트 메타데이터 정의
 * 이미지에 보이는 4가지 마법진 디자인
 */

export interface MagicCircleMetadata {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number; // ms per frame
}

// 스프라이트시트에 4개의 마법진이 가로로 배열되어 있음
export const MAGIC_CIRCLE_TYPES = {
  circle1: {
    path: "/assets/sprites/Magic_Circle/Magic_Circle.png",
    frameWidth: 838, // 각 마법진의 너비 (추정값, 실제 이미지 크기에 맞게 조정 필요)
    frameHeight: 838, // 각 마법진의 높이
    frameCount: 7, // 4개의 다른 디자인
    frameDuration: 100, // 각 프레임 지속 시간 (ms)
  },
} as const;

export type MagicCircleType = keyof typeof MAGIC_CIRCLE_TYPES;
