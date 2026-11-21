// Shadow Protocol — deterministic staged scenes for ?shot= screenshots.
// Each shot is a real render of the game's own code, staged by placing the
// player and guards and setting suspicion, never by drawing fake pixels.
import { TILE } from './config.js';

export function applyShot(game, shot) {
  // Staged scenes are frozen: guards hold their pose so the shot stays a
  // near-miss instead of playing out into a catch before the capture lands.
  game.shotFrozen = true;
  if (shot === 'start') {
    game.screen = 'title';
    game.time = 0.4;
    return;
  }
  game.screen = 'playing';
  const guard = game.guards[0];
  const p = game.player;
  if (shot === 'play') {
    // Mid-level: player crouched in shadow between two patrols, keycard ahead.
    p.x = 6.5 * TILE; p.y = 5.5 * TILE;
    p.sneaking = true;
    p.facing = 0.4;
    guard.x = 9.5 * TILE; guard.y = 3.5 * TILE; guard.angle = Math.PI / 2; guard.suspicion = 18;
    const g2 = game.guards[1];
    if (g2) { g2.x = 15.5 * TILE; g2.y = 6.5 * TILE; g2.angle = -Math.PI / 2; g2.suspicion = 8; }
  } else if (shot === 'alert') {
    // Near-miss: a guard has just spotted the player at the corridor mouth.
    p.x = 8.5 * TILE; p.y = 4.5 * TILE;
    p.facing = -0.6;
    guard.x = 9.5 * TILE; guard.y = 2.5 * TILE; guard.angle = Math.PI / 2;
    guard.state = 'alert'; guard.suspicion = 100; guard.alertTimer = 3;
    guard.lastSeen = { x: p.x, y: p.y };
    const g2 = game.guards[1];
    if (g2) { g2.x = 15.5 * TILE; g2.y = 5.5 * TILE; g2.angle = Math.PI; g2.state = 'suspicious'; g2.suspicion = 72; }
    game.toast = 'SPOTTED — break line of sight!';
    game.toastTimer = 3;
    game.shake = 6;
  } else if (shot === 'exit') {
    // Keycard in hand, player one step from the glowing exit.
    game.hasKey = true;
    game.level.keycard.taken = true;
    p.x = (game.exit.x - 1.6) * TILE; p.y = game.exit.y * TILE;
    p.facing = 0;
    guard.x = 15.5 * TILE; guard.y = 3.5 * TILE; guard.angle = Math.PI; guard.suspicion = 5;
    const g2 = game.guards[1];
    if (g2) { g2.x = 19.5 * TILE; g2.y = 9.5 * TILE; g2.angle = -Math.PI / 2; g2.suspicion = 0; }
    game.toast = 'Keycard secured — reach the exit!';
    game.toastTimer = 3;
  }
  // Centre the camera on the staged action.
  game.cam.x = Math.max(0, Math.min(game.level.cols * TILE - 1280, p.x - 640));
  game.cam.y = Math.max(0, Math.min(game.level.rows * TILE - 800, p.y - 400));
  game.time = 12.5;
}
