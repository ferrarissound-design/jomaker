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
    const stride = Math.sin(time * 12) * 1.8;
    const dir = props?.direction === 'left' ? -1 : 1;
    ctx.save();
    ctx.translate(24, 22);
    ctx.scale(dir, 1);

    // Small carnivorous dinosaur: low body, counterbalancing tail and quick legs.
    ctx.fillStyle = '#c98a63';
    ctx.beginPath();
    ctx.moveTo(-8, 5);
    ctx.bezierCurveTo(-17, 3, -24, 7, -28, 12);
    ctx.bezierCurveTo(-20, 10, -13, 11, -5, 13);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#d59a72';
    ctx.beginPath(); ctx.ellipse(-2, 7, 13, 9, -.08, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#b97857';
    ctx.beginPath(); ctx.roundRect(-7, 12 + stride, 6, 13, 3); ctx.fill();
    ctx.beginPath(); ctx.roundRect(3, 12 - stride, 6, 13, 3); ctx.fill();
    ctx.fillRect(-9, 23 + stride, 10, 3);
    ctx.fillRect(3, 23 - stride, 11, 3);

    ctx.fillStyle = '#dca17b';
    ctx.beginPath(); ctx.ellipse(8, 0, 9, 8, -.08, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(15, 2, 9, 5, 0, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#8b5747';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(12, 4); ctx.lineTo(22, 4); ctx.stroke();

    ctx.fillStyle = '#f4df8b';
    ctx.beginPath(); ctx.arc(9, -2, 2.3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#26353b';
    ctx.beginPath(); ctx.arc(9.6, -2, 1, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#b97857';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(5, 8); ctx.lineTo(11, 11); ctx.lineTo(14, 9); ctx.stroke();
    ctx.restore();
  }

  if (type === 'flyingEnemy') {
    const flap = Math.sin(time * 11) * 7;
    const dir = props?.direction === 'left' ? -1 : 1;
    ctx.save();
    ctx.translate(24, 24);
    ctx.scale(dir, 1);

    // Pteranodon: broad membrane wings, long beak and rear crest.
    ctx.fillStyle = '#8aa6b8';
    ctx.beginPath();
    ctx.moveTo(-3, -2);
    ctx.bezierCurveTo(-12, -10 - flap, -20, -13 - flap, -25, -5);
    ctx.bezierCurveTo(-18, -4, -11, 2 + flap * .25, -3, 5);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath();
    ctx.moveTo(2, -2);
    ctx.bezierCurveTo(10, -10 - flap, 18, -13 - flap, 24, -4);
    ctx.bezierCurveTo(17, -3, 10, 3 + flap * .25, 2, 5);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#718fa3';
    ctx.beginPath(); ctx.ellipse(0, 4, 8, 6, 0, 0, Math.PI * 2); ctx.fill();

    ctx.fillStyle = '#9bb4c3';
    ctx.beginPath(); ctx.ellipse(8, -1, 7, 6, -.12, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath();
    ctx.moveTo(12, -2); ctx.lineTo(27, 1); ctx.lineTo(12, 4); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#6f8795';
    ctx.beginPath();
    ctx.moveTo(5, -5); ctx.lineTo(-5, -12); ctx.lineTo(8, -7); ctx.closePath(); ctx.fill();

    ctx.fillStyle = '#f1d66e';
    ctx.beginPath(); ctx.arc(9, -3, 1.8, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#243442';
    ctx.beginPath(); ctx.arc(9.4, -3, .8, 0, Math.PI * 2); ctx.fill();

    ctx.strokeStyle = '#607d8e';
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-2, 9); ctx.lineTo(-6, 14); ctx.moveTo(3, 9); ctx.lineTo(7, 14); ctx.stroke();
    ctx.restore();
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
        const offsetX = enemyType === 'flyingEnemy' ? 4 : 7;
        const offsetY = enemyType === 'flyingEnemy' ? 10 : 12;
        drawPart(ctx, enemyType, e.x - offsetX, e.y - offsetY, TILE, time, false, {
          direction: e.vx < 0 ? 'left' : 'right'
        });
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
