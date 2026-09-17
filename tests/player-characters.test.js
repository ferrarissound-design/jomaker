import test from 'node:test';
import assert from 'node:assert/strict';
import { JO_FRAMES, MOMOSE_FRAMES, PLAYER_CHARACTERS, joFrameFor, momoseFrameFor, normalizePlayerCharacter } from '../src/player-characters.js';

test('player-facing names stay 恐竜, 百瀬 and JO', () => {
  assert.equal(PLAYER_CHARACTERS.dino.label, '恐竜');
  assert.equal(PLAYER_CHARACTERS.momose.label, '百瀬');
  assert.equal(PLAYER_CHARACTERS.jo.label, 'JO');
  assert.equal(normalizePlayerCharacter('momose'), 'momose');
  assert.equal(normalizePlayerCharacter('jo'), 'jo');
  assert.equal(normalizePlayerCharacter('human'), 'dino');
});

test('JO selects all seven measured source rectangles by movement state', () => {
  const player = { grounded: true, vx: 0, facing: 1 };
  assert.equal(joFrameFor(player, 0), JO_FRAMES.idle);
  player.vx = 80;
  assert.equal(joFrameFor(player, 0), JO_FRAMES.walkRight1);
  assert.equal(joFrameFor(player, .13), JO_FRAMES.walkRight2);
  player.facing = -1;
  assert.equal(joFrameFor(player, 0), JO_FRAMES.walkLeft1);
  assert.equal(joFrameFor(player, .13), JO_FRAMES.walkLeft2);
  player.grounded = false;
  assert.equal(joFrameFor(player, 0), JO_FRAMES.jumpLeft);
  player.facing = 1;
  assert.equal(joFrameFor(player, 0), JO_FRAMES.jumpRight);
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
