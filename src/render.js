import { drawAnimeEnemy } from './anime-enemies.js?v=20260916-facing-1';
import { TILE, PARTS } from './stage.js';
import { drawBackground } from './backgrounds.js';


const PLAYER_WALK_RIGHT_SOURCES = ['./029A536A-CC50-4049-B511-605245126177.png', './7B1D2CC0-C6BB-4150-83C2-ACAF5D70B983.png'];
const PLAYER_WALK_RIGHT_FRAMES = PLAYER_WALK_RIGHT_SOURCES.map(src => {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  return image;
});

const PLAYER_WALK_LEFT_FRAMES = ['./594F8DAD-DC51-4DFF-9AC3-784FCB70FF74.png', './90285534-ECDC-4BA6-96D4-BBA630AE34B7.png'].map(src => {
  const image = new Image();
  image.decoding = 'async';
  image.src = src;
  return image;
});

const PLAYER_JUMP_FRAME = new Image();
PLAYER_JUMP_FRAME.decoding = 'async';
PLAYER_JUMP_FRAME.src = './B1003C9C-4C47-4249-B6A9-1507F723BB9B.png';

const PLAYER_IDLE_FRAME = new Image();
PLAYER_IDLE_FRAME.decoding = 'async';
PLAYER_IDLE_FRAME.src = './9914630D-0C2F-469E-B82B-ED918A8EFB35.png';

export function drawPart(ctx, type, x, y, size = TILE, time = 0, active = false, props = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / TILE, size / TILE);
  ctx.fillStyle = PARTS[type]?.[2] ?? '#fff';

  if (type === 'ground') {
    ctx.fillStyle = '#bd8051'; ctx.fillRect(0, 0, 48, 48);
    ctx.fillStyle = '#d99b61'; ctx.fillRect(0, 10, 48, 20);
    ctx.strokeStyle = '#f2bc7b'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const [px, py] of [[8,19],[30,33],[39,22]]) {
      ctx.beginPath(); ctx.moveTo(px,py); ctx.lineTo(px+4,py-1); ctx.stroke();
    }
    ctx.fillStyle = '#73c844'; ctx.strokeStyle = '#36583b'; ctx.lineWidth = 1.5;
    ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(48,0);ctx.lineTo(48,8);
    for(let px=48;px>0;px-=8)ctx.quadraticCurveTo(px-4,16,px-8,8);
    ctx.lineTo(0,0);ctx.fill();ctx.stroke();
    ctx.fillStyle = '#b8ed70';ctx.fillRect(0,0,48,3);
  }

  if (['block', 'breakable', 'switchBlock', 'pressureBlock', 'timerBlock'].includes(type)) {
    ctx.beginPath();
    ctx.roundRect(1, 1, 46, 46, 6);
    ctx.fill();
    if (type === 'breakable') {
      ctx.strokeStyle = '#8a5d42';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(8, 7); ctx.lineTo(22, 22); ctx.lineTo(14, 38);
      ctx.moveTo(22, 22); ctx.lineTo(39, 12);
      ctx.moveTo(22, 22); ctx.lineTo(37, 39);
      ctx.stroke();
    } else {
      ctx.fillStyle = type === 'ground' ? '#8bc8a0' : type === 'switchBlock' ? '#ffd1cd' : type === 'pressureBlock' ? '#c9e8ee' : type === 'timerBlock' ? '#f4dec0' : '#ffd28a';
      ctx.fillRect(4, 3, 40, 6);
      ctx.fillStyle = '#152c3620';
      ctx.fillRect(7, 28, 12, 4);
      ctx.fillRect(29, 17, 10, 4);
    }
  }

  if (type === 'platform' || type === 'movingPlatform') {
    ctx.beginPath();
    ctx.roundRect(0, 0, 48, 12, 5);
    ctx.fill();
    ctx.fillStyle = '#d8f5ed';
    ctx.fillRect(5, 2, 38, 3);
    if (type === 'movingPlatform') {
      ctx.fillStyle = '#315f69';
      ctx.font = 'bold 13px sans-serif';
      ctx.fillText(props?.axis === 'y' ? '↕' : '↔', 17, 29);
    }
  }

  if (type === 'crate') {
    ctx.fillStyle = '#b9875f';
    ctx.beginPath(); ctx.roundRect(4, 4, 40, 40, 5); ctx.fill();
    ctx.strokeStyle = '#74543d'; ctx.lineWidth = 4;
    ctx.strokeRect(9, 9, 30, 30);
    ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(38, 38); ctx.moveTo(38, 10); ctx.lineTo(10, 38); ctx.stroke();
  }

  if (type === 'plate') {
    ctx.fillStyle = active ? '#5e8791' : '#91abb1';
    ctx.beginPath(); ctx.roundRect(3, active ? 38 : 34, 42, active ? 7 : 11, 4); ctx.fill();
    ctx.fillStyle = '#d9e7e9';
    ctx.fillRect(9, active ? 39 : 35, 30, 3);
  }

  if (type === 'cannon') {
    const left = props?.direction === 'left';
    ctx.fillStyle = '#596a72';
    ctx.beginPath(); ctx.arc(left ? 27 : 21, 28, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(left ? 2 : 21, 20, 25, 14);
    ctx.fillStyle = '#263942';
    ctx.beginPath(); ctx.arc(left ? 28 : 20, 28, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#8a9aa0';
    ctx.fillRect(10, 41, 25, 5);
  }

  if (type === 'spring') {
    ctx.fillStyle = '#f08f52';
    ctx.beginPath(); ctx.roundRect(5, 34, 38, 10, 4); ctx.fill();
    ctx.strokeStyle = '#7f6256'; ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(10, 34); ctx.lineTo(18, 22); ctx.lineTo(26, 34); ctx.lineTo(34, 22); ctx.lineTo(40, 34);
    ctx.stroke();
    ctx.fillStyle = '#ffd07a';
    ctx.beginPath(); ctx.roundRect(7, 17, 34, 7, 3); ctx.fill();
  }

  if (type === 'coin') {
    ctx.beginPath();
    ctx.ellipse(24, 24, 11 + Math.sin(time * 3) * 2, 15, 0, 0, 7);
    ctx.fill();
    ctx.strokeStyle = '#fff1ad'; ctx.lineWidth = 3; ctx.stroke();
    ctx.fillStyle = '#b38239'; ctx.fillRect(22, 17, 4, 14);
  }

  if (type === 'key') {
    ctx.strokeStyle = '#9a7428';
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(18, 20, 8, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(24, 25); ctx.lineTo(40, 39); ctx.lineTo(34, 39); ctx.moveTo(35, 34); ctx.lineTo(40, 29); ctx.stroke();
  }

  if (type === 'door' || type === 'enemyDoor') {
    ctx.beginPath(); ctx.roundRect(7, 3, 34, 45, 6); ctx.fill();
    ctx.strokeStyle = type === 'enemyDoor' ? '#4c3e61' : '#6c5142'; ctx.lineWidth = 3; ctx.strokeRect(11, 7, 26, 38);
    ctx.fillStyle = '#f2d9a6';
    if (type === 'enemyDoor') {
      ctx.font = 'bold 19px sans-serif'; ctx.fillText('◆', 15, 31);
    } else {
      ctx.beginPath(); ctx.arc(32, 27, 3, 0, Math.PI * 2); ctx.fill();
    }
  }

  if (type === 'switch' || type === 'timerSwitch') {
    ctx.fillStyle = active ? '#6bcf8c' : type === 'timerSwitch' ? '#d79c58' : '#ef8a68';
    ctx.beginPath(); ctx.roundRect(5, 29, 38, 13, 6); ctx.fill();
    ctx.fillStyle = '#fff7df';
    ctx.beginPath(); ctx.arc(24, active ? 30 : 23, 10, 0, Math.PI * 2); ctx.fill();
    if (type === 'timerSwitch') {
      ctx.fillStyle = '#6f5330'; ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`${Number(props?.duration ?? 3.2).toFixed(1)}s`, 10, 18);
    }
  }

  if (type === 'warp') {
    const pulse = 2 + Math.sin(time * 4) * 2;
    ctx.strokeStyle = '#7994db'; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.ellipse(24, 25, 15 + pulse, 20, 0, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#d9dcff'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.ellipse(24, 25, 7 + pulse / 2, 12, 0, 0, Math.PI * 2); ctx.stroke();
  }

  if (type === 'spike') {
    for (let i = 0; i < 3; i++) {
      ctx.beginPath(); ctx.moveTo(i * 16, 46); ctx.lineTo(i * 16 + 8, 10); ctx.lineTo(i * 16 + 16, 46); ctx.fill();
    }
  }

  if (type === 'enemy' || type === 'flyingEnemy') {
    drawAnimeEnemy(ctx, type, -8, -9, 64, 56, time, props?.direction === 'left' ? -1 : 1);
  }

  if (type === 'checkpoint') {
    ctx.fillStyle = active ? '#2c7c9b' : '#6fb8d7';
    ctx.fillRect(10, 7, 4, 41);
    ctx.beginPath(); ctx.arc(24, 18, 12 + (active ? Math.sin(time * 5) : 0), 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 15px sans-serif'; ctx.fillText('✦', 18, 24);
  }

  if (type === 'goal' || type === 'start') {
    ctx.fillRect(10, 6, 4, 42);
    ctx.beginPath(); ctx.moveTo(14, 6); ctx.lineTo(41, 14); ctx.lineTo(14, 26); ctx.fill();
    ctx.fillStyle = '#fff'; ctx.font = 'bold 14px sans-serif'; ctx.fillText(type === 'goal' ? '★' : 'S', 17, 20);
  }

  ctx.restore();
}

function drawVectorPlayer(ctx, p, time) {
  const dir = p.facing ?? (p.vx < 0 ? -1 : 1);
  const running = p.grounded && Math.abs(p.vx) > 1;
  const step = running ? Math.sin(time * 18) * 2.8 : 0;
  const bob = running ? Math.abs(Math.sin(time * 18)) * 1.2 : (!p.grounded ? -1.5 : 0);

  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + bob);
  ctx.scale(dir, 1);
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  // Tail: the silhouette intentionally extends beyond the physics hitbox.
  ctx.fillStyle = '#73cb7e';
  ctx.beginPath();
  ctx.moveTo(-7, 17);
  ctx.bezierCurveTo(-18, 15, -29, 20, -38, 28);
  ctx.bezierCurveTo(-25, 25, -14, 26, -4, 29);
  ctx.closePath();
  ctx.fill();

  // Back bumps.
  ctx.fillStyle = '#5caf69';
  for (let i = 0; i < 4; i++) {
    ctx.beginPath();
    ctx.arc(-8 + i * 5, 12 - Math.abs(i - 1.5), 2.7, Math.PI, 0);
    ctx.fill();
  }

  // Body and pale belly.
  ctx.fillStyle = '#82d98a';
  ctx.beginPath();
  ctx.ellipse(-1, 24, 17, 13, -0.08, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#dff2c9';
  ctx.beginPath();
  ctx.ellipse(5, 26, 9, 9, -0.15, 0, Math.PI * 2);
  ctx.fill();

  // Legs with a tiny run cycle.
  ctx.fillStyle = '#67bd73';
  ctx.beginPath(); ctx.roundRect(-8, 29 + step, 9, 11 - step * .25, 4); ctx.fill();
  ctx.beginPath(); ctx.roundRect(5, 29 - step, 9, 11 + step * .25, 4); ctx.fill();

  // Feet and claws.
  ctx.fillStyle = '#5aa866';
  ctx.beginPath(); ctx.roundRect(-10, 37 + step, 13, 5, 3); ctx.fill();
  ctx.beginPath(); ctx.roundRect(3, 37 - step, 14, 5, 3); ctx.fill();
  ctx.fillStyle = '#f4f0d6';
  ctx.beginPath();
  ctx.moveTo(-8, 40 + step); ctx.lineTo(-4, 39 + step); ctx.lineTo(-5, 42 + step);
  ctx.moveTo(8, 40 - step); ctx.lineTo(12, 39 - step); ctx.lineTo(11, 42 - step);
  ctx.fill();

  // Tiny T-rex arms.
  ctx.strokeStyle = '#65b970';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(8, 24);
  ctx.lineTo(15, 28);
  ctx.lineTo(19, 26);
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(18, 26); ctx.lineTo(21, 24);
  ctx.moveTo(18, 27); ctx.lineTo(22, 28);
  ctx.stroke();

  // Oversized head and snout, inspired by the soft 3D dinosaur reference.
  ctx.fillStyle = '#8be393';
  ctx.beginPath();
  ctx.ellipse(10, 11, 14, 12, -0.12, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(20, 15, 13, 8.5, 0.03, 0, Math.PI * 2);
  ctx.fill();

  // Brow gives it the grumpy-cute T-rex expression.
  ctx.fillStyle = '#6ec877';
  ctx.beginPath();
  ctx.ellipse(10, 6, 9, 3.3, -0.22, 0, Math.PI * 2);
  ctx.fill();

  // Mouth.
  ctx.fillStyle = '#653d3d';
  ctx.beginPath();
  ctx.roundRect(12, 14, 18, 7, 3);
  ctx.fill();
  ctx.fillStyle = '#e98a88';
  ctx.beginPath();
  ctx.roundRect(18, 18, 10, 3, 2);
  ctx.fill();

  // Teeth.
  ctx.fillStyle = '#fffdf0';
  for (let i = 0; i < 4; i++) {
    const tx = 14 + i * 4;
    ctx.beginPath();
    ctx.moveTo(tx, 14);
    ctx.lineTo(tx + 2, 18);
    ctx.lineTo(tx + 4, 14);
    ctx.closePath();
    ctx.fill();
  }

  // Eye with a vertical pupil.
  ctx.fillStyle = '#f5d46f';
  ctx.beginPath(); ctx.ellipse(11, 10, 3.7, 4.6, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#273a32';
  ctx.beginPath(); ctx.ellipse(11.5, 10, 1.1, 3.2, 0, 0, Math.PI * 2); ctx.fill();

  // Nostril.
  ctx.fillStyle = '#355d45';
  ctx.beginPath(); ctx.ellipse(26, 12, 1.5, 1.1, 0, 0, Math.PI * 2); ctx.fill();

  ctx.restore();
}


export function drawPlayer(ctx, p, time) {
  const dir = p.facing ?? (p.vx < 0 ? -1 : 1);
  const running = p.grounded && Math.abs(p.vx) > 1;
  const walkingLeft = running && dir < 0;
  const walkFrames = walkingLeft ? PLAYER_WALK_LEFT_FRAMES : PLAYER_WALK_RIGHT_FRAMES;
  const frameIndex = running ? Math.floor(time * 8) % 2 : 0;
  const frame = !p.grounded ? PLAYER_JUMP_FRAME
    : running ? walkFrames[frameIndex] : PLAYER_IDLE_FRAME;

  if (!frame?.complete || !frame.naturalWidth || !frame.naturalHeight) {
    drawVectorPlayer(ctx, p, time);
    return;
  }

  const footY = !p.grounded ? 1155 : running ? (walkingLeft ? [1153, 1135] : [1121, 1157])[frameIndex] : 1193;
  const targetHeight = Math.max(p.h * 1.7, 62);
  const targetWidth = targetHeight * (frame.naturalWidth / frame.naturalHeight);

  ctx.save();
  ctx.translate(p.x + p.w / 2, p.y + p.h);
  ctx.scale(walkingLeft ? 1 : dir, 1);
  ctx.drawImage(frame, -targetWidth * (walkingLeft ? .38 : .62), -targetHeight * footY / 1254, targetWidth, targetHeight);
  ctx.restore();
}

export function render(ctx, w, h, stage, camera, scale, editing, game, time, selected, cameraY = 0) {
  ctx.clearRect(0, 0, w, h);
  const themed = drawBackground(ctx, w, h, stage.background ?? 'tropicalSea', camera);
  if (!themed) {
    ctx.fillStyle = '#e8f2ed'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#d6e6df';
    for (let i = -1; i < 8; i++) {
      const x = i * 230 - (camera * .18) % 230;
      ctx.beginPath(); ctx.moveTo(x, h); ctx.lineTo(x + 140, h * .24); ctx.lineTo(x + 290, h); ctx.fill();
    }
  }

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camera, -cameraY);

  if (editing) {
    ctx.strokeStyle = '#183f4010'; ctx.lineWidth = 1 / scale; ctx.beginPath();
    for (let x = Math.floor(camera / TILE) * TILE; x < camera + w / scale; x += TILE) {
      ctx.moveTo(x, 0); ctx.lineTo(x, stage.height * TILE);
    }
    for (let y = 0; y <= stage.height * TILE; y += TILE) {
      ctx.moveTo(camera, y); ctx.lineTo(camera + w / scale, y);
    }
    ctx.stroke();
  }

  for (const o of stage.objects) {
    const key = `${o.x},${o.y}`;
    if (o.x * TILE < camera - TILE || o.x * TILE > camera + w / scale + TILE) continue;
    if (game && ['enemy', 'flyingEnemy', 'movingPlatform', 'crate'].includes(o.type)) continue;
    if (game?.coins.has(key) && o.type === 'coin') continue;
    if (game?.collectedKeys.has(key) && o.type === 'key') continue;
    if (game?.openedDoors.has(key) && o.type === 'door') continue;
    if (game?.brokenBlocks.has(key) && o.type === 'breakable') continue;
    if (game?.switchOn && o.type === 'switchBlock') continue;
    if (game?.pressureActive && o.type === 'pressureBlock') continue;
    if (game?.timerGate > 0 && o.type === 'timerBlock') continue;
    if (game && o.type === 'enemyDoor' && game.enemies.length === 0) continue;

    const active =
      (o.type === 'checkpoint' && game?.checkpoint?.x === o.x && game?.checkpoint?.y === o.y) ||
      (o.type === 'switch' && game?.switchOn) ||
      (o.type === 'timerSwitch' && game?.timerGate > 0) ||
      (o.type === 'plate' && game?.pressureActive);
    drawPart(ctx, o.type, o.x * TILE, o.y * TILE, TILE, time, active, o.props);
  }

  if (editing) {
    drawPart(ctx, 'start', stage.playerStart.x * TILE, stage.playerStart.y * TILE);
    if (selected) {
      ctx.strokeStyle = '#234f58'; ctx.lineWidth = 3 / scale;
      ctx.strokeRect(selected.x * TILE + 1, selected.y * TILE + 1, 46, 46);
    }
  }

  if (game) {
    for (const platform of game.movingPlatforms) {
      if (platform.x > camera - TILE && platform.x < camera + w / scale + TILE) {
        drawPart(ctx, 'movingPlatform', platform.x, platform.y, TILE, time, false, platform.props);
      }
    }
    for (const crate of game.crates) {
      if (crate.x > camera - TILE && crate.x < camera + w / scale + TILE) {
        drawPart(ctx, 'crate', crate.x - 4, crate.y - 4, TILE, time);
      }
    }
    for (const e of game.enemies) {
      if (e.x > camera - TILE && e.x < camera + w / scale + TILE) {
        const enemyType = e.type ?? 'enemy';
        const flying = enemyType === 'flyingEnemy';
        const ew = TILE * (flying ? 1.6 : 1.35), eh = ew * 140 / 160;
        const direction = flying || e.vx < 0 ? -1 : 1;
        drawAnimeEnemy(ctx, enemyType, e.x + e.w / 2 - ew * (direction < 0 ? .45 : .55),
          flying ? e.y + e.h / 2 - eh * .55 : e.y + e.h - eh * 132 / 140,
          ew, eh, time, direction);
      }
    }
    ctx.fillStyle = '#344950';
    for (const shot of game.projectiles) {
      ctx.beginPath();
      ctx.ellipse(shot.x + shot.w / 2, shot.y + shot.h / 2, shot.w / 2, shot.h / 2, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    drawPlayer(ctx, game.player, time);
  }

  ctx.restore();
}
