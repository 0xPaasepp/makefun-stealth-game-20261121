// Shadow Protocol — shared tuning numbers and colours.
// One place for every magic number so the other modules stay readable.
export const TILE = 60;
export const VIEW_W = 1280;
export const VIEW_H = 800;

export const PLAYER = {
  radius: 15,
  walkSpeed: 170,
  sneakSpeed: 92,
  runSpeed: 250,
  noiseWalk: 70,
  noiseSneak: 26,
  noiseRun: 150,
};

export const GUARD = {
  radius: 16,
  patrolSpeed: 62,
  chaseSpeed: 132,
  searchSpeed: 85,
  viewRange: 300,
  viewHalfAngle: 0.52,
  hearRange: 170,
  // Suspicion gained per second while the player is seen.
  spotRateLit: 55,
  spotRateShadow: 26,
  spotRateSneak: 0.55,
  decayRate: 22,
  alertAt: 100,
  suspiciousAt: 45,
  alertCooldown: 4.5,
  searchTime: 6,
};

export const COLORS = {
  floor: '#1c2433',
  floorAlt: '#202a3c',
  floorLit: '#3a3423',
  shadow: '#101623',
  wall: '#4a5872',
  wallTop: '#6b7d9e',
  crate: '#7a5a33',
  crateTop: '#9c7743',
  exit: '#2fd47a',
  keycard: '#ffd23f',
  player: '#37e0a0',
  playerSneak: '#2bb3ff',
  guardCalm: '#ffcf5c',
  guardSuspicious: '#ff9f2e',
  guardAlert: '#ff3b4e',
  coneCalm: 'rgba(255, 207, 92, 0.20)',
  coneSuspicious: 'rgba(255, 159, 46, 0.30)',
  coneAlert: 'rgba(255, 59, 78, 0.38)',
  hud: '#e8eef7',
  dim: '#8b98ad',
};

export const LEVEL_NAMES = [
  '01 · The Lobby',
  '02 · The Vault Floor',
  '03 · The Rooftop Run',
];
