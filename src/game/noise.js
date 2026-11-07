export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const lerp = (a, b, t) => a + (b - a) * t;

// Deterministic random numbers so each stage has the same layout every time.
export function makeRng(seed) {
  let s = seed % 2147483647 || 1;
  return () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
}

function hash3(x, y, z) {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(z | 0, 1274126177);
  h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

export function noise3(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z);
  const xf = x - xi, yf = y - yi, zf = z - zi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf), w = zf * zf * (3 - 2 * zf);
  const x00 = lerp(hash3(xi, yi, zi), hash3(xi + 1, yi, zi), u);
  const x10 = lerp(hash3(xi, yi + 1, zi), hash3(xi + 1, yi + 1, zi), u);
  const x01 = lerp(hash3(xi, yi, zi + 1), hash3(xi + 1, yi, zi + 1), u);
  const x11 = lerp(hash3(xi, yi + 1, zi + 1), hash3(xi + 1, yi + 1, zi + 1), u);
  return lerp(lerp(x00, x10, v), lerp(x01, x11, v), w);
}

export function fbm3(x, y, z, octaves = 5) {
  let s = 0, a = 0.5, f = 1, n = 0;
  for (let i = 0; i < octaves; i++) { s += a * noise3(x * f, y * f, z * f); n += a; a *= 0.5; f *= 2.03; }
  return s / n;
}
