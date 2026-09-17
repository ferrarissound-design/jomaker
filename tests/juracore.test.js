import '../src/engine-fixes.js?v=20260917-trike-mutual-defeat-1';
import { JURACORE_DURATION } from '../src/juracore-runtime.js?v=20260917-juracore-1';
import test from 'node:test';
import assert from 'node:assert/strict';
import { TILE, PARTS, StageEditor, createStage } from '../src/stage.js?v=20260916-enemy-direction-1';
import { GameEngine } from '../src/engine.js?v=20260916-enemy-direction-1';
import { encodeStage, decodeStage } from '../src/share.js?v=20260916-enemy-direction-1';

const idle = { left: false, right: false, jump: false };

function stageWithCore(extra = []) {
  const stage = createStage();
  stage.objects.push({ type: 'juracore', x: 3, y: 11 }, ...extra);
  return stage;
}

function placePlayerOn(game, x, y) {
  Object.assign(game.player, { x: x * TILE + 8, y: y * TILE + 8, vx: 0, vy: 0 });
}

test('Juracore is a placeable and shareable stage part', () => {
  assert.equal(PARTS.juracore[1], 'ジュラコア');
  const editor = new StageEditor(createStage());
  assert.equal(editor.place('juracore', 6, 11), true);
  const decoded = decodeStage(encodeStage(editor.stage));
  assert.ok(decoded.objects.some(o => o.type === 'juracore' && o.x === 6 && o.y === 11));
});

test('collecting Juracore starts the eight-second power and hides the pickup', () => {
  const game = new GameEngine(stageWithCore());
  placePlayerOn(game, 3, 11);
  game.step(1 / 120, idle);
  assert.ok(game.collectedJuraCores.has('3,11'));
  assert.ok(game.juracoreTimer > JURACORE_DURATION - .02);
  assert.ok(game.juracoreTimer <= JURACORE_DURATION);
});

test('powered player defeats enemies and cancels cannon shots on contact', () => {
  const game = new GameEngine(stageWithCore([{ type: 'enemy', x: 5, y: 11, props: { direction: 'left' } }]));
  placePlayerOn(game, 3, 11);
  game.step(1 / 120, idle);
  assert.ok(game.juracoreTimer > 0);

  const enemy = game.enemies[0];
  Object.assign(enemy, { x: game.player.x, y: game.player.y, vx: 0, vy: 0 });
  game.projectiles.push({ x: game.player.x, y: game.player.y, w: 15, h: 11, vx: 0 });
  const deathsBefore = game.deaths;
  game.step(1 / 120, idle);

  assert.equal(game.deaths, deathsBefore);
  assert.equal(game.enemies.length, 0);
  assert.equal(game.projectiles.length, 0);
});

test('spikes and pits stay lethal during Juracore power', () => {
  const game = new GameEngine(stageWithCore([{ type: 'spike', x: 6, y: 11 }]));
  placePlayerOn(game, 3, 11);
  game.step(1 / 120, idle);
  assert.ok(game.juracoreTimer > 0);

  placePlayerOn(game, 6, 11);
  game.step(1 / 120, idle);
  assert.equal(game.deaths, 1);
  assert.equal(game.juracoreTimer, 0);

  // Re-arm the power directly so the pit rule can be checked independently.
  game.juracoreTimer = JURACORE_DURATION;
  game.player.y = game.stage.height * TILE + 101;
  game.step(1 / 120, idle);
  assert.equal(game.deaths, 2);
});

test('Juracore power expires normally', () => {
  const game = new GameEngine(stageWithCore());
  game.juracoreTimer = 1 / 60;
  game.step(1 / 120, idle);
  assert.ok(game.juracoreTimer > 0);
  game.step(1 / 120, idle);
  assert.equal(game.juracoreTimer, 0);
});
