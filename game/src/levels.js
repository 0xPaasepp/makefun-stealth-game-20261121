// Shadow Protocol — hand-designed maps.
// Legend: # wall · . floor · , lit floor · _ shadow floor · C crate (cover, blocks sight)
//          P player start · K keycard · E exit · G guard spawn (patrols listed per level)
export const LEVELS = [
  {
    name: '01 · The Lobby',
    intro: 'Slip past the patrols, grab the keycard, reach the green exit unseen.',
    map: [
      '########################',
      '#P.....,,.....#........#',
      '#......,,.....#...K....#',
      '#..C...,,..C..#........#',
      '#......,,.....#...C....#',
      '#..____,,__...#........#',
      '#..____,,__...#....E...#',
      '#......,,.....#........#',
      '#..C...,,..C..#........#',
      '#......,,.....#........#',
      '#..____,,__...#........#',
      '#......,,.....#........#',
      '########################',
    ],
    guards: [
      { x: 9, y: 2, waypoints: [[9, 2], [9, 10], [5, 10], [5, 2]] },
      { x: 15, y: 9, waypoints: [[15, 9], [15, 3], [19, 3], [19, 9]] },
      { x: 20, y: 6, waypoints: [[20, 6], [20, 10], [17, 10], [17, 6]] },
    ],
  },
  {
    name: '02 · The Vault Floor',
    intro: 'More guards, tighter corridors. Shadows are your friends — lit floors betray you.',
    map: [
      '########################',
      '#P..C....#.....,,......#',
      '#......__#.....,,..K...#',
      '#..C...__#..C..,,......#',
      '#......__#.....,,......#',
      '####.####..C...,,..C...#',
      '#......__.....C,,......#',
      '#..C...__..#....,,.....#',
      '#......__..#....,,..E..#',
      '#..____....#..C.,,.....#',
      '#......C...#.....,,....#',
      '#......__..#.....,,....#',
      '########################',
    ],
    guards: [
      { x: 7, y: 2, waypoints: [[7, 2], [7, 9], [3, 9], [3, 2]] },
      { x: 13, y: 1, waypoints: [[13, 1], [13, 5], [18, 5], [18, 1]] },
      { x: 16, y: 8, waypoints: [[16, 8], [16, 11], [20, 11], [20, 8]] },
      { x: 10, y: 7, waypoints: [[10, 7], [10, 11], [6, 11], [6, 7]] },
    ],
  },
  {
    name: '03 · The Rooftop Run',
    intro: 'Final floor. Fast patrols, long sightlines. Patience wins — sprint only in the dark.',
    map: [
      '########################',
      '#P......,,....#....K...#',
      '#..C....,,..C.#........#',
      '#......_,,....#...C....#',
      '#..__..,,..__.#........#',
      '#......,,.....#....E...#',
      '#..C...,,..C..####.#####',
      '#......,,.....#........#',
      '#..__..,,..__.#...C....#',
      '#......,,.....#........#',
      '#..C...,,..C..#........#',
      '#......,,.....#........#',
      '########################',
    ],
    guards: [
      { x: 8, y: 2, waypoints: [[8, 2], [8, 10], [4, 10], [4, 2]] },
      { x: 13, y: 4, waypoints: [[13, 4], [13, 1], [19, 1], [19, 4]] },
      { x: 18, y: 9, waypoints: [[18, 9], [18, 7], [21, 7], [21, 9]] },
      { x: 21, y: 3, waypoints: [[21, 3], [21, 10], [21, 3]] },
      { x: 11, y: 8, waypoints: [[11, 8], [11, 11], [7, 11], [7, 8]] },
    ],
  },
];

// Parse one level's string map into tiles, spawns and objectives.
export function parseLevel(def) {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const tiles = [];
  let player = { x: 1.5, y: 1.5 };
  let keycard = null;
  let exit = null;
  for (let y = 0; y < rows; y++) {
    const row = [];
    for (let x = 0; x < cols; x++) {
      const ch = def.map[y][x];
      if (ch === 'P') { player = { x: x + 0.5, y: y + 0.5 }; row.push('.'); }
      else if (ch === 'K') { keycard = { x: x + 0.5, y: y + 0.5, taken: false }; row.push('.'); }
      else if (ch === 'E') { exit = { x: x + 0.5, y: y + 0.5 }; row.push('.'); }
      else row.push(ch);
    }
    tiles.push(row);
  }
  return { name: def.name, intro: def.intro, tiles, rows, cols, player, keycard, exit,
    guards: def.guards.map((g) => ({ ...g })) };
}

export function tileAt(level, tx, ty) {
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.tiles[ty][tx];
}

export function isSolid(level, tx, ty) {
  const t = tileAt(level, tx, ty);
  return t === '#' || t === 'C';
}

export function blocksSight(level, tx, ty) {
  return isSolid(level, tx, ty);
}

export function isShadow(level, tx, ty) {
  return tileAt(level, tx, ty) === '_';
}

export function isLit(level, tx, ty) {
  return tileAt(level, tx, ty) === ',';
}
