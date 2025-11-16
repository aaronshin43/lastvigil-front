/**
 * Renderer.ts
 * 60fps requestAnimationFrame 루프, 캔버스 초기화/그리기 총괄
 */

import type { Effect } from "../gameplay/Effect";
import type { GazeCursor } from "../gameplay/GazeCursor";
import type { Camera } from "./Camera";
import type { AssetLoader } from "./AssetLoader";
import { WIZARD_SPRITES } from "../gameplay/WizardTypes";

export interface RendererConfig {
  backgroundCanvasId: string;
  gameCanvasId: string;
  backgroundColor?: string;
  camera: Camera;
  assetLoader: AssetLoader;
}

export class Renderer {
  private backgroundCanvas: HTMLCanvasElement;
  private backgroundCtx: CanvasRenderingContext2D;
  private gameCanvas: HTMLCanvasElement;
  private gameCtx: CanvasRenderingContext2D;
  private camera: Camera;
  private assetLoader: AssetLoader;

  private backgroundColor: string;
  private isRunning: boolean = false;
  private animationFrameId: number | null = null;
  private lastFrameTime: number = 0;

  // 배경 이미지
  private backgroundImage: HTMLImageElement | null = null;

  // Witch 상태 (고정 위치, HP만 서버로부터 받음)
  private witchX: number = 0.01; // 정규화된 x 좌표 (고정값)
  private witchY: number = 0.8; // 정규화된 y 좌표 (고정값)
  private witchHP: number = 100; // 현재 HP
  private witchMaxHP: number = 100; // 최대 HP
  private witchIsDead: boolean = false;

  // Wizard 애니메이션 상태
  private wizardCurrentFrame: number = 0;
  private wizardElapsedTime: number = 0;
  private wizardAnimationState: "idle" | "hurt" | "attack" | "attack2" = "idle";
  private previousWitchHP: number = 100; // HP 변화 감지용

  // 렌더링할 객체들 (외부에서 주입)
  private effects: Effect[] = [];
  private gazeCursor: GazeCursor | null = null;

  constructor(config: RendererConfig) {
    // 배경 캔버스 초기화
    this.backgroundCanvas = document.getElementById(
      config.backgroundCanvasId
    ) as HTMLCanvasElement;
    if (!this.backgroundCanvas) {
      throw new Error(
        `Canvas with id "${config.backgroundCanvasId}" not found`
      );
    }
    this.backgroundCtx = this.backgroundCanvas.getContext("2d")!;

    // 게임 객체 캔버스 초기화
    this.gameCanvas = document.getElementById(
      config.gameCanvasId
    ) as HTMLCanvasElement;
    if (!this.gameCanvas) {
      throw new Error(`Canvas with id "${config.gameCanvasId}" not found`);
    }
    this.gameCtx = this.gameCanvas.getContext("2d")!;

    this.backgroundColor = config.backgroundColor || "#000000";
    this.camera = config.camera;
    this.assetLoader = config.assetLoader;

    // 캠버스 크기 설정
    this.resizeCanvases();

    // 윈도우 리사이즈 이벤트
    window.addEventListener("resize", () => this.resizeCanvases());
  }

  /**
   * 캔버스 크기를 윈도우 크기에 맞추기
   */
  private resizeCanvases(): void {
    const width = window.innerWidth;
    const height = window.innerHeight;

    this.backgroundCanvas.width = width;
    this.backgroundCanvas.height = height;
    this.gameCanvas.width = width;
    this.gameCanvas.height = height;

    // 배경 다시 그리기
    if (this.backgroundImage) {
      this.drawBackground();
    }
  }

  /**
   * 배경 이미지 설정
   */
  setBackgroundImage(image: HTMLImageElement): void {
    this.backgroundImage = image;
    this.drawBackground();
  }

  /**
   * Witch HP 업데이트 (서버로부터 받음, 위치는 고정)
   */
  updateWitchHP(currentHP: number, maxHP: number, isDead: boolean): void {
    // HP가 감소하면 hurt 애니메이션 실행
    if (currentHP < this.previousWitchHP && currentHP > 0) {
      this.wizardAnimationState = "hurt";
      this.wizardCurrentFrame = 0;
      this.wizardElapsedTime = 0;
      console.log("💥 플레이어 피격!");
    }
    
    this.previousWitchHP = currentHP;
    this.witchHP = currentHP;
    this.witchMaxHP = maxHP;
    this.witchIsDead = isDead;
  }

  /**
   * 공격 애니메이션 실행 (attack 또는 attack2 랜덤 선택)
   */
  playAttackAnimation(): void {
    // 이미 공격 중이거나 hurt 애니메이션 중이면 무시
    if (this.wizardAnimationState === "attack" || 
        this.wizardAnimationState === "attack2" ||
        this.wizardAnimationState === "hurt") {
      return;
    }

    // 랜덤으로 attack 또는 attack2 선택
    const attackType = Math.random() < 0.5 ? "attack" : "attack2";
    this.wizardAnimationState = attackType;
    this.wizardCurrentFrame = 0;
    this.wizardElapsedTime = 0;
    console.log(`⚔️ 공격 애니메이션 실행: ${attackType}`);
  }

  /**
   * 배경 다시 그리기 (외부에서 호출 가능)
   */
  public redrawBackground(deltaTime?: number): void {
    // Wizard 애니메이션 업데이트
    if (deltaTime !== undefined) {
      this.updateWizardAnimation(deltaTime);
    }
    this.drawBackground();
  }

  /**
   * 배경 이미지 그리기 (Camera 기반)
   */
  private drawBackground(): void {
    this.backgroundCtx.clearRect(
      0,
      0,
      this.backgroundCanvas.width,
      this.backgroundCanvas.height
    );

    if (
      !this.backgroundImage ||
      !this.backgroundImage.complete ||
      this.backgroundImage.naturalWidth === 0
    ) {
      // 이미지가 없으면 단색 배경
      this.backgroundCtx.fillStyle = this.backgroundColor;
      this.backgroundCtx.fillRect(
        0,
        0,
        this.backgroundCanvas.width,
        this.backgroundCanvas.height
      );
      return;
    }

    // 배경 이미지를 월드 크기에 맞춰 그리기
    const worldWidth = this.camera.getWorldWidth();
    const viewportHeight = this.backgroundCanvas.height;

    // 화면을 꽉 채우도록 설정
    const imageWidth = worldWidth;
    const imageHeight = viewportHeight; // 화면 높이에 맞춤 (종횡비 무시)

    // 카메라 오프셋 적용 (배경이 월드와 함께 스크롤)
    const cameraOffset = -this.camera.getOffsetX();

    this.backgroundCtx.drawImage(
      this.backgroundImage,
      cameraOffset,
      0, // yOffset 제거, 상단부터 그리기
      imageWidth,
      imageHeight
    );

    // Wizard 그리기 (서버에서 받은 witch 좌표 사용)
    const wizardImage = this.assetLoader.getWizard(this.wizardAnimationState);
    if (
      wizardImage &&
      wizardImage.complete &&
      wizardImage.naturalWidth > 0 &&
      !this.witchIsDead
    ) {
      const currentConfig = WIZARD_SPRITES[this.wizardAnimationState];
      const drawWidth = currentConfig.frameWidth * currentConfig.scale;
      const drawHeight = currentConfig.frameHeight * currentConfig.scale;

      // 서버로부터 받은 정규화된 좌표를 화면 좌표로 변환
      const worldWidth = this.camera.getWorldWidth();
      const worldX = this.witchX * worldWidth;
      const worldY = this.witchY * viewportHeight;

      // 월드 좌표를 화면 좌표로 변환 (카메라 오프셋 적용)
      const wizardX = worldX + cameraOffset;
      const wizardY = worldY - drawHeight / 2; // 중심 정렬

      // 현재 프레임의 소스 좌표 계산
      const srcX = this.wizardCurrentFrame * currentConfig.frameWidth;
      const srcY = 0;

      this.backgroundCtx.drawImage(
        wizardImage,
        srcX,
        srcY,
        currentConfig.frameWidth,
        currentConfig.frameHeight,
        wizardX,
        wizardY,
        drawWidth,
        drawHeight
      );

      // HP 바 그리기
      this.drawWitchHealthBar(wizardX, wizardY, drawWidth);
    }
  }

  /**
   * Witch HP 바 그리기 (픽셀 아트 스타일)
   */
  private drawWitchHealthBar(x: number, y: number, width: number): void {
    // 픽셀 아트 스타일 설정
    this.backgroundCtx.imageSmoothingEnabled = false;

    const segmentWidth = 20; // 각 세그먼트 너비
    const segmentHeight = 18; // 세그먼트 높이
    const segmentGap = 2; // 세그먼트 간격
    const numSegments = 10; // 총 세그먼트 수 (10칸)
    const hpPerSegment = 10; // 각 칸당 HP
    const totalWidth = numSegments * (segmentWidth + segmentGap);

    const barX = x + (width - totalWidth) / 2;
    const barY = y + 225; // Witch 위쪽에 표시

    // 채워진 세그먼트 수 계산 (각 칸당 10 HP)
    const filledSegments = Math.floor(this.witchHP / hpPerSegment);
    const partialSegment = (this.witchHP % hpPerSegment) / hpPerSegment;
    const hpRatio = Math.max(0, this.witchHP / this.witchMaxHP);

    // 하트 아이콘 그리기 (픽셀 스타일)
    const heartX = barX - 22;
    const heartY = barY + 1;
    this.drawPixelHeart(heartX, heartY, hpRatio);

    // 각 세그먼트 그리기
    for (let i = 0; i < numSegments; i++) {
      const segX = barX + i * (segmentWidth + segmentGap);

      let fillAmount = 0;
      if (i < filledSegments) {
        fillAmount = 1; // 완전히 채워짐
      } else if (i === filledSegments && partialSegment > 0) {
        fillAmount = partialSegment; // 부분적으로 채워짐
      }

      this.drawHPSegment(
        segX,
        barY,
        segmentWidth,
        segmentHeight,
        fillAmount,
        hpRatio
      );
    }

    this.backgroundCtx.imageSmoothingEnabled = true;
  }

  /**
   * HP 세그먼트 하나 그리기 (픽셀 아트 스타일)
   */
  private drawHPSegment(
    x: number,
    y: number,
    width: number,
    height: number,
    fillAmount: number,
    hpRatio: number
  ): void {
    // 외곽 테두리 (검은색, 2픽셀)
    this.backgroundCtx.fillStyle = "#000000";
    this.backgroundCtx.fillRect(x, y, width, height);

    // 내부 영역
    const innerX = x + 2;
    const innerY = y + 2;
    const innerWidth = width - 4;
    const innerHeight = height - 4;

    if (fillAmount > 0) {
      // HP 색상 결정
      let mainColor, lightColor, darkColor;
      if (hpRatio > 0.6) {
        // 초록색 계열
        mainColor = "#ff5555"; // 밝은 빨강
        lightColor = "#ffaaaa"; // 매우 밝은 빨강 (상단 하이라이트)
        darkColor = "#cc3333"; // 어두운 빨강 (하단 음영)
      } else if (hpRatio > 0.3) {
        // 노란색 계열
        mainColor = "#ff5555";
        lightColor = "#ffaaaa";
        darkColor = "#cc3333";
      } else {
        // 빨간색 계열
        mainColor = "#ff5555";
        lightColor = "#ffaaaa";
        darkColor = "#cc3333";
      }

      // 부분적으로 채워진 경우 너비 조정
      const fillWidth = innerWidth * fillAmount;

      // 메인 색상 (대부분의 영역)
      this.backgroundCtx.fillStyle = mainColor;
      this.backgroundCtx.fillRect(innerX, innerY, fillWidth, innerHeight);

      // 상단 하이라이트 (밝은 색, 2-3픽셀)
      this.backgroundCtx.fillStyle = lightColor;
      this.backgroundCtx.fillRect(innerX, innerY, fillWidth, 3);

      // 하단 음영 (어두운 색, 2픽셀)
      this.backgroundCtx.fillStyle = darkColor;
      this.backgroundCtx.fillRect(
        innerX,
        innerY + innerHeight - 2,
        fillWidth,
        2
      );

      // 빈 부분이 있으면 채우기
      if (fillAmount < 1) {
        const emptyDark = "#3d3d5c";
        const emptyLight = "#5a5a7a";
        const emptyX = innerX + fillWidth;
        const emptyWidth = innerWidth - fillWidth;

        this.backgroundCtx.fillStyle = emptyDark;
        this.backgroundCtx.fillRect(emptyX, innerY, emptyWidth, innerHeight);

        this.backgroundCtx.fillStyle = emptyLight;
        this.backgroundCtx.fillRect(emptyX, innerY, emptyWidth, 2);
      }
    } else {
      // 완전히 빈 세그먼트 (어두운 회색)
      const emptyDark = "#3d3d5c"; // 어두운 보라빛 회색
      const emptyLight = "#5a5a7a"; // 밝은 보라빛 회색 (하이라이트)

      this.backgroundCtx.fillStyle = emptyDark;
      this.backgroundCtx.fillRect(innerX, innerY, innerWidth, innerHeight);

      // 상단 하이라이트
      this.backgroundCtx.fillStyle = emptyLight;
      this.backgroundCtx.fillRect(innerX, innerY, innerWidth, 2);
    }
  }

  /**
   * 픽셀 하트 아이콘 그리기
   */
  private drawPixelHeart(x: number, y: number, hpRatio: number): void {
    const pixelSize = 2;

    // 하트 픽셀 패턴 (8x7)
    const heartPattern = [
      [0, 1, 1, 0, 0, 1, 1, 0],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [1, 1, 1, 1, 1, 1, 1, 1],
      [0, 1, 1, 1, 1, 1, 1, 0],
      [0, 0, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0, 0],
    ];

    // 하트 색상 결정
    let heartColor;
    if (hpRatio > 0.6) {
      heartColor = "#ff3366"; // 밝은 핑크-레드
    } else if (hpRatio > 0.3) {
      heartColor = "#ff3366"; // 밝은 핑크-레드
    } else if (hpRatio > 0) {
      heartColor = "#ff3366"; // 밝은 핑크-레드
    } else {
      heartColor = "#666666"; // 회색 (죽음)
    }

    for (let row = 0; row < heartPattern.length; row++) {
      for (let col = 0; col < heartPattern[row].length; col++) {
        if (heartPattern[row][col] === 1) {
          // 메인 하트 색상
          this.backgroundCtx.fillStyle = heartColor;
          this.backgroundCtx.fillRect(
            x + col * pixelSize,
            y + row * pixelSize,
            pixelSize,
            pixelSize
          );
        }
      }
    }
  }

  /**
   * 렌더링할 이펙트 배열 설정
   */
  setEffects(effects: Effect[]): void {
    this.effects = effects;
  }

  /**
   * Witch 상태 getter
   */
  getWitchState(): {
    hp: number;
    maxHP: number;
    isDead: boolean;
  } {
    return {
      hp: this.witchHP,
      maxHP: this.witchMaxHP,
      isDead: this.witchIsDead,
    };
  }

  /**
   * 시선 커서 설정
   */
  setGazeCursor(cursor: GazeCursor): void {
    this.gazeCursor = cursor;
  }

  /**
   * 게임 캔버스 클리어
   */
  clear(): void {
    this.gameCtx.clearRect(0, 0, this.gameCanvas.width, this.gameCanvas.height);
  }

  /**
   * 렌더링 루프 시작
   */
  start(): void {
    if (this.isRunning) {
      console.warn("Renderer is already running");
      return;
    }

    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.animate();
    console.log("Renderer started");
  }

  /**
   * 렌더링 루프 중지
   */
  stop(): void {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    console.log("Renderer stopped");
  }

  /**
   * 메인 애니메이션 루프 (60fps)
   */
  private animate = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    this.lastFrameTime = now;

    // Wizard 애니메이션 업데이트
    this.updateWizardAnimation(deltaTime);

    // 배경 다시 그리기 (카메라 이동 반영)
    this.drawBackground();

    // 게임 캔버스 클리어
    this.clear();

    // 시선 커서 업데이트 및 그리기
    if (this.gazeCursor) {
      this.gazeCursor.update();
      this.gazeCursor.draw(this.gameCtx);
    }

    // 이펙트 업데이트 및 그리기
    for (let i = this.effects.length - 1; i >= 0; i--) {
      const effect = this.effects[i];
      effect.update(deltaTime);
      effect.draw(this.gameCtx, this.camera);

      // 완료된 이펙트 제거
      if (effect.isComplete()) {
        this.effects.splice(i, 1);
      }
    }

    // 다음 프레임 요청
    this.animationFrameId = requestAnimationFrame(this.animate);
  };

  /**
   * Wizard 애니메이션 프레임 업데이트
   */
  private updateWizardAnimation(deltaTime: number): void {
    const currentConfig = WIZARD_SPRITES[this.wizardAnimationState];
    this.wizardElapsedTime += deltaTime;

    if (this.wizardElapsedTime >= currentConfig.frameDuration) {
      this.wizardElapsedTime -= currentConfig.frameDuration;
      this.wizardCurrentFrame++;
      
      // hurt 애니메이션이 끝나면 idle로 복귀
      if (this.wizardAnimationState === "hurt") {
        if (this.wizardCurrentFrame >= WIZARD_SPRITES.hurt.frameCount) {
          this.wizardAnimationState = "idle";
          this.wizardCurrentFrame = 0;
        }
      }
      // attack 애니메이션이 끝나면 idle로 복귀
      else if (this.wizardAnimationState === "attack") {
        if (this.wizardCurrentFrame >= WIZARD_SPRITES.attack.frameCount) {
          this.wizardAnimationState = "idle";
          this.wizardCurrentFrame = 0;
        }
      }
      // attack2 애니메이션이 끝나면 idle로 복귀
      else if (this.wizardAnimationState === "attack2") {
        if (this.wizardCurrentFrame >= WIZARD_SPRITES.attack2.frameCount) {
          this.wizardAnimationState = "idle";
          this.wizardCurrentFrame = 0;
        }
      }
      else {
        // idle 애니메이션 루프
        this.wizardCurrentFrame = this.wizardCurrentFrame % currentConfig.frameCount;
      }
    }
  }

  /**
   * 캔버스 크기 반환
   */
  getCanvasSize(): { width: number; height: number } {
    return {
      width: this.gameCanvas.width,
      height: this.gameCanvas.height,
    };
  }

  /**
   * 현재 FPS 계산 (디버그용)
   */
  getFPS(): number {
    const now = performance.now();
    const deltaTime = now - this.lastFrameTime;
    return deltaTime > 0 ? 1000 / deltaTime : 0;
  }

  /**
   * 게임 컨텍스트 가져오기
   */
  getGameContext(): CanvasRenderingContext2D {
    return this.gameCtx;
  }

  /**
   * 정리 (메모리 해제)
   */
  dispose(): void {
    this.stop();
    window.removeEventListener("resize", () => this.resizeCanvases());
    this.effects = [];
    this.gazeCursor = null;
    this.backgroundImage = null;
  }
}
