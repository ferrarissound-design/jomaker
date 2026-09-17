export const PLAYER_CHARACTER_STORAGE_KEY = 'jomaker.playerCharacter';
export const DEFAULT_PLAYER_CHARACTER = 'dino';
export const MOMOSE_SPRITE_SRC = './CBED4124-3DEC-4943-8F26-61C3163030A8.png';
export const TOA_SPRITE_SRC = './7F5A6661-079F-4749-BC81-71090029FA7D.png';
export const JO_SPRITE_SRC = './JO-alternating-walk.png';

export const PLAYER_CHARACTERS = Object.freeze({
  dino: Object.freeze({ id: 'dino', label: '恐竜' }),
  momose: Object.freeze({ id: 'momose', label: '百瀬' }),
  jo: Object.freeze({ id: 'jo', label: 'JO' }),
  toa: Object.freeze({ id: 'toa', label: 'TOA' })
});

// Tight alpha bounds measured from the supplied sheet. The seven drawings are
// not laid out on a uniform grid, so each pose keeps its own source rectangle.
export const MOMOSE_FRAMES = Object.freeze({
  idle: Object.freeze({ x: 75, y: 27, w: 251, h: 512 }),
  walkRight1: Object.freeze({ x: 394, y: 34, w: 320, h: 500 }),
  walkRight2: Object.freeze({ x: 749, y: 36, w: 311, h: 497 }),
  jumpRight: Object.freeze({ x: 1073, y: 18, w: 365, h: 531 }),
  walkLeft1: Object.freeze({ x: 156, y: 575, w: 326, h: 472 }),
  walkLeft2: Object.freeze({ x: 548, y: 578, w: 337, h: 464 }),
  jumpLeft: Object.freeze({ x: 958, y: 572, w: 394, h: 462 })
});

// Alpha bounds measured from the JO sheet. A small transparent gutter is kept
// around every pose so filtering cannot clip the inked outline.
export const JO_FRAMES = Object.freeze({
  idle: Object.freeze({ x: 75, y: 50, w: 234, h: 512 }),
  walkRight1: Object.freeze({ x: 411, y: 63, w: 304, h: 498 }),
  walkRight2: Object.freeze({ x: 749, y: 58, w: 303, h: 503 }),
  jumpRight: Object.freeze({ x: 1075, y: 59, w: 342, h: 480 }),
  walkLeft1: Object.freeze({ x: 167, y: 578, w: 312, h: 459 }),
  walkLeft2: Object.freeze({ x: 580, y: 583, w: 294, h: 452 }),
  jumpLeft: Object.freeze({ x: 974, y: 581, w: 338, h: 445 })
});

// Individually measured alpha bounds with a 2px filtering gutter. anchorX is
// the foot/body axis inside the crop, excluding flowing hair and raised hands.
export const TOA_FRAMES = Object.freeze({
  idle: Object.freeze({ x: 39, y: 21, w: 260, h: 521, anchorX: 158 }),
  walkRight1: Object.freeze({ x: 377, y: 26, w: 303, h: 513, anchorX: 168 }),
  walkRight2: Object.freeze({ x: 730, y: 26, w: 304, h: 513, anchorX: 175 }),
  jumpRight: Object.freeze({ x: 1093, y: 14, w: 348, h: 516, anchorX: 181 }),
  walkLeft1: Object.freeze({ x: 187, y: 575, w: 310, h: 491, anchorX: 138 }),
  walkLeft2: Object.freeze({ x: 580, y: 572, w: 327, h: 496, anchorX: 140 }),
  jumpLeft: Object.freeze({ x: 1000, y: 571, w: 349, h: 491, anchorX: 165 })
});

export function normalizePlayerCharacter(value) {
  return Object.hasOwn(PLAYER_CHARACTERS, value) ? value : DEFAULT_PLAYER_CHARACTER;
}

export function characterFrameNameFor(player, time) {
  const facing = player.facing ?? (player.vx < 0 ? -1 : 1);
  if (!player.grounded) return facing < 0 ? 'jumpLeft' : 'jumpRight';
  if (Math.abs(player.vx) <= 1) return 'idle';
  const second = Math.floor(time * 8) % 2 === 1;
  if (facing < 0) return second ? 'walkLeft2' : 'walkLeft1';
  return second ? 'walkRight2' : 'walkRight1';
}

export function characterFrameFor(frames, player, time) {
  return frames[characterFrameNameFor(player, time)];
}

export function momoseFrameFor(player, time) {
  return characterFrameFor(MOMOSE_FRAMES, player, time);
}

export function joFrameFor(player, time) {
  return characterFrameFor(JO_FRAMES, player, time);
}

export function toaFrameFor(player, time) {
  return characterFrameFor(TOA_FRAMES, player, time);
}
