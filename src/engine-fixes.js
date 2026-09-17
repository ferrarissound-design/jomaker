import { TILE, PART_DEFAULTS } from './stage.js?v=20260916-enemy-direction-1';
import { GameEngine } from './engine.js?v=20260916-enemy-direction-1';

const overlaps = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

// New cannons should face left unless the creator explicitly changes the part setting.
PART_DEFAULTS.cannon = { ...PART_DEFAULTS.cannon, direction: 'left' };

// Cannons are one-way from below, but their visible body is solid from the
// left and right. The player can still land on top without the whole tile
// becoming a normal solid block.
const baseMove = GameEngine.prototype.move;
GameEngine.prototype.move = function moveWithCannonCollision(body, dt, isPlayer = false) {
  const startX = body.x;
  const startY = body.y;
  const startRight = startX + body.w;
  const startBottom = startY + body.h;
  const intendedDx = body.vx * dt;
  const result = baseMove.call(this, body, dt, isPlayer);

  if (isPlayer && intendedDx) {
    for (const cannon of this.cannons ?? []) {
      const left = cannon.x;
      const right = cannon.x + TILE;
      const top = cannon.y + 13;
      const bottom = cannon.y + TILE;

      // Side collision only applies when the player was already beside the
      // visible cannon body. A player descending from above is left alone so
      // the top-landing logic below can catch them cleanly.
      const verticalSideOverlap = startBottom > top + 1 && startY < bottom - 1;
      if (!verticalSideOverlap) continue;

      if (intendedDx > 0) {
        const crossedLeftSide = startRight <= left + 1 && body.x + body.w > left;
        const startedInside = startRight > left && startX < right;
        if (crossedLeftSide || (startedInside && body.x + body.w > left)) {
          body.x = left - body.w;
          result.wall = true;
        }
      } else {
        const crossedRightSide = startX >= right - 1 && body.x < right;
        const startedInside = startRight > left && startX < right;
        if (crossedRightSide || (startedInside && body.x < right)) {
          body.x = right;
          result.wall = true;
        }
      }
    }
  }

  if (!isPlayer || body.vy < 0) return result;

  const bottomBefore = result.bottomBefore;
  let supportTop = null;

  for (const cannon of this.cannons ?? []) {
    const top = cannon.y + 13;
    const horizontal = body.x < cannon.x + TILE && body.x + body.w > cannon.x;
    const crossedTop = bottomBefore <= top + 1 && body.y + body.h >= top;
    if (!horizontal || !crossedTop || body.y >= top) continue;
    if (supportTop === null || top < supportTop) supportTop = top;
  }

  if (supportTop !== null) {
    body.y = supportTop - body.h;
    body.vy = 0;
    body.grounded = true;
  }

  return result;
};

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

// Two trikes that are both in the kicked/sliding state destroy each other.
// The engine substeps at 120 Hz, so checking the small swept gap before the
// normal step prevents fast trikes from passing through each other between frames.
const TRIKE_SLIDE_SPEED = 290;
const baseStep = GameEngine.prototype.step;
const slidingTrikesWillCollide = (a, b, dt) => {
  if (a.type !== 'trikeEnemy' || b.type !== 'trikeEnemy') return false;
  if (a.state !== 'sliding' || b.state !== 'sliding') return false;
  if (a.y >= b.y + b.h || a.y + a.h <= b.y) return false;
  if (overlaps(a, b)) return true;

  const aCenter = a.x + a.w / 2;
  const bCenter = b.x + b.w / 2;
  const left = aCenter <= bCenter ? a : b;
  const right = left === a ? b : a;
  const leftVx = left.direction * TRIKE_SLIDE_SPEED;
  const rightVx = right.direction * TRIKE_SLIDE_SPEED;
  const closingSpeed = leftVx - rightVx;
  if (closingSpeed <= 0) return false;

  const gap = right.x - (left.x + left.w);
  return gap <= closingSpeed * dt + 1e-9;
};

GameEngine.prototype.step = function stepWithTrikeMutualDefeat(dt, input) {
  // Long frames are split by the base engine. Let those recursive 120 Hz
  // slices pass through this wrapper so collision timing stays precise.
  if (dt <= 1 / 120 + 1e-9) {
    const sliding = (this.enemies ?? []).filter(e => e.type === 'trikeEnemy' && e.state === 'sliding');
    const defeated = new Set();

    for (let i = 0; i < sliding.length; i++) {
      if (defeated.has(sliding[i])) continue;
      for (let j = i + 1; j < sliding.length; j++) {
        if (defeated.has(sliding[j])) continue;
        if (!slidingTrikesWillCollide(sliding[i], sliding[j], dt)) continue;
        defeated.add(sliding[i]);
        defeated.add(sliding[j]);
        break;
      }
    }

    if (defeated.size) {
      this.enemies = this.enemies.filter(e => !defeated.has(e));
      this.stompSerial++;
      this.updateEnemyDoors();
    }
  }

  return baseStep.call(this, dt, input);
};
