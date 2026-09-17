import { render as baseRender, drawPart as baseDrawPart, drawPlayer } from './render-juracore.js?v=20260917-spike-image-base-1';
import { TILE } from './stage.js?v=20260916-enemy-direction-1';

const SPIKE_SRC = './51CF049A-807B-4434-B262-7694990C3EE5.png';
const spikeImage = new Image();
spikeImage.decoding = 'async';
spikeImage.src = SPIKE_SRC;

let spikeCrop = null;
let spikeReady = false;

function findOpaqueBounds(image) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const { data, width, height } = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let minX = width, minY = height, maxX = -1, maxY = -1;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (data[(y * width + x) * 4 + 3] <= 8) continue;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
    if (maxX < minX || maxY < minY) return null;
    return { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  } catch {
    return null;
  }
}

spikeImage.addEventListener('load', () => {
  spikeCrop = findOpaqueBounds(spikeImage) ?? {
    x: 0,
    y: 0,
    w: spikeImage.naturalWidth,
    h: spikeImage.naturalHeight
  };
  spikeReady = true;
});

function paintSpike(ctx, x, y, size = TILE) {
  if (!spikeReady || !spikeCrop) return false;
  const scale = size / TILE;
  const targetW = 48 * scale;
  const targetH = 38 * scale;
  const targetX = x;
  const targetY = y + 8 * scale;
  ctx.drawImage(
    spikeImage,
    spikeCrop.x,
    spikeCrop.y,
    spikeCrop.w,
    spikeCrop.h,
    targetX,
    targetY,
    targetW,
    targetH
  );
  return true;
}

export function drawPart(ctx, type, x, y, size = TILE, time = 0, active = false, props = null) {
  if (type !== 'spike' || !paintSpike(ctx, x, y, size)) {
    baseDrawPart(ctx, type, x, y, size, time, active, props);
  }
}

export { drawPlayer };

export function render(ctx, w, h, stage, camera, scale, editing, game, time, selected, cameraY = 0) {
  if (!spikeReady) {
    baseRender(ctx, w, h, stage, camera, scale, editing, game, time, selected, cameraY);
    return;
  }

  const hasSpikes = stage.objects.some(o => o.type === 'spike');
  if (!hasSpikes) {
    baseRender(ctx, w, h, stage, camera, scale, editing, game, time, selected, cameraY);
    return;
  }

  const stageWithoutSpikes = {
    ...stage,
    objects: stage.objects.filter(o => o.type !== 'spike')
  };
  baseRender(ctx, w, h, stageWithoutSpikes, camera, scale, editing, game, time, selected, cameraY);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camera, -cameraY);
  for (const o of stage.objects) {
    if (o.type !== 'spike') continue;
    paintSpike(ctx, o.x * TILE, o.y * TILE, TILE);
  }

  if (editing && selected?.type === 'spike') {
    ctx.strokeStyle = '#234f58';
    ctx.lineWidth = 3 / scale;
    ctx.strokeRect(selected.x * TILE + 1, selected.y * TILE + 1, 46, 46);
  }
  ctx.restore();
}
