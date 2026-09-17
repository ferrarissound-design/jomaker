import { render as baseRender } from './render.js?v=20260917-juracore-base-1';
export { drawPart, drawPlayer } from './render.js?v=20260917-juracore-base-1';
import { TILE } from './stage.js?v=20260916-enemy-direction-1';
import { JURACORE_WARNING } from './juracore-runtime.js?v=20260917-juracore-1';

function star(ctx, x, y, outer, inner, points = 4) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + i * Math.PI / points;
    const r = i % 2 ? inner : outer;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (!i) ctx.moveTo(px, py); else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawJuracore(ctx, x, y, time) {
  const bob = Math.sin(time * 3.2) * 3;
  const pulse = 1 + Math.sin(time * 5.4) * .055;
  const cx = x + 24;
  const cy = y + 23 + bob;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(pulse, pulse);

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 25);
  glow.addColorStop(0, 'rgba(255,245,183,.82)');
  glow.addColorStop(.45, 'rgba(246,166,62,.34)');
  glow.addColorStop(1, 'rgba(231,120,37,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 25, 0, Math.PI * 2);
  ctx.fill();

  // Uneven amber core, deliberately more fossil/meteor than star-shaped.
  ctx.fillStyle = '#e79032';
  ctx.strokeStyle = '#8e4c24';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(-14, -12);
  ctx.lineTo(-4, -18);
  ctx.lineTo(9, -15);
  ctx.lineTo(17, -6);
  ctx.lineTo(15, 8);
  ctx.lineTo(6, 17);
  ctx.lineTo(-8, 15);
  ctx.lineTo(-17, 5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#f8bd58';
  ctx.beginPath();
  ctx.moveTo(-9, -10);
  ctx.lineTo(-2, -14);
  ctx.lineTo(7, -12);
  ctx.lineTo(10, -7);
  ctx.lineTo(-4, -5);
  ctx.closePath();
  ctx.fill();

  // Three bright fossil-claw marks at the heart of the stone.
  ctx.strokeStyle = '#fff8d8';
  ctx.shadowColor = '#fff0a6';
  ctx.shadowBlur = 8;
  ctx.lineWidth = 2.6;
  ctx.lineCap = 'round';
  for (const dx of [-5, 0, 5]) {
    ctx.beginPath();
    ctx.moveTo(dx - 2, 6);
    ctx.quadraticCurveTo(dx, -1, dx + 2, -7);
    ctx.stroke();
  }
  ctx.shadowBlur = 0;

  // A few star-like motes keep the power-up readable without turning the core
  // itself into a Mario-style star silhouette.
  for (let i = 0; i < 4; i++) {
    const a = time * 1.7 + i * Math.PI / 2;
    const r = 22 + (i % 2) * 3;
    const sx = Math.cos(a) * r;
    const sy = Math.sin(a) * r * .72;
    ctx.fillStyle = i % 2 ? '#fff9dc' : '#ffd66f';
    star(ctx, sx, sy, 3.1, 1.15, 4);
    ctx.fill();
  }

  ctx.restore();
}

function drawPoweredPlayerEffect(ctx, game, time) {
  if (!(game?.juracoreTimer > 0)) return;
  const p = game.player;
  const warning = game.juracoreTimer <= JURACORE_WARNING;
  const flicker = warning && Math.floor(time * 12) % 2 === 0;
  const alpha = flicker ? .34 : .78;
  const cx = p.x + p.w / 2;
  const cy = p.y + p.h / 2;
  const radius = 30 + Math.sin(time * 8) * 2.5;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.shadowColor = '#ffb43c';
  ctx.shadowBlur = 16;
  ctx.strokeStyle = '#ffd36b';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.ellipse(cx, cy, radius * .72, radius, 0, 0, Math.PI * 2);
  ctx.stroke();
  ctx.shadowBlur = 0;

  for (let i = 0; i < 7; i++) {
    const a = -time * (2.2 + i * .05) + i * (Math.PI * 2 / 7);
    const r = 27 + (i % 3) * 4;
    const sx = cx + Math.cos(a) * r;
    const sy = cy + Math.sin(a) * r * .75;
    ctx.fillStyle = i % 2 ? '#fff9de' : '#ffbd4a';
    star(ctx, sx, sy, 3.3, 1.1, 4);
    ctx.fill();
  }

  // Ground-level flare gives the power a heavier, primitive impact.
  if (p.grounded) {
    ctx.strokeStyle = '#ff9d31';
    ctx.lineWidth = 3;
    ctx.globalAlpha *= .72;
    const spread = 18 + Math.abs(Math.sin(time * 10)) * 9;
    ctx.beginPath();
    ctx.moveTo(cx - spread, p.y + p.h + 2);
    ctx.lineTo(cx - 7, p.y + p.h - 1);
    ctx.moveTo(cx + spread, p.y + p.h + 2);
    ctx.lineTo(cx + 7, p.y + p.h - 1);
    ctx.stroke();
  }
  ctx.restore();
}

export function render(ctx, w, h, stage, camera, scale, editing, game, time, selected, cameraY = 0) {
  baseRender(ctx, w, h, stage, camera, scale, editing, game, time, selected, cameraY);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-camera, -cameraY);

  for (const o of stage.objects) {
    if (o.type !== 'juracore') continue;
    const key = `${o.x},${o.y}`;
    if (game?.collectedJuraCores?.has(key)) continue;
    if (o.x * TILE < camera - TILE || o.x * TILE > camera + w / scale + TILE) continue;
    drawJuracore(ctx, o.x * TILE, o.y * TILE, time);
  }

  drawPoweredPlayerEffect(ctx, game, time);
  ctx.restore();
}
