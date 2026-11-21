// Shadow Protocol — game loop, level flow, camera, collisions with objectives
// and the win/lose state machine. Pure canvas + WebAudio, no libraries.
import { LEVELS, parseLevel, tileAt } from './levels.js';
import { TILE, VIEW_W, VIEW_H, PLAYER } from './config.js';
import { makePlayer, movePlayer, noiseRadius } from './player.js';
import { makeGuard, updateGuard, guardCaught } from './guards.js';
import { makeAudio } from './audio.js';
import { makeInput } from './input.js';
import { drawWorld, drawHUD, drawScreen, drawToast } from './render.js';
import { applyShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

function fitCanvas() {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = VIEW_W * dpr;
  canvas.height = VIEW_H * dpr;
  canvas.style.width = '100vw';
  canvas.style.height = '100vh';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // Keep the 4:2.5 playfield centred: letterbox via CSS is handled by the
  // canvas filling the window and the camera mapping below.
}

const input = makeInput();
input.attach();
const audio = makeAudio();

const game = {
  screen: 'title',
  levelIndex: 0,
  level: null,
  guards: [],
  player: null,
  exit: null,
  hasKey: false,
  time: 0,
  cam: { x: 0, y: 0 },
  shake: 0,
  toast: '',
  toastTimer: 0,
  alertLevel: 0,
  particles: [],
  shot: null,
  spottedFlash: 0,
};

function loadLevel(index) {
  const def = LEVELS[index];
  const level = parseLevel(def);
  game.levelIndex = index;
  game.level = level;
  game.exit = level.exit;
  game.hasKey = false;
  game.player = makePlayer(level.player);
  game.guards = level.guards.map(makeGuard);
  game.particles = [];
  game.alertLevel = 0;
  game.toast = level.intro;
  game.toastTimer = 3.5;
  game.screen = 'playing';
  centreCamera(true);
  setStatus(`Level ${index + 1}: ${level.name}. Find the keycard, then reach the exit unseen.`);
}

function setStatus(text) { if (statusEl) statusEl.textContent = text; }

function centreCamera(snap) {
  const p = game.player;
  const mapW = game.level.cols * TILE;
  const mapH = game.level.rows * TILE;
  const tx = Math.max(0, Math.min(mapW - VIEW_W, p.x - VIEW_W / 2));
  const ty = Math.max(0, Math.min(mapH - VIEW_H, p.y - VIEW_H / 2));
  if (snap) { game.cam.x = tx; game.cam.y = ty; return; }
  game.cam.x += (tx - game.cam.x) * 0.12;
  game.cam.y += (ty - game.cam.y) * 0.12;
}

function burst(x, y, color, n) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2;
    const sp = 20 + Math.random() * 60;
    game.particles.push({
      x, y, color, size: 2 + Math.random() * 3,
      vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
      life: 0.6 + Math.random() * 0.4, max: 1,
    });
  }
}

function onSpotted(guard) {
  audio.alarm();
  game.shake = 10;
  game.spottedFlash = 0.5;
  game.toast = 'SPOTTED — break line of sight!';
  game.toastTimer = 2.5;
  setStatus('Spotted! Break line of sight to lose the guards.');
}

function update(dt) {
  game.time += dt;
  if (game.toastTimer > 0) game.toastTimer -= dt;
  if (game.spottedFlash > 0) game.spottedFlash -= dt;
  if (game.shake > 0) game.shake = Math.max(0, game.shake - dt * 22);
  // A staged ?shot= scene is frozen: time still ticks for pulsing lights,
  // but nobody moves, so the captured frame is the staged moment.
  if (game.shotFrozen) return;

  // Particles drift and fade.
  for (const p of game.particles) {
    p.x += p.vx * dt; p.y += p.vy * dt;
    p.vx *= 0.96; p.vy *= 0.96;
    p.life -= dt;
  }
  game.particles = game.particles.filter((p) => p.life > 0);

  if (game.screen !== 'playing') return;

  const p = game.player;
  p.sneaking = input.sneak();
  p.running = input.run() && !p.sneaking;
  const { x, y } = input.axis();
  movePlayer(p, game.level, x, y, dt);
  p._noise = noiseRadius(p);

  // Footstep sounds: quieter and rarer while sneaking, louder while running.
  // Guard footsteps too — the nearer a guard, the louder its steps.
  if (p.moving) {
    const interval = p.running ? 0.32 : p.sneaking ? 0.55 : 0.42;
    if (game.time - p.lastStep > interval) {
      p.lastStep = game.time;
      audio.footstep(p.sneaking ? 0.03 : p.running ? 0.12 : 0.06, true);
      burst(p.x, p.y + 10, 'rgba(200,210,230,0.5)', 1);
    }
  }
  for (const g of game.guards) {
    const d = Math.hypot(g.x - p.x, g.y - p.y);
    if (d < 260 && Math.sin(g.bob) > 0.98) audio.footstep(0.05 * (1 - d / 300), false);
  }

  for (const g of game.guards) updateGuard(g, game.level, p, dt, onSpotted);
  game.alertLevel = Math.max(0, ...game.guards.map((g) => g.suspicion));

  // Keycard pickup.
  const k = game.level.keycard;
  if (k && !k.taken && Math.hypot(p.x - k.x * TILE, p.y - k.y * TILE) < 28) {
    k.taken = true;
    game.hasKey = true;
    audio.pickup();
    burst(k.x * TILE, k.y * TILE, '#ffd23f', 18);
    game.toast = 'Keycard secured — reach the green exit!';
    game.toastTimer = 3;
    setStatus('Keycard secured. Reach the green exit.');
  }

  // Exit: only opens with the keycard.
  const ex = game.exit;
  if (ex && Math.hypot(p.x - ex.x * TILE, p.y - ex.y * TILE) < 26) {
    if (game.hasKey) {
      audio.win();
      burst(p.x, p.y, '#2fd47a', 26);
      if (game.levelIndex + 1 < LEVELS.length) {
        loadLevel(game.levelIndex + 1);
      } else {
        game.screen = 'win';
        setStatus('You cleared all three levels unseen. Ghosted.');
      }
      return;
    }
    if (game.toastTimer <= 0) {
      game.toast = 'Locked — you need the keycard first.';
      game.toastTimer = 2;
    }
  }

  // Caught?
  for (const g of game.guards) {
    if (guardCaught(g, p)) {
      audio.caught();
      game.screen = 'caught';
      game.shake = 14;
      setStatus('Caught! Press R to retry the level.');
      return;
    }
  }

  centreCamera(false);
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.save();
  if (game.shake > 0) ctx.translate((Math.random() - 0.5) * game.shake, (Math.random() - 0.5) * game.shake);
  if (game.screen === 'title') {
    // Title shows level 1 behind the overlay, dimmed.
    drawWorld(ctx, game);
    drawHUD(ctx, game);
  } else {
    drawWorld(ctx, game);
    drawHUD(ctx, game);
  }
  if (game.spottedFlash > 0) {
    ctx.fillStyle = `rgba(255, 59, 78, ${game.spottedFlash * 0.35})`;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  }
  drawToast(ctx, game);
  if (game.screen !== 'playing') drawScreen(ctx, game);
  ctx.restore();
}

function handleKeys() {
  if (input.tapped('Enter')) {
    if (game.screen === 'title') { audio.resume(); audio.click(); loadLevel(0); }
  }
  if (input.tapped('KeyR')) {
    if (game.screen === 'caught' || game.screen === 'win' || game.screen === 'paused') {
      audio.click();
      if (game.screen === 'win') { game.time = 0; loadLevel(0); }
      else loadLevel(game.levelIndex);
    }
  }
  if (input.tapped('KeyP')) {
    if (game.screen === 'playing') game.screen = 'paused';
    else if (game.screen === 'paused') game.screen = 'playing';
      }
  if (input.consumeClick() && game.screen === 'title') {
    audio.resume(); audio.click(); loadLevel(0);
  }
}

let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  handleKeys();
  update(dt);
  render();
  requestAnimationFrame(frame);
}

function start() {
  fitCanvas();
  window.__shadow = game; // playtest handle: inspect live state from the console
  window.addEventListener('resize', fitCanvas);
  const params = new URLSearchParams(window.location.search);
  game.shot = params.get('shot');
  loadLevel(0);
  game.screen = 'title';
  game.time = 0;
  if (game.shot) applyShot(game, game.shot);
  requestAnimationFrame(frame);
}

start();
