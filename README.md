# The Last Vigil

A 2D Gothic action defense game where players cast magic using real-time gaze tracking and ASL alphabet hand gestures via webcam. The game features a cloud-based architecture with AI analysis running on Vultr GPU servers.

## Features

- **Gaze-Based Aiming**: Attack direction determined by player's eye movement (left/right screen gaze)
- **ASL Gesture Magic**: Recognize specific hand gestures (A, C, L, S) to cast powerful spells
- **Webcam-Only Control**: No mouse or keyboard required
- **2D Pixel Art Style**: Gothic horror theme with zombies, skeletons, and magical effects
- **Horizontal Scrolling Battlefield**: Paladins-inspired map design
- **Cloud AI Processing**: Heavy computations handled by Vultr GPU servers for optimal performance

## Architecture

### Frontend (Client)
- **Technology**: TypeScript, HTML5 Canvas, WebSocket
- **Role**: Rendering engine and video transmitter
- **Key Components**:
  - `Renderer.ts`: 60fps rendering loop using requestAnimationFrame
  - `AssetLoader.ts`: Preloads all PNG assets as Image objects
  - `Game.ts`: Main game class managing enemies, effects, and player
  - `Network.ts`: WebSocket connection to Vultr server
  - `Camera.ts`: Handles viewport and scrolling
  - Various screen classes: `LandingScreen.ts`, `CountdownScreen.ts`, `GameOverScreen.ts`

### Backend (Vultr Cloud GPU)
- **Technology**: Python, FastAPI, MediaPipe, OpenCV
- **Role**: AI analysis and game logic processing
- **Functions**:
  - Real-time webcam frame analysis
  - ASL gesture recognition using trained MediaPipe models
  - Gaze tracking with quantified values [-1, 1]
  - Enemy spawning, movement, health, and collision detection

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/aaronshin43/lastvigil-front.git
   cd lastvigil-front
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   - Copy `.env.example` to `.env`
   - Configure Vultr server settings:
     ```
     VITE_VULTR_SERVER_IP=your-server-ip
     VITE_VULTR_SERVER_PORT=your-server-port
     VITE_VULTR_SERVER_URL=ws://your-server-url
     VITE_ENV=development
     ```

## Usage

### Development
```bash
npm run dev
```
Starts the Vite development server.

### Build
```bash
npm run build
```
Compiles TypeScript and builds for production.

### Preview
```bash
npm run preview
```
Previews the built application.

## Game Controls

- **Gaze**: Look left/right on screen to aim attacks
- **Gestures**: Perform ASL alphabet signs to cast magic
- **Guide Button**: Shows ASL gesture reference
- **Skip Button**: Skip one alphabet

## Project Structure

```
lastvigil-front/
├── public/
│   └── assets/          # Game sprites, maps, VFX
├── src/
│   ├── core/            # Main game systems
│   │   ├── AssetLoader.ts
│   │   ├── Camera.ts
│   │   ├── Game.ts
│   │   ├── Renderer.ts
│   │   └── *Screen.ts   # UI screens
│   ├── gameplay/        # Game entities
│   │   ├── Enemy.ts
│   │   ├── Player.ts
│   │   ├── Effect.ts
│   │   └── types/       # Type definitions
│   └── services/
│       └── Network.ts   # WebSocket client
├── index.html           # Main HTML file
├── style.css            # Global styles
└── main.ts              # Application entry point
```

## Technologies Used

- **Frontend**: TypeScript, Vite, HTML5 Canvas
- **Networking**: WebSocket for real-time communication
- **Assets**: PNG spritesheets for animations
- **AI Backend**: MediaPipe, OpenCV (handled by Vultr server)