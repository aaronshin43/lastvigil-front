/lastvigil-front/
|
|-- 📂 /public/
|   |-- 📂 /assets/
|   |   |-- 📂 /maps/
|   |   |   `-- graveyard_map.png   (2D 맵 배경 이미지)
|   |   |-- 📂 /sprites/
|   |   |   |-- enemy_zombie.png    (좀비 스프라이트시트)
|   |   |   `-- enemy_skeleton.png  (해골 스프라이트시트)
|   |   `-- 📂 /vfx/
|   |       |-- effect_explosion.png  (폭발 스프라이트시트)
|   |       `-- magic_circle.png      (마법진 단일 이미지)
|
|-- 📂 /src/
|   |-- 📂 /core/
|   |   |-- Game.ts         (메인 게임 클래스, 모든 객체(적,이펙트) 관리)
|   |   |-- Renderer.ts     (60fps 'requestAnimationFrame' 루프, 캔버스 초기화/그리기 총괄)
|   |   `-- AssetLoader.ts  (모든 .png 이미지 에셋을 'Image' 객체로 미리 로드)
|   |
|   |-- 📂 /gameplay/
|   |   |-- GazeCursor.ts   (시선 커서 객체, 60fps 스무딩 및 캔버스 그리기 담당)
|   |   |-- Enemy.ts        ( 2D 웨이포인트 로직, 캔버스에 자신을 그리는 'draw(ctx)' 함수 포함)
|   |   |-- Effect.ts       ( 2D 스프라이트시트 애니메이션 로직, 'draw(ctx)' 함수 포함)
|   |   `-- Spawner.ts      (로직 동일: 적 웨이브 관리)
|   |
|   |-- 📂 /services/
|   |   |-- Network.ts      (로직 동일: WebSocket 연결, Vultr AI 데이터 수신)
|   |   `-- InputManager.ts (캘리브레이션 버튼 이벤트, AI 데이터 해석 담당)
|   |
|   |-- style.css           (HTML/CSS - <canvas> 위에 <button>을 띄우는 UI 레이어)
|   `-- main.ts             (모든 모듈을 초기화하고 'AssetLoader' 실행, 로딩 후 'Game' 시작)
|
`-- index.html              (HTML 뼈대 - <canvas>와 <button> UI 요소 포함)