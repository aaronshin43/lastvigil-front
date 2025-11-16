/**
 * main.ts
 * 모든 모듈을 초기화하고 AssetLoader 실행, 로딩 후 Game 시작
 */

import { AssetLoader } from "./core/AssetLoader";
import { Renderer } from "./core/Renderer";
import { GazeCursor } from "./gameplay/GazeCursor";
import { Game } from "./core/Game";
import { Network } from "./services/Network";

// 전역 상태 관리
let assetLoader: AssetLoader;
let renderer: Renderer;
let gazeCursor: GazeCursor;
let game: Game;
let network: Network;

// 웹캠 관리
let webcamActive = false;
let webcamStream: MediaStream | null = null;
let sendInterval: number | null = null;

// 맵 스크롤 관리
let edgeHoldStartTime = 0;
const EDGE_HOLD_THRESHOLD = 300; // 0.3초
const EDGE_THRESHOLD = 0.1; // 화면 10% 이내
const SCROLL_SPEED = 20;

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

    // 2. Renderer 초기화
    renderer = new Renderer({
      backgroundCanvasId: "background-canvas",
      gameCanvasId: "circle-canvas",
    });
    console.log("🎨 렌더러 초기화 완료");

    // 3. 배경 이미지 설정
    const backgroundImage = assetLoader.getMap("graveyardFinal");
    if (backgroundImage) {
      renderer.setBackgroundImage(backgroundImage);
    }

    // 4. GazeCursor 초기화
    gazeCursor = new GazeCursor({
      radius: 55,
      chaseSpeed: 0.08,
      initialX: window.innerWidth / 2,
      initialY: window.innerHeight / 2,
    });

    // 5. Game 초기화
    game = new Game({
      assetLoader,
      renderer,
      gazeCursor,
    });

    // 6. Network (WebSocket) 초기화
    initNetwork();

    // 7. UI 이벤트 리스너 설정
    setupUIEvents();

    // 8. 게임 시작 (렌더링 루프)
    game.start();

    // 9. 맵 스크롤 로직 시작
    startScrollLoop();

    console.log("🚀 게임 시작!");
  } catch (error) {
    console.error("❌ 초기화 실패:", error);
    alert("게임 초기화에 실패했습니다. 콘솔을 확인하세요.");
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
  // 1. 시선 데이터 처리 - 서버에서 정규화된 좌표 수신
  if (response.gaze) {
    const { gaze_x, gaze_y } = response.gaze;

    // 화면 좌표로 변환
    const targetX = gaze_x * window.innerWidth;
    const targetY = gaze_y * window.innerHeight;

    // GazeCursor 업데이트 (clampToBounds는 GazeCursor 내부에서 처리)
    gazeCursor.setTarget(targetX, targetY);
  }

  // 2. 제스처 데이터 처리
  if (response.hand === "DETECTED" && response.gesture) {
    console.log(`✋ 제스처 감지: ${response.gesture}`);

    // 제스처 → 스킬 매핑
    const skillMapping: { [key: string]: string } = {
      A: "fireSlash",
      C: "iceBlast",
      L: "lightningBolt",
      S: "shadowStrike",
    };

    const skillType = skillMapping[response.gesture];
    if (skillType) {
      console.log(`🔥 스킬 발동: ${skillType}`);
      // 서버가 이미 스킬 발동을 처리하므로 여기서는 로그만
      // 실제 이펙트는 gameState.effects에 포함되어 렌더링됨
    }
  }

  // 3. ✨ 게임 상태 데이터 처리 (20fps로 업데이트)
  if (response.gameState) {
    // console.log(`🎮 게임 상태 업데이트:`, {
    //   enemies: response.gameState.enemies?.length || 0,
    //   effects: response.gameState.effects?.length || 0,
    //   effectsData: response.gameState.effects, // 🔍 이펙트 데이터 상세 확인
    //   score: response.gameState.playerScore,
    //   wave: response.gameState.waveNumber,
    // });

    // Game 클래스에 전달하여 렌더링
    game.updateGameState(response.gameState);
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

  console.log("🎮 UI 이벤트 설정 중...", {
    webcamToggleBtn,
    effectTestBtn,
    effectSelector,
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
      console.log("현재 커서 위치:", pos);

      // 테스트용 이펙트를 게임 상태로 추가
      const testGameState = game.getLatestGameState();
      testGameState.effects.push({
        id: `test_${Date.now()}`,
        type: selectedEffect,
        x: pos.x,
        y: pos.y,
      });
      game.updateGameState(testGameState);
    });
  } else {
    console.error(
      "❌ effect-test-btn 버튼 또는 effect-selector를 찾을 수 없습니다."
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

  // 배경 오프셋 리셋
  renderer.setBackgroundOffset(0);
  edgeHoldStartTime = 0;
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
 * 맵 스크롤 로직
 */
function startScrollLoop() {
  setInterval(() => {
    const edgeDirection = gazeCursor.checkEdgeProximity(
      window.innerWidth,
      window.innerHeight,
      EDGE_THRESHOLD
    );

    const isAtLeftEdge = edgeDirection === "left";
    const isAtRightEdge = edgeDirection === "right";

    if (isAtLeftEdge || isAtRightEdge) {
      if (edgeHoldStartTime === 0) {
        edgeHoldStartTime = Date.now();
      }

      const holdDuration = Date.now() - edgeHoldStartTime;

      if (holdDuration >= EDGE_HOLD_THRESHOLD) {
        const currentOffset = renderer.getBackgroundOffset();

        // 최대 스크롤 계산
        const backgroundImage = assetLoader.getMap("graveyardFinal");
        if (backgroundImage && backgroundImage.complete) {
          const imageWidth =
            backgroundImage.naturalWidth *
            (window.innerHeight / backgroundImage.naturalHeight);
          const maxScroll = (imageWidth - window.innerWidth) / 2;

          if (maxScroll > 0) {
            if (isAtLeftEdge) {
              renderer.setBackgroundOffset(
                Math.min(currentOffset + SCROLL_SPEED, maxScroll)
              );
            } else if (isAtRightEdge) {
              renderer.setBackgroundOffset(
                Math.max(currentOffset - SCROLL_SPEED, -maxScroll)
              );
            }
          }
        }
      }
    } else {
      edgeHoldStartTime = 0;
    }
  }, 16); // ~60fps 체크
}

// 페이지 로드 시 초기화
window.addEventListener("DOMContentLoaded", init);
