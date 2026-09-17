import { TILE, PARTS } from './stage.js?v=20260916-enemy-direction-1';
import { GameEngine } from './engine.js?v=20260916-enemy-direction-1';

export const JURACORE_DURATION = 8;
export const JURACORE_WARNING = 1.5;

// Insert Juracore near the other collectible parts without replacing the
// existing PARTS object. Stage validation, sharing and the editor palette all
// reference this same mutable object.
if (!PARTS.juracore) {
  const entries = Object.entries(PARTS);
  for (const key of Object.keys(PARTS)) delete PARTS[key];
  for (const [key, value] of entries) {
    PARTS[key] = value;
    if (key === 'coin') PARTS.juracore = ['✹', 'ジュラコア', '#e79032'];
  }
}

const overlaps = (a, b) =>
  a.x < b.x + b.w &&
  a.x + a.w > b.x &&
  a.y < b.y + b.h &&
  a.y + a.h > b.y;

const objectKey = o => `${o.x},${o.y}`;
const pickupBody = o => ({ x: o.x * TILE + 8, y: o.y * TILE + 8, w: 32, h: 40 });
const spikeBody = o => ({ x: o.x * TILE + 8, y: o.y * TILE + 8, w: 32, h: 40 });

function collectJuracore(game) {
  const p = game.player;
  let collected = false;
  for (const o of game.stage.objects) {
    if (o.type !== 'juracore') continue;
    const key = objectKey(o);
    if (game.collectedJuraCores.has(key) || !overlaps(p, pickupBody(o))) continue;
    game.collectedJuraCores.add(key);
    game.juracoreTimer = JURACORE_DURATION;
    game.juracoreSerial++;
    collected = true;
  }
  return collected;
}

function removePoweredContacts(game) {
  const p = game.player;
  const defeated = new Set();
  for (const enemy of game.enemies ?? []) {
    if (overlaps(p, enemy)) defeated.add(enemy);
  }
  if (defeated.size) {
    game.enemies = game.enemies.filter(enemy => !defeated.has(enemy));
    game.stompSerial += defeated.size;
    game.updateEnemyDoors();
  }

  if (game.projectiles?.length) {
    game.projectiles = game.projectiles.filter(shot => !overlaps(p, shot));
  }
}

function touchingLethalStageHazard(game) {
  const p = game.player;
  if (p.y > game.stage.height * TILE + 100) return true;
  return game.stage.objects.some(o => o.type === 'spike' && overlaps(p, spikeBody(o)));
}

const baseReset = GameEngine.prototype.reset;
GameEngine.prototype.reset = function resetWithJuracore(clearCheckpoint = true) {
  const result = baseReset.call(this, clearCheckpoint);
  this.juracoreTimer = 0;
  this.collectedJuraCores = new Set();
  this.juracoreSerial = 0;
  return result;
};

// engine-fixes.js already wraps step for trike-vs-trike interactions. This
// wrapper intentionally sits outside that logic and only changes combat death
// while the Juracore timer is active. Pits and spikes remain lethal.
const baseStep = GameEngine.prototype.step;
GameEngine.prototype.step = function stepWithJuracore(dt, input) {
  if (dt > 1 / 120 + 1e-9) return baseStep.call(this, dt, input);

  // Allow a core that the player is already touching at the start of a frame
  // to protect them immediately.
  collectJuracore(this);

  if (this.juracoreTimer > 0) {
    this.juracoreTimer = Math.max(0, this.juracoreTimer - dt);
  }

  const powered = this.juracoreTimer > 0;
  if (powered) removePoweredContacts(this);

  let blockedDeath = false;
  let result;
  if (powered) {
    this.die = () => {
      blockedDeath = true;
      return false;
    };
  }

  try {
    result = baseStep.call(this, dt, input);
  } finally {
    if (powered) delete this.die;
  }

  // A spike or a fall is still a real miss even while powered. Enemy and
  // cannon-shot contacts are converted into attacks instead.
  if (powered && blockedDeath && touchingLethalStageHazard(this)) {
    return GameEngine.prototype.die.call(this);
  }

  if (powered) removePoweredContacts(this);
  collectJuracore(this);
  return result;
};
