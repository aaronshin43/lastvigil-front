/**
 * main.ts
 * Initialize all modules and run AssetLoader, start Game after loading
 */

import { AssetLoader } from "./core/AssetLoader";
import { Renderer } from "./core/Renderer";
import { GazeCursor } from "./gameplay/GazeCursor";
import { Game } from "./core/Game";
import { Network } from "./services/Network";
import { Camera } from "./core/Camera";
import { LandingScreen } from "./core/LandingScreen";
import { CountdownScreen } from "./core/CountdownScreen";
import { GameOverScreen } from "./core/GameOverScreen";

// Global state management
let assetLoader: AssetLoader;
let renderer: Renderer;
let gazeCursor: GazeCursor;
let game: Game;
let network: Network;
let camera: Camera;
let landingScreen: LandingScreen;
let countdownScreen: CountdownScreen;
let gameOverScreen: GameOverScreen;

// Webcam management
let webcamActive = false;
let webcamStream: MediaStream | null = null;
let sendInterval: number | null = null;

// Map scroll management
let edgeHoldStartTime = 0;
const EDGE_HOLD_THRESHOLD = 300; // 0.3 seconds
const EDGE_THRESHOLD = 0.1; // 10% of screen
const MIN_SCROLL_SPEED = 10; // Minimum scroll speed
const MAX_SCROLL_SPEED = 50; // Maximum scroll speed

// Wave tracking
let currentWave = 0; // Initialize to 0 to detect first wave
let isShowingWaveAnnouncement = false; // Check if wave announcement is showing

// Gesture sequence tracking
let currentGestureSequence: string | string[] = "";

// Game initialization state
let isGameInitialized = false;

/**
 * Initialize application
 */
async function init() {
  // console.log("🎮 Game initialization starting...");

  try {
    // 1. Initialize AssetLoader and load assets
    assetLoader = new AssetLoader();
    // console.log("📦 Loading assets...");
    await assetLoader.loadAll();
    // console.log("✅ Asset loading complete!");

    // 2. Initialize LandingScreen and display
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

    // 3. Initialize GameOverScreen
    gameOverScreen = new GameOverScreen({
      canvasId: "gameover-canvas",
      onRestart: () => {
        // console.log("🔄 Restarting game");
        // Restart by reloading page
        window.location.reload();
      },
    });

    // console.log("🎬 Showing landing screen");
  } catch (error) {
    console.error("❌ Initialization failed:", error);
    alert("Game initialization failed. Please check the console.");
  }
}

/**
 * Start game (when Start button is clicked on landing screen)
 */
function startGame() {
  // console.log("🚀 Preparing to start game!");

  // Hide landing screen
  landingScreen.hide();

  // Hide UI elements (during countdown)
  hideGameUI();

  // Initialize and start countdown screen
  countdownScreen = new CountdownScreen({
    canvasId: "countdown-canvas",
  });
  
  countdownScreen.startInitialCountdown(() => {
    // console.log("⏱️ Countdown complete! Starting game");
    // Show UI elements again
    showGameUI();
    initializeGame();
  });
}

/**
 * Actual game initialization (after countdown)
 */
function initializeGame() {
  // Prevent duplicate initialization if already initialized
  if (isGameInitialized) {
    console.warn("⚠️ Game is already initialized. Preventing duplicate initialization.");
    return;
  }

  try {
    // console.log("🎮 Game initialization starting...");
    
    // 3. Initialize Camera
    camera = new Camera({
      worldWidth: 2148, // Backend map size
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight,
    });
    // Start camera from left side of map (so enemies spawn from left)
    camera.setOffsetX(0);
    // console.log("📹 Camera initialization complete");

    // 4. Initialize Renderer
    renderer = new Renderer({
      backgroundCanvasId: "background-canvas",
      gameCanvasId: "circle-canvas",
      camera: camera,
      assetLoader: assetLoader,
    });
    // console.log("🎨 Renderer initialization complete");

    // 5. Set background image
    const backgroundImage = assetLoader.getMap("graveyard");
    if (backgroundImage) {
      renderer.setBackgroundImage(backgroundImage);
    }

    // 6. Initialize GazeCursor
    gazeCursor = new GazeCursor({
      chaseSpeed: 0.08,
      initialX: window.innerWidth / 2,
      initialY: window.innerHeight / 2,
      assetLoader: assetLoader,
    });

    // 7. Initialize Game
    game = new Game({
      assetLoader,
      renderer,
      gazeCursor,
      camera,
    });

    // 8. Initialize Network (WebSocket)
    initNetwork();

    // 9. Set up UI event listeners
    setupUIEvents();

    // 10. Start game (rendering loop)
    game.start();

    // 11. Start map scroll logic
    startScrollLoop();

    // 12. Auto-start webcam
    startWebcam();

    // Set initialization completion flag
    isGameInitialized = true;
    // console.log("✅ Game initialization complete!");
  } catch (error) {
    console.error("❌ Game start failed:", error);
    alert("Game start failed. Please check the console.");
  }
}

/**
 * Initialize Network (WebSocket)
 */
function initNetwork() {
  const serverUrl =
    import.meta.env.VITE_VULTR_SERVER_URL || "ws://localhost:8000/ws";
  // console.log(`🌐 Server URL: ${serverUrl}`);

  network = new Network({
    serverUrl,
    reconnectInterval: 3000,
    maxReconnectAttempts: 5,
  });

  // Register event handlers
  network.onOpen(() => {
    // console.log("🔌 Connected to Vultr server.");
  });

  network.onMessage((data) => {
    // 📡 Output backend response to console
    // console.log("=".repeat(80));
    // console.log("📡 Backend response received:", new Date().toLocaleTimeString());
    // console.log("=".repeat(80));
    // console.log(JSON.stringify(data, null, 2));
    // console.log("=".repeat(80));

    // Pass server data to Game
    processServerData(data);
  });

  network.onError((error) => {
    console.error("🔥 WebSocket error:", error);
  });

  network.onClose(() => {
    // console.log("🔌 WebSocket connection closed");
  });

  // Start connection
  network.connect();
}

/**
 * Process server data
 */
function processServerData(response: any) {
  // 1. Process gaze data - receive normalized coordinates (0-1) based on entire map from backend
  if (response.gaze && response.gaze.gaze_x !== undefined && response.gaze.gaze_y !== undefined) {
    const { gaze_x, gaze_y } = response.gaze;

    // 🔍 Check backend raw data
    // console.log(`🔍 RAW backend gaze:`, response.gaze);

    // Convert normalized coordinates (0-1) to world/screen coordinates
    const WORLD_WIDTH = 2148; // Backend map size
    const worldX = gaze_x * WORLD_WIDTH;
    const screenY = gaze_y * window.innerHeight;

    // Convert world X to screen X through camera
    const screenX = worldX - camera.getOffsetX();

    // console.log(`👁️ Gaze: norm(${gaze_x.toFixed(3)}, ${gaze_y.toFixed(3)}) → world(${worldX.toFixed(0)}, ${screenY.toFixed(0)}) → screen(${screenX.toFixed(0)}, ${screenY.toFixed(0)}) | cam: ${camera.getOffsetX().toFixed(0)}`);

    // Update GazeCursor
    gazeCursor.setTarget(screenX, screenY);

    // Trigger scroll: move camera based on world coordinates
    checkAndScrollCamera(worldX);
  }
  // If no gaze data, maintain previous target and stop scrolling only
  // GazeCursor continues to update() in Renderer, so animation and image are maintained

  // 2. ✨ Process game state data (update at 20fps)
  if (response.gameState) {
    console.log(`🎮 Game state update:`, {
      enemies: response.gameState.enemies?.length || 0,
      effects: response.gameState.effects?.length || 0,
      effectsData: response.gameState.effects, // 🔍 Check effect data details
      score: response.gameState.playerScore,
      wave: response.gameState.waveNumber,
      HP: response.gameState.playerHP,
      gestureSequence: response.gameState.gestureSequence,
      gestureMatched: response.gameState.gestureMatched,
    });

    // Update gesture sequence UI
    const gestureSequenceElement = document.getElementById("gesture-sequence");
    if (gestureSequenceElement && response.gameState.gestureSequence) {
      // If array, join; if string, use as is
      const sequenceText = Array.isArray(response.gameState.gestureSequence)
        ? response.gameState.gestureSequence.join("")
        : response.gameState.gestureSequence;
      
      gestureSequenceElement.textContent = sequenceText;
      currentGestureSequence = response.gameState.gestureSequence;
      
      // Update if guide is currently open
      const aslGuideContainer = document.getElementById("asl-guide-container");
      if (aslGuideContainer && aslGuideContainer.style.display === "block") {
        updateASLGuide();
      }
    }

    // Execute attack animation when gesture sequence matches successfully
    if (response.gameState.gestureMatched === true) {
      // console.log(`🔥 Gesture sequence match successful! Skill activation`);
      renderer.playAttackAnimation();
    }

    // Detect wave change (display only when increasing, prevent duplicates)
    if (response.gameState.waveNumber && 
        response.gameState.waveNumber > currentWave && 
        !isShowingWaveAnnouncement) {
      // console.log(`🌊 Wave change: ${currentWave} → ${response.gameState.waveNumber}`);
      const newWave = response.gameState.waveNumber;
      currentWave = newWave;
      
      // Skip first wave as it was already shown in initial countdown
      if (newWave > 1) {
        isShowingWaveAnnouncement = true;
        countdownScreen.showWaveAnnouncement(newWave);
        
        // Reset flag after 1.5 seconds (same as animation duration)
        setTimeout(() => {
          isShowingWaveAnnouncement = false;
        }, 1500);
      }
    }

    // Pass to Game class for rendering
    game.updateGameState(response.gameState);
  }

  // 3. 🎮 Handle game over
  if (response.type === "gameOver") {
    // console.log("💀 Game over!", {
    //   finalScore: response.finalScore,
    //   finalWave: response.finalWave,
    // });

    // Show game over screen
    gameOverScreen.show(response.finalScore, response.finalWave);

    // Stop game loop
    game.stop();

    // Stop webcam
    if (webcamActive) {
      stopWebcam();
    }
  }
}

/**
 * Set up UI events
 */
function setupUIEvents() {
  const skipButtonImg = document.getElementById(
    "skip-button"
  ) as HTMLImageElement;
  const guideButton = document.getElementById(
    "guide-button"
  ) as HTMLImageElement;
  const aslGuideContainer = document.getElementById(
    "asl-guide-container"
  ) as HTMLDivElement;

  console.log("🎮 Setting up UI events...", {
    skipButtonImg,
    guideButton,
    aslGuideContainer,
  });

  // New skip button image
  if (skipButtonImg) {
    skipButtonImg.addEventListener("click", () => {
      // console.log("⏭️ Skip skill request (image button)");
      if (network && network.isConnected()) {
        network.send(JSON.stringify({ type: "skipGesture" }));
        // console.log("📤 Sending skipGesture message");
      } else {
        console.warn("⚠️ Not connected to server.");
      }
    });
  } else {
    console.error("❌ Cannot find skip-button image.");
  }

  // Guide button click - Toggle ASL gesture guide
  if (guideButton && aslGuideContainer) {
    let isGuideVisible = false;
    
    guideButton.addEventListener("click", () => {
      isGuideVisible = !isGuideVisible;
      
      if (isGuideVisible) {
        // Show guide
        updateASLGuide();
        // console.log("📖 Showing ASL gesture guide");
      } else {
        // Hide guide
        aslGuideContainer.style.display = "none";
        // console.log("📖 Hiding ASL gesture guide");
      }
    });
  } else {
    console.error("❌ Cannot find guide-button or asl-guide-container.");
  }
}

/**
 * Update ASL gesture guide (according to current sequence)
 */
function updateASLGuide() {
  const aslGuideContainer = document.getElementById("asl-guide-container") as HTMLDivElement;
  const aslGuideImages = document.getElementById("asl-guide-images") as HTMLDivElement;
  
  if (!aslGuideContainer || !aslGuideImages) {
    console.error("❌ Cannot find ASL guide container.");
    return;
  }

  // Hide if no current gesture sequence
  if (!currentGestureSequence) {
    console.warn("⚠️ No current gesture sequence.", currentGestureSequence);
    aslGuideContainer.style.display = "none";
    return;
  }

  // Use as is if array, split if string
  const letters = Array.isArray(currentGestureSequence)
    ? currentGestureSequence
    : currentGestureSequence.split("");
  
  // Hide if empty array
  if (letters.length === 0) {
    console.warn("⚠️ Gesture sequence is empty.");
    aslGuideContainer.style.display = "none";
    return;
  }

  // Remove all existing images
  aslGuideImages.innerHTML = "";
  
  // console.log(`📖 Creating ASL guide:`, letters, `(${letters.length} characters)`);
  
  letters.forEach((letter) => {
    const upperLetter = letter.toUpperCase();
    
    const imgWrapper = document.createElement("div");
    imgWrapper.style.cssText = `
      display: flex;
      flex-direction: column;
      align-items: center;
    `;

    const img = document.createElement("img");
    img.src = `./assets/asl_example/asl_${upperLetter.toLowerCase()}.png`;
    img.alt = `ASL ${upperLetter}`;
    img.style.cssText = `
      width: 100px;
      height: 100px;
      object-fit: contain;
    `;

    imgWrapper.appendChild(img);
    aslGuideImages.appendChild(imgWrapper);
  });

  aslGuideContainer.style.display = "block";
}

/**
 * Start webcam
 */
function startWebcam() {
  navigator.mediaDevices
    .getUserMedia({ video: true })
    .then((stream) => {
      webcamStream = stream;
      const video = document.getElementById("video") as HTMLVideoElement;
      
      if (!video) {
        console.error("❌ Cannot find video element.");
        return;
      }
      
      video.srcObject = stream;

      video.onloadedmetadata = () => {
        webcamActive = true;
        
        // // Update button if it exists (continue even if not)
        // const btn = document.getElementById("webcam-toggle") as HTMLButtonElement;
        // if (btn) {
        //   btn.textContent = "Stop Webcam";
        //   btn.classList.add("active");
        // }

        // Start frame transmission (20fps)
        sendInterval = window.setInterval(() => {
          sendFrameToServer();
        }, 50);
      };
      
      // Explicitly call play() (for autoplay)
      video.play().catch(err => {
        console.error("❌ Video playback failed:", err);
      });
    })
    .catch((err) => {
      console.error("❌ Webcam error:", err);
      alert("Cannot activate webcam.");
    });
}

/**
 * Stop webcam
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

  // Reset cursor
  gazeCursor.setPosition(window.innerWidth / 2, window.innerHeight / 2);

  // Maintain camera offset (keep scroll position)
  // camera.setOffsetX(0); // commented out
  edgeHoldStartTime = 0;
  // console.log("📹 Webcam stopped, camera position maintained");
}

/**
 * Send frame to server
 */
function sendFrameToServer() {
  if (!network.isConnected()) {
    console.warn("⚠️ Server connection lost - cannot send frame");
    return;
  }

  const video = document.getElementById("video") as HTMLVideoElement;
  const canvas = document.getElementById("canvas") as HTMLCanvasElement;
  
  if (!video || !canvas) {
    console.error("❌ Cannot find video or canvas element.");
    return;
  }
  
  const context = canvas.getContext("2d");
  if (!context) {
    console.error("❌ Cannot get canvas context.");
    return;
  }

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
  network.send(dataUrl);
}

/**
 * Check camera scroll based on world coordinates
 */
function checkAndScrollCamera(worldX: number) {
  const WORLD_WIDTH = 2148; // Backend map size
  const cameraOffsetX = camera.getOffsetX();
  const viewportWidth = camera.getViewportWidth();

  // Current world area visible by camera
  const cameraLeft = cameraOffsetX;
  const cameraRight = cameraOffsetX + viewportWidth;

  // Scroll trigger area (10% of viewport)
  const scrollMargin = viewportWidth * EDGE_THRESHOLD;
  const leftScrollZone = cameraLeft + scrollMargin;
  const rightScrollZone = cameraRight - scrollMargin;

  const isInLeftZone = worldX < leftScrollZone;
  const isInRightZone = worldX > rightScrollZone;

  // 🔍 Scroll zone debugging (log only on entry)
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

      // Calculate dynamic scroll speed (faster when head is turned more)
      let scrollSpeed: number;
      if (isInLeftZone) {
        // Left zone: faster closer to leftScrollZone edge
        const distanceFromZoneEdge = leftScrollZone - worldX;
        const normalizedDistance = Math.min(
          distanceFromZoneEdge / scrollMargin,
          1
        );
        scrollSpeed =
          MIN_SCROLL_SPEED +
          (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * normalizedDistance;
      } else {
        // Right zone: faster farther from rightScrollZone edge
        const distanceFromZoneEdge = worldX - rightScrollZone;
        const normalizedDistance = Math.min(
          distanceFromZoneEdge / scrollMargin,
          1
        );
        scrollSpeed =
          MIN_SCROLL_SPEED +
          (MAX_SCROLL_SPEED - MIN_SCROLL_SPEED) * normalizedDistance;
      }

      // Move camera
      if (isInLeftZone && cameraOffsetX > 0) {
        camera.moveX(-scrollSpeed); // Scroll left
        // console.log(`⬅️ Camera scroll LEFT: speed=${scrollSpeed.toFixed(1)}, offset=${camera.getOffsetX().toFixed(0)}`);
      } else if (isInRightZone && cameraOffsetX < maxOffset) {
        camera.moveX(scrollSpeed); // Scroll right
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
 * Map scroll logic (no longer used - handled directly from gaze data)
 */
function startScrollLoop() {
  // Scroll is now handled directly from gaze coordinates in processServerData
}

/**
 * Hide UI elements (during countdown)
 */
function hideGameUI() {
  const status2 = document.getElementById("status2-display");
  const guideButton = document.getElementById("guide-button");
  const skipButton = document.getElementById("skip-button");
  const gameUI = document.getElementById("game-ui");
  const topFrame = document.getElementById("top-frame");
  const scoreImage = document.getElementById("score-image");
  
  if (status2) status2.style.display = "none";
  if (guideButton) guideButton.style.display = "none";
  if (skipButton) skipButton.style.display = "none";
  if (gameUI) gameUI.style.display = "none";
  if (topFrame) topFrame.style.display = "none";
  if (scoreImage) scoreImage.style.display = "none";
}

/**
 * Show UI elements (when game starts)
 */
function showGameUI() {
  const status2 = document.getElementById("status2-display");
  const guideButton = document.getElementById("guide-button");
  const skipButton = document.getElementById("skip-button");
  const gameUI = document.getElementById("game-ui");
  const topFrame = document.getElementById("top-frame");
  const scoreImage = document.getElementById("score-image");
  
  if (status2) status2.style.display = "block";
  if (guideButton) guideButton.style.display = "block";
  if (skipButton) skipButton.style.display = "block";
  if (gameUI) gameUI.style.display = "block";
  if (topFrame) topFrame.style.display = "block";
  if (scoreImage) scoreImage.style.display = "block";
}

// Initialize on page load
window.addEventListener("DOMContentLoaded", init);
