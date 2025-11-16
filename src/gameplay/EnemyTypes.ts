/**
 * EnemyTypes.ts
 * Sprite metadata and game stats for each monster
 */

export interface SpriteAnimationConfig {
  path: string;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  frameDuration: number; // ms
}

export interface EnemyTypeConfig {
  id: string;
  name: string;
  sprites: {
    walk: SpriteAnimationConfig;
    hurt: SpriteAnimationConfig;
    death: SpriteAnimationConfig;
  };
  stats: {
    maxHP: number;
    speed: number; // pixels per second
    damage: number;
    goldReward: number;
    scale: number; // Rendering size scale
  };
}

/**
 * All enemy type definitions
 */
export const ENEMY_TYPES: { [key: string]: EnemyTypeConfig } = {
  // ========== Tier 1: Basic Monsters ==========
  slime: {
    id: "slime",
    name: "Slime",
    sprites: {
      walk: {
        path: "/assets/sprites/Slime/Slime_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 5,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Slime/Slime_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Slime/Slime_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 50,
      speed: 60,
      damage: 5,
      goldReward: 10,
      scale: 0.6,
    },
  },

  skeleton: {
    id: "skeleton",
    name: "Skeleton",
    sprites: {
      walk: {
        path: "/assets/sprites/Skeleton/Skeleton_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Skeleton/Skeleton_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Skeleton/Skeleton_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 80,
      speed: 70,
      damage: 10,
      goldReward: 15,
      scale: 0.6,
    },
  },

  orc: {
    id: "orc",
    name: "Orc",
    sprites: {
      walk: {
        path: "/assets/sprites/Orc/Orc_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Orc/Orc_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Orc/Orc_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 120,
      speed: 50,
      damage: 15,
      goldReward: 20,
      scale: 0.6,
    },
  },

  // ========== Tier 2: Intermediate Monsters ==========
  skeletonArcher: {
    id: "skeletonArcher",
    name: "Skeleton Archer",
    sprites: {
      walk: {
        path: "/assets/sprites/Skeleton_Archor/Skeleton_Archer_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Skeleton_Archor/Skeleton_Archer_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Skeleton_Archor/Skeleton_Archer_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 100,
      speed: 80,
      damage: 12,
      goldReward: 25,
      scale: 0.6,
    },
  },

  armoredSkeleton: {
    id: "armoredSkeleton",
    name: "Armored Skeleton",
    sprites: {
      walk: {
        path: "/assets/sprites/Armored_Skeleton/Armored_Skeleton_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Armored_Skeleton/Armored_Skeleton_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Armored_Skeleton/Armored_Skeleton_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 150,
      speed: 55,
      damage: 18,
      goldReward: 30,
      scale: 0.6,
    },
  },

  greatswordSkeleton: {
    id: "greatswordSkeleton",
    name: "Greatsword Skeleton",
    sprites: {
      walk: {
        path: "/assets/sprites/Greatsword_Skeleton/Greatsword_Skeleton_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Greatsword_Skeleton/Greatsword_Skeleton_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Greatsword_Skeleton/Greatsword_Skeleton_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 180,
      speed: 45,
      damage: 25,
      goldReward: 35,
      scale: 0.6,
    },
  },

  // ========== Tier 3: Advanced Monsters ==========
  armoredOrc: {
    id: "armoredOrc",
    name: "Armored Orc",
    sprites: {
      walk: {
        path: "/assets/sprites/Armored_Orc/Armored_Orc_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Armored_Orc/Armored_Orc_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Armored_Orc/Armored_Orc_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 250,
      speed: 40,
      damage: 30,
      goldReward: 50,
      scale: 0.6,
    },
  },

  elitOrc: {
    id: "elitOrc",
    name: "Elite Orc",
    sprites: {
      walk: {
        path: "/assets/sprites/Elit_Orc/Elit_Orc_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Elit_Orc/Elit_Orc_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Elit_Orc/Elit_Orc_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 300,
      speed: 55,
      damage: 35,
      goldReward: 60,
      scale: 0.6,
    },
  },

  orcRider: {
    id: "orcRider",
    name: "Orc Rider",
    sprites: {
      walk: {
        path: "/assets/sprites/Orc_rider/Orc_rider_walk.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 8,
        frameDuration: 150,
      },
      hurt: {
        path: "/assets/sprites/Orc_rider/Orc_rider_hurt.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 100,
      },
      death: {
        path: "/assets/sprites/Orc_rider/Orc_rider_death.png",
        frameWidth: 1000,
        frameHeight: 1000,
        frameCount: 4,
        frameDuration: 200,
      },
    },
    stats: {
      maxHP: 200,
      speed: 90,
      damage: 28,
      goldReward: 55,
      scale: 0.6,
    },
  },

  // ========== Tier 4: Boss ==========
  // dragon: {
  //   id: "dragon",
  //   name: "Dragon",
  //   sprites: {
  //     walk: {
  //       path: "/assets/sprites/Dragon/Dragon_walk.png",
  //       frameWidth: 128,
  //       frameHeight: 128,
  //       frameCount: 4,
  //       frameDuration: 200,
  //     },
  //     hurt: {
  //       path: "/assets/sprites/Dragon/Dragon_hurt.png",
  //       frameWidth: 128,
  //       frameHeight: 128,
  //       frameCount: 2,
  //       frameDuration: 150,
  //     },
  //     death: {
  //       path: "/assets/sprites/Dragon/Dragon_death.png",
  //       frameWidth: 128,
  //       frameHeight: 128,
  //       frameCount: 4,
  //       frameDuration: 200,
  //     },
  //   },
  //   stats: {
  //     maxHP: 1000,
  //     speed: 30,
  //     damage: 50,
  //     goldReward: 200,
  //     scale: 2.0,
  //   },
  // },
};

/**
 * Get configuration by enemy type ID
 */
export function getEnemyConfig(typeId: string): EnemyTypeConfig | null {
  return ENEMY_TYPES[typeId] || null;
}

/**
 * List of all enemy type IDs
 */
export function getAllEnemyTypeIds(): string[] {
  return Object.keys(ENEMY_TYPES);
}
