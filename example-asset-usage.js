// index.html 내에서 AssetLoader 사용 예제

import { Effect } from './src/gameplay/Effect.ts';
import { GazeCursor } from './src/gameplay/GazeCursor.ts';
import { AssetLoader } from './src/core/AssetLoader.ts';

// AssetLoader 인스턴스 생성
const assetLoader = new AssetLoader();

// 게임 초기화 함수
async function initGame() {
    // 에셋 로딩 (로딩 화면 표시 가능)
    await assetLoader.loadAll();
    
    // 로딩 완료 후 게임 시작
    startGame();
}

function startGame() {
    // 배경 이미지 가져오기
    const mapImage = assetLoader.getMap('graveyard');
    
    // WebSocket 연결 등 기존 로직...
}

// 이펙트 생성 함수 - AssetLoader 사용
function createEffect(x, y, effectName = 'fireHammer') {
    const vfxData = assetLoader.getVFXWithMetadata(effectName);
    
    if (!vfxData) {
        console.error(`이펙트 "${effectName}"을 찾을 수 없습니다.`);
        return;
    }
    
    const { image, metadata } = vfxData;
    
    const effect = new Effect({
        x: x,
        y: y,
        image: image,
        frameWidth: metadata.frameWidth,
        frameHeight: metadata.frameHeight,
        frameCount: metadata.frameCount,
        frameDuration: metadata.frameDuration,
        loop: metadata.loop,
        scale: metadata.scale
    });
    
    activeEffects.push(effect);
}

// 여러 이펙트 쉽게 생성
function createExplosion(x, y) {
    createEffect(x, y, 'explosion');
}

function createFireHammer(x, y) {
    createEffect(x, y, 'fireHammer');
}

function createMagicCircle(x, y) {
    createEffect(x, y, 'magicCircle');
}

// 게임 시작
initGame();
