/**
 * Game.ts
 * A "dumb" renderer that renders based on the latestGameState received from the server.
 * Does not calculate any game logic - only responsible for drawing.
 */

import { AssetLoader } from "./AssetLoader";
import { Renderer } from "./Renderer";
import { GazeCursor } from "../gameplay/GazeCursor";
import { AudioManager } from "./AudioManager";
import { Effect } from "../gameplay/Effect";
import { Enemy, type EnemyStateData } from "../gameplay/Enemy";
import { getEnemyConfig } from "../gameplay/EnemyTypes";
import { Player } from "../gameplay/Player";
import type { Camera } from "./Camera";

/**
 * Data structure for game state received from the server
 */
export interface GameStateData {
  enemies: EnemyStateData[];
  effects: {
    id: string;
    type: string;
    x: number; // Normalized x-coordinate (0.0~1.0)
  }[];
  playerHP?: number; // Player HP
  playerGold?: number;
  playerScore?: number;
  waveNumber?: number;
}

export interface GameConfig {
  assetLoader: AssetLoader;
  renderer: Renderer;
  gazeCursor: GazeCursor;
  camera: Camera;
  audioManager: AudioManager;
}

export class Game {
  private assetLoader: AssetLoader;
  private renderer: Renderer;
  private gazeCursor: GazeCursor;
  private camera: Camera;
  private audioManager: AudioManager;

  // Objects to render (based on server data)
  private enemies: Map<string, Enemy> = new Map();
  private activeEffects: Effect[] = [];
  private player: Player;

  // Game state
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;

  // Latest game state received from the server
  private latestGameState: GameStateData = {
    enemies: [],
    effects: [],
  };

  constructor(config: GameConfig) {
    this.assetLoader = config.assetLoader;
    this.renderer = config.renderer;
    this.gazeCursor = config.gazeCursor;
    this.camera = config.camera;
    this.audioManager = config.audioManager;

    // Initialize player
    this.player = new Player(this.assetLoader);
  }

  /**
   * Start the game (begin rendering loop)
   */
  public start(): void {
    if (this.isRunning) return;

    console.log("🎮 Starting game rendering!");
    this.isRunning = true;
    this.lastUpdateTime = performance.now();

    // Start rendering loop
    this.gameLoop();
  }

  /**
   * Game loop (60fps)
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // 1. Update animations (effects only)
    this.updateAnimations(deltaTime);

    // 2. Render (pass deltaTime)
    this.render(deltaTime);

    requestAnimationFrame(this.gameLoop);
  };

  /**
   * Update game state received from the server
   * This method is called by WebSocket
   */
  public updateGameState(state: GameStateData): void {
    this.latestGameState = state;

    // Gaze position is handled in processServerData() in main.ts, so it is omitted here

    // Update player HP
    if (state.playerHP !== undefined) {
      const maxHP = 100;
      this.player.updateHP(state.playerHP, maxHP);

      // Update Witch HP in Renderer (for UI)
      const isDead = state.playerHP <= 0;
      this.renderer.updateWitchHP(state.playerHP, maxHP, isDead);
    }

    // Update enemies
    this.updateEnemies(state.enemies);

    // Update effects
    this.updateEffects(state.effects);
  }

  /**
   * Update enemy objects
   */
  private updateEnemies(enemyStates: EnemyStateData[]): void {
    const currentEnemyIds = new Set(enemyStates.map((e) => e.id));

    // console.log(`👾 Enemy update: ${enemyStates.length} enemies from server, ${this.enemies.size} in game`);

    // Remove enemies that were deleted on the server
    for (const id of this.enemies.keys()) {
      if (!currentEnemyIds.has(id)) {
        // console.log(`❌ Enemy removed: ${id}`);
        this.enemies.delete(id);
      }
    }

    // Create or update enemies
    for (const enemyState of enemyStates) {
      let enemy = this.enemies.get(enemyState.id);

      if (!enemy) {
        // Create new enemy
        const config = getEnemyConfig(enemyState.typeId);
        if (!config) {
          console.error(`Unknown enemy type: ${enemyState.typeId}`);
          continue;
        }
        enemy = new Enemy(enemyState.id, config, this.assetLoader);
        this.enemies.set(enemyState.id, enemy);
        // console.log(`✨ Enemy created: ${enemyState.id}, type=${enemyState.typeId}, x=${enemyState.x.toFixed(3)}, y=${enemyState.y.toFixed(3)}`);
      }

      // Update state based on server data
      enemy.updateFromServer(enemyState);
    }
  }

  /**
   * Update effects
   */
  private updateEffects(
    effectStates: { id: string; type: string; x: number }[]
  ): void {
    // console.log(
    //   `🎨 Effect update: received ${effectStates.length}, currently active ${this.activeEffects.length}`
    // );

    // Extract existing effect IDs
    const existingEffectIds = new Set(
      this.activeEffects.map((e) => (e as any).id).filter(Boolean)
    );

    // Create new effects
    for (const effectState of effectStates) {
      // console.log(
      //   `🔍 Effect check: id=${effectState.id}, type=${effectState.type}, x=${effectState.x}, exists=${existingEffectIds.has(effectState.id)}`
      // );

      if (!existingEffectIds.has(effectState.id)) {
        // x: Convert normalized coordinates (0~1) to world coordinates
        const WORLD_WIDTH = 2148; // Backend map size
        const worldX = effectState.x * WORLD_WIDTH;

        // y: Apply yOffset from VFX metadata (default 0.7)
        const vfxMetadata = this.assetLoader.getVFXMetadata(effectState.type);
        const baseY = 0.7; // Default y position (70% of screen height)
        const yPosition =
          vfxMetadata?.yOffset !== undefined
            ? baseY + vfxMetadata.yOffset
            : baseY;
        const fixedY = window.innerHeight * yPosition;

        const effect = this.createEffect(effectState.type, worldX, fixedY);
        if (effect) {
          (effect as any).id = effectState.id; // Tag ID
          this.activeEffects.push(effect);
          
          // 🔊 효과음 재생
          this.audioManager.playVFXSound(effectState.type);
          
          console.log(
            `✨ Effect created: ${effectState.type} at world(${worldX.toFixed(
              0
            )}, ${fixedY.toFixed(0)})`
          );
        } else {
          console.error(`❌ Failed to create effect: ${effectState.type}`);
        }
      }
    }
  }

  /**
   * Create an effect
   */
  private createEffect(
    effectType: string,
    x: number,
    y: number
  ): Effect | null {
    const vfxData = this.assetLoader.getVFXWithMetadata(effectType);
    if (!vfxData) {
      console.warn(`Effect "${effectType}" not found.`);
      return null;
    }

    return new Effect(x, y, vfxData.image, vfxData.metadata);
  }

  /**
   * Update animations (effects only)
   */
  private updateAnimations(deltaTime: number): void {
    // Smooth gaze cursor
    this.gazeCursor.update(deltaTime);

    // Update player animations
    this.player.update(deltaTime);

    // Update enemy animations
    for (const enemy of this.enemies.values()) {
      enemy.updateAnimation(deltaTime);
    }

    // Update effects
    for (const effect of this.activeEffects) {
      effect.update(deltaTime);
    }

    // Remove completed effects
    this.activeEffects = this.activeEffects.filter(
      (effect) => !effect.isComplete()
    );
  }

  /**
   * Rendering
   */
  private render(deltaTime: number): void {
    // 0. Draw background (apply camera offset, update Castle animation)
    this.renderer.redrawBackground(deltaTime);

    const ctx = this.renderer.getGameContext();
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 1. Draw enemies (based on latestGameState.enemies)
    let drawnEnemies = 0;
    for (const enemy of this.enemies.values()) {
      enemy.draw(ctx, this.camera);
      drawnEnemies++;
    }

    // 2. Draw effects
    for (const effect of this.activeEffects) {
      effect.draw(ctx, this.camera);
    }

    // 3. Draw gaze cursor
    this.gazeCursor.draw(ctx);

    // 4. Draw UI (debug)
    this.drawUI(ctx);
  }

  /**
   * Draw UI (display server data)
   */
  private drawUI(ctx: CanvasRenderingContext2D): void {
    const enemyCount = this.enemies.size;
    const gold = this.latestGameState.playerGold || 0;
    const score = this.latestGameState.playerScore || 0;
    const wave = this.latestGameState.waveNumber || 1;

    // Update HTML UI elements
    this.updateHTMLUI(score, wave, gold, enemyCount);

    // Debug text on canvas (bottom right)
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "right";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
  }

  /**
   * Update HTML UI elements
   */
  private updateHTMLUI(
    score: number,
    wave: number,
    gold: number,
    enemyCount: number
  ): void {
    const scoreEl = document.getElementById("score");
    const waveEl = document.getElementById("wave");
    const goldEl = document.getElementById("gold");
    const enemiesEl = document.getElementById("enemies-count");
    const witchHPEl = document.getElementById("witch-hp");

    if (scoreEl) scoreEl.textContent = `${score}`;
    if (waveEl) waveEl.textContent = `Wave: ${wave}`;
    if (goldEl) goldEl.textContent = `Gold: ${gold}`;
    if (enemiesEl) enemiesEl.textContent = `Enemies: ${enemyCount}`;

    // Update Witch HP
    const witchState = this.renderer.getWitchState();
    if (witchHPEl) {
      const hpPercent = Math.round((witchState.hp / witchState.maxHP) * 100);
      witchHPEl.textContent = `HP: ${witchState.hp}/${witchState.maxHP} (${hpPercent}%)`;

      // Change color based on HP
      if (hpPercent > 50) {
        witchHPEl.style.color = "#00FF00"; // Green
      } else if (hpPercent > 25) {
        witchHPEl.style.color = "#FFA500"; // Orange
      } else {
        witchHPEl.style.color = "#FF0000"; // Red
      }
    }
  }

  /**
   * Stop the game
   */
  public stop(): void {
    this.isRunning = false;
    console.log("⏹️ Game stopped");
  }

  /**
   * Game state getter
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getLatestGameState(): GameStateData {
    return this.latestGameState;
  }
}
