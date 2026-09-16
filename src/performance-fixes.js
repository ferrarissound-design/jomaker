// Runtime performance guard for the large PNG-based player animation.
// Keep every animation frame and its timing, but move expensive decode/upload work
// away from the moment a running frame is first shown.

const THREE_CDN = 'https://cdn.jsdelivr.net/npm/three@0.180.0/build/three.module.js';
const PLAYER_SPRITES = [
  './029A536A-CC50-4049-B511-605245126177.png',
  './7B1D2CC0-C6BB-4150-83C2-ACAF5D70B983.png',
  './594F8DAD-DC51-4DFF-9AC3-784FCB70FF74.png',
  './90285534-ECDC-4BA6-96D4-BBA630AE34B7.png',
  './B1003C9C-4C47-4249-B6A9-1507F723BB9B.png',
  './70FE4599-3EA7-4DB1-A5DA-43DE8A833E60.png',
  './9914630D-0C2F-469E-B82B-ED918A8EFB35.png'
];
const PLAYER_FILENAMES = new Set(PLAYER_SPRITES.map(src => src.slice(2)));

const isPlayerSprite = url => {
  const value = String(url ?? '').split('?')[0];
  const filename = value.slice(value.lastIndexOf('/') + 1);
  return PLAYER_FILENAMES.has(filename);
};

// Ask the browser to fetch and decode every player frame before it is needed by
// the run cycle. Failure is harmless because Three.js still owns the real load.
for (const src of PLAYER_SPRITES) {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  if (typeof image.decode === 'function') image.decode().catch(() => {});
}

// Prime the same Three.js module used by render3d.js. This does not block the UI.
// Once available, apply two targeted optimizations only to the player sprite:
// 1) disable mipmap generation for these oversized 2D frames;
// 2) avoid forcing a material recompile when merely swapping one mapped frame
//    for another. USE_MAP remains enabled, so changing material.map is enough.
void import(THREE_CDN).then(THREE => {
  const hotTextures = new Set();
  const originalLoad = THREE.TextureLoader.prototype.load;

  THREE.TextureLoader.prototype.load = function load(url, onLoad, onProgress, onError) {
    const texture = originalLoad.call(this, url, onLoad, onProgress, onError);
    if (isPlayerSprite(url)) {
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;
      hotTextures.add(texture);
    }
    return texture;
  };

  const needsUpdate = Object.getOwnPropertyDescriptor(THREE.Material.prototype, 'needsUpdate');
  if (needsUpdate?.set) {
    Object.defineProperty(THREE.SpriteMaterial.prototype, 'needsUpdate', {
      configurable: true,
      set(value) {
        const isJoMakerPlayer = value === true
          && this.map
          && this.transparent === true
          && this.depthWrite === false
          && Math.abs((this.alphaTest ?? 0) - .02) < .00001
          && this.toneMapped === false;

        if (isJoMakerPlayer) return;
        needsUpdate.set.call(this, value);
      }
    });
  }

  // Upload ready player textures a couple at a time before normal drawing.
  // Staggering avoids replacing a tiny random hitch with one large startup hitch.
  const originalRender = THREE.WebGLRenderer.prototype.render;
  THREE.WebGLRenderer.prototype.render = function render(scene, camera) {
    if (hotTextures.size && typeof this.initTexture === 'function') {
      let budget = 2;
      for (const texture of hotTextures) {
        if (budget <= 0) break;
        if (texture.userData.__jomakerWarm) continue;
        const image = texture.image;
        if (!image || !image.width || !image.height) continue;
        try {
          this.initTexture(texture);
          texture.userData.__jomakerWarm = true;
          budget--;
        } catch {
          // Keep gameplay alive even if a browser/WebGL implementation rejects
          // an eager upload. The normal renderer path will still load it later.
        }
      }
    }
    return originalRender.call(this, scene, camera);
  };
}).catch(() => {
  // 2.5D already has its own Canvas fallback. Performance hints must never stop it.
});
