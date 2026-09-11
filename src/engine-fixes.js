import { TILE } from './stage.js';
import { GameEngine } from './engine.js';

const overlaps = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

// Keep timer-block rendering and collision state synchronized. If the timer
// expires while a body is still inside a timer block, keep every timer block
// disabled until all of them can safely return at the same time.
GameEngine.prototype.tickTimer = function tickTimer(dt) {
  if (this.timerGate <= 0) {
    this.restoreDynamicSolids();
    return;
  }

  this.timerGate = Math.max(0, this.timerGate - dt);
  if (this.timerGate > 0) return;

  const timerObjects = this.stage.objects.filter(o => o.type === 'timerBlock');
  const bodies = [this.player, ...(this.crates ?? []), ...(this.enemies ?? [])].filter(Boolean);
  const blocked = timerObjects.some(o => {
    const solid = this.makeSolid(o);
    return bodies.some(body => overlaps(body, solid));
  });

  if (blocked) {
    // Rendering uses timerGate > 0 to hide timer blocks. Keep a tiny positive
    // value so a visible block can never be non-solid while restoration waits.
    this.timerGate = Number.EPSILON;
    return;
  }

  for (const o of timerObjects) {
    const solid = this.makeSolid(o);
    this.solids.set(solid.key, solid);
  }
  this.restoreDynamicSolids();
};

// Carry riders with a moving platform, but resolve the platform's own motion
// on the same axis before the normal player step. This prevents a vertical
// platform from embedding the player in a ceiling and having that overlap
// misread as a horizontal wall collision (the sideways-launch bug).
GameEngine.prototype.carryPlayerWithPlatform = function carryPlayerWithPlatform() {
  const key = this.player.platformKey;
  if (!key) return;
  const platform = this.movingPlatforms.find(p => p.key === key);
  if (!platform) return;

  const p = this.player;
  const dx = platform.x - platform.prevX;
  const dy = platform.y - platform.prevY;
  let blocked = false;

  if (dx) {
    p.x += dx;
    for (const o of this.nearby(p)) {
      if (o.type === 'platform' || !overlaps(p, o)) continue;
      p.x = dx > 0 ? o.x - p.w : o.x + o.w;
      blocked = true;
    }
    p.x = Math.max(0, Math.min(this.stage.width * TILE - p.w, p.x));
  }

  if (dy) {
    p.y += dy;
    for (const o of this.nearby(p)) {
      if (o.type === 'platform' || !overlaps(p, o)) continue;
      p.y = dy > 0 ? o.y - p.h : o.y + o.h;
      p.vy = 0;
      blocked = true;
    }
  }

  if (blocked) {
    p.platformKey = null;
    p.grounded = false;
  }
};

// Resolve lower crates first, then let falling crates use other crates as
// one-way supports. The previous implementation only collided crates with
// stage solids, allowing vertically stacked crates to merge into one another.
GameEngine.prototype.moveCrates = function moveCrates(dt) {
  const ordered = [...this.crates].sort((a, b) => (b.y + b.h) - (a.y + a.h));

  for (const crate of ordered) {
    const bottomBefore = crate.y + crate.h;
    crate.vy = Math.min(900, crate.vy + 1800 * dt);
    crate.y += crate.vy * dt;
    crate.grounded = false;

    for (const o of this.nearby(crate)) {
      if (!overlaps(crate, o) || (o.type === 'platform' && (crate.vy < 0 || bottomBefore > o.y + 1))) continue;
      if (crate.vy >= 0) {
        crate.y = o.y - crate.h;
        crate.vy = 0;
        crate.grounded = true;
      } else {
        crate.y = o.y + o.h;
        crate.vy = 0;
      }
    }

    if (!crate.grounded && crate.vy >= 0) {
      let support = null;
      for (const other of this.crates) {
        if (other === crate) continue;
        const horizontal = crate.x < other.x + other.w && crate.x + crate.w > other.x;
        const crossedTop = bottomBefore <= other.y + 2 && crate.y + crate.h >= other.y;
        if (!horizontal || !crossedTop) continue;
        if (!support || other.y < support.y) support = other;
      }

      if (support) {
        crate.y = support.y - crate.h;
        crate.vy = 0;
        crate.grounded = true;
      }
    }

    if (crate.y > this.stage.height * TILE + 100) {
      crate.x = crate.spawnX;
      crate.y = crate.spawnY;
      crate.vy = 0;
      crate.grounded = false;
    }
  }
};
