import { TILE, clone, validateStage } from './stage.js';

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const objectKey = o => `${o.x},${o.y}`;

export class GameEngine {
  constructor(stage) {
    this.stage = clone(validateStage(stage));
    this.deaths = 0;
    this.checkpoint = null;
    this.time = 0;
    this.reset();
  }

  rebuildRuntime() {
    this.solids = new Map();
    for (const o of this.stage.objects) {
      if (!['ground', 'block', 'platform', 'breakable', 'door', 'switchBlock'].includes(o.type)) continue;
      if (o.type === 'switchBlock' && this.switchOn) continue;
      const key = objectKey(o);
      this.solids.set(key, {
        ...o,
        key,
        x: o.x * TILE,
        y: o.y * TILE,
        w: TILE,
        h: o.type === 'platform' ? 12 : TILE
      });
    }

    this.movingPlatforms = this.stage.objects
      .filter(o => o.type === 'movingPlatform')
      .map(o => ({
        key: objectKey(o),
        baseX: o.x * TILE,
        x: o.x * TILE,
        prevX: o.x * TILE,
        y: o.y * TILE,
        w: TILE,
        h: 12
      }));

    this.warps = this.stage.objects.filter(o => o.type === 'warp');
  }

  reset(clearCheckpoint = true) {
    if (clearCheckpoint) this.checkpoint = null;
    const spawn = this.checkpoint ?? this.stage.playerStart;

    this.switchOn = false;
    this.keys = 0;
    this.coins = new Set();
    this.collectedKeys = new Set();
    this.openedDoors = new Set();
    this.brokenBlocks = new Set();
    this.touchingSwitches = new Set();
    this.warpCooldown = 0;
    this.clear = false;
    this.coyote = 0;
    this.buffer = 0;
    this.jumpCuttable = false;
    this.rebuildRuntime();

    this.player = {
      x: spawn.x * TILE + 10,
      y: spawn.y * TILE + 8,
      w: 28,
      h: 38,
      vx: 0,
      vy: 0,
      grounded: false,
      platformKey: null
    };

    this.enemies = this.stage.objects
      .filter(o => o.type === 'enemy')
      .map(o => ({ x: o.x * TILE + 7, y: o.y * TILE + 12, w: 34, h: 36, vx: 65, vy: 0 }));
  }

  nearby(body) {
    const found = [];
    for (let y = Math.floor(body.y / TILE) - 1; y <= Math.floor((body.y + body.h) / TILE) + 1; y++) {
      for (let x = Math.floor(body.x / TILE) - 1; x <= Math.floor((body.x + body.w) / TILE) + 1; x++) {
        const o = this.solids.get(`${x},${y}`);
        if (o) found.push(o);
      }
    }
    return found;
  }

  openDoor(o) {
    if (this.keys <= 0) return false;
    this.keys--;
    this.openedDoors.add(o.key);
    this.solids.delete(o.key);
    return true;
  }

  breakBlock(o) {
    this.brokenBlocks.add(o.key);
    this.solids.delete(o.key);
  }

  move(body, dt, isPlayer = false) {
    body.x += body.vx * dt;
    let wall = false;

    for (const o of this.nearby(body)) {
      if (o.type === 'platform' || !overlaps(body, o)) continue;
      if (isPlayer && o.type === 'door' && this.openDoor(o)) continue;
      body.x = body.vx > 0 ? o.x - body.w : o.x + o.w;
      wall = true;
    }

    body.x = Math.max(0, Math.min(this.stage.width * TILE - body.w, body.x));

    const bottomBefore = body.y + body.h;
    body.vy = Math.min(900, body.vy + 1800 * dt);
    body.y += body.vy * dt;
    body.grounded = false;
    if (isPlayer) body.platformKey = null;

    for (const o of this.nearby(body)) {
      if (!overlaps(body, o) || (o.type === 'platform' && (body.vy < 0 || bottomBefore > o.y + 1))) continue;
      if (isPlayer && o.type === 'door' && this.openDoor(o)) continue;

      if (body.vy >= 0) {
        body.y = o.y - body.h;
        body.grounded = true;
        body.vy = 0;
      } else if (isPlayer && o.type === 'breakable') {
        this.breakBlock(o);
        body.vy = -120;
      } else {
        body.y = o.y + o.h;
        body.vy = 0;
      }
    }

    return { wall, bottomBefore };
  }

  updateMovingPlatforms(dt) {
    this.time += dt;
    for (const platform of this.movingPlatforms) {
      platform.prevX = platform.x;
      const range = TILE * 2;
      platform.x = Math.max(
        0,
        Math.min(
          this.stage.width * TILE - platform.w,
          platform.baseX + Math.sin(this.time * 1.25) * range
        )
      );
    }
  }

  carryPlayerWithPlatform() {
    const key = this.player.platformKey;
    if (!key) return;
    const platform = this.movingPlatforms.find(p => p.key === key);
    if (!platform) return;
    this.player.x += platform.x - platform.prevX;
    this.player.x = Math.max(0, Math.min(this.stage.width * TILE - this.player.w, this.player.x));
  }

  landOnMovingPlatform(bottomBefore) {
    const p = this.player;
    if (p.vy < 0) return;
    for (const platform of this.movingPlatforms) {
      const horizontal = p.x < platform.x + platform.w && p.x + p.w > platform.x;
      const crossedTop = bottomBefore <= platform.y + 8 && p.y + p.h >= platform.y;
      if (!horizontal || !crossedTop || p.y >= platform.y) continue;
      p.y = platform.y - p.h;
      p.vy = 0;
      p.grounded = true;
      p.platformKey = platform.key;
      return;
    }
  }

  setSwitch(on) {
    this.switchOn = on;
    for (const o of this.stage.objects.filter(o => o.type === 'switchBlock')) {
      const key = objectKey(o);
      if (on) {
        this.solids.delete(key);
      } else {
        this.solids.set(key, { ...o, key, x: o.x * TILE, y: o.y * TILE, w: TILE, h: TILE });
      }
    }
  }

  toggleSwitch() {
    this.setSwitch(!this.switchOn);
  }

  useWarp(source) {
    if (this.warps.length < 2 || this.warpCooldown > 0) return false;
    const index = this.warps.findIndex(o => o.x === source.x && o.y === source.y);
    if (index < 0) return false;
    const target = this.warps[(index + 1) % this.warps.length];
    this.player.x = target.x * TILE + 10;
    this.player.y = target.y * TILE + 8;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.platformKey = null;
    this.warpCooldown = .55;
    return true;
  }

  step(dt, input) {
    if (this.clear) return;
    const p = this.player;
    const jumpHeld = input.jumpHeld ?? input.jump;

    this.warpCooldown = Math.max(0, this.warpCooldown - dt);
    this.updateMovingPlatforms(dt);
    this.carryPlayerWithPlatform();

    this.buffer = input.jump ? .13 : Math.max(0, this.buffer - dt);
    this.coyote = p.grounded ? .11 : Math.max(0, this.coyote - dt);
    p.vx = (Number(input.right) - Number(input.left)) * 260;

    if (this.buffer > 0 && this.coyote > 0) {
      p.vy = -650;
      p.grounded = false;
      p.platformKey = null;
      this.coyote = 0;
      this.buffer = 0;
      this.jumpCuttable = true;
    }

    if (this.jumpCuttable && !jumpHeld && p.vy < -260) {
      p.vy = -260;
      this.jumpCuttable = false;
    }

    const movement = this.move(p, dt, true);
    this.landOnMovingPlatform(movement.bottomBefore);
    if (p.vy >= 0) this.jumpCuttable = false;

    for (const e of this.enemies) {
      const { wall } = this.move(e, dt, false);
      const ahead = e.vx > 0 ? e.x + e.w + 5 : e.x - 5;
      const support = this.solids.has(`${Math.floor(ahead / TILE)},${Math.floor((e.y + e.h + 5) / TILE)}`);
      if (wall || e.x <= 0 || e.x + e.w >= this.stage.width * TILE || (e.grounded && !support)) e.vx *= -1;
      if (overlaps(p, e)) return this.die();
    }

    if (p.y > this.stage.height * TILE + 100) return this.die();

    const switchesNow = new Set();

    for (const o of this.stage.objects) {
      if (Math.abs(o.x * TILE - p.x) > TILE * 2) continue;
      const key = objectKey(o);

      if (o.type === 'spring') {
        const spring = { x: o.x * TILE + 4, y: o.y * TILE + 24, w: 40, h: 24 };
        if (p.vy >= 0 && overlaps(p, spring)) {
          p.vy = -850;
          p.grounded = false;
          p.platformKey = null;
          this.jumpCuttable = false;
        }
        continue;
      }

      if (o.type === 'warp') {
        const portal = { x: o.x * TILE + 6, y: o.y * TILE + 4, w: 36, h: 42 };
        if (overlaps(p, portal) && this.useWarp(o)) break;
        continue;
      }

      const b = { x: o.x * TILE + 8, y: o.y * TILE + 8, w: 32, h: 40 };
      if (!overlaps(p, b)) continue;

      if (o.type === 'spike') return this.die();
      if (o.type === 'coin') this.coins.add(key);

      if (o.type === 'key' && !this.collectedKeys.has(key)) {
        this.collectedKeys.add(key);
        this.keys++;
      }

      if (o.type === 'checkpoint') this.checkpoint = { x: o.x, y: o.y };

      if (o.type === 'switch') {
        switchesNow.add(key);
        if (!this.touchingSwitches.has(key)) this.toggleSwitch();
      }

      if (o.type === 'goal') this.clear = true;
    }

    this.touchingSwitches = switchesNow;
  }

  die() {
    this.deaths++;
    this.reset(false);
  }
}
