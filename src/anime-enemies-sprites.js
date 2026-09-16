import { TILE } from './stage.js?v=20260916-enemy-direction-1';
import {
  ENEMY_VISUAL_WIDTH_TILES as BASE_ENEMY_VISUAL_WIDTH_TILES,
  paintAnimeEnemy,
  drawAnimeEnemy as drawBaseAnimeEnemy,
  makeAnimeEnemy as makeBaseAnimeEnemy,
  animateAnimeEnemy as animateBaseAnimeEnemy
} from './anime-enemies-clean.js?base=20260916-ptero-sprite-1';

export const ENEMY_VISUAL_WIDTH_TILES = Object.freeze({
  ...BASE_ENEMY_VISUAL_WIDTH_TILES,
  flyingEnemy: 1.78
});
export { paintAnimeEnemy };

const PTERO_SHEET_SRC = new URL('../F0D64240-49E9-48B3-9979-9D88F4723153.png', import.meta.url).href;
const TRIKE_SHEET_SRC = new URL('../BC07A5D9-DDD7-47C3-B5A6-285DC80486B7.png', import.meta.url).href;
const COLUMNS = 4;
const ROWS = 2;
const FRAME_WIDTH = 480;
const FRAME_HEIGHT = 420;
const TRIKE_BASELINE = 396;
const PTERO_SEQUENCE = [0, 1, 2, 1, 3, 1];

let pteroFrames = null;
let pteroLoadStarted = false;
const pteroReadyCallbacks = [];

let trikeFrames = null;
let trikeLoadStarted = false;
const trikeReadyCallbacks = [];

function connectedComponents(sourceCtx, x0, y0, width, height) {
  const imageData = sourceCtx.getImageData(x0, y0, width, height);
  const pixels = imageData.data;
  const visited = new Uint8Array(width * height);
  const components = [];

  for (let start = 0; start < width * height; start++) {
    if (visited[start] || pixels[start * 4 + 3] <= 8) continue;

    const stack = [start];
    visited[start] = 1;
    const indices = [];
    let minX = width, minY = height, maxX = -1, maxY = -1;

    while (stack.length) {
      const index = stack.pop();
      indices.push(index);
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

    components.push({ indices, minX, minY, maxX, maxY });
  }

  components.sort((a, b) => b.indices.length - a.indices.length);
  return { imageData, components };
}

function extractLargestOpaqueComponent(sourceCtx, x0, y0, width, height) {
  const { imageData, components } = connectedComponents(sourceCtx, x0, y0, width, height);
  const largest = components[0];
  if (!largest) {
    const empty = document.createElement('canvas');
    empty.width = width;
    empty.height = height;
    return { canvas: empty, x: 0, y: 0, width, height };
  }

  const cleanData = sourceCtx.createImageData(width, height);
  for (const index of largest.indices) {
    const offset = index * 4;
    cleanData.data[offset] = imageData.data[offset];
    cleanData.data[offset + 1] = imageData.data[offset + 1];
    cleanData.data[offset + 2] = imageData.data[offset + 2];
    cleanData.data[offset + 3] = imageData.data[offset + 3];
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

// Trike sliding frames intentionally contain detached speed streaks. Keep those,
// while still removing accidental single-pixel debris from the sprite sheet.
function extractMeaningfulOpaqueComponents(sourceCtx, x0, y0, width, height) {
  const { imageData, components } = connectedComponents(sourceCtx, x0, y0, width, height);
  const largest = components[0];
  if (!largest) {
    const empty = document.createElement('canvas');
    empty.width = width;
    empty.height = height;
    return { canvas: empty, x: 0, y: 0, width, height, coreWidth: width, coreHeight: height };
  }

  const minArea = Math.max(10, Math.floor(largest.indices.length * .0015));
  const kept = components.filter(component => {
    const boxWidth = component.maxX - component.minX + 1;
    const boxHeight = component.maxY - component.minY + 1;
    return component.indices.length >= minArea || (boxWidth >= 18 && boxHeight >= 2);
  });

  const cleanData = sourceCtx.createImageData(width, height);
  let minX = width, minY = height, maxX = -1, maxY = -1;
  for (const component of kept) {
    minX = Math.min(minX, component.minX);
    minY = Math.min(minY, component.minY);
    maxX = Math.max(maxX, component.maxX);
    maxY = Math.max(maxY, component.maxY);
    for (const index of component.indices) {
      const offset = index * 4;
      cleanData.data[offset] = imageData.data[offset];
      cleanData.data[offset + 1] = imageData.data[offset + 1];
      cleanData.data[offset + 2] = imageData.data[offset + 2];
      cleanData.data[offset + 3] = imageData.data[offset + 3];
    }
  }

  const cleanCanvas = document.createElement('canvas');
  cleanCanvas.width = width;
  cleanCanvas.height = height;
  cleanCanvas.getContext('2d').putImageData(cleanData, 0, 0);

  return {
    canvas: cleanCanvas,
    x: minX,
    y: minY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
    coreWidth: largest.maxX - largest.minX + 1,
    coreHeight: largest.maxY - largest.minY + 1
  };
}

function normalizePteroFrames(image) {
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
  const commonScale = Math.min(450 / maxWidth, 350 / maxHeight);

  return cells.map(cell => {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    const drawWidth = cell.width * commonScale;
    const drawHeight = cell.height * commonScale;
    const drawX = (FRAME_WIDTH - drawWidth) / 2;
    const drawY = (FRAME_HEIGHT - drawHeight) / 2;
    ctx.drawImage(cell.canvas, cell.x, cell.y, cell.width, cell.height, drawX, drawY, drawWidth, drawHeight);
    return canvas;
  });
}

function normalizeTrikeFrames(image) {
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

      // Walk/flipped art should contain only the dinosaur itself. Keeping only the
      // largest connected shape strips the tiny black dots and neighbouring-cell
      // bleed visible near the left-facing snout and right-facing feet. Sliding
      // art is the one exception because its detached speed streaks are intentional.
      const rawCell = col === 3
        ? extractMeaningfulOpaqueComponents(sourceCtx, x0, y0, x1 - x0, y1 - y0)
        : extractLargestOpaqueComponent(sourceCtx, x0, y0, x1 - x0, y1 - y0);
      cells.push({
        ...rawCell,
        coreWidth: rawCell.coreWidth ?? rawCell.width,
        coreHeight: rawCell.coreHeight ?? rawCell.height
      });
    }
  }

  // Preserve one consistent dinosaur scale across walking, flipped and sliding art.
  // Full-bounds cap prevents the detached speed streaks from being clipped.
  const maxCoreWidth = Math.max(...cells.map(cell => cell.coreWidth));
  const maxCoreHeight = Math.max(...cells.map(cell => cell.coreHeight));
  const maxFullWidth = Math.max(...cells.map(cell => cell.width));
  const maxFullHeight = Math.max(...cells.map(cell => cell.height));
  const commonScale = Math.min(
    420 / maxCoreWidth,
    350 / maxCoreHeight,
    458 / maxFullWidth,
    374 / maxFullHeight
  );

  return cells.map(cell => {
    const canvas = document.createElement('canvas');
    canvas.width = FRAME_WIDTH;
    canvas.height = FRAME_HEIGHT;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = true;
    const drawWidth = cell.width * commonScale;
    const drawHeight = cell.height * commonScale;
    const drawX = (FRAME_WIDTH - drawWidth) / 2;
    const drawY = TRIKE_BASELINE - drawHeight;
    ctx.drawImage(cell.canvas, cell.x, cell.y, cell.width, cell.height, drawX, drawY, drawWidth, drawHeight);
    return canvas;
  });
}

function loadSpriteSheet(src, normalizer, getFrames, setFrames, getStarted, setStarted, callbacks) {
  const current = getFrames();
  if (current) return current;
  if (getStarted() || typeof document === 'undefined' || typeof Image === 'undefined') return null;

  setStarted(true);
  const image = new Image();
  image.decoding = 'async';
  image.onload = () => {
    try {
      const frames = normalizer(image);
      setFrames(frames);
      for (const callback of callbacks.splice(0)) callback(frames);
    } catch {
      callbacks.length = 0;
    }
  };
  image.onerror = () => { callbacks.length = 0; };
  image.src = src;
  return null;
}

function ensurePteroFrames(onReady = null) {
  if (pteroFrames) {
    onReady?.(pteroFrames);
    return;
  }
  if (onReady) pteroReadyCallbacks.push(onReady);
  loadSpriteSheet(
    PTERO_SHEET_SRC,
    normalizePteroFrames,
    () => pteroFrames,
    frames => { pteroFrames = frames; },
    () => pteroLoadStarted,
    started => { pteroLoadStarted = started; },
    pteroReadyCallbacks
  );
}

function ensureTrikeFrames(onReady = null) {
  if (trikeFrames) {
    onReady?.(trikeFrames);
    return;
  }
  if (onReady) trikeReadyCallbacks.push(onReady);
  loadSpriteSheet(
    TRIKE_SHEET_SRC,
    normalizeTrikeFrames,
    () => trikeFrames,
    frames => { trikeFrames = frames; },
    () => trikeLoadStarted,
    started => { trikeLoadStarted = started; },
    trikeReadyCallbacks
  );
}

function pteroFrameAt(time) {
  return PTERO_SEQUENCE[Math.floor(time * 8) % PTERO_SEQUENCE.length];
}

function trikeFrameAt(direction, state, time) {
  const base = direction < 0 ? 4 : 0;
  if (state === 'walk') return base + (Math.floor(time * 7) % 2);
  if (state === 'sliding') return base + 3;
  return base + 2; // flipped / immobilized
}

export function drawAnimeEnemy(ctx, type, x, y, width, height, time, direction = 1, state = 'walk') {
  if (type === 'flyingEnemy') {
    ensurePteroFrames();
    if (!pteroFrames) return drawBaseAnimeEnemy(ctx, type, x, y, width, height, time, direction, state);
    const base = direction < 0 ? 4 : 0;
    ctx.drawImage(pteroFrames[base + pteroFrameAt(time)], x, y, width, height);
    return;
  }

  if (type === 'trikeEnemy') {
    ensureTrikeFrames();
    if (!trikeFrames) return drawBaseAnimeEnemy(ctx, type, x, y, width, height, time, direction, state);
    ctx.drawImage(trikeFrames[trikeFrameAt(direction, state, time)], x, y, width, height);
    return;
  }

  return drawBaseAnimeEnemy(ctx, type, x, y, width, height, time, direction, state);
}

function buildFallbackFrameCanvas(type, index) {
  const canvas = document.createElement('canvas');
  canvas.width = FRAME_WIDTH;
  canvas.height = FRAME_HEIGHT;
  const ctx = canvas.getContext('2d');
  ctx.scale(3, 3);

  if (type === 'flyingEnemy') {
    if (index >= 4) {
      ctx.translate(160, 0);
      ctx.scale(-1, 1);
    }
    paintAnimeEnemy(ctx, type, index % 2, 'walk');
  } else {
    const left = index >= 4;
    const local = index % 4;
    if (left) {
      ctx.translate(160, 0);
      ctx.scale(-1, 1);
    }
    const fallbackState = local >= 2 ? 'flipped' : 'walk';
    paintAnimeEnemy(ctx, type, local === 1 ? 1 : 0, fallbackState);
  }
  return canvas;
}

function makeSpriteEnemy(view, type, ensureFrames) {
  const T = view.THREE;
  view.enemySpriteTextures ??= new Map();
  if (!view.enemySpriteTextures.has(type)) {
    const frameCanvases = [];
    const frames = Array.from({ length: 8 }, (_, index) => {
      const canvas = buildFallbackFrameCanvas(type, index);
      frameCanvases.push(canvas);
      const texture = new T.CanvasTexture(canvas);
      texture.colorSpace = T.SRGBColorSpace;
      view.animeTextures.push(texture);
      return texture;
    });

    ensureFrames(readyFrames => {
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
  sprite.userData.ownedMaterial = material;
  sprite.userData.frames = frames;
  return sprite;
}

export function makeAnimeEnemy(view, type) {
  if (type === 'flyingEnemy') {
    const sprite = makeSpriteEnemy(view, type, ensurePteroFrames);
    sprite.center.set(.5, .45);
    return sprite;
  }

  if (type === 'trikeEnemy') {
    const sprite = makeSpriteEnemy(view, type, ensureTrikeFrames);
    sprite.center.set(.5, 1 - TRIKE_BASELINE / FRAME_HEIGHT);
    return sprite;
  }

  return makeBaseAnimeEnemy(view, type);
}

export function animateAnimeEnemy(view, node, enemy, time) {
  if (enemy.type === 'flyingEnemy') {
    const direction = enemy.vx < 0 ? -1 : enemy.vx > 0 ? 1 : (node.userData.facing ?? -1);
    node.userData.facing = direction;
    const width = ENEMY_VISUAL_WIDTH_TILES.flyingEnemy;
    node.scale.set(width, width * 140 / 160, 1);
    node.center.set(.5, .45);
    node.position.set(
      (enemy.x + enemy.w / 2) / TILE,
      view.stage.height - (enemy.y + enemy.h / 2) / TILE,
      .43
    );
    node.material.rotation = 0;
    const base = direction < 0 ? 4 : 0;
    node.material.map = node.userData.frames[base + pteroFrameAt(time)];
    return;
  }

  if (enemy.type === 'trikeEnemy') {
    const direction = enemy.direction ?? (enemy.vx < 0 ? -1 : enemy.vx > 0 ? 1 : (node.userData.facing ?? 1));
    node.userData.facing = direction;
    const width = ENEMY_VISUAL_WIDTH_TILES.trikeEnemy;
    node.scale.set(width, width * 140 / 160, 1);
    node.center.set(.5, 1 - TRIKE_BASELINE / FRAME_HEIGHT);
    node.position.set((enemy.x + enemy.w / 2) / TILE, view.bodyBottom(enemy), .43);
    node.material.rotation = 0;
    node.material.map = node.userData.frames[trikeFrameAt(direction, enemy.state, time)];
    return;
  }

  return animateBaseAnimeEnemy(view, node, enemy, time);
}
