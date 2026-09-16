import { TILE } from './stage.js?v=20260916-enemy-direction-1';
import {
  ENEMY_VISUAL_WIDTH_TILES,
  paintAnimeEnemy,
  drawAnimeEnemy as drawBaseAnimeEnemy,
  makeAnimeEnemy as makeBaseAnimeEnemy,
  animateAnimeEnemy as animateBaseAnimeEnemy
} from './anime-enemies.js?base=20260916-enemy-pixel-clean-1';

export { ENEMY_VISUAL_WIDTH_TILES, paintAnimeEnemy };

const SMALL_CARNIVORE_SHEET_SRC = new URL('../9475BE2E-4E23-4213-89A7-5AB11EF76B44.png', import.meta.url).href;
const COLUMNS = 4;
const ROWS = 2;
const FRAME_WIDTH = 480;
const FRAME_HEIGHT = 420;
const BASELINE = 396;
let cleanedFrames = null;
let loadStarted = false;
const readyCallbacks = [];

function extractLargestOpaqueComponent(sourceCtx, x0, y0, width, height) {
  const imageData = sourceCtx.getImageData(x0, y0, width, height);
  const pixels = imageData.data;
  const visited = new Uint8Array(width * height);
  let largest = null;

  for (let start = 0; start < width * height; start++) {
    if (visited[start] || pixels[start * 4 + 3] <= 8) continue;

    const stack = [start];
    visited[start] = 1;
    const component = [];
    let minX = width, minY = height, maxX = -1, maxY = -1;

    while (stack.length) {
      const index = stack.pop();
      component.push(index);
      const x = index % width;
      const y = Math.floor(index / width);
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);

      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (visited[next] || pixels[next * 4 + 3] <= 8) continue;
          visited[next] = 1;
          stack.push(next);
        }
      }
    }

    if (!largest || component.length > largest.indices.length) {
      largest = { indices: component, minX, minY, maxX, maxY };
    }
  }

  if (!largest) {
    const empty = document.createElement('canvas');
    empty.width = width;
    empty.height = height;
    return { canvas: empty, x: 0, y: 0, width, height };
  }

  const cleanData = sourceCtx.createImageData(width, height);
  for (const index of largest.indices) {
    const offset = index * 4;
    cleanData.data[offset] = pixels[offset];
    cleanData.data[offset + 1] = pixels[offset + 1];
    cleanData.data[offset + 2] = pixels[offset + 2];
    cleanData.data[offset + 3] = pixels[offset + 3];
  }

  const cleanCanvas = document.createElement('canvas');
  cleanCanvas.width = width;
  cleanCanvas.height = height;
  cleanCanvas.getContext('2d').putImageData(cleanData, 0, 0);

  return {
    canvas: cleanCanvas,
    x: largest.minX,
    y: largest.minY,
    width: largest.maxX - largest.minX + 1,
    height: largest.maxY - largest.minY + 1
  };
}

function normalizeCleanFrames(image) {
  const source = document.createElement('canvas');
  source.width = image.naturalWidth;
  source.height = image.naturalHeight;
  const sourceCtx = source.getContext('2d', { willReadFrequently: true });
  sourceCtx.drawImage(image, 0, 0);

  const cells = [];
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLUMNS; col++) {
      const x0 = Math.round(col * image.naturalWidth / COLUMNS);
      const x1 = Math.round((col + 1) * image.naturalWidth / COLUMNS);
      const y0 = Math.round(row * image.naturalHeight / ROWS);
      const y1 = Math.round((row + 1) * image.naturalHeight / ROWS);
      cells.push(extractLargestOpaqueComponent(sourceCtx, x0, y0, x1 - x0, y1 - y0));
    }
  }

  const maxWidth = Math.max(...cells.map(cell => cell.width));
  const maxHeight = Math.max(...cells.map(cell => cell.height));
  const commonScale = Math.min(450 / maxWidth, 372 / maxHeight);

  return cells.map(cell => {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    const drawWidth = cell.width * commonScale;
    const drawHeight = cell.height * commonScale;
    const drawX = (FRAME_WIDTH - drawWidth) / 2;
    const drawY = BASELINE - drawHeight;
    ctx.drawImage(
      cell.canvas,
      cell.x,
      cell.y,
      cell.width,
      cell.height,
      drawX,
      drawY,
      drawWidth,
      drawHeight
    );
    return canvas;
  });
}

function ensureCleanFrames(onReady = null) {
  if (cleanedFrames) {
    onReady?.(cleanedFrames);
    return;
  }
  if (onReady) readyCallbacks.push(onReady);
  if (loadStarted || typeof document === 'undefined' || typeof Image === 'undefined') return;

  loadStarted = true;
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    try {
      cleanedFrames = normalizeCleanFrames(image);
      for (const callback of readyCallbacks.splice(0)) callback(cleanedFrames);
    } catch {
      readyCallbacks.length = 0;
    }
  };
  image.onerror = () => { readyCallbacks.length = 0; };
  image.src = SMALL_CARNIVORE_SHEET_SRC;
}

function drawEnemyVectorFallback(ctx, x, y, width, height, time, direction) {
  ctx.save();
  ctx.translate(x + (direction < 0 ? width : 0), y);
  ctx.scale(direction * width / 160, height / 140);
  paintAnimeEnemy(ctx, 'enemy', Math.floor(time * 7) % 2, 'walk');
  ctx.restore();
}

export function drawAnimeEnemy(ctx, type, x, y, width, height, time, direction = 1, state = 'walk') {
  if (type !== 'enemy') return drawBaseAnimeEnemy(ctx, type, x, y, width, height, time, direction, state);

  ensureCleanFrames();
  if (!cleanedFrames) {
    drawEnemyVectorFallback(ctx, x, y, width, height, time, direction);
    return;
  }

  const base = direction < 0 ? 4 : 0;
  const frame = base + 1 + (Math.floor(time * 7) % 2);
  ctx.drawImage(cleanedFrames[frame], x, y, width, height);
}

export function makeAnimeEnemy(view, type) {
  if (type !== 'enemy') return makeBaseAnimeEnemy(view, type);

  const T = view.THREE;
  view.enemySpriteTextures ??= new Map();
  if (!view.enemySpriteTextures.has(type)) {
    const frameCanvases = [];
    const frames = Array.from({ length: 8 }, (_, index) => {
      const frame = index % 2;
      const canvas = document.createElement('canvas');
      canvas.width = FRAME_WIDTH;
      canvas.height = FRAME_HEIGHT;
      frameCanvases.push(canvas);
      const ctx = canvas.getContext('2d');
      ctx.scale(3, 3);
      if (index >= 4) {
        ctx.translate(160, 0);
        ctx.scale(-1, 1);
      }
      paintAnimeEnemy(ctx, type, frame, 'walk');
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      view.animeTextures.push(texture);
      return texture;
    });

    ensureCleanFrames(readyFrames => {
      readyFrames.forEach((source, index) => {
        const ctx = frameCanvases[index].getContext('2d');
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        ctx.drawImage(source, 0, 0, FRAME_WIDTH, FRAME_HEIGHT);
        frames[index].needsUpdate = true;
      });
    });

    view.enemySpriteTextures.set(type, frames);
  }

  const frames = view.enemySpriteTextures.get(type);
  const material = new T.SpriteMaterial({
    map: frames[0],
    transparent: true,
    alphaTest: .02,
    depthWrite: false,
    toneMapped: false
  });
  const sprite = new T.Sprite(material);
  sprite.center.set(.5, 1 - 132 / 140);
  sprite.userData.ownedMaterial = material;
  sprite.userData.frames = frames;
  return sprite;
}

export function animateAnimeEnemy(view, node, enemy, time) {
  if (enemy.type !== 'enemy') return animateBaseAnimeEnemy(view, node, enemy, time);

  const direction = enemy.vx < 0 ? -1 : enemy.vx > 0 ? 1 : (node.userData.facing ?? 1);
  node.userData.facing = direction;
  const width = ENEMY_VISUAL_WIDTH_TILES.enemy;
  node.scale.set(width, width * 140 / 160, 1);
  node.center.set(.5, 1 - 132 / 140);
  node.position.set((enemy.x + enemy.w / 2) / TILE, view.bodyBottom(enemy), .43);

  const base = direction < 0 ? 4 : 0;
  const running = enemy.grounded && Math.abs(enemy.vx) > 1;
  const frame = !enemy.grounded ? 3 : running ? 1 + (Math.floor(time * 7) % 2) : 0;
  node.material.rotation = 0;
  node.material.map = node.userData.frames[base + frame];
}
