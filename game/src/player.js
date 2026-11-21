// Shadow Protocol — the player: movement, sneak/run, noise and collisions.
import { PLAYER, TILE } from './config.js';
import { isSolid } from './levels.js';

export function makePlayer(spawn) {
  return {
    x: spawn.x * TILE,
    y: spawn.y * TILE,
    radius: PLAYER.radius,
    sneaking: false,
    running: false,
    moving: false,
    stepPhase: 0,
    lastStep: 0,
    facing: 0,
  };
}

// Move with axis-separated collision so the player slides along walls.
export function movePlayer(player, level, dx, dy, dt) {
  const speed = player.running ? PLAYER.runSpeed
    : player.sneaking ? PLAYER.sneakSpeed : PLAYER.walkSpeed;
  const mx = dx * speed * dt;
  const my = dy * speed * dt;
  player.moving = Math.abs(dx) + Math.abs(dy) > 0.01;
  if (player.moving) player.facing = Math.atan2(dy, dx);
  tryStep(player, level, mx, 0);
  tryStep(player, level, 0, my);
  if (player.moving) player.stepPhase += dt * (player.running ? 11 : player.sneaking ? 6 : 8.5);
}

function tryStep(player, level, mx, my) {
  const nx = player.x + mx;
  const ny = player.y + my;
  const r = player.radius - 2;
  const corners = [
    [nx - r, ny - r], [nx + r, ny - r],
    [nx - r, ny + r], [nx + r, ny + r],
  ];
  for (const [cx, cy] of corners) {
    if (isSolid(level, Math.floor(cx / TILE), Math.floor(cy / TILE))) return;
  }
  player.x = nx;
  player.y = ny;
}

// How loud the player is right now: guards hear running from far away.
export function noiseRadius(player) {
  if (!player.moving) return 0;
  if (player.running) return PLAYER.noiseRun;
  if (player.sneaking) return PLAYER.noiseSneak;
  return PLAYER.noiseWalk;
}

export function tileOf(player) {
  return { x: Math.floor(player.x / TILE), y: Math.floor(player.y / TILE) };
}
