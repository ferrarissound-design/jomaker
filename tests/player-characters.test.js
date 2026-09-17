import test from 'node:test';
import assert from 'node:assert/strict';
import { MOMOSE_FRAMES, PLAYER_CHARACTERS, momoseFrameFor, normalizePlayerCharacter } from '../src/player-characters.js';

test('player-facing names stay 恐竜 and 百瀬', () => {
  assert.equal(PLAYER_CHARACTERS.dino.label, '恐竜');
  assert.equal(PLAYER_CHARACTERS.momose.label, '百瀬');
  assert.equal(normalizePlayerCharacter('momose'), 'momose');
  assert.equal(normalizePlayerCharacter('human'), 'dino');
});

test('百瀬 selects all seven measured source rectangles by movement state', () => {
  const player = { grounded: true, vx: 0, facing: 1 };
  assert.equal(momoseFrameFor(player, 0), MOMOSE_FRAMES.idle);
  player.vx = 80;
  assert.equal(momoseFrameFor(player, 0), MOMOSE_FRAMES.walkRight1);
  assert.equal(momoseFrameFor(player, .13), MOMOSE_FRAMES.walkRight2);
  player.facing = -1;
  assert.equal(momoseFrameFor(player, 0), MOMOSE_FRAMES.walkLeft1);
  assert.equal(momoseFrameFor(player, .13), MOMOSE_FRAMES.walkLeft2);
  player.grounded = false;
  assert.equal(momoseFrameFor(player, 0), MOMOSE_FRAMES.jumpLeft);
  player.facing = 1;
  assert.equal(momoseFrameFor(player, 0), MOMOSE_FRAMES.jumpRight);
});
