/**
 * AssetLoader.ts
 * 모든 .png 이미지 에셋을 Image 객체로 미리 로드
 * 이펙트 메타데이터 관리
 */

export interface EffectMetadata {
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number;  // ms
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
    graveyard: '/assets/maps/background_ingame_final_final.png',
  },
  sprites: {
    zombie: '/assets/sprites/enemy_zombie.png',
    skeleton: '/assets/sprites/enemy_skeleton.png',
  },
  vfx: {
    explosion: {
      path: '/assets/vfx/effect_explosion.png',
      metadata: {
        frameWidth: 192,
        frameHeight: 192,
        frameCount: 8,
        frameDuration: 60,
        loop: false,
        scale: 1.5
      }
    },
    fireHammer: {
      path: '/assets/vfx/FireHammerRedV1-sheet.png',
      metadata: {
        frameWidth: 128,
        frameHeight: 144,
        frameCount: 19,
        frameDuration: 50,
        loop: false,
        scale: 1.5
      }
    },
    magicCircle: {
      path: '/assets/vfx/magic_circle.png',
      metadata: {
        frameWidth: 256,
        frameHeight: 256,
        frameCount: 1,  // 단일 이미지
        frameDuration: 100,
        loop: true,
        scale: 1.0
      }
    }
  }
};

export class AssetLoader {
  private loadedImages: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Promise<void>[] = [];

  /**
   * 모든 에셋 로드
   */
  async loadAll(): Promise<void> {
    console.log('에셋 로딩 시작...');

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
  getVFXWithMetadata(name: string): { image: HTMLImageElement; metadata: EffectMetadata } | null {
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
    const total = Object.keys(ASSET_MANIFEST.maps).length +
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
