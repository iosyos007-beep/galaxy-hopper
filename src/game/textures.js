import * as THREE from 'three';
import { fbm3, clamp, makeRng } from './noise.js';

export function glowTexture() {
  const cv = document.createElement('canvas'); cv.width = cv.height = 128;
  const c = cv.getContext('2d');
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.12)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; return t;
}

const SEEDS = { earth: 3, clouds: 41, moon: 23, belt: 29, mars: 11, jupiter: 5, saturn: 7, uranus: 17, neptune: 19 };

function banded(v, n, a, b) {
  const band = Math.sin(v * 30 + n * 7) * 0.5 + 0.5;
  return [a[0] + (b[0] - a[0]) * band, a[1] + (b[1] - a[1]) * band, a[2] + (b[2] - a[2]) * band];
}

// Seamless equirectangular planet texture painted from 3D noise.
export function planetTexture(kind, W = 256) {
  const H = W / 2;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const ctx = cv.getContext('2d'); const img = ctx.createImageData(W, H); const d = img.data;
  const seed = SEEDS[kind] || 1;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, a = u * Math.PI * 2;
    const n = fbm3(Math.cos(a) * 1.7 + seed, v * 3.4, Math.sin(a) * 1.7, 5);
    const lat = Math.abs(v - 0.5) * 2;
    let r, g, b, al = 255;
    switch (kind) {
      case 'earth':
        if (n > 0.52) { const t = Math.min(1, (n - 0.52) * 5); r = 70 + 110 * t; g = 170 - 40 * t; b = 80 - 30 * t; }
        else { const t = n / 0.52; r = 12 + 30 * t; g = 70 + 90 * t; b = 160 + 80 * t; }
        if (lat > 0.84) r = g = b = 238;
        break;
      case 'clouds': { const t = clamp((n - 0.5) * 5, 0, 1); r = g = b = 255; al = Math.round(t * 230); break; }
      case 'mars': r = 150 + 100 * n; g = 60 + 50 * n; b = 35 + 25 * n; if (lat > 0.88) { r = 245; g = 235; b = 230; } break;
      case 'belt': r = 110 + 100 * n; g = 95 + 90 * n; b = 80 + 70 * n; break;
      case 'jupiter': [r, g, b] = banded(v, n, [150, 90, 50], [250, 215, 170]); break;
      case 'saturn': [r, g, b] = banded(v, n, [200, 160, 100], [255, 235, 180]); break;
      case 'uranus': r = 120 + 70 * n; g = 210 + 40 * n; b = 225 + 25 * n; break;
      case 'neptune': [r, g, b] = banded(v, n, [30, 60, 170], [110, 160, 255]); break;
      default: r = g = b = 105 + 120 * n; b += 10; // moon
    }
    const i = (y * W + x) * 4; d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = al;
  }
  ctx.putImageData(img, 0, 0);
  if (kind === 'moon' || kind === 'belt') {
    const rnd = makeRng(9);
    for (let i = 0; i < 70; i++) {
      const cx = rnd() * W, cy = H * 0.12 + rnd() * H * 0.76, rad = (3 + Math.pow(rnd(), 2.5) * 26) * (W / 512);
      ctx.fillStyle = 'rgba(55,58,75,0.35)'; ctx.beginPath(); ctx.ellipse(cx, cy, rad, rad * 0.9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.22)'; ctx.lineWidth = Math.max(1, rad * 0.15);
      ctx.beginPath(); ctx.ellipse(cx + rad * 0.12, cy + rad * 0.12, rad, rad * 0.9, 0, Math.PI * 0.1, Math.PI * 1.1); ctx.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4; return tex;
}

export function ringTexture(tint = [230, 190, 140]) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 4; const c = cv.getContext('2d');
  for (let x = 0; x < 256; x++) {
    const t = x / 255;
    const a = (0.35 + 0.65 * Math.abs(Math.sin(t * 23) * Math.sin(t * 7 + 1))) * Math.sin(t * Math.PI);
    c.fillStyle = `rgba(${tint[0] - t * 40 | 0},${tint[1] - t * 40 | 0},${tint[2] - t * 30 | 0},${a.toFixed(3)})`;
    c.fillRect(x, 0, 1, 4);
  }
  const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; return tex;
}
