import { GameEngine } from './engine.js?v=20260916-trike-default-left-1';
import { TILE } from './stage.js?v=20260916-trike-default-left-1';

const PATCH_FLAG = '__jomakerMovingPlatformCollisionPatched';
const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

if (!GameEngine.prototype[PATCH_FLAG]) {
  GameEngine.prototype.updateMovingPlatforms = function updateMovingPlatformsWithBounce(dt) {
    this.time += dt;
    const platforms = this.movingPlatforms ?? [];
    if (!platforms.length) return;

    const stageW = this.stage.width * TILE;
    const stageH = this.stage.height * TILE;

    // Every active solid is an obstacle for moving platforms. This includes
    // ground, blocks, one-way platforms, breakables and currently closed gates.
    const staticObstacles = [...(this.solids?.values?.() ?? [])];
    const crateObstacles = this.crates ?? [];
    const proposals = new Map();

    for (const platform of platforms) {
      platform.prevX = platform.x;
      platform.prevY = platform.y;

      if (!Number.isFinite(platform.motionPhase)) {
        // Match the old global sine motion on the first patched frame.
        platform.motionPhase = Math.max(0, this.time - dt) * platform.speed;
      }
      if (platform.motionDirection !== 1 && platform.motionDirection !== -1) {
        platform.motionDirection = 1;
      }

      const nextPhase = platform.motionPhase + dt * platform.speed * platform.motionDirection;
      const offset = Math.sin(nextPhase) * TILE * platform.distance;
      let x = platform.baseX;
      let y = platform.baseY;

      if (platform.axis === 'y') {
        y = Math.max(0, Math.min(stageH - platform.h, platform.baseY + offset));
      } else {
        x = Math.max(0, Math.min(stageW - platform.w, platform.baseX + offset));
      }

      proposals.set(platform, { x, y, phase: nextPhase });
    }

    const bounced = new Set();

    // Moving platforms are solid against every static obstacle and pushable box.
    // On contact they stay at the last safe position and reverse their motion.
    for (const platform of platforms) {
      const next = proposals.get(platform);
      const body = { x: next.x, y: next.y, w: platform.w, h: platform.h };
      const hitsStatic = staticObstacles.some(other => overlaps(body, other));
      const hitsCrate = crateObstacles.some(crate => overlaps(body, crate));
      if (hitsStatic || hitsCrate) bounced.add(platform);
    }

    // Resolve moving-platform vs moving-platform collisions from the same predicted frame,
    // so both platforms reverse together rather than one being allowed to tunnel through.
    for (let i = 0; i < platforms.length; i++) {
      const a = platforms[i];
      const nextA = proposals.get(a);
      const bodyA = { x: nextA.x, y: nextA.y, w: a.w, h: a.h };
      for (let j = i + 1; j < platforms.length; j++) {
        const b = platforms[j];
        const nextB = proposals.get(b);
        const bodyB = { x: nextB.x, y: nextB.y, w: b.w, h: b.h };
        if (!overlaps(bodyA, bodyB)) continue;
        bounced.add(a);
        bounced.add(b);
      }
    }

    for (const platform of platforms) {
      const next = proposals.get(platform);
      if (bounced.has(platform)) {
        // Stay at the last non-overlapping position and reverse along the same sine path.
        // Reversing phase direction preserves the original smooth acceleration profile.
        platform.x = platform.prevX;
        platform.y = platform.prevY;
        platform.motionDirection *= -1;
        continue;
      }

      platform.x = next.x;
      platform.y = next.y;
      platform.motionPhase = next.phase;
    }
  };

  Object.defineProperty(GameEngine.prototype, PATCH_FLAG, {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });
}
