// Shadow Protocol — keyboard + mouse input, one object the game reads each frame.
export function makeInput() {
  const keys = new Set();
  const taps = new Set(); // keys tapped since last check — survives a down+up within one frame
  const input = {
    keys,
    mouse: { x: 0, y: 0, clicked: false },
    attach() {
      window.addEventListener('keydown', (e) => {
        if (!e.repeat) taps.add(e.code);
        keys.add(e.code);
        if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      });
      window.addEventListener('keyup', (e) => keys.delete(e.code));
      window.addEventListener('blur', () => keys.clear());
      window.addEventListener('mousemove', (e) => { input.mouse.x = e.clientX; input.mouse.y = e.clientY; });
      window.addEventListener('mousedown', () => { input.mouse.clicked = true; });
    },
    axis() {
      let x = 0; let y = 0;
      if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
      if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) y -= 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) y += 1;
      if (x !== 0 && y !== 0) { x *= Math.SQRT1_2; y *= Math.SQRT1_2; }
      return { x, y };
    },
    sneak() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    run() { return keys.has('Space'); },
    pressed(code) { return keys.has(code); },
    // True once per tap, even a very quick one.
    tapped(code) { const hit = taps.has(code); taps.delete(code); return hit; },
    consumeClick() { const c = input.mouse.clicked; input.mouse.clicked = false; return c; },
  };
  return input;
}
