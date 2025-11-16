/**
 * VFXTypes.ts
 * VFX 이펙트별 스프라이트 메타데이터 정의
 */

export interface VFXMetadata {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number; // ms
  loop?: boolean;
  scale?: number;
  yOffset?: number; // y축 오프셋 (기본 0.7에서 조정, 예: -0.3 = 화면 높이의 40% 지점)
}

export interface VFXConfig {
  [key: string]: VFXMetadata;
}

/**
 * 모든 VFX 타입 정의
 */
export const VFX_TYPES: VFXConfig = {
  fireHammerRed: {
    path: "/assets/vfx/fire_hammer_red-sheet.png",
    frameWidth: 128,
    frameHeight: 144,
    frameCount: 19,
    frameDuration: 50,
    loop: false,
    scale: 3,
  },
  fireSlash: {
    path: "/assets/vfx/fire_slash-sheet.png",
    frameWidth: 128,
    frameHeight: 128,
    frameCount: 19,
    frameDuration: 50,
    loop: false,
    scale: 3,
  },
  fireVortexRed: {
    path: "/assets/vfx/fire_vortex_red-sheet.png",
    frameWidth: 96,
    frameHeight: 144,
    frameCount: 27,
    frameDuration: 40,
    loop: false,
    scale: 3,
  },
  fireHurricaneBlue: {
    path: "/assets/vfx/fire_hurricane_blue-sheet.png",
    frameWidth: 128,
    frameHeight: 100,
    frameCount: 17,
    frameDuration: 60,
    loop: false,
    scale: 3,
  },
  meteorShowerRed: {
    path: "/assets/vfx/meteor_shower-red-sheet.png",
    frameWidth: 253,
    frameHeight: 192,
    frameCount: 24,
    frameDuration: 60,
    loop: false,
    scale: 3,
    yOffset: 0.1, // 화면 상단 30% 지점
  },
  tornado: {
    path: "/assets/vfx/tornado-sheet.png",
    frameWidth: 105,
    frameHeight: 100,
    frameCount: 14,
    frameDuration: 60,
    loop: false,
    scale: 3,
  },
  lightningV1: {
    path: "/assets/vfx/lightning_v1-sheet.png",
    frameWidth: 64,
    frameHeight: 156,
    frameCount: 17,
    frameDuration: 50,
    loop: false,
    scale: 3,
    yOffset: -0.2,
  },
  lightningV2: {
    path: "/assets/vfx/lightning_v2-sheet.png",
    frameWidth: 64,
    frameHeight: 256,
    frameCount: 8,
    frameDuration: 50,
    loop: false,
    scale: 3,
  },
  skyBeam: {
    path: "/assets/vfx/sky_beam-sheet.png",
    frameWidth: 64,
    frameHeight: 256,
    frameCount: 20,
    frameDuration: 60,
    loop: false,
    scale: 2,
    yOffset: -0.2, // 화면 70% 지점
  },
};

/**
 * VFX ID로 설정 가져오기
 */
export function getVFXConfig(vfxId: string): VFXMetadata | null {
  return VFX_TYPES[vfxId] || null;
}

/**
 * 모든 VFX ID 목록
 */
export function getAllVFXIds(): string[] {
  return Object.keys(VFX_TYPES);
}
