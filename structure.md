/lasatvigil
├── /public/
│   ├── /assets/
│   │   ├── map.glb         (3D 모델, 맵)
│   │   ├── zombie.glb
│   │   └── magic_circle.png (텍스처, 이미지)
│
├── /src/
│   ├── /core/
│   │   ├── Game.ts         (메인 Three.js 씬, 카메라, 렌더러)
│   │   ├── Renderer.ts     (애니메이션 루프: a.k.a animate)
│   │   └── Assets.ts       (GLTF/텍스처 로더 관리)
│   │
│   ├── /gameplay/
│   │   ├── Enemy.ts        (적 클래스, 웨이포인트 로직)
│   │   ├── Effect.ts       (폭발, 마법진 이펙트 클래스)
│   │   └── Spawner.ts      (적 웨이브 관리)
│   │
│   ├── /services/
│   │   ├── Network.ts      (WebSocket 연결 및 관리 로직)
│   │   ├── AIInput.ts      (클라이언트 AI: MediaPipe JS 실행 로직)
│   │
│   ├── style.css           (HTML/CSS)
│   └── main.ts             (모든 것을 시작하는 메인 함수)
│
└── index.html              (HTML 뼈대)