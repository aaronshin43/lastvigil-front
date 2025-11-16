/lastvigil-front/
|
|-- 📂 /public/
| |-- 📂 /assets/
| | |-- 📂 /maps/
| | | `-- graveyard_map.png   (2D map background image)
|   |   |-- 📂 /sprites/
|   |   |   |-- enemy_zombie.png    (Zombie spritesheet)
|   |   |   `-- enemy_skeleton.png (Skeleton spritesheet)
| | `-- 📂 /vfx/
|   |       |-- effect_explosion.png  (Explosion spritesheet)
|   |       `-- magic_circle.png (Magic circle single image)
|
|-- 📂 /src/
| |-- 📂 /core/
| | |-- Game.ts (Main game class, manages all objects (enemies, effects))
| | |-- Renderer.ts (60fps 'requestAnimationFrame' loop, canvas initialization/drawing management)
| | `-- AssetLoader.ts  (Preloads all .png image assets as 'Image' objects)
|   |
|   |-- 📂 /gameplay/
|   |   |-- GazeCursor.ts   (Gaze cursor object, handles 60fps smoothing and canvas drawing)
|   |   |-- Enemy.ts        ( 2D waypoint logic, includes 'draw(ctx)' function to draw itself on canvas)
|   |   |-- Effect.ts       ( 2D spritesheet animation logic, includes 'draw(ctx)' function)
|   |   `-- Spawner.ts (Same logic: enemy wave management)
| |
| |-- 📂 /services/
| | |-- Network.ts (Same logic: WebSocket connection, Vultr AI data reception)
| | `-- InputManager.ts (Calibration button events, AI data interpretation)
|   |
|   |-- style.css           (HTML/CSS - UI layer that floats <button> over <canvas>)
|   `-- main.ts (Initializes all modules and runs 'AssetLoader', starts 'Game' after loading)
|
`-- index.html (HTML skeleton - includes <canvas> and <button> UI elements)

vite vanilla project structure for a 2D game using TypeScript, with a focus on modular design and separation of concerns. The project is organized into three main directories: `public`, `src`, and the root directory for HTML and CSS files.
