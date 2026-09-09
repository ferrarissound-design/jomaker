export const BACKGROUNDS = {
  tropicalSea: { id: 'tropicalSea', name: '南国の海', src: new URL('./assets/backgrounds/tropical-sea.svg', import.meta.url).href },
  sunsetCoast: { id: 'sunsetCoast', name: '夕焼け海岸', src: new URL('./assets/backgrounds/sunset-coast.svg', import.meta.url).href },
  classic: { id: 'classic', name: 'クラシック', src: null }
};

const cache = new Map();

function getImage(entry) {
  if (!entry?.src || typeof Image === 'undefined') return null;
  if (!cache.has(entry.id)) {
    const image = new Image();
    image.decoding = 'async';
    image.src = entry.src;
    cache.set(entry.id, image);
  }
  return cache.get(entry.id);
}

function fallback(ctx, w, h, id) {
  const gradient = ctx.createLinearGradient(0, 0, 0, h);
  if (id === 'sunsetCoast') {
    gradient.addColorStop(0, '#7765c8');
    gradient.addColorStop(.5, '#ef9992');
    gradient.addColorStop(1, '#ffd78f');
  } else {
    gradient.addColorStop(0, '#47d7f4');
    gradient.addColorStop(1, '#bff6ff');
  }
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

export function backgroundName(id) {
  return BACKGROUNDS[id]?.name ?? BACKGROUNDS.tropicalSea.name;
}

export function drawBackground(ctx, w, h, id = 'tropicalSea', camera = 0) {
  const entry = BACKGROUNDS[id] ?? BACKGROUNDS.tropicalSea;
  if (entry.id === 'classic') return false;

  fallback(ctx, w, h, entry.id);
  const image = getImage(entry);
  if (!image?.complete || !image.naturalWidth) return true;

  const aspect = image.naturalWidth / image.naturalHeight;
  const targetAspect = w / h;
  let dw, dh;
  if (aspect > targetAspect) {
    dh = h;
    dw = h * aspect;
  } else {
    dw = w;
    dh = w / aspect;
  }

  const travel = Math.max(0, dw - w);
  const shift = travel ? (camera * .055) % Math.max(1, travel) : 0;
  ctx.drawImage(image, -shift, (h - dh) / 2, dw, dh);

  const shade = ctx.createLinearGradient(0, h * .55, 0, h);
  shade.addColorStop(0, '#0000');
  shade.addColorStop(1, '#173b4a18');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, w, h);
  return true;
}
