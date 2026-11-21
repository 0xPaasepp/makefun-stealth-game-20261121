// Shadow Protocol — all drawing: floor, walls, crates, lighting, vision cones,
// guards, player, particles, HUD, minimap and the title/win/lose screens.
import { COLORS, TILE, VIEW_W, VIEW_H, GUARD } from './config.js';
import { tileAt, isShadow, isLit } from './levels.js';

function coneColor(guard) {
  if (guard.state === 'alert') return COLORS.coneAlert;
  if (guard.state !== 'patrol' || guard.suspicion > 10) return COLORS.coneSuspicious;
  return COLORS.coneCalm;
}

function guardColor(guard) {
  if (guard.state === 'alert') return COLORS.guardAlert;
  if (guard.state !== 'patrol' || guard.suspicion > 10) return COLORS.guardSuspicious;
  return COLORS.guardCalm;
}

export function drawWorld(ctx, game) {
  const { level, cam } = game;
  ctx.save();
  ctx.translate(-cam.x, -cam.y);
  const x0 = Math.max(0, Math.floor(cam.x / TILE));
  const y0 = Math.max(0, Math.floor(cam.y / TILE));
  const x1 = Math.min(level.cols - 1, Math.ceil((cam.x + VIEW_W) / TILE));
  const y1 = Math.min(level.rows - 1, Math.ceil((cam.y + VIEW_H) / TILE));

  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      const t = tileAt(level, x, y);
      const px = x * TILE; const py = y * TILE;
      if (t === '#') {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE, TILE);
        ctx.fillStyle = COLORS.wallTop;
        ctx.fillRect(px, py, TILE, 8);
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(px, py + 8, TILE, 3);
      } else if (t === 'C') {
        ctx.fillStyle = '#241a10';
        ctx.fillRect(px + 2, py + 2, TILE - 4, TILE - 4);
        ctx.fillStyle = COLORS.crate;
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
        ctx.fillStyle = COLORS.crateTop;
        ctx.fillRect(px + 4, py + 4, TILE - 8, 6);
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.lineWidth = 2;
        ctx.strokeRect(px + 6, py + 6, TILE - 12, TILE - 12);
        ctx.beginPath();
        ctx.moveTo(px + 6, py + 6); ctx.lineTo(px + TILE - 6, py + TILE - 6);
        ctx.moveTo(px + TILE - 6, py + 6); ctx.lineTo(px + 6, py + TILE - 6);
        ctx.stroke();
      } else {
        ctx.fillStyle = (x + y) % 2 === 0 ? COLORS.floor : COLORS.floorAlt;
        ctx.fillRect(px, py, TILE, TILE);
        if (isLit(level, x, y)) {
          ctx.fillStyle = COLORS.floorLit;
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = 'rgba(255, 220, 120, 0.10)';
          ctx.fillRect(px, py, TILE, TILE);
        }
        if (isShadow(level, x, y)) {
          ctx.fillStyle = COLORS.shadow;
          ctx.fillRect(px, py, TILE, TILE);
        }
        ctx.fillStyle = 'rgba(255,255,255,0.03)';
        ctx.fillRect(px, py, TILE, 2);
      }
    }
  }

  drawExit(ctx, game);
  drawKeycard(ctx, game);
  drawParticles(ctx, game);
  for (const g of game.guards) drawGuardCone(ctx, g);
  for (const g of game.guards) drawGuard(ctx, g);
  drawPlayer(ctx, game);
  ctx.restore();
  drawDarkness(ctx, game);
}

function drawExit(ctx, game) {
  const { exit, hasKey } = game;
  if (!exit) return;
  const ex = exit.x * TILE; const ey = exit.y * TILE;
  const pulse = 0.7 + Math.sin(game.time * 3) * 0.3;
  ctx.save();
  ctx.globalAlpha = hasKey ? 0.55 + pulse * 0.35 : 0.25;
  ctx.fillStyle = COLORS.exit;
  ctx.fillRect(ex - TILE / 2 + 4, ey - TILE / 2 + 4, TILE - 8, TILE - 8);
  ctx.globalAlpha = 1;
  ctx.strokeStyle = hasKey ? '#a8ffce' : '#5a7a68';
  ctx.lineWidth = 3;
  ctx.strokeRect(ex - TILE / 2 + 4, ey - TILE / 2 + 4, TILE - 8, TILE - 8);
  ctx.fillStyle = hasKey ? '#062b16' : '#0c1a12';
  ctx.font = 'bold 11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(hasKey ? 'EXIT' : 'LOCKED', ex, ey + 4);
  ctx.restore();
}

function drawKeycard(ctx, game) {
  const k = game.level.keycard;
  if (!k || k.taken) return;
  const kx = k.x * TILE; const ky = k.y * TILE + Math.sin(game.time * 4) * 3;
  ctx.save();
  ctx.shadowColor = COLORS.keycard;
  ctx.shadowBlur = 16;
  ctx.fillStyle = COLORS.keycard;
  ctx.fillRect(kx - 11, ky - 7, 22, 14);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#7a5c00';
  ctx.fillRect(kx - 7, ky - 3, 8, 3);
  ctx.fillRect(kx - 7, ky + 2, 5, 3);
  ctx.restore();
}

function drawParticles(ctx, game) {
  for (const p of game.particles) {
    ctx.globalAlpha = Math.max(0, p.life / p.max);
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGuardCone(ctx, guard) {
  const range = GUARD.viewRange;
  const half = GUARD.viewHalfAngle;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(guard.x, guard.y);
  ctx.arc(guard.x, guard.y, range, guard.angle - half, guard.angle + half);
  ctx.closePath();
  ctx.fillStyle = coneColor(guard);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();
}

function drawGuard(ctx, guard) {
  const bob = Math.sin(guard.bob) * 1.5;
  const color = guardColor(guard);
  ctx.save();
  ctx.translate(guard.x, guard.y + bob * 0.3);
  ctx.shadowColor = color;
  ctx.shadowBlur = guard.state === 'alert' ? 18 : 8;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, guard.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Visor facing the look direction.
  ctx.fillStyle = '#10131a';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.angle) * 6, Math.sin(guard.angle) * 6, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(Math.cos(guard.angle) * 8, Math.sin(guard.angle) * 8, 2, 0, Math.PI * 2);
  ctx.fill();
  // Suspicion ring above the guard.
  if (guard.suspicion > 5) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(0, 0, guard.radius + 8, -Math.PI / 2, -Math.PI / 2 + (guard.suspicion / 100) * Math.PI * 2);
    ctx.stroke();
  }
  if (guard.state === 'alert') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('!', 0, -guard.radius - 12);
  } else if (guard.state === 'suspicious' || guard.state === 'search') {
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 16px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', 0, -guard.radius - 12);
  }
  ctx.restore();
}

function drawPlayer(ctx, game) {
  const p = game.player;
  ctx.save();
  ctx.translate(p.x, p.y);
  const color = p.sneaking ? COLORS.playerSneak : COLORS.player;
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.shadowBlur = 0;
  // Direction tick + crouch ring when sneaking.
  ctx.strokeStyle = '#06281c';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(p.facing) * (p.radius + 4), Math.sin(p.facing) * (p.radius + 4));
  ctx.stroke();
  if (p.sneaking) {
    ctx.strokeStyle = 'rgba(43,179,255,0.7)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.arc(0, 0, p.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();
}

// Darkness overlay: the world is dark except around the player, lit zones and cones.
function drawDarkness(ctx, game) {
  const p = game.player;
  const dark = document.createElement('canvas');
  dark.width = VIEW_W; dark.height = VIEW_H;
  const dctx = dark.getContext('2d');
  dctx.fillStyle = 'rgba(4, 7, 14, 0.62)';
  dctx.fillRect(0, 0, VIEW_W, VIEW_H);
  dctx.globalCompositeOperation = 'destination-out';
  const px = p.x - game.cam.x; const py = p.y - game.cam.y;
  const grad = dctx.createRadialGradient(px, py, 30, px, py, 220);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  dctx.fillStyle = grad;
  dctx.beginPath();
  dctx.arc(px, py, 220, 0, Math.PI * 2);
  dctx.fill();
  for (const g of game.guards) {
    const gx = g.x - game.cam.x; const gy = g.y - game.cam.y;
    const gg = dctx.createRadialGradient(gx, gy, 10, gx, gy, 130);
    gg.addColorStop(0, 'rgba(0,0,0,0.55)');
    gg.addColorStop(1, 'rgba(0,0,0,0)');
    dctx.fillStyle = gg;
    dctx.beginPath();
    dctx.arc(gx, gy, 130, 0, Math.PI * 2);
    dctx.fill();
  }
  ctx.drawImage(dark, 0, 0);
}

export function drawHUD(ctx, game) {
  const { levelIndex, hasKey, time, alertLevel } = game;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 9, 16, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, 54);
  ctx.fillStyle = COLORS.hud;
  ctx.font = 'bold 17px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`SHADOW PROTOCOL — ${game.level.name}`, 16, 22);
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillStyle = COLORS.dim;
  ctx.fillText(game.level.intro, 16, 42);
  // Objectives.
  ctx.textAlign = 'right';
  ctx.fillStyle = hasKey ? COLORS.exit : COLORS.keycard;
  ctx.font = 'bold 14px system-ui, sans-serif';
  ctx.fillText(hasKey ? '◆ Keycard secured — reach the EXIT' : '◇ Find the keycard', VIEW_W - 220, 22);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '14px system-ui, sans-serif';
  ctx.fillText(`Level ${levelIndex + 1}/3   ${fmtTime(time)}`, VIEW_W - 220, 42);
  // Alert meter.
  const bx = VIEW_W - 200; const by = 12; const bw = 180; const bh = 12;
  ctx.fillStyle = '#222b3a';
  ctx.fillRect(bx, by, bw, bh);
  const frac = Math.max(0, Math.min(1, alertLevel / 100));
  ctx.fillStyle = frac > 0.66 ? COLORS.guardAlert : frac > 0.33 ? COLORS.guardSuspicious : COLORS.guardCalm;
  ctx.fillRect(bx, by, bw * frac, bh);
  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 1;
  ctx.strokeRect(bx, by, bw, bh);
  ctx.fillStyle = COLORS.hud;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(alertLevel > 66 ? 'ALERT!' : alertLevel > 30 ? 'SUSPICIOUS' : 'UNSEEN', bx, by + 26);
  ctx.restore();
  drawMinimap(ctx, game);
}

function fmtTime(t) {
  const m = Math.floor(t / 60);
  const s = Math.floor(t % 60);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function drawMinimap(ctx, game) {
  const { level } = game;
  const scale = 4.5;
  const w = level.cols * scale; const h = level.rows * scale;
  const ox = VIEW_W - w - 14; const oy = 64;
  ctx.save();
  ctx.fillStyle = 'rgba(5, 9, 16, 0.8)';
  ctx.fillRect(ox - 6, oy - 6, w + 12, h + 12);
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const t = tileAt(level, x, y);
      ctx.fillStyle = t === '#' ? '#5a6b8a' : t === 'C' ? '#8a6a3d' : t === '_' ? '#0d1320' : '#2c3a52';
      ctx.fillRect(ox + x * scale, oy + y * scale, scale, scale);
    }
  }
  const ex = game.exit; if (ex) { ctx.fillStyle = COLORS.exit; ctx.fillRect(ox + ex.x * scale - 2, oy + ex.y * scale - 2, 4, 4); }
  const k = level.keycard;
  if (k && !k.taken) { ctx.fillStyle = COLORS.keycard; ctx.fillRect(ox + k.x * scale - 2, oy + k.y * scale - 2, 4, 4); }
  for (const g of game.guards) {
    ctx.fillStyle = guardColor(g);
    ctx.beginPath();
    ctx.arc(ox + (g.x / TILE) * scale, oy + (g.y / TILE) * scale, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = COLORS.player;
  ctx.beginPath();
  ctx.arc(ox + (game.player.x / TILE) * scale, oy + (game.player.y / TILE) * scale, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawScreen(ctx, game) {
  ctx.save();
  ctx.fillStyle = 'rgba(4, 7, 14, 0.82)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  if (game.screen === 'title') {
    ctx.fillStyle = '#37e0a0';
    ctx.font = 'bold 64px system-ui, sans-serif';
    ctx.fillText('SHADOW', VIEW_W / 2, 250);
    ctx.fillText('PROTOCOL', VIEW_W / 2, 320);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '20px system-ui, sans-serif';
    ctx.fillText('A top-down stealth game — slip past the patrols, unseen.', VIEW_W / 2, 380);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('WASD / arrows — move · SHIFT — sneak · SPACE — sprint (loud!)', VIEW_W / 2, 430);
    ctx.fillText('Hide in shadows, duck behind crates, grab the keycard, reach the exit.', VIEW_W / 2, 458);
    ctx.fillStyle = COLORS.keycard;
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(game.time % 1 < 0.6 ? '▶  Press ENTER or click to begin' : 'Press ENTER or click to begin', VIEW_W / 2, 530);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText('3 levels · guards with vision cones · suspicion that decays — get spotted, break line of sight, recover', VIEW_W / 2, 580);
  } else if (game.screen === 'win') {
    ctx.fillStyle = COLORS.exit;
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('GHOSTED.', VIEW_W / 2, 300);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText(`All 3 levels cleared in ${fmtTime(game.time)} — never once caught.`, VIEW_W / 2, 360);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press R to play again', VIEW_W / 2, 420);
  } else if (game.screen === 'caught') {
    ctx.fillStyle = COLORS.guardAlert;
    ctx.font = 'bold 56px system-ui, sans-serif';
    ctx.fillText('SPOTTED!', VIEW_W / 2, 300);
    ctx.fillStyle = COLORS.hud;
    ctx.font = '22px system-ui, sans-serif';
    ctx.fillText('A guard caught you in the open. Break line of sight next time — or move slower.', VIEW_W / 2, 360);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText('Press R to retry this level', VIEW_W / 2, 420);
  } else if (game.screen === 'paused') {
    ctx.fillStyle = COLORS.hud;
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.fillText('PAUSED', VIEW_W / 2, 320);
    ctx.fillStyle = COLORS.dim;
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Press P to resume · R to restart the level', VIEW_W / 2, 370);
  }
  ctx.restore();
}

export function drawToast(ctx, game) {
  if (!game.toast || game.toastTimer <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, game.toastTimer);
  ctx.fillStyle = 'rgba(5, 9, 16, 0.85)';
  const w = ctx.measureText(game.toast).width + 40;
  ctx.fillRect(VIEW_W / 2 - w / 2, 70, w, 36);
  ctx.fillStyle = COLORS.keycard;
  ctx.font = 'bold 16px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(game.toast, VIEW_W / 2, 93);
  ctx.restore();
}
