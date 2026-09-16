import { ThreePlayRenderer } from './render3d.js?v=20260916-left-jump-1';

const MOUNTAIN_PANORAMA_SRC = './F9F8E7A2-0B27-46F3-BB59-E2E454041170.png';
const PATCH_FLAG = '__jomakerMountainPanoramaPatched';

if (!ThreePlayRenderer.prototype[PATCH_FLAG]) {
  const originalBuildBackdrop = ThreePlayRenderer.prototype.buildBackdrop;
  const originalUpdateCamera = ThreePlayRenderer.prototype.updateCamera;

  ThreePlayRenderer.prototype.buildBackdrop = function buildBackdropWithMountainPanorama() {
    originalBuildBackdrop.call(this);

    // The uploaded blue/green mountain art is for the normal grassland palette.
    // Sunset Coast keeps its existing warm procedural scenery.
    if (this.stage.background === 'sunsetCoast') return;

    const T = this.THREE;
    const loader = new T.TextureLoader();

    loader.load(
      MOUNTAIN_PANORAMA_SRC,
      texture => {
        texture.colorSpace = T.SRGBColorSpace;
        texture.generateMipmaps = false;
        texture.minFilter = T.LinearFilter;
        texture.magFilter = T.LinearFilter;
        this.animeTextures.push(texture);

        const material = new T.MeshBasicMaterial({
          map: texture,
          transparent: true,
          depthWrite: false,
          toneMapped: false,
          fog: false
        });
        this.materials.set('mountain-panorama', material);

        const imageWidth = texture.image?.width || 2048;
        const imageHeight = texture.image?.height || 512;
        const aspect = Math.max(2.5, imageWidth / imageHeight);
        const tileWidth = 30;
        const tileHeight = tileWidth / aspect;
        const geometry = this.geometry('mountain-panorama-plane', () => new T.PlaneGeometry(1, 1));
        const group = new T.Group();
        group.name = 'mountain-panorama';

        // Give the panorama plenty of overhang so the subtle parallax shift can
        // never expose an empty edge, even on wide stages.
        const startX = -tileWidth * 2;
        const endX = this.stage.width + tileWidth * 3;
        for (let x = startX; x < endX; x += tileWidth) {
          const pane = new T.Mesh(geometry, material);
          pane.position.set(x + tileWidth / 2, tileHeight / 2 - .35, -11.7);
          pane.scale.set(tileWidth, tileHeight, 1);
          group.add(pane);
        }

        // Keep the existing clouds and foreground prehistoric trees, but hide
        // the old geometric mountain/foothill meshes now that the painted
        // panorama is ready. If the image fails to load, the old scenery stays
        // visible as a safe fallback.
        for (const child of this.backdrop.children) {
          if (child.isMesh && child.position.z <= -5) child.visible = false;
        }

        this.mountainPanoramaGroup = group;
        this.backdrop.add(group);
      },
      undefined,
      () => {
        // Keep the procedural mountains when the image cannot be loaded.
      }
    );
  };

  ThreePlayRenderer.prototype.updateCamera = function updateCameraWithMountainParallax(...args) {
    originalUpdateCamera.apply(this, args);
    if (!this.mountainPanoramaGroup) return;

    // Move the distant scenery with only a fraction of the camera motion.
    // This gives depth without making the background distracting on mobile.
    this.mountainPanoramaGroup.position.x = this.camera.position.x * .22;
  };

  Object.defineProperty(ThreePlayRenderer.prototype, PATCH_FLAG, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
}
