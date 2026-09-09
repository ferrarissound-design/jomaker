import { TILE, PARTS } from './stage.js';
import { drawBackground } from './backgrounds.js';

export function drawPart(ctx, type, x, y, size = TILE, time = 0, active = false, props = null) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / TILE, size / TILE);
  ctx.fillStyle = PARTS[type]?.[2] ?? '#fff';

  if (['ground', 'block', 'breakable', 'switchBlock', 'pressureBlock', 'timerBlock'].includes(type)) {
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

  if (type === 'enemy') {
    ctx.beginPath(); ctx.roundRect(6, 13, 36, 32, 10); ctx.fill();
    ctx.fillStyle = '#243442';
    ctx.fillRect(13, 23, 6, 6); ctx.fillRect(29, 23, 6, 6);
    ctx.fillRect(10, 43, 9, 4); ctx.fillRect(29, 43, 9, 4);
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

export function drawPlayer(ctx, p, time) {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.fillStyle = '#77cfbf';
  ctx.beginPath(); ctx.roundRect(0, 3, p.w, 31, 9); ctx.fill();
  ctx.fillStyle = '#f3f5df';
  ctx.beginPath(); ctx.roundRect(4, 8, 20, 14, 5); ctx.fill();
  ctx.fillStyle = '#193943'; ctx.fillRect(8, 12, 4, 5); ctx.fillRect(18, 12, 4, 5);
  ctx.fillStyle = '#efb66f'; ctx.fillRect(-3, 25, 34, 5);
  ctx.fillStyle = '#27565e';
  const step = p.grounded && p.vx ? Math.sin(time * 18) * 3 : 0;
  ctx.fillRect(3, 33, 8, 5 + step); ctx.fillRect(18, 33, 8, 5 - step);
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
    if (game && ['enemy', 'movingPlatform', 'crate'].includes(o.type)) continue;
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
        drawPart(ctx, 'enemy', e.x - 7, e.y - 12, TILE, time);
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
