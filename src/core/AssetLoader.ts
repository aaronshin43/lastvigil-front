/**
 * AssetLoader.ts
 * 모든 .png 이미지 에셋을 Image 객체로 미리 로드
 * 이펙트 메타데이터 관리
 */

export interface EffectMetadata {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number; // ms
  loop?: boolean;
  scale?: number;
}

export interface AssetManifest {
  maps: {
    [key: string]: string;
  };
  sprites: {
    [key: string]: string;
  };
  vfx: {
    [key: string]: {
      path: string;
      metadata: EffectMetadata;
    };
  };
}

// 에셋 매니페스트 - 모든 에셋 경로와 메타데이터 정의
const ASSET_MANIFEST: AssetManifest = {
  maps: {
    graveyard: "/assets/maps/background_ingame_final_final.png",
    graveyardNatural: "/assets/maps/background_ingame_natural.png",
    graveyardFinal: "/assets/maps/background_ingame_final.png",
    ingame: "/assets/maps/background_ingame.png",
    intro: "/assets/maps/GameIntro.png",
    road: "/assets/maps/mapRoad3.png",
  },
  sprites: {
    // Skeleton
    skeletonWalk: "/assets/sprites/Skeleton/Skeleton_walk.png",
    skeletonHurt: "/assets/sprites/Skeleton/Skeleton_hurt.png",
    skeletonDeath: "/assets/sprites/Skeleton/Skeleton_death.png",

    // Orc
    orcWalk: "/assets/sprites/Orc/Orc_walk.png",
    orcHurt: "/assets/sprites/Orc/Orc_hurt.png",
    orcDeath: "/assets/sprites/Orc/Orc_death.png",

    // Slime
    slimeWalk: "/assets/sprites/Slime/Slime_walk.png",
    slimeHurt: "/assets/sprites/Slime/Slime_hurt.png",
    slimeDeath: "/assets/sprites/Slime/Slime_death.png",

    // Wizard
    wizardIdle: "/assets/sprites/Wizard/Wizard_idle.png",
    wizardAttack: "/assets/sprites/Wizard/Wizard_attack.png",
    wizardAttack2: "/assets/sprites/Wizard/Wizard_attack2.png",
    wizardHurt: "/assets/sprites/Wizard/Wizard_hurt.png",
    wizardDeath: "/assets/sprites/Wizard/Wizard_death.png",

    // Skeleton Archer
    skeletonArcherWalk:
      "/assets/sprites/Skeleton_Archor/Skeleton_Archer_walk.png",
    skeletonArcherHurt:
      "/assets/sprites/Skeleton_Archor/Skeleton_Archer_hurt.png",
    skeletonArcherDeath:
      "/assets/sprites/Skeleton_Archor/Skeleton_Archer_death.png",
  },
  vfx: {
    fireHammerRed: {
      path: "/assets/vfx/fire_hammer_red-sheet.png",
      metadata: {
        frameWidth: 128,
        frameHeight: 144,
        frameCount: 19,
        frameDuration: 50,
        loop: false,
        scale: 1.5,
      },
    },
    fireSlash: {
      path: "/assets/vfx/fire_slash-sheet.png",
      metadata: {
        frameWidth: 128,
        frameHeight: 128,
        frameCount: 19,
        frameDuration: 50,
        loop: false,
        scale: 1.5,
      },
    },
    fireVortexRed: {
      path: "/assets/vfx/fire_vortex_red-sheet.png",
      metadata: {
        frameWidth: 96,
        frameHeight: 144,
        frameCount: 27,
        frameDuration: 40,
        loop: false,
        scale: 1.5,
      },
    },
    fireHurricaneBlue: {
      path: "/assets/vfx/fire_hurricane_blue-sheet.png",
      metadata: {
        frameWidth: 128,
        frameHeight: 100,
        frameCount: 17,
        frameDuration: 60,
        loop: false,
        scale: 1.5,
      },
    },
    meteorShowerRed: {
      path: "/assets/vfx/meteor_shower-red-sheet.png",
      metadata: {
        frameWidth: 253,
        frameHeight: 192,
        frameCount: 24,
        frameDuration: 60,
        loop: false,
        scale: 1.5,
      },
    },
    tornado: {
      path: "/assets/vfx/tornado-sheet.png",
      metadata: {
        frameWidth: 105,
        frameHeight: 100,
        frameCount: 14,
        frameDuration: 60,
        loop: false,
        scale: 1.5,
      },
    },
    lightningV1: {
      path: "/assets/vfx/lightning_v1-sheet.png",
      metadata: {
        frameWidth: 64,
        frameHeight: 156,
        frameCount: 17,
        frameDuration: 50,
        loop: false,
        scale: 1.5,
      },
    },
    lightningV2: {
      path: "/assets/vfx/lightning_v2-sheet.png",
      metadata: {
        frameWidth: 64,
        frameHeight: 256,
        frameCount: 8,
        frameDuration: 50,
        loop: false,
        scale: 1.5,
      },
    },
    skyBeam: {
      path: "/assets/vfx/sky_beam-sheet.png",
      metadata: {
        frameWidth: 64,
        frameHeight: 256,
        frameCount: 20,
        frameDuration: 60,
        loop: false,
        scale: 1.5,
      },
    },
  },
};

export class AssetLoader {
  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Promise<void>[] = [];

  /**
   * 모든 에셋 로드
   */
  async loadAll(): Promise<void> {
    console.log("에셋 로딩 시작...");

    // 맵 이미지 로드
    for (const [key, path] of Object.entries(ASSET_MANIFEST.maps)) {
      this.loadingPromises.push(this.loadImage(`map_${key}`, path));
    }

    // 스프라이트 이미지 로드
    for (const [key, path] of Object.entries(ASSET_MANIFEST.sprites)) {
      this.loadingPromises.push(this.loadImage(`sprite_${key}`, path));
    }

    // VFX 이미지 로드
    for (const [key, config] of Object.entries(ASSET_MANIFEST.vfx)) {
      this.loadingPromises.push(this.loadImage(`vfx_${key}`, config.path));
    }

    await Promise.all(this.loadingPromises);
    console.log(`에셋 로딩 완료: ${this.loadedImages.size}개 이미지`);
  }

  /**
   * 개별 이미지 로드
   */
  private loadImage(key: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(key, img);
        console.log(`✓ 로드됨: ${path}`);
        resolve();
      };
      img.onerror = () => {
        console.error(`✗ 로드 실패: ${path}`);
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });
  }

  /**
   * 맵 이미지 가져오기
   */
  getMap(name: string): HTMLImageElement | null {
    return this.loadedImages.get(`map_${name}`) || null;
  }

  /**
   * 스프라이트 이미지 가져오기
   */
  getSprite(name: string): HTMLImageElement | null {
    return this.loadedImages.get(`sprite_${name}`) || null;
  }

  /**
   * VFX 이미지 가져오기
   */
  getVFX(name: string): HTMLImageElement | null {
    return this.loadedImages.get(`vfx_${name}`) || null;
  }

  /**
   * VFX 메타데이터 가져오기
   */
  getVFXMetadata(name: string): EffectMetadata | null {
    return ASSET_MANIFEST.vfx[name]?.metadata || null;
  }

  /**
   * VFX 이미지와 메타데이터 함께 가져오기
   */
  getVFXWithMetadata(
    name: string
  ): { image: HTMLImageElement; metadata: EffectMetadata } | null {
    const image = this.getVFX(name);
    const metadata = this.getVFXMetadata(name);

    if (!image || !metadata) {
      console.warn(`VFX "${name}"을 찾을 수 없습니다.`);
      return null;
    }

    return { image, metadata };
  }

  /**
   * 로딩 진행률 (0~1)
   */
  getProgress(): number {
    const total =
      Object.keys(ASSET_MANIFEST.maps).length +
      Object.keys(ASSET_MANIFEST.sprites).length +
      Object.keys(ASSET_MANIFEST.vfx).length;
    return this.loadedImages.size / total;
  }

  /**
   * 모든 VFX 이름 목록
   */
  getVFXList(): string[] {
    return Object.keys(ASSET_MANIFEST.vfx);
  }
}
