/**
 * AssetLoader.ts
 * 모든 .png 이미지 에셋을 Image 객체로 미리 로드
 * 이미지 로딩 및 캐싱만 담당 (메타데이터는 각 모듈에서 관리)
 */

import { ENEMY_TYPES } from "../gameplay/EnemyTypes";
import { VFX_TYPES } from "../gameplay/VFXTypes";
import type { VFXMetadata } from "../gameplay/VFXTypes";
import { WIZARD_SPRITE } from "../gameplay/WizardTypes";
import type { WizardMetadata } from "../gameplay/WizardTypes";
import { MAGIC_CIRCLE_TYPES } from "../gameplay/MagicCircleTypes";
import type { MagicCircleMetadata } from "../gameplay/MagicCircleTypes";

export interface AssetManifest {
  maps: {
    [key: string]: string;
  };
}

// 에셋 매니페스트 - 맵 경로 정의
const ASSET_MANIFEST: AssetManifest = {
  maps: {
    graveyard: "/assets/maps/background_ingame_final_final.png",
    landing: "/assets/maps/landing.png",
    flourishOrnament: "/assets/maps/flourishOrnamentNoBack.png",
    landingTitle: "/assets/maps/landingTitle.png",
    startButton: "/assets/maps/clickToStart.png",
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

    // Wizard 스프라이트 로드 (플레이어)
    this.loadingPromises.push(
      this.loadImage("wizard_idle", "/assets/sprites/Wizard/Wizard_idle.png")
    );
    this.loadingPromises.push(
      this.loadImage("wizard_hurt", "/assets/sprites/Wizard/Wizard_hurt.png")
    );
    this.loadingPromises.push(
      this.loadImage(
        "wizard_attack",
        "/assets/sprites/Wizard/Wizard_attack.png"
      )
    );
    this.loadingPromises.push(
      this.loadImage(
        "wizard_attack2",
        "/assets/sprites/Wizard/Wizard_attack2.png"
      )
    );

    // Wizard 스프라이트 로드 (Castle용 - 기존)
    this.loadingPromises.push(this.loadImage("wizard", WIZARD_SPRITE.path));

    // Magic Circle 스프라이트 로드 (조준원용)
    this.loadingPromises.push(
      this.loadImage("magic_circle", MAGIC_CIRCLE_TYPES.circle1.path)
    );

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
   * Wizard 이미지 가져오기
   */
  getWizard(
    state?: "idle" | "hurt" | "attack" | "attack2"
  ): HTMLImageElement | null {
    if (state) {
      return this.loadedImages.get(`wizard_${state}`) || null;
    }
    // state가 없으면 기존 wizard (Castle용)
    return this.loadedImages.get("wizard") || null;
  }

  /**
   * Wizard 메타데이터 가져오기
   */
  getWizardMetadata(): WizardMetadata {
    return WIZARD_SPRITE;
  }

  /**
   * Magic Circle 이미지 가져오기
   */
  getMagicCircle(): HTMLImageElement | null {
    return this.loadedImages.get("magic_circle") || null;
  }

  /**
   * Magic Circle 메타데이터 가져오기
   */
  getMagicCircleMetadata(): MagicCircleMetadata {
    return MAGIC_CIRCLE_TYPES.circle1;
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
    // Magic Circle 경로 확인
    if (path === MAGIC_CIRCLE_TYPES.circle1.path) {
      return this.loadedImages.get("magic_circle") || null;
    }

    // Wizard 경로 확인
    if (path === "/assets/sprites/Wizard/Wizard_idle.png") {
      return this.loadedImages.get("wizard_idle") || null;
    }
    if (path === "/assets/sprites/Wizard/Wizard_hurt.png") {
      return this.loadedImages.get("wizard_hurt") || null;
    }
    if (path === "/assets/sprites/Wizard/Wizard_attack.png") {
      return this.loadedImages.get("wizard_attack") || null;
    }
    if (path === "/assets/sprites/Wizard/Wizard_attack2.png") {
      return this.loadedImages.get("wizard_attack2") || null;
    }

    // 맵 경로 확인
    for (const [name, mapPath] of Object.entries(ASSET_MANIFEST.maps)) {
      if (mapPath === path) {
        return this.loadedImages.get(`map_${name}`) || null;
      }
    }

    // VFX 경로 확인
    for (const [name, vfxConfig] of Object.entries(VFX_TYPES)) {
      if (vfxConfig.path === path) {
        return this.loadedImages.get(`vfx_${name}`) || null;
      }
    }

    // 적 스프라이트 경로 확인
    for (const [enemyId, enemyType] of Object.entries(ENEMY_TYPES)) {
      if (enemyType.sprites.walk.path === path) {
        return this.loadedImages.get(`enemy_${enemyId}_walk`) || null;
      }
      if (enemyType.sprites.hurt.path === path) {
        return this.loadedImages.get(`enemy_${enemyId}_hurt`) || null;
      }
      if (enemyType.sprites.death.path === path) {
        return this.loadedImages.get(`enemy_${enemyId}_death`) || null;
      }
    }

    console.warn(`이미지를 찾을 수 없습니다: ${path}`);
    return null;
  }
}
