/**
 * AssetLoader.ts
 * 모든 .png 이미지 에셋을 Image 객체로 미리 로드
 * 이미지 로딩 및 캐싱만 담당 (메타데이터는 각 모듈에서 관리)
 */

import { ENEMY_TYPES } from "../gameplay/EnemyTypes";
import { VFX_TYPES } from "../gameplay/VFXTypes";
import type { VFXMetadata } from "../gameplay/VFXTypes";

export interface AssetManifest {
  maps: {
    [key: string]: string;
  };
}

// 에셋 매니페스트 - 맵 경로 정의
const ASSET_MANIFEST: AssetManifest = {
  maps: {
    graveyard: "/assets/maps/background_ingame_final_final.png",
    graveyardNatural: "/assets/maps/background_ingame_natural.png",
    graveyardFinal: "/assets/maps/background_ingame_final.png",
    ingame: "/assets/maps/background_ingame.png",
    intro: "/assets/maps/GameIntro.png",
    road: "/assets/maps/mapRoad3.png",
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

    // VFX 이미지 로드
    await this.loadVFXSprites();

    // 적 스프라이트 로드
    await this.loadEnemySprites();

    await Promise.all(this.loadingPromises);
    console.log(`에셋 로딩 완료: ${this.loadedImages.size}개 이미지`);
  }

  /**
   * VFXTypes.ts에 정의된 모든 VFX 스프라이트 로드
   */
  private async loadVFXSprites(): Promise<void> {
    const allVFXTypes = Object.entries(VFX_TYPES);

    for (const [vfxId, vfxConfig] of allVFXTypes) {
      this.loadingPromises.push(this.loadImage(`vfx_${vfxId}`, vfxConfig.path));
    }
  }

  /**
   * EnemyTypes.ts에 정의된 모든 적 스프라이트 로드
   */
  private async loadEnemySprites(): Promise<void> {
    const allEnemyTypes = Object.values(ENEMY_TYPES);

    for (const enemyType of allEnemyTypes) {
      // walk 스프라이트
      this.loadingPromises.push(
        this.loadImage(
          `enemy_${enemyType.id}_walk`,
          enemyType.sprites.walk.path
        )
      );

      // hurt 스프라이트
      this.loadingPromises.push(
        this.loadImage(
          `enemy_${enemyType.id}_hurt`,
          enemyType.sprites.hurt.path
        )
      );

      // death 스프라이트
      this.loadingPromises.push(
        this.loadImage(
          `enemy_${enemyType.id}_death`,
          enemyType.sprites.death.path
        )
      );
    }
  }

  /**
   * 개별 이미지 로드
   */
  private loadImage(key: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(key, img);
        // console.log(`✓ 로드됨: ${path}`);
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
   * VFX 이미지 가져오기
   */
  getVFX(name: string): HTMLImageElement | null {
    return this.loadedImages.get(`vfx_${name}`) || null;
  }

  /**
   * VFX 메타데이터 가져오기
   */
  getVFXMetadata(name: string): VFXMetadata | null {
    return VFX_TYPES[name] || null;
  }

  /**
   * VFX 이미지와 메타데이터 함께 가져오기
   */
  getVFXWithMetadata(
    name: string
  ): { image: HTMLImageElement; metadata: VFXMetadata } | null {
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
      Object.keys(VFX_TYPES).length +
      Object.keys(ENEMY_TYPES).length * 3; // walk, hurt, death per enemy
    return this.loadedImages.size / total;
  }

  /**
   * 모든 VFX 이름 목록
   */
  getVFXList(): string[] {
    return Object.keys(VFX_TYPES);
  }

  /**
   * 경로로 이미지 가져오기 (범용)
   */
  getImageByPath(path: string): HTMLImageElement | null {
    // loadedImages에서 경로로 검색
    for (const [key, image] of this.loadedImages.entries()) {
      // 맵 경로 확인
      const mapEntry = Object.entries(ASSET_MANIFEST.maps).find(
        ([name]) => `map_${name}` === key
      );
      if (mapEntry && mapEntry[1] === path) return image;

      // VFX 경로 확인
      const vfxEntry = Object.entries(VFX_TYPES).find(
        ([name]) => `vfx_${name}` === key
      );
      if (vfxEntry && vfxEntry[1].path === path) return image;

      // 적 스프라이트 경로 확인
      for (const enemyType of Object.values(ENEMY_TYPES)) {
        if (enemyType.sprites.walk.path === path) return image;
        if (enemyType.sprites.hurt.path === path) return image;
        if (enemyType.sprites.death.path === path) return image;
      }
    }

    console.warn(`이미지를 찾을 수 없습니다: ${path}`);
    return null;
  }
}
