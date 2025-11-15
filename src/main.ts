/**
 * main.ts
 * 모든 모듈을 초기화하고 AssetLoader 실행, 로딩 후 Game 시작
 */

import { AssetLoader } from './core/AssetLoader';
import { Renderer } from './core/Renderer';
import { GazeCursor } from './gameplay/GazeCursor';
import { Effect } from './gameplay/Effect';
import { Network } from './services/Network';

// 전역 상태 관리
let assetLoader: AssetLoader;
let renderer: Renderer;
let gazeCursor: GazeCursor;
let network: Network;
let activeEffects: Effect[] = [];

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
  console.log('🎮 게임 초기화 시작...');

  try {
    // 1. AssetLoader 초기화 및 에셋 로드
    assetLoader = new AssetLoader();
    console.log('📦 에셋 로딩 중...');
    await assetLoader.loadAll();
    console.log('✅ 에셋 로딩 완료!');

    // 2. Renderer 초기화
    renderer = new Renderer({
      backgroundCanvasId: 'background-canvas',
      gameCanvasId: 'circle-canvas',
    });
    console.log('🎨 렌더러 초기화 완료');

    // 3. 배경 이미지 설정
    const backgroundImage = assetLoader.getMap('graveyardFinal');
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
    renderer.setGazeCursor(gazeCursor);

    // 5. 이펙트 배열 연결
    renderer.setEffects(activeEffects);

    // 6. Network (WebSocket) 초기화
    initNetwork();

    // 7. UI 이벤트 리스너 설정
    setupUIEvents();

    // 8. 렌더러 시작
    renderer.start();

    // 9. 맵 스크롤 로직 시작
    startScrollLoop();

    console.log('🚀 게임 시작!');
  } catch (error) {
    console.error('❌ 초기화 실패:', error);
    alert('게임 초기화에 실패했습니다. 콘솔을 확인하세요.');
  }
}

/**
 * Network (WebSocket) 초기화
 */
function initNetwork() {
  const serverUrl = import.meta.env.VITE_VULTR_SERVER_URL || 'ws://localhost:8000/ws';
  console.log(`🌐 서버 URL: ${serverUrl}`);

  network = new Network({
    serverUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // 이벤트 핸들러 등록
  network.onOpen(() => {
    console.log('🔌 Vultr 서버에 연결되었습니다.');
  });

  network.onMessage((data) => {
    processServerData(data);
  });

  network.onError((error) => {
    console.error('🔥 WebSocket 오류:', error);
  });

  network.onClose(() => {
    console.log('🔌 WebSocket 연결 종료');
  });

  // 연결 시작
  network.connect();
}

/**
 * 서버 데이터 처리
 */
function processServerData(response: any) {
  const data = response.face_key_points;

  if (
    data &&
    data.nose_tip &&
    data.chin &&
    data.forehead &&
    data.left_face &&
    data.right_face &&
    data.left_eye &&
    data.right_eye
  ) {
    const { nose_tip, chin, forehead, left_face, right_face, left_eye, right_eye } = data;

    // 얼굴 중심점 계산
    const face_center_x = (left_eye.x + right_eye.x) / 2;
    const face_center_y = (left_eye.y + right_eye.y) / 2;

    // Yaw (좌우 회전) 계산
    const left_distance = Math.abs(nose_tip.x - left_face.x);
    const right_distance = Math.abs(nose_tip.x - right_face.x);
    const face_width = Math.abs(right_face.x - left_face.x);

    let yaw_ratio = 0.0;
    if (face_width > 0) {
      yaw_ratio = (left_distance - right_distance) / face_width;
    }

    // Pitch (상하 회전) 계산
    const nose_to_forehead = Math.abs(nose_tip.y - forehead.y);
    const nose_to_chin = Math.abs(nose_tip.y - chin.y);
    const face_height = Math.abs(chin.y - forehead.y);

    let pitch_ratio = 0.0;
    if (face_height > 0) {
      pitch_ratio = (nose_to_chin - nose_to_forehead) / face_height + 0.15;
    }

    // 시선 좌표 매핑
    const gaze_scale_x = 1.5;
    const gaze_scale_y = 6.0;

    const gaze_x = face_center_x - yaw_ratio * gaze_scale_x;
    const gaze_y = face_center_y - pitch_ratio * gaze_scale_y;

    // GazeCursor 업데이트
    const targetX = gaze_x * window.innerWidth;
    const targetY = gaze_y * window.innerHeight;

    gazeCursor.setTarget(targetX, targetY);
    gazeCursor.clampToBounds(window.innerWidth, window.innerHeight);
  } else {
    // 데이터가 없을 때 중앙으로
    gazeCursor.setTarget(window.innerWidth / 2, window.innerHeight / 2);
  }
}

/**
 * UI 이벤트 설정
 */
function setupUIEvents() {
  const webcamToggleBtn = document.getElementById('webcam-toggle') as HTMLButtonElement;
  const effectTestBtn = document.getElementById('effect-test-btn') as HTMLButtonElement;
  const effectSelector = document.getElementById('effect-selector') as HTMLSelectElement;

  console.log('🎮 UI 이벤트 설정 중...', { webcamToggleBtn, effectTestBtn, effectSelector });

  // 웹캠 토글
  if (webcamToggleBtn) {
    webcamToggleBtn.addEventListener('click', () => {
      console.log('웹캠 토글 클릭');
      if (webcamActive) {
        stopWebcam();
      } else {
        startWebcam();
      }
    });
  } else {
    console.error('❌ webcam-toggle 버튼을 찾을 수 없습니다.');
  }

  // 이펙트 테스트
  if (effectTestBtn && effectSelector) {
    effectTestBtn.addEventListener('click', () => {
      const selectedEffect = effectSelector.value;
      console.log(`🎆 이펙트 테스트 버튼 클릭! 선택된 이펙트: ${selectedEffect}`);
      const pos = gazeCursor.getPosition();
      console.log('현재 커서 위치:', pos);
      createEffect(pos.x, pos.y, selectedEffect);
    });
  } else {
    console.error('❌ effect-test-btn 버튼 또는 effect-selector를 찾을 수 없습니다.');
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
      const video = document.getElementById('video') as HTMLVideoElement;
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        webcamActive = true;
        const btn = document.getElementById('webcam-toggle') as HTMLButtonElement;
        btn.textContent = 'Stop Webcam';
        btn.classList.add('active');

        // 프레임 전송 시작 (20fps)
        sendInterval = window.setInterval(() => {
          sendFrameToServer();
        }, 50);
      };
    })
    .catch((err) => {
      console.error('웹캠 오류:', err);
      alert('웹캠을 활성화할 수 없습니다.');
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

  const video = document.getElementById('video') as HTMLVideoElement;
  video.srcObject = null;

  webcamActive = false;
  const btn = document.getElementById('webcam-toggle') as HTMLButtonElement;
  btn.textContent = 'Start Webcam';
  btn.classList.remove('active');

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

  const video = document.getElementById('video') as HTMLVideoElement;
  const canvas = document.getElementById('canvas') as HTMLCanvasElement;
  const context = canvas.getContext('2d')!;

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
  network.send(dataUrl);
}

/**
 * 이펙트 생성
 */
function createEffect(x: number, y: number, effectName: string) {
  console.log(`🎨 이펙트 생성 시도: ${effectName} at (${x}, ${y})`);
  
  const vfxData = assetLoader.getVFXWithMetadata(effectName);

  if (!vfxData) {
    console.error(`❌ 이펙트 "${effectName}"을 찾을 수 없습니다.`);
    return;
  }

  const { image, metadata } = vfxData;
  console.log('✅ VFX 데이터 로드 성공:', metadata);

  const effect = new Effect({
    x,
    y,
    image,
    frameWidth: metadata.frameWidth,
    frameHeight: metadata.frameHeight,
    frameCount: metadata.frameCount,
    frameDuration: metadata.frameDuration,
    loop: metadata.loop,
    scale: metadata.scale,
  });

  activeEffects.push(effect);
  console.log(`✨ 이펙트 추가됨! 현재 활성 이펙트 수: ${activeEffects.length}`);
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

    const isAtLeftEdge = edgeDirection === 'left';
    const isAtRightEdge = edgeDirection === 'right';

    if (isAtLeftEdge || isAtRightEdge) {
      if (edgeHoldStartTime === 0) {
        edgeHoldStartTime = Date.now();
      }

      const holdDuration = Date.now() - edgeHoldStartTime;

      if (holdDuration >= EDGE_HOLD_THRESHOLD) {
        const currentOffset = renderer.getBackgroundOffset();

        // 최대 스크롤 계산
        const backgroundImage = assetLoader.getMap('graveyardFinal');
        if (backgroundImage && backgroundImage.complete) {
          const imageWidth =
            backgroundImage.naturalWidth * (window.innerHeight / backgroundImage.naturalHeight);
          const maxScroll = (imageWidth - window.innerWidth) / 2;

          if (maxScroll > 0) {
            if (isAtLeftEdge) {
              renderer.setBackgroundOffset(Math.min(currentOffset + SCROLL_SPEED, maxScroll));
            } else if (isAtRightEdge) {
              renderer.setBackgroundOffset(Math.max(currentOffset - SCROLL_SPEED, -maxScroll));
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
window.addEventListener('DOMContentLoaded', init);
