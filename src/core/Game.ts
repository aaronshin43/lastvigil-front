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
import { Player } from "../gameplay/Player";
import type { Camera } from "./Camera";

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
  playerHP?: number; // 플레이어 HP
  playerGold?: number;
  playerScore?: number;
  waveNumber?: number;
}

export interface GameConfig {
  assetLoader: AssetLoader;
  renderer: Renderer;
  gazeCursor: GazeCursor;
  camera: Camera;
}

export class Game {
  private assetLoader: AssetLoader;
  private renderer: Renderer;
  private gazeCursor: GazeCursor;
  private camera: Camera;

  // 렌더링할 객체들 (서버 데이터 기반)
  private enemies: Map<string, Enemy> = new Map();
  private activeEffects: Effect[] = [];
  private player: Player;

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
    this.camera = config.camera;

    // 플레이어 초기화
    this.player = new Player(this.assetLoader);
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

    // 2. 렌더링 (deltaTime 전달)
    this.render(deltaTime);

    requestAnimationFrame(this.gameLoop);
  };

  /**
   * 서버로부터 게임 상태 업데이트 받기
   * WebSocket에서 이 메서드를 호출함
   */
  public updateGameState(state: GameStateData): void {
    this.latestGameState = state;

    // 시선 위치는 main.ts의 processServerData()에서 처리하므로 여기서는 제거

    // 플레이어 HP 업데이트
    if (state.playerHP !== undefined) {
      const maxHP = 100;
      this.player.updateHP(state.playerHP, maxHP);

      // Renderer의 Witch HP도 업데이트 (UI용)
      const isDead = state.playerHP <= 0;
      this.renderer.updateWitchHP(state.playerHP, maxHP, isDead);
    }

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

    // console.log(`👾 Enemy update: ${enemyStates.length} enemies from server, ${this.enemies.size} in game`);

    // 서버에서 제거된 적 삭제
    for (const id of this.enemies.keys()) {
      if (!currentEnemyIds.has(id)) {
        // console.log(`❌ Enemy removed: ${id}`);
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
        // console.log(`✨ Enemy created: ${enemyState.id}, type=${enemyState.typeId}, x=${enemyState.x.toFixed(3)}, y=${enemyState.y.toFixed(3)}`);
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
    console.log(`🎨 이펙트 업데이트: ${effectStates.length}개 수신, 현재 ${this.activeEffects.length}개 활성`);
    
    // 기존 이펙트 ID 추출
    const existingEffectIds = new Set(
      this.activeEffects.map((e) => (e as any).id).filter(Boolean)
    );

    // 새로운 이펙트 생성
    for (const effectState of effectStates) {
      console.log(`🔍 이펙트 체크: id=${effectState.id}, type=${effectState.type}, x=${effectState.x}, exists=${existingEffectIds.has(effectState.id)}`);
      
      if (!existingEffectIds.has(effectState.id)) {
        // x: 정규화된 좌표(0~1)를 월드 좌표로 변환
        const WORLD_WIDTH = 2148; // 백엔드 맵 크기
        const worldX = effectState.x * WORLD_WIDTH;

        // y: VFX 메타데이터의 yOffset 적용 (기본 0.7)
        const vfxMetadata = this.assetLoader.getVFXMetadata(effectState.type);
        const baseY = 0.7; // 기본 y 위치 (화면 높이의 70%)
        const yPosition =
          vfxMetadata?.yOffset !== undefined
            ? baseY + vfxMetadata.yOffset
            : baseY;
        const fixedY = window.innerHeight * yPosition;

        const effect = this.createEffect(effectState.type, worldX, fixedY);
        if (effect) {
          (effect as any).id = effectState.id; // ID 태깅
          this.activeEffects.push(effect);
          console.log(
            `✨ 이펙트 생성: ${effectState.type} at world(${worldX.toFixed(
              0
            )}, ${fixedY.toFixed(0)})`
          );
        } else {
          console.error(`❌ 이펙트 생성 실패: ${effectState.type}`);
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
    this.gazeCursor.update(deltaTime);

    // 플레이어 애니메이션 업데이트
    this.player.update(deltaTime);

    // 적 애니메이션 업데이트
    for (const enemy of this.enemies.values()) {
      enemy.updateAnimation(deltaTime);
    }

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
  private render(deltaTime: number): void {
    // 0. 배경 그리기 (카메라 오프셋 반영, Castle 애니메이션 업데이트)
    this.renderer.redrawBackground(deltaTime);

    const ctx = this.renderer.getGameContext();
    if (!ctx) return;

    // 캠버스 클리어
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

    // 1. 적 그리기 (latestGameState.enemies 기반)
    let drawnEnemies = 0;
    for (const enemy of this.enemies.values()) {
      enemy.draw(ctx, this.camera);
      drawnEnemies++;
    }

    // if (drawnEnemies > 0) {
    //   console.log(`👾 Drew ${drawnEnemies} enemies | camera offset: ${this.camera.getOffsetX().toFixed(0)}`);
    // }

    // 2. 이펙트 그리기
    for (const effect of this.activeEffects) {
      effect.draw(ctx, this.camera);
    }

    // 3. 플레이어는 Renderer의 배경 레이어에서 그려짐 (중복 방지)
    // this.player.draw(ctx, this.camera);

    // 4. 시선 커서 그리기
    this.gazeCursor.draw(ctx);

    // 5. UI 그리기 (디버그)
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
    const witchHPEl = document.getElementById("witch-hp");

    if (scoreEl) scoreEl.textContent = `Score: ${score}`;
    if (waveEl) waveEl.textContent = `Wave: ${wave}`;
    if (goldEl) goldEl.textContent = `Gold: ${gold}`;
    if (enemiesEl) enemiesEl.textContent = `Enemies: ${enemyCount}`;

    // Witch HP 업데이트
    const witchState = this.renderer.getWitchState();
    if (witchHPEl) {
      const hpPercent = Math.round((witchState.hp / witchState.maxHP) * 100);
      witchHPEl.textContent = `HP: ${witchState.hp}/${witchState.maxHP} (${hpPercent}%)`;

      // HP에 따라 색상 변경
      if (hpPercent > 50) {
        witchHPEl.style.color = "#00FF00"; // 초록색
      } else if (hpPercent > 25) {
        witchHPEl.style.color = "#FFA500"; // 주황색
      } else {
        witchHPEl.style.color = "#FF0000"; // 빨간색
      }
    }
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
