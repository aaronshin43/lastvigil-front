/**
 * AssetLoader.ts
 * Pre-loads all .png image assets as Image objects
 * Handles only image loading and caching (metadata is managed by each module)
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

// Asset manifest - defines map paths
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
   * Load all assets
   */
  async loadAll(): Promise<void> {
    console.log("Starting asset loading...");

    // Load map images
    for (const [key, path] of Object.entries(ASSET_MANIFEST.maps)) {
      this.loadingPromises.push(this.loadImage(`map_${key}`, path));
    }

    // Load Wizard sprites (player)
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

    // Load Wizard sprites (for Castle - legacy)
    this.loadingPromises.push(this.loadImage("wizard", WIZARD_SPRITE.path));

    // Load Magic Circle sprites (for aiming circle)
    this.loadingPromises.push(
      this.loadImage("magic_circle", MAGIC_CIRCLE_TYPES.circle1.path)
    );

    // Load VFX images
    await this.loadVFXSprites();

    // Load enemy sprites
    await this.loadEnemySprites();

    await Promise.all(this.loadingPromises);
    console.log(`Asset loading completed: ${this.loadedImages.size} images`);
  }

  /**
   * Load all VFX sprites defined in VFXTypes.ts
   */
  private async loadVFXSprites(): Promise<void> {
    const allVFXTypes = Object.entries(VFX_TYPES);

    for (const [vfxId, vfxConfig] of allVFXTypes) {
      this.loadingPromises.push(this.loadImage(`vfx_${vfxId}`, vfxConfig.path));
    }
  }

  /**
   * Load all enemy sprites defined in EnemyTypes.ts
   */
  private async loadEnemySprites(): Promise<void> {
    const allEnemyTypes = Object.values(ENEMY_TYPES);

    for (const enemyType of allEnemyTypes) {
      // walk sprites
      this.loadingPromises.push(
        this.loadImage(
          `enemy_${enemyType.id}_walk`,
          enemyType.sprites.walk.path
        )
      );

      // hurt sprites
      this.loadingPromises.push(
        this.loadImage(
          `enemy_${enemyType.id}_hurt`,
          enemyType.sprites.hurt.path
        )
      );

      // death sprites
      this.loadingPromises.push(
        this.loadImage(
          `enemy_${enemyType.id}_death`,
          enemyType.sprites.death.path
        )
      );
    }
  }

  /**
   * Load individual image
   */
  private loadImage(key: string, path: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        this.loadedImages.set(key, img);
        // console.log(`✓ Loaded: ${path}`);
        resolve();
      };
      img.onerror = () => {
        console.error(`✗ Failed to load: ${path}`);
        reject(new Error(`Failed to load image: ${path}`));
      };
      img.src = path;
    });
  }

  /**
   * Get map image
   */
  getMap(name: string): HTMLImageElement | null {
    return this.loadedImages.get(`map_${name}`) || null;
  }

  /**
   * Get VFX image
   */
  getVFX(name: string): HTMLImageElement | null {
    return this.loadedImages.get(`vfx_${name}`) || null;
  }

  /**
   * Get VFX metadata
   */
  getVFXMetadata(name: string): VFXMetadata | null {
    return VFX_TYPES[name] || null;
  }

  /**
   * Get Wizard image
   */
  getWizard(
    state?: "idle" | "hurt" | "attack" | "attack2"
  ): HTMLImageElement | null {
    if (state) {
      return this.loadedImages.get(`wizard_${state}`) || null;
    }
    // If no state, return legacy wizard (for Castle)
    return this.loadedImages.get("wizard") || null;
  }

  /**
   * Get Wizard metadata
   */
  getWizardMetadata(): WizardMetadata {
    return WIZARD_SPRITE;
  }

  /**
   * Get Magic Circle image
   */
  getMagicCircle(): HTMLImageElement | null {
    return this.loadedImages.get("magic_circle") || null;
  }

  /**
   * Get Magic Circle metadata
   */
  getMagicCircleMetadata(): MagicCircleMetadata {
    return MAGIC_CIRCLE_TYPES.circle1;
  }

  /**
   * Get VFX image and metadata together
   */
  getVFXWithMetadata(
    name: string
  ): { image: HTMLImageElement; metadata: VFXMetadata } | null {
    const image = this.getVFX(name);
    const metadata = this.getVFXMetadata(name);

    if (!image || !metadata) {
      console.warn(`VFX "${name}" not found.`);
      return null;
    }

    return { image, metadata };
  }

  /**
   * Get loading progress (0-1)
   */
  getProgress(): number {
    const total =
      Object.keys(ASSET_MANIFEST.maps).length +
      Object.keys(VFX_TYPES).length +
      Object.keys(ENEMY_TYPES).length * 3; // walk, hurt, death per enemy
    return this.loadedImages.size / total;
  }

  /**
   * Get list of all VFX names
   */
  getVFXList(): string[] {
    return Object.keys(VFX_TYPES);
  }

  /**
   * Get image by path (universal)
   */
  getImageByPath(path: string): HTMLImageElement | null {
    // Check Magic Circle path
    if (path === MAGIC_CIRCLE_TYPES.circle1.path) {
      return this.loadedImages.get("magic_circle") || null;
    }

    // Check Wizard paths
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

    // Check map paths
    for (const [name, mapPath] of Object.entries(ASSET_MANIFEST.maps)) {
      if (mapPath === path) {
        return this.loadedImages.get(`map_${name}`) || null;
      }
    }

    // Check VFX paths
    for (const [name, vfxConfig] of Object.entries(VFX_TYPES)) {
      if (vfxConfig.path === path) {
        return this.loadedImages.get(`vfx_${name}`) || null;
      }
    }

    // Check enemy sprite paths
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

    console.warn(`Image not found: ${path}`);
    return null;
  }
}
