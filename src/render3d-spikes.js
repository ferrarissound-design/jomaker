import { createPlayRenderer as createBasePlayRenderer, ThreePlayRenderer } from './render3d-juracore.js?v=20260917-spike-image-base-1';

const SPIKE_SRC = './51CF049A-807B-4434-B262-7694990C3EE5.png';

function opaqueBounds(image) {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(image, 0, 0);
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const { data, width, height } = pixels;
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

function makeSpikeCanvas(image) {
  const crop = opaqueBounds(image) ?? {
    x: 0,
    y: 0,
    w: image.naturalWidth,
    h: image.naturalHeight
  };
  const canvas = document.createElement('canvas');
  canvas.width = 384;
  canvas.height = 288;
  const ctx = canvas.getContext('2d');
  ctx?.drawImage(image, crop.x, crop.y, crop.w, crop.h, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function installSpikeSprites(renderer) {
  const spikeEntries = renderer.staticEntries.filter(entry => entry.o.type === 'spike');
  if (!spikeEntries.length) return renderer;

  const T = renderer.THREE;
  const image = new Image();
  image.decoding = 'async';
  let disposed = false;
  let texture = null;
  let material = null;

  image.addEventListener('load', () => {
    if (disposed) return;
    const canvas = makeSpikeCanvas(image);
    texture = new T.CanvasTexture(canvas);
    texture.colorSpace = T.SRGBColorSpace;
    texture.needsUpdate = true;
    material = new T.SpriteMaterial({
      map: texture,
      transparent: true,
      alphaTest: .02,
      depthWrite: false,
      toneMapped: false
    });

    for (const entry of spikeEntries) {
      const group = entry.node;
      group.clear();
      const sprite = new T.Sprite(material);
      sprite.scale.set(1.04, .78, 1);
      sprite.position.set(0, -.07, .5);
      sprite.renderOrder = 5;
      group.add(sprite);
    }
  });
  image.src = SPIKE_SRC;

  const baseDispose = renderer.dispose.bind(renderer);
  renderer.dispose = () => {
    disposed = true;
    material?.dispose();
    texture?.dispose();
    baseDispose();
  };

  return renderer;
}

export async function createPlayRenderer(canvas, stage) {
  const renderer = await createBasePlayRenderer(canvas, stage);
  return installSpikeSprites(renderer);
}

export { ThreePlayRenderer };
