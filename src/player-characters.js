export const PLAYER_CHARACTER_STORAGE_KEY = 'jomaker.playerCharacter';
export const DEFAULT_PLAYER_CHARACTER = 'dino';
export const MOMOSE_SPRITE_SRC = './CBED4124-3DEC-4943-8F26-61C3163030A8.png';

export const PLAYER_CHARACTERS = Object.freeze({
  dino: Object.freeze({ id: 'dino', label: '恐竜' }),
  momose: Object.freeze({ id: 'momose', label: '百瀬' })
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

export function normalizePlayerCharacter(value) {
  return value === 'momose' ? 'momose' : DEFAULT_PLAYER_CHARACTER;
}

export function momoseFrameFor(player, time) {
  const facing = player.facing ?? (player.vx < 0 ? -1 : 1);
  if (!player.grounded) return facing < 0 ? MOMOSE_FRAMES.jumpLeft : MOMOSE_FRAMES.jumpRight;
  if (Math.abs(player.vx) <= 1) return MOMOSE_FRAMES.idle;
  const second = Math.floor(time * 8) % 2 === 1;
  if (facing < 0) return second ? MOMOSE_FRAMES.walkLeft2 : MOMOSE_FRAMES.walkLeft1;
  return second ? MOMOSE_FRAMES.walkRight2 : MOMOSE_FRAMES.walkRight1;
}
