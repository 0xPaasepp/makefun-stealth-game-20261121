// Shadow Protocol — guard patrols, vision cones, hearing and the alert system.
// Suspicion 0-100: rises while the player is seen, decays in the dark.
// States: patrol -> suspicious (investigate) -> alert (chase) -> search -> patrol.
import { GUARD, TILE } from './config.js';
import { blocksSight, isLit, isShadow } from './levels.js';

export function makeGuard(def) {
  const start = def.waypoints[0];
  return {
    x: start[0] * TILE,
    y: start[1] * TILE,
    radius: GUARD.radius,
    waypoints: def.waypoints.map(([wx, wy]) => ({ x: (wx + 0.5) * TILE, y: (wy + 0.5) * TILE })),
    wpIndex: 1,
    angle: 0,
    state: 'patrol',
    suspicion: 0,
    alertTimer: 0,
    searchTimer: 0,
    lastSeen: null,
    pauseTimer: 0,
    bob: Math.random() * 6,
  };
}

function dist(ax, ay, bx, by) { return Math.hypot(bx - ax, by - ay); }

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

// Grid raycast: true when no wall or crate blocks the line between two points.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const steps = Math.ceil(dist(ax, ay, bx, by) / (TILE / 3));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const x = ax + (bx - ax) * t;
    const y = ay + (by - ay) * t;
    if (blocksSight(level, Math.floor(x / TILE), Math.floor(y / TILE))) return false;
  }
  return true;
}

export function canSeePlayer(guard, level, player) {
  const d = dist(guard.x, guard.y, player.x, player.y);
  if (d > GUARD.viewRange) return { seen: false, d };
  const toPlayer = Math.atan2(player.y - guard.y, player.x - guard.x);
  if (Math.abs(angleDiff(guard.angle, toPlayer)) > GUARD.viewHalfAngle) return { seen: false, d };
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return { seen: false, d };
  return { seen: true, d };
}

export function updateGuard(guard, level, player, dt, onSpotted) {
  const seen = canSeePlayer(guard, level, player);
  const ptx = Math.floor(player.x / TILE);
  const pty = Math.floor(player.y / TILE);
  const inShadow = isShadow(level, ptx, pty);
  const inLight = isLit(level, ptx, pty);

  if (seen.seen) {
    let rate = inShadow ? GUARD.spotRateShadow : GUARD.spotRateLit;
    if (player.sneaking) rate *= GUARD.spotRateSneak;
    if (inLight) rate *= 1.4;
    // Closer is scarier: detection speeds up inside half range.
    if (seen.d < GUARD.viewRange * 0.5) rate *= 1.6;
    guard.suspicion = Math.min(100, guard.suspicion + rate * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (guard.suspicion >= GUARD.alertAt && guard.state !== 'alert') {
      guard.state = 'alert';
      guard.alertTimer = GUARD.alertCooldown;
      onSpotted(guard);
    } else if (guard.suspicion >= GUARD.suspiciousAt && guard.state === 'patrol') {
      guard.state = 'suspicious';
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - GUARD.decayRate * dt);
    if (guard.state === 'suspicious' && guard.suspicion < GUARD.suspiciousAt * 0.4) {
      guard.state = 'search';
      guard.searchTimer = GUARD.searchTime;
    }
  }

  // Hearing: a loud player pulls the nearest guard to investigate.
  const noise = player._noise || 0;
  if (noise > 0 && guard.state === 'patrol') {
    const d = dist(guard.x, guard.y, player.x, player.y);
    if (d < Math.min(noise, GUARD.hearRange) * 1.2) {
      guard.state = 'suspicious';
      guard.lastSeen = { x: player.x, y: player.y };
      guard.suspicion = Math.max(guard.suspicion, GUARD.suspiciousAt);
    }
  }

  let speed = GUARD.patrolSpeed;
  let target = null;
  if (guard.state === 'alert') {
    speed = GUARD.chaseSpeed;
    target = guard.lastSeen || { x: player.x, y: player.y };
    guard.alertTimer -= dt;
    if (guard.alertTimer <= 0) {
      guard.state = 'search';
      guard.searchTimer = GUARD.searchTime;
      guard.suspicion = 60;
    }
  } else if (guard.state === 'suspicious' || guard.state === 'search') {
    speed = guard.state === 'search' ? GUARD.searchSpeed : GUARD.patrolSpeed * 1.5;
    target = guard.lastSeen;
    if (guard.state === 'search') {
      guard.searchTimer -= dt;
      if (guard.searchTimer <= 0) { guard.state = 'patrol'; guard.suspicion = 0; }
    }
  } else {
    if (guard.pauseTimer > 0) { guard.pauseTimer -= dt; return; }
    target = guard.waypoints[guard.wpIndex];
  }

  if (target) {
    const d = dist(guard.x, guard.y, target.x, target.y);
    if (d < 6) {
      if (guard.state === 'patrol') {
        guard.wpIndex = (guard.wpIndex + 1) % guard.waypoints.length;
        guard.pauseTimer = 0.7;
      } else if (guard.state === 'suspicious' || guard.state === 'search') {
        guard.state = 'search';
        guard.searchTimer = Math.max(guard.searchTimer, 2.5);
        // Look around at the last known spot, then give up.
        guard.angle += dt * 1.8;
        return;
      }
    } else {
      const want = Math.atan2(target.y - guard.y, target.x - guard.x);
      guard.angle += Math.max(-3.2 * dt, Math.min(3.2 * dt, angleDiff(guard.angle, want)));
      guard.x += Math.cos(guard.angle) * speed * dt;
      guard.y += Math.sin(guard.angle) * speed * dt;
    }
  }
  guard.bob += dt * 4;
}

// A guard catches the player when it gets close while alerted.
export function guardCaught(guard, player) {
  return guard.state === 'alert' && dist(guard.x, guard.y, player.x, player.y) < guard.radius + player.radius + 4;
}
