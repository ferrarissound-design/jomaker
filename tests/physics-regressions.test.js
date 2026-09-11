import test from 'node:test';
import assert from 'node:assert/strict';
import '../src/engine-fixes.js';
import { GameEngine } from '../src/engine.js';
import { createStage } from '../src/stage.js';

const idle = { left: false, right: false, jump: false, jumpHeld: false };
const advance = (game, frames, input = idle) => {
  for (let i = 0; i < frames; i++) game.step(1 / 120, input);
};

test('vertical moving platforms do not launch an idle rider sideways into a ceiling', () => {
  const game = new GameEngine(createStage());
  game.player = {
    x: 106,
    y: 150,
    w: 28,
    h: 38,
    vx: 0,
    vy: 0,
    grounded: true,
    platformKey: 'moving',
    facing: 1
  };
  game.movingPlatforms = [{ key: 'moving', x: 96, y: 130, prevX: 96, prevY: 140, w: 48, h: 12 }];
  game.solids = new Map([
    ['2,2', { key: '2,2', type: 'block', x: 96, y: 96, w: 48, h: 48 }]
  ]);

  game.carryPlayerWithPlatform();

  assert.equal(game.player.x, 106);
  assert.equal(game.player.y, 144);
  assert.equal(game.player.platformKey, null);
});

test('vertically stacked crates land on each other instead of merging', () => {
  const stage = createStage();
  stage.objects.push({ type: 'crate', x: 4, y: 9 }, { type: 'crate', x: 4, y: 10 });
  const game = new GameEngine(stage);

  advance(game, 120);

  const crates = [...game.crates].sort((a, b) => a.y - b.y);
  assert.equal(crates.length, 2);
  assert.equal(crates[0].y + crates[0].h, crates[1].y);
  assert.equal(crates[0].grounded, true);
  assert.equal(crates[1].grounded, true);
});

test('timer blocks stay hidden and non-solid until they can safely return', () => {
  const stage = createStage();
  stage.objects = stage.objects.filter(o => !(o.x === 4 && o.y === 11));
  stage.objects.push({ type: 'timerBlock', x: 4, y: 11 });
  const game = new GameEngine(stage);

  game.activateTimer(0.01);
  game.player.x = 4 * 48 + 10;
  game.player.y = 11 * 48 + 8;
  game.player.vx = 0;
  game.player.vy = 0;
  game.step(1 / 60, idle);

  assert.ok(game.timerGate > 0);
  assert.equal(game.solids.has('4,11'), false);

  game.player.x = 6 * 48 + 10;
  game.step(1 / 60, idle);

  assert.equal(game.timerGate, 0);
  assert.equal(game.solids.has('4,11'), true);
});
