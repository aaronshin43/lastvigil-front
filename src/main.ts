/**
 * main.ts
 * 모든 모듈을 초기화하고 AssetLoader 실행, 로딩 후 Game 시작
 */

import { AssetLoader } from "./core/AssetLoader";
import { Renderer } from "./core/Renderer";
import { GazeCursor } from "./gameplay/GazeCursor";
import { Game } from "./core/Game";
import { Network } from "./services/Network";
import { Camera } from "./core/Camera";
import { LandingScreen } from "./core/LandingScreen";
import { GameOverScreen } from "./core/GameOverScreen";

// 전역 상태 관리
let assetLoader: AssetLoader;
let renderer: Renderer;
let gazeCursor: GazeCursor;
let game: Game;
let network: Network;
let camera: Camera;
let landingScreen: LandingScreen;
let gameOverScreen: GameOverScreen;

// 웹캠 관리
let webcamActive = false;
let webcamStream: MediaStream | null = null;
let sendInterval: number | null = null;

// 맵 스크롤 관리
let edgeHoldStartTime = 0;
const EDGE_HOLD_THRESHOLD = 300; // 0.3초
const EDGE_THRESHOLD = 0.1; // 화면 10% 이내
const MIN_SCROLL_SPEED = 10; // 최소 스크롤 속도
const MAX_SCROLL_SPEED = 50; // 최대 스크롤 속도

/**
 * 애플리케이션 초기화
 */
async function init() {
  console.log("🎮 게임 초기화 시작...");

  try {
    // 1. AssetLoader 초기화 및 에셋 로드
    assetLoader = new AssetLoader();
    console.log("📦 에셋 로딩 중...");
    await assetLoader.loadAll();
    console.log("✅ 에셋 로딩 완료!");

    // 2. LandingScreen 초기화 및 표시
    landingScreen = new LandingScreen({
      canvasId: "landing-canvas",
      onStart: startGame,
    });
    
    const landingImages = {
      landing: assetLoader.getMap("landing")!,
      flourishOrnament: assetLoader.getMap("flourishOrnament")!,
      landingTitle: assetLoader.getMap("landingTitle")!,
      startButton: assetLoader.getMap("startButton")!,
    };
    
    landingScreen.setImages(landingImages);
    landingScreen.show();
    
    // 3. GameOverScreen 초기화
    gameOverScreen = new GameOverScreen({
      canvasId: "gameover-canvas",
      onRestart: () => {
        console.log("🔄 게임 재시작");
        // 페이지 새로고침으로 재시작
        window.location.reload();
      },
    });
    
    console.log("🎬 랜딩 화면 표시");
  } catch (error) {
    console.error("❌ 초기화 실패:", error);
    alert("게임 초기화에 실패했습니다. 콘솔을 확인하세요.");
  }
}

/**
 * 게임 시작 (랜딩 화면에서 Start 버튼 클릭 시)
 */
function startGame() {
  console.log("🚀 게임 시작!");
  
  // 랜딩 화면 숨기기
  landingScreen.hide();
  
  try {
    // 3. Camera 초기화
    camera = new Camera({
      worldWidth: 2148, // 백엔드 맵 크기
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    // 카메라를 맵 왼쪽 끝에서 시작 (적이 왼쪽에서 소환되도록)
    camera.setOffsetX(0);
    console.log("📹 카메라 초기화 완료");

    // 4. Renderer 초기화
    renderer = new Renderer({
      backgroundCanvasId: "background-canvas",
      gameCanvasId: "circle-canvas",
      camera: camera,
      assetLoader: assetLoader,
    });
    console.log("🎨 렌더러 초기화 완료");

    // 5. 배경 이미지 설정
    const backgroundImage = assetLoader.getMap("graveyard");
    if (backgroundImage) {
      renderer.setBackgroundImage(backgroundImage);
    }

    // 6. GazeCursor 초기화
    gazeCursor = new GazeCursor({
      radius: 55,
      chaseSpeed: 0.08,
      initialX: window.innerWidth / 2,
      initialY: window.innerHeight / 2,
    });

    // 7. Game 초기화
    game = new Game({
      assetLoader,
      renderer,
      gazeCursor,
      camera,
    });

    // 8. Network (WebSocket) 초기화
    initNetwork();

    // 9. UI 이벤트 리스너 설정
    setupUIEvents();

    // 10. 게임 시작 (렌더링 루프)
    game.start();

    // 11. 맵 스크롤 로직 시작
    startScrollLoop();

    console.log("✅ 게임 루프 시작 완료!");
  } catch (error) {
    console.error("❌ 게임 시작 실패:", error);
    alert("게임 시작에 실패했습니다. 콘솔을 확인하세요.");
  }
}

/**
 * Network (WebSocket) 초기화
 */
function initNetwork() {
  const serverUrl =
    import.meta.env.VITE_VULTR_SERVER_URL || "ws://localhost:8000/ws";
  console.log(`🌐 서버 URL: ${serverUrl}`);

  network = new Network({
    serverUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // 이벤트 핸들러 등록
  network.onOpen(() => {
    console.log("🔌 Vultr 서버에 연결되었습니다.");
  });

  network.onMessage((data) => {
    // 📡 백엔드 응답을 콘솔에 출력
    // console.log("=".repeat(80));
    // console.log("📡 백엔드 응답 수신:", new Date().toLocaleTimeString());
    // console.log("=".repeat(80));
    // console.log(JSON.stringify(data, null, 2));
    // console.log("=".repeat(80));

    // 서버 데이터를 Game에 전달
    processServerData(data);
  });

  network.onError((error) => {
    console.error("🔥 WebSocket 오류:", error);
  });

  network.onClose(() => {
    console.log("🔌 WebSocket 연결 종료");
  });

  // 연결 시작
  network.connect();
}

/**
 * 서버 데이터 처리
 */
function processServerData(response: any) {
  // 1. 시선 데이터 처리 - 백엔드에서 맵 전체 기준 정규화 좌표(0-1) 수신
  if (response.gaze) {
    const { gaze_x, gaze_y } = response.gaze;

    // 🔍 백엔드 원본 데이터 확인
    // console.log(`🔍 RAW backend gaze:`, response.gaze);

    // 정규화 좌표(0-1)를 월드/스크린 좌표로 변환
    const WORLD_WIDTH = 2148; // 백엔드 맵 크기
    const worldX = gaze_x * WORLD_WIDTH;
    const screenY = gaze_y * window.innerHeight;

    // 카메라를 통해 월드 X를 스크린 X로 변환
    const screenX = worldX - camera.getOffsetX();

    // console.log(`👁️ Gaze: norm(${gaze_x.toFixed(3)}, ${gaze_y.toFixed(3)}) → world(${worldX.toFixed(0)}, ${screenY.toFixed(0)}) → screen(${screenX.toFixed(0)}, ${screenY.toFixed(0)}) | cam: ${camera.getOffsetX().toFixed(0)}`);

    // GazeCursor 업데이트
    gazeCursor.setTarget(screenX, screenY);

    // 스크롤 트리거: 월드 좌표 기반으로 카메라 이동
    checkAndScrollCamera(worldX);
  }

  // 2. ✨ 게임 상태 데이터 처리 (20fps로 업데이트)
  if (response.gameState) {
    console.log(`🎮 게임 상태 업데이트:`, {
      enemies: response.gameState.enemies?.length || 0,
      effects: response.gameState.effects?.length || 0,
      effectsData: response.gameState.effects, // 🔍 이펙트 데이터 상세 확인
      score: response.gameState.playerScore,
      wave: response.gameState.waveNumber,
      HP: response.gameState.playerHP,
      gestureSequence: response.gameState.gestureSequence,
      gestureMatched: response.gameState.gestureMatched,
    });

    // 제스처 시퀀스 UI 업데이트
    const gestureSequenceElement = document.getElementById("gesture-sequence");
    if (gestureSequenceElement && response.gameState.gestureSequence) {
      gestureSequenceElement.textContent = response.gameState.gestureSequence;
    }

    // 제스처 시퀀스 매칭 성공 시 공격 애니메이션 실행
    if (response.gameState.gestureMatched === true) {
      console.log(`🔥 제스처 시퀀스 매칭 성공! 스킬 발동`);
      renderer.playAttackAnimation();
    }

    // Game 클래스에 전달하여 렌더링
    game.updateGameState(response.gameState);
  }

  // 3. 🎮 게임 오버 처리
  if (response.type === "gameOver") {
    console.log("💀 게임 오버!", {
      finalScore: response.finalScore,
      finalWave: response.finalWave,
    });
    
    // 게임 오버 화면 표시
    gameOverScreen.show(response.finalScore, response.finalWave);
    
    // 게임 루프 정지
    game.stop();
    
    // 웹캠 정지
    if (webcamActive) {
      stopWebcam();
    }
  }
}

/**
 * UI 이벤트 설정
 */
function setupUIEvents() {
  const webcamToggleBtn = document.getElementById(
    "webcam-toggle"
  ) as HTMLButtonElement;
  const effectTestBtn = document.getElementById(
    "effect-test-btn"
  ) as HTMLButtonElement;
  const effectSelector = document.getElementById(
    "effect-selector"
  ) as HTMLSelectElement;
  const skillGuideToggleBtn = document.getElementById(
    "skill-guide-toggle"
  ) as HTMLButtonElement;
  const allImage = document.getElementById("all-image") as HTMLImageElement;

  console.log("🎮 UI 이벤트 설정 중...", {
    webcamToggleBtn,
    effectTestBtn,
    effectSelector,
    skillGuideToggleBtn,
  });

  // 웹캠 토글
  if (webcamToggleBtn) {
    webcamToggleBtn.addEventListener("click", () => {
      console.log("웹캠 토글 클릭");
      if (webcamActive) {
        stopWebcam();
      } else {
        startWebcam();
      }
    });
  } else {
    console.error("❌ webcam-toggle 버튼을 찾을 수 없습니다.");
  }

  // 이펙트 테스트
  if (effectTestBtn && effectSelector) {
    effectTestBtn.addEventListener("click", () => {
      const selectedEffect = effectSelector.value;
      console.log(
        `🎆 이펙트 테스트 버튼 클릭! 선택된 이펙트: ${selectedEffect}`
      );
      const pos = gazeCursor.getPosition();
      // console.log("현재 커서 위치:", pos);

      // 테스트용 이펙트를 게임 상태로 추가
      // 백엔드와 동일한 형식: x는 정규화된 좌표 (0~1)
      const normalizedX = pos.x / window.innerWidth;

      const testGameState = game.getLatestGameState();
      testGameState.effects = [{
        id: `test_${Date.now()}`,
        type: selectedEffect,
        x: normalizedX, // 정규화된 x 좌표 (0.0~1.0)
      }];
      // console.log(`📍 스킬 발동 좌표: normalizedX=${normalizedX.toFixed(3)} (픽셀: ${pos.x.toFixed(0)})`);
      game.updateGameState(testGameState);
    });
  } else {
    console.error(
      "❌ effect-test-btn 버튼 또는 effect-selector를 찾을 수 없습니다."
    );
  }

  // 스킬 가이드 토글
  if (skillGuideToggleBtn && allImage) {
    skillGuideToggleBtn.addEventListener("click", () => {
      allImage.classList.toggle("visible");
      const isVisible = allImage.classList.contains("visible");
      skillGuideToggleBtn.textContent = isVisible
        ? "Hide Guide"
        : "Skill Guide";
      console.log(`📖 스킬 가이드 ${isVisible ? "표시" : "숨김"}`);
    });
  } else {
    console.error(
      "❌ skill-guide-toggle 버튼 또는 all-image를 찾을 수 없습니다."
    );
  }
}

/**
 * 웹캠 시작
 */
function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      webcamStream = stream;
      const video = document.getElementById("video") as HTMLVideoElement;
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        webcamActive = true;
        const btn = document.getElementById(
          "webcam-toggle"
        ) as HTMLButtonElement;
        btn.textContent = "Stop Webcam";
        btn.classList.add("active");

        // 프레임 전송 시작 (20fps)
        sendInterval = window.setInterval(() => {
          sendFrameToServer();
        }, 50);
      };
    })
    .catch((err) => {
      console.error("웹캠 오류:", err);
      alert("웹캠을 활성화할 수 없습니다.");
    });
}

/**
 * 웹캠 중지
 */
function stopWebcam() {
  if (webcamStream) {
    webcamStream.getTracks().forEach((track) => track.stop());
    webcamStream = null;
  }

  if (sendInterval !== null) {
    clearInterval(sendInterval);
    sendInterval = null;
  }

  const video = document.getElementById("video") as HTMLVideoElement;
  video.srcObject = null;

  webcamActive = false;
  const btn = document.getElementById("webcam-toggle") as HTMLButtonElement;
  btn.textContent = "Start Webcam";
  btn.classList.remove("active");

  // 커서 리셋
  gazeCursor.setPosition(window.innerWidth / 2, window.innerHeight / 2);

  // 카메라 오프셋은 유지 (스크롤 위치 유지)
  // camera.setOffsetX(0); // 주석 처리
  edgeHoldStartTime = 0;
  console.log("📹 Webcam stopped, camera position maintained");
}

/**
 * 프레임을 서버로 전송
 */
function sendFrameToServer() {
  if (!network.isConnected()) return;

  const video = document.getElementById("video") as HTMLVideoElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  const context = canvas.getContext("2d")!;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  network.send(dataUrl);
}

/**
 * 월드 좌표 기반 카메라 스크롤 체크
 */
function checkAndScrollCamera(worldX: number) {
  const WORLD_WIDTH = 2148; // 백엔드 맵 크기
  const cameraOffsetX = camera.getOffsetX();
  const viewportWidth = camera.getViewportWidth();

  // 현재 카메라가 보는 월드 영역
  const cameraLeft = cameraOffsetX;
  const cameraRight = cameraOffsetX + viewportWidth;

  // 스크롤 트리거 영역 (뷰포트의 10%)
  const scrollMargin = viewportWidth * EDGE_THRESHOLD;
  const leftScrollZone = cameraLeft + scrollMargin;
  const rightScrollZone = cameraRight - scrollMargin;

  const isInLeftZone = worldX < leftScrollZone;
  const isInRightZone = worldX > rightScrollZone;

  // 🔍 스크롤 존 디버깅 (진입 시만 로그)
  // const wasInZone = edgeHoldStartTime !== 0;
  // const nowInZone = isInLeftZone || isInRightZone;
  // if (nowInZone && !wasInZone) {
  //   console.log(`📹 Entering scroll zone: worldX=${worldX.toFixed(0)} | camera=[${cameraLeft.toFixed(0)}, ${cameraRight.toFixed(0)}] | zones=[${leftScrollZone.toFixed(0)}, ${rightScrollZone.toFixed(0)}] | ${isInLeftZone ? 'LEFT' : 'RIGHT'}`);
  // }

  if (isInLeftZone || isInRightZone) {
    if (edgeHoldStartTime === 0) {
      edgeHoldStartTime = Date.now();
      // console.log(`⏱️ Edge hold started`);
    }

    const holdDuration = Date.now() - edgeHoldStartTime;

    if (holdDuration >= EDGE_HOLD_THRESHOLD) {
      const maxOffset = WORLD_WIDTH - viewportWidth;

      // 동적 스크롤 속도 계산 (고개를 많이 돌릴수록 빠르게)
      let scrollSpeed: number;
      if (isInLeftZone) {
        // 왼쪽 존: leftScrollZone에 가까울수록 빠르게
        const distanceFromZoneEdge = leftScrollZone - worldX;
        const normalizedDistance = Math.min(
          distanceFromZoneEdge / scrollMargin,
          1
        );
        scrollSpeed =
          MIN_SCROLL_SPEED +
          (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * normalizedDistance;
      } else {
        // 오른쪽 존: rightScrollZone에서 멀수록 빠르게
        const distanceFromZoneEdge = worldX - rightScrollZone;
        const normalizedDistance = Math.min(
          distanceFromZoneEdge / scrollMargin,
          1
        );
        scrollSpeed =
          MIN_SCROLL_SPEED +
          (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * normalizedDistance;
      }

      // 카메라 이동
      if (isInLeftZone && cameraOffsetX > 0) {
        camera.moveX(-scrollSpeed); // 왼쪽으로 스크롤
        // console.log(`⬅️ Camera scroll LEFT: speed=${scrollSpeed.toFixed(1)}, offset=${camera.getOffsetX().toFixed(0)}`);
      } else if (isInRightZone && cameraOffsetX < maxOffset) {
        camera.moveX(scrollSpeed); // 오른쪽으로 스크롤
        // console.log(`➡️ Camera scroll RIGHT: speed=${scrollSpeed.toFixed(1)}, offset=${camera.getOffsetX().toFixed(0)}`);
      } // else {
      //   console.log(`🚫 Camera at boundary: offset=${cameraOffsetX.toFixed(0)}, max=${maxOffset.toFixed(0)}`);
      // }
    }
  } else {
    // if (edgeHoldStartTime !== 0) {
    //   console.log(`⏱️ Edge hold reset (was holding for ${Date.now() - edgeHoldStartTime}ms)`);
    // }
    edgeHoldStartTime = 0;
  }
}

/**
 * 맵 스크롤 로직 (더 이상 사용하지 않음 - gaze 데이터에서 직접 처리)
 */
function startScrollLoop() {
  // 스크롤은 이제 processServerData에서 gaze 좌표 기반으로 처리됨
}

// 페이지 로드 시 초기화
window.addEventListener("DOMContentLoaded", init);
