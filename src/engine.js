import { TILE, clone, validateStage } from './stage.js';

const overlaps = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
const objectKey = o => `${o.x},${o.y}`;
const prop = (o, name, fallback) => o?.props?.[name] ?? fallback;

export class GameEngine {
  constructor(stage) {
    this.stage = clone(validateStage(stage));
    this.deaths = 0;
    this.checkpoint = null;
    this.time = 0;
    this.jumpSerial = 0;
    this.coinSerial = 0;
    this.landingSerial = 0;
    this.stompSerial = 0;
    this.goalSerial = 0;
    this.hasGroundContact = false;
    this.reset();
  }

  makeSolid(o) {
    return {
      ...o,
      key: objectKey(o),
      x: o.x * TILE,
      y: o.y * TILE,
      w: TILE,
      h: o.type === 'platform' ? 12 : TILE
    };
  }

  rebuildRuntime() {
    this.solids = new Map();
    const solidTypes = ['ground', 'block', 'platform', 'breakable', 'door', 'switchBlock', 'pressureBlock', 'enemyDoor', 'timerBlock'];

    for (const o of this.stage.objects) {
      if (!solidTypes.includes(o.type)) continue;
      if (o.type === 'switchBlock' && this.switchOn) continue;
      if (o.type === 'pressureBlock' && this.pressureActive) continue;
      if (o.type === 'enemyDoor' && this.enemies.length === 0) continue;
      if (o.type === 'timerBlock' && this.timerGate > 0) continue;
      this.solids.set(objectKey(o), this.makeSolid(o));
    }

    this.movingPlatforms = this.stage.objects
      .filter(o => o.type === 'movingPlatform')
      .map(o => ({
        key: objectKey(o),
        baseX: o.x * TILE,
        baseY: o.y * TILE,
        x: o.x * TILE,
        y: o.y * TILE,
        prevX: o.x * TILE,
        prevY: o.y * TILE,
        axis: prop(o, 'axis', 'x'),
        distance: prop(o, 'distance', 2),
        speed: prop(o, 'speed', 1.25),
        props: o.props,
        w: TILE,
        h: 12
      }));

    this.crates = this.stage.objects
      .filter(o => o.type === 'crate')
      .map(o => ({
        key: objectKey(o),
        spawnX: o.x * TILE + 4,
        spawnY: o.y * TILE + 4,
        x: o.x * TILE + 4,
        y: o.y * TILE + 4,
        w: 40,
        h: 40,
        vy: 0,
        grounded: false
      }));

    this.cannons = this.stage.objects
      .filter(o => o.type === 'cannon')
      .map((o, index) => ({
        key: objectKey(o),
        x: o.x * TILE,
        y: o.y * TILE,
        direction: prop(o, 'direction', 'right'),
        interval: prop(o, 'interval', 1.65),
        timer: .35 + index * .12
      }));

    this.warps = this.stage.objects.filter(o => o.type === 'warp');
  }

  reset(clearCheckpoint = true) {
    if (clearCheckpoint) this.checkpoint = null;
    const spawn = this.checkpoint ?? this.stage.playerStart;

    this.switchOn = false;
    this.pressureActive = false;
    this.timerGate = 0;
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
    this.projectiles = [];

    this.enemies = this.stage.objects
      .filter(o => ['enemy', 'flyingEnemy'].includes(o.type))
      .map((o, index) => o.type === 'flyingEnemy'
        ? {
            key: objectKey(o),
            type: 'flyingEnemy',
            x: o.x * TILE + 4,
            y: o.y * TILE + 10,
            baseY: o.y * TILE + 10,
            w: 40,
            h: 24,
            vx: 82,
            phase: index * .85,
            minX: Math.max(0, (o.x - 2) * TILE + 4),
            maxX: Math.min(this.stage.width * TILE - 40, (o.x + 2) * TILE + 4)
          }
        : {
            key: objectKey(o),
            type: 'enemy',
            x: o.x * TILE + 7,
            y: o.y * TILE + 12,
            w: 34,
            h: 36,
            vx: 65,
            vy: 0,
            grounded: false
          });

    this.rebuildRuntime();

    this.player = {
      x: spawn.x * TILE + 10,
      y: spawn.y * TILE + 8,
      w: 28,
      h: 38,
      vx: 0,
      vy: 0,
      grounded: false,
      platformKey: null,
      facing: 1
    };
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

  setSwitch(on) {
    this.switchOn = on;
    for (const o of this.stage.objects.filter(o => o.type === 'switchBlock')) {
      const key = objectKey(o);
      if (on) this.solids.delete(key);
      else this.solids.set(key, this.makeSolid(o));
    }
  }

  toggleSwitch() {
    this.setSwitch(!this.switchOn);
  }

  setPressure(active) {
    if (this.pressureActive === active) return;
    this.pressureActive = active;
    for (const o of this.stage.objects.filter(o => o.type === 'pressureBlock')) {
      const key = objectKey(o);
      if (active) this.solids.delete(key);
      else this.solids.set(key, this.makeSolid(o));
    }
  }

  updateEnemyDoors() {
    for (const o of this.stage.objects.filter(o => o.type === 'enemyDoor')) {
      const key = objectKey(o);
      if (this.enemies.length === 0) this.solids.delete(key);
      else if (!this.solids.has(key)) this.solids.set(key, this.makeSolid(o));
    }
  }

  activateTimer(seconds = 3.2) {
    this.timerGate = Math.max(this.timerGate, seconds);
    for (const o of this.stage.objects.filter(o => o.type === 'timerBlock')) {
      this.solids.delete(objectKey(o));
    }
  }

  tickTimer(dt) {
    if (this.timerGate <= 0) return;
    this.timerGate = Math.max(0, this.timerGate - dt);
    if (this.timerGate > 0) return;
    for (const o of this.stage.objects.filter(o => o.type === 'timerBlock')) {
      this.solids.set(objectKey(o), this.makeSolid(o));
    }
  }

  tryPushCrate(crate, dx) {
    if (!dx) return true;
    const before = crate.x;
    crate.x += dx;
    crate.x = Math.max(0, Math.min(this.stage.width * TILE - crate.w, crate.x));

    const blockedBySolid = this.nearby(crate).some(o => o.type !== 'platform' && overlaps(crate, o));
    const blockedByCrate = this.crates.some(other => other !== crate && overlaps(crate, other));
    if (blockedBySolid || blockedByCrate) {
      crate.x = before;
      return false;
    }
    return true;
  }

  move(body, dt, isPlayer = false) {
    const dx = body.vx * dt;
    body.x += dx;
    let wall = false;

    if (isPlayer && dx) {
      for (const crate of this.crates) {
        if (!overlaps(body, crate)) continue;
        const pushed = this.tryPushCrate(crate, dx);
        if (!pushed || overlaps(body, crate)) {
          body.x = dx > 0 ? crate.x - body.w : crate.x + crate.w;
          wall = true;
        }
      }
    }

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

    if (isPlayer) {
      for (const crate of this.crates) {
        if (!overlaps(body, crate)) continue;
        if (body.vy >= 0 && bottomBefore <= crate.y + 8) {
          body.y = crate.y - body.h;
          body.vy = 0;
          body.grounded = true;
        } else if (body.vy < 0) {
          body.y = crate.y + crate.h;
          body.vy = 0;
        }
      }
    }

    return { wall, bottomBefore };
  }

  moveCrates(dt) {
    for (const crate of this.crates) {
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

      if (crate.y > this.stage.height * TILE + 100) {
        crate.x = crate.spawnX;
        crate.y = crate.spawnY;
        crate.vy = 0;
      }
    }
  }

  updatePressure() {
    const plates = this.stage.objects.filter(o => o.type === 'plate');
    const pressed = plates.some(o => {
      const pad = { x: o.x * TILE + 3, y: o.y * TILE + 35, w: 42, h: 13 };
      return overlaps(this.player, pad) || this.crates.some(crate => overlaps(crate, pad));
    });
    this.setPressure(pressed);
  }

  updateMovingPlatforms(dt) {
    this.time += dt;
    for (const platform of this.movingPlatforms) {
      platform.prevX = platform.x;
      platform.prevY = platform.y;
      const offset = Math.sin(this.time * platform.speed) * TILE * platform.distance;
      if (platform.axis === 'y') {
        platform.x = platform.baseX;
        platform.y = Math.max(0, Math.min(this.stage.height * TILE - platform.h, platform.baseY + offset));
      } else {
        platform.y = platform.baseY;
        platform.x = Math.max(0, Math.min(this.stage.width * TILE - platform.w, platform.baseX + offset));
      }
    }
  }

  carryPlayerWithPlatform() {
    const key = this.player.platformKey;
    if (!key) return;
    const platform = this.movingPlatforms.find(p => p.key === key);
    if (!platform) return;
    this.player.x += platform.x - platform.prevX;
    this.player.y += platform.y - platform.prevY;
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

  useWarp(source) {
    if (this.warps.length < 2 || this.warpCooldown > 0) return false;
    const index = this.warps.findIndex(o => o.x === source.x && o.y === source.y);
    if (index < 0) return false;
    const targetKey = prop(source, 'target', '');
    const linked = targetKey ? this.warps.find(o => objectKey(o) === targetKey) : null;
    const target = linked ?? this.warps[(index + 1) % this.warps.length];
    this.player.x = target.x * TILE + 10;
    this.player.y = target.y * TILE + 8;
    this.player.vx = 0;
    this.player.vy = 0;
    this.player.platformKey = null;
    this.warpCooldown = .55;
    return true;
  }

  updateCannons(dt) {
    for (const cannon of this.cannons) {
      cannon.timer -= dt;
      if (cannon.timer > 0) continue;
      cannon.timer += cannon.interval;
      const left = cannon.direction === 'left';
      this.projectiles.push({
        x: cannon.x + (left ? 2 : 31),
        y: cannon.y + 18,
        w: 15,
        h: 11,
        vx: left ? -300 : 300
      });
    }
  }

  updateProjectiles(dt) {
    const next = [];

    projectileLoop:
    for (const shot of this.projectiles) {
      shot.x += shot.vx * dt;
      if (shot.x > this.stage.width * TILE + TILE || shot.x + shot.w < -TILE) continue;

      if (overlaps(shot, this.player)) {
        this.die();
        return true;
      }

      for (const crate of this.crates) {
        if (!overlaps(shot, crate)) continue;
        this.tryPushCrate(crate, Math.sign(shot.vx) * TILE * .32);
        continue projectileLoop;
      }

      for (let i = this.enemies.length - 1; i >= 0; i--) {
        if (!overlaps(shot, this.enemies[i])) continue;
        this.enemies.splice(i, 1);
        this.updateEnemyDoors();
        continue projectileLoop;
      }

      for (const o of this.stage.objects) {
        if (!['switch', 'timerSwitch'].includes(o.type)) continue;
        const button = { x: o.x * TILE + 5, y: o.y * TILE + 22, w: 38, h: 22 };
        if (!overlaps(shot, button)) continue;
        if (o.type === 'switch') this.toggleSwitch();
        else this.activateTimer(prop(o, 'duration', 3.2));
        continue projectileLoop;
      }

      for (const solid of this.nearby(shot)) {
        if (!overlaps(shot, solid)) continue;
        if (solid.type === 'breakable') this.breakBlock(solid);
        continue projectileLoop;
      }

      next.push(shot);
    }

    this.projectiles = next;
    return false;
  }

  moveFlyingEnemy(enemy, dt) {
    enemy.x += enemy.vx * dt;
    if (enemy.x <= enemy.minX) {
      enemy.x = enemy.minX;
      enemy.vx = Math.abs(enemy.vx);
    } else if (enemy.x >= enemy.maxX) {
      enemy.x = enemy.maxX;
      enemy.vx = -Math.abs(enemy.vx);
    }

    const bob = Math.sin(this.time * 3.2 + enemy.phase) * 12;
    enemy.y = Math.max(4, Math.min(this.stage.height * TILE - enemy.h - 4, enemy.baseY + bob));
  }

  step(dt, input) {
    if (this.clear) return;
    const p = this.player;
    const jumpHeld = input.jumpHeld ?? input.jump;

    this.warpCooldown = Math.max(0, this.warpCooldown - dt);
    this.tickTimer(dt);
    this.updateMovingPlatforms(dt);
    this.carryPlayerWithPlatform();
    this.moveCrates(dt);

    this.buffer = input.jump ? .13 : Math.max(0, this.buffer - dt);
    this.coyote = p.grounded ? .11 : Math.max(0, this.coyote - dt);
    p.vx = (Number(input.right) - Number(input.left)) * 260;
    if (p.vx) p.facing = Math.sign(p.vx);

    if (this.buffer > 0 && this.coyote > 0) {
      p.vy = -650;
      p.grounded = false;
      p.platformKey = null;
      this.coyote = 0;
      this.buffer = 0;
      this.jumpCuttable = true;
      this.jumpSerial++;
    }

    if (this.jumpCuttable && !jumpHeld && p.vy < -260) {
      p.vy = -260;
      this.jumpCuttable = false;
    }

    const groundedBeforeMove = p.grounded;
    const movement = this.move(p, dt, true);
    this.landOnMovingPlatform(movement.bottomBefore);
    if (p.grounded) {
      if (this.hasGroundContact && !groundedBeforeMove) this.landingSerial++;
      this.hasGroundContact = true;
    }
    if (p.vy >= 0) this.jumpCuttable = false;

    for (let i = this.enemies.length - 1; i >= 0; i--) {
      const e = this.enemies[i];
      if (e.type === 'flyingEnemy') {
        this.moveFlyingEnemy(e, dt);
      } else {
        const { wall } = this.move(e, dt, false);
        const ahead = e.vx > 0 ? e.x + e.w + 5 : e.x - 5;
        const support = this.solids.has(`${Math.floor(ahead / TILE)},${Math.floor((e.y + e.h + 5) / TILE)}`);
        if (wall || e.x <= 0 || e.x + e.w >= this.stage.width * TILE || (e.grounded && !support)) e.vx *= -1;
      }

      if (!overlaps(p, e)) continue;
      const stomp = p.vy >= 0 && movement.bottomBefore <= e.y + 10;
      if (stomp) {
        this.enemies.splice(i, 1);
        p.y = e.y - p.h;
        p.vy = -420;
        p.grounded = false;
        this.stompSerial++;
        this.updateEnemyDoors();
      } else {
        return this.die();
      }
    }

    this.updatePressure();
    this.updateCannons(dt);
    if (this.updateProjectiles(dt)) return;

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
      if (o.type === 'coin' && !this.coins.has(key)) {
        this.coins.add(key);
        this.coinSerial++;
      }

      if (o.type === 'key' && !this.collectedKeys.has(key)) {
        this.collectedKeys.add(key);
        this.keys++;
      }

      if (o.type === 'checkpoint') this.checkpoint = { x: o.x, y: o.y };

      if (o.type === 'switch') {
        switchesNow.add(key);
        if (!this.touchingSwitches.has(key)) this.toggleSwitch();
      }

      if (o.type === 'timerSwitch') {
        switchesNow.add(key);
        if (!this.touchingSwitches.has(key)) this.activateTimer(prop(o, 'duration', 3.2));
      }

      if (o.type === 'goal' && !this.clear) {
        this.clear = true;
        this.goalSerial++;
      }
    }

    this.touchingSwitches = switchesNow;
  }

  die() {
    this.deaths++;
    this.reset(false);
  }
}
