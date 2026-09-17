import test from 'node:test';
import assert from 'node:assert/strict';
import { TOA_FRAMES, toaFrameFor, JO_FRAMES, MOMOSE_FRAMES, PLAYER_CHARACTERS, joFrameFor, momoseFrameFor, normalizePlayerCharacter } from '../src/player-characters.js';

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
test('TOA selects all seven measured source rectangles by movement state', () => {
  const player = { grounded: true, vx: 0, facing: 1 };
  assert.equal(toaFrameFor(player, 0), TOA_FRAMES.idle);
  player.vx = 80;
  assert.equal(toaFrameFor(player, 0), TOA_FRAMES.walkRight1);
  assert.equal(toaFrameFor(player, .13), TOA_FRAMES.walkRight2);
  player.facing = -1;
  assert.equal(toaFrameFor(player, 0), TOA_FRAMES.walkLeft1);
  assert.equal(toaFrameFor(player, .13), TOA_FRAMES.walkLeft2);
  player.grounded = false;
  assert.equal(toaFrameFor(player, 0), TOA_FRAMES.jumpLeft);
  player.facing = 1;
  assert.equal(toaFrameFor(player, 0), TOA_FRAMES.jumpRight);
});


test('TOA selection persists through normalization without accepting inherited keys', () => {
  assert.equal(PLAYER_CHARACTERS.toa.label, 'TOA');
  assert.equal(normalizePlayerCharacter('toa'), 'toa');
  assert.equal(normalizePlayerCharacter('constructor'), 'dino');
});

test('TOA Canvas renderer uses each cropped pose and keeps its body axis on the shared hitbox', async () => {
  const previousImage = globalThis.Image;
  globalThis.Image = class { complete = true; naturalWidth = 1448; };
  try {
    const { drawPlayer } = await import('../src/render.js');
    const player = { x: 100, y: 200, w: 28, h: 38, character: 'toa', grounded: true, vx: 0, facing: 1 };
    for (const [grounded, vx, facing, time] of [
      [true, 0, 1, 0], [true, 80, 1, 0], [true, 80, 1, .13],
      [true, -80, -1, 0], [true, -80, -1, .13],
      [false, 80, 1, 0], [false, -80, -1, 0]
    ]) {
      Object.assign(player, { grounded, vx, facing });
      const before = structuredClone(player);
      let args;
      drawPlayer({ drawImage(...values) { args = values; } }, player, time);
      const frame = toaFrameFor(player, time);
      assert.deepEqual(args.slice(1, 5), [frame.x, frame.y, frame.w, frame.h]);
      assert.ok(Math.abs(args[5] + args[7] * frame.anchorX / frame.w - (player.x + player.w / 2)) < 1e-10);
      assert.equal(args[6] + args[8], player.y + player.h);
      assert.deepEqual(player, before, 'skin rendering must never mutate physics');
    }
  } finally { globalThis.Image = previousImage; }
});
