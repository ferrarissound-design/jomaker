import test from 'node:test';
import assert from 'node:assert/strict';

import '../src/engine-fixes.js?v=20260916-cannon-rider-1';
import { TILE, createStage, defaultPropsFor } from '../src/stage.js?v=20260916-enemy-direction-1';
import { GameEngine } from '../src/engine.js?v=20260916-enemy-direction-1';

test('new cannons default to facing left', () => {
  assert.equal(defaultPropsFor('cannon').direction, 'left');
});

test('player can land on the visible top of a cannon', () => {
  const stage = createStage();
  const cannon = { type: 'cannon', x: 5, y: 9, props: { direction: 'left', interval: 8 } };
  stage.objects.push(cannon);

  const game = new GameEngine(stage);
  const top = cannon.y * TILE + 13;
  game.player.x = cannon.x * TILE + 10;
  game.player.y = top - game.player.h - 2;
  game.player.vy = 120;
  game.player.grounded = false;

  game.move(game.player, 1 / 30, true);

  assert.equal(game.player.grounded, true);
  assert.equal(game.player.vy, 0);
  assert.equal(game.player.y + game.player.h, top);
});

test('cannon remains one-way so the player is not blocked from below', () => {
  const stage = createStage();
  const cannon = { type: 'cannon', x: 5, y: 9, props: { direction: 'left', interval: 8 } };
  stage.objects.push(cannon);

  const game = new GameEngine(stage);
  const top = cannon.y * TILE + 13;
  game.player.x = cannon.x * TILE + 10;
  game.player.y = top + 4;
  game.player.vy = -400;
  game.player.grounded = false;

  game.move(game.player, 1 / 120, true);

  assert.equal(game.player.grounded, false);
  assert.ok(game.player.vy < 0);
});
