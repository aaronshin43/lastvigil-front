/**
 * Game.ts
 * 서버로부터 받은 latestGameState를 기반으로 렌더링하는 "멍청한" 렌더러
 * 게임 로직은 일체 계산하지 않음 - 오직 그리기만 담당
 */

import { AssetLoader } from "./AssetLoader";
import { Renderer } from "./Renderer";
import { GazeCursor } from "../gameplay/GazeCursor";
import { Effect } from "../gameplay/Effect";
import { Enemy, type EnemyStateData } from "../gameplay/Enemy";
import { getEnemyConfig } from "../gameplay/EnemyTypes";

/**
 * 서버로부터 받는 게임 상태 데이터 구조
 */
export interface GameStateData {
  enemies: EnemyStateData[];
  effects: {
    id: string;
    type: string;
    x: number; // 정규화된 x 좌표 (0.0~1.0)
  }[];
  playerGold?: number;
  playerScore?: number;
  waveNumber?: number;
}

export interface GameConfig {
  assetLoader: AssetLoader;
  renderer: Renderer;
  gazeCursor: GazeCursor;
}

export class Game {
  private assetLoader: AssetLoader;
  private renderer: Renderer;
  private gazeCursor: GazeCursor;

  // 렌더링할 객체들 (서버 데이터 기반)
  private enemies: Map<string, Enemy> = new Map();
  private activeEffects: Effect[] = [];

  // 게임 상태
  private isRunning: boolean = false;
  private lastUpdateTime: number = 0;

  // 서버로부터 받은 최신 게임 상태
  private latestGameState: GameStateData = {
    enemies: [],
    effects: [],
  };

  constructor(config: GameConfig) {
    this.assetLoader = config.assetLoader;
    this.renderer = config.renderer;
    this.gazeCursor = config.gazeCursor;
  }

  /**
   * 게임 시작 (렌더링 루프 시작)
   */
  public start(): void {
    if (this.isRunning) return;

    console.log("🎮 게임 렌더링 시작!");
    this.isRunning = true;
    this.lastUpdateTime = performance.now();

    // 렌더링 루프 시작
    this.gameLoop();
  }

  /**
   * 게임 루프 (60fps)
   */
  private gameLoop = (): void => {
    if (!this.isRunning) return;

    const currentTime = performance.now();
    const deltaTime = currentTime - this.lastUpdateTime;
    this.lastUpdateTime = currentTime;

    // 1. 애니메이션 업데이트 (이펙트만)
    this.updateAnimations(deltaTime);

    // 2. 렌더링
    this.render();

    requestAnimationFrame(this.gameLoop);
  };

  /**
   * 서버로부터 게임 상태 업데이트 받기
   * WebSocket에서 이 메서드를 호출함
   */
  public updateGameState(state: GameStateData): void {
    this.latestGameState = state;

    // 시선 위치는 main.ts의 processServerData()에서 처리하므로 여기서는 제거

    // 적 업데이트
    this.updateEnemies(state.enemies);

    // 이펙트 업데이트
    this.updateEffects(state.effects);
  }

  /**
   * 적 객체 업데이트
   */
  private updateEnemies(enemyStates: EnemyStateData[]): void {
    const currentEnemyIds = new Set(enemyStates.map((e) => e.id));

    // 서버에서 제거된 적 삭제
    for (const id of this.enemies.keys()) {
      if (!currentEnemyIds.has(id)) {
        this.enemies.delete(id);
      }
    }

    // 적 생성 또는 업데이트
    for (const enemyState of enemyStates) {
      let enemy = this.enemies.get(enemyState.id);

      if (!enemy) {
        // 새 적 생성
        const config = getEnemyConfig(enemyState.typeId);
        if (!config) {
          console.error(`Unknown enemy type: ${enemyState.typeId}`);
          continue;
        }
        enemy = new Enemy(enemyState.id, config, this.assetLoader);
        this.enemies.set(enemyState.id, enemy);
      }

      // 서버 데이터로 상태 업데이트
      enemy.updateFromServer(enemyState);
    }
  }

  /**
   * 이펙트 업데이트
   */
  private updateEffects(
    effectStates: { id: string; type: string; x: number }[]
  ): void {
    // 기존 이펙트 ID 추출
    const existingEffectIds = new Set(
      this.activeEffects.map((e) => (e as any).id).filter(Boolean)
    );

    // 새로운 이펙트 생성
    for (const effectState of effectStates) {
      if (!existingEffectIds.has(effectState.id)) {
        // x: 정규화된 좌표(0~1)를 픽셀로 변환
        // y: 화면 하단 60% 지점으로 고정
        const pixelX = effectState.x * window.innerWidth;
        const fixedY = window.innerHeight * 0.6;
        
        const effect = this.createEffect(
          effectState.type,
          pixelX,
          fixedY
        );
        if (effect) {
          (effect as any).id = effectState.id; // ID 태깅
          this.activeEffects.push(effect);
          console.log(`✨ 이펙트 생성: ${effectState.type} at (${pixelX.toFixed(0)}, ${fixedY.toFixed(0)})`);
        }
      }
    }
  }

  /**
   * 이펙트 생성
   */
  private createEffect(
    effectType: string,
    x: number,
    y: number
  ): Effect | null {
    const vfxData = this.assetLoader.getVFXWithMetadata(effectType);
    if (!vfxData) {
      console.warn(`이펙트 "${effectType}"을 찾을 수 없습니다.`);
      return null;
    }

    return new Effect(x, y, vfxData.image, vfxData.metadata);
  }

  /**
   * 애니메이션 업데이트 (이펙트만)
   */
  private updateAnimations(deltaTime: number): void {
    // 시선 커서 스무딩
    this.gazeCursor.update();

    // 이펙트 업데이트
    for (const effect of this.activeEffects) {
      effect.update(deltaTime);
    }

    // 완료된 이펙트 제거
    this.activeEffects = this.activeEffects.filter(
      (effect) => !effect.isComplete()
    );
  }

  /**
   * 렌더링
   */
  private render(): void {
    const ctx = this.renderer.getGameContext();
    if (!ctx) return;

    // 캔버스 클리어
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 1. 적 그리기 (latestGameState.enemies 기반)
    for (const enemy of this.enemies.values()) {
      enemy.draw(ctx);
    }

    // 2. 이펙트 그리기
    for (const effect of this.activeEffects) {
      effect.draw(ctx);
    }

    // 3. 시선 커서 그리기
    this.gazeCursor.draw(ctx);

    // 4. UI 그리기 (디버그)
    this.drawUI(ctx);
  }

  /**
   * UI 그리기 (서버 데이터 표시)
   */
  private drawUI(ctx: CanvasRenderingContext2D): void {
    const enemyCount = this.enemies.size;
    const gold = this.latestGameState.playerGold || 0;
    const score = this.latestGameState.playerScore || 0;
    const wave = this.latestGameState.waveNumber || 1;

    // HTML UI 요소 업데이트
    this.updateHTMLUI(score, wave, gold, enemyCount);

    // 캔버스 디버그 텍스트 (우측 하단)
    ctx.fillStyle = "white";
    ctx.font = "16px Arial";
    ctx.textAlign = "right";
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;

    // const drawTextWithOutline = (text: string, x: number, y: number) => {
    //   ctx.strokeText(text, x, y);
    //   ctx.fillText(text, x, y);
    // };

    // const rightX = ctx.canvas.width - 20;
    // drawTextWithOutline(
    //   `FPS: ${Math.round(1000 / (performance.now() - this.lastUpdateTime))}`,
    //   rightX,
    //   ctx.canvas.height - 60
    // );
    // drawTextWithOutline(
    //   `Effects: ${this.activeEffects.length}`,
    //   rightX,
    //   ctx.canvas.height - 40
    // );
    // drawTextWithOutline(
    //   `Enemies: ${enemyCount}`,
    //   rightX,
    //   ctx.canvas.height - 20
    // );
  }

  /**
   * HTML UI 요소 업데이트
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

    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    if (waveEl) waveEl.textContent = `Wave: ${wave}`;
    if (goldEl) goldEl.textContent = `Gold: ${gold}`;
    if (enemiesEl) enemiesEl.textContent = `Enemies: ${enemyCount}`;
  }

  /**
   * 게임 중지
   */
  public stop(): void {
    this.isRunning = false;
    console.log("⏹️ 게임 중지");
  }

  /**
   * 게임 상태 getter
   */
  public getIsRunning(): boolean {
    return this.isRunning;
  }

  public getLatestGameState(): GameStateData {
    return this.latestGameState;
  }
}
