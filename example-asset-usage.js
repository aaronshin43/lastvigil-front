// Example of using AssetLoader in index.html

import { Effect } from './src/gameplay/Effect.ts';
import { GazeCursor } from './src/gameplay/GazeCursor.ts';
import { AssetLoader } from './src/core/AssetLoader.ts';

// Create AssetLoader instance
const assetLoader = new AssetLoader();

// Game initialization function
async function initGame() {
    // Load assets (can show loading screen)
    await assetLoader.loadAll();
    
    // Start game after loading complete
    startGame();
}

function startGame() {
    // Get background image
    const mapImage = assetLoader.getMap('graveyard');
    
    // Existing logic such as WebSocket connection...
}

// Effect creation function - using AssetLoader
function createEffect(x, y, effectName = 'fireHammer') {
    const vfxData = assetLoader.getVFXWithMetadata(effectName);
    
    if (!vfxData) {
        console.error(`Cannot find effect "${effectName}".`);
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

// Easily create multiple effects
function createExplosion(x, y) {
    createEffect(x, y, 'explosion');
}

function createFireHammer(x, y) {
    createEffect(x, y, 'fireHammer');
}

function createMagicCircle(x, y) {
    createEffect(x, y, 'magicCircle');
}

// Start game
initGame();
