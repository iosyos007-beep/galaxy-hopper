import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { fbm3 } from './noise.js';
import { planetTexture, ringTexture } from './textures.js';

const glowSprite = (tex, color, opacity) => new THREE.Sprite(new THREE.SpriteMaterial({
  map: tex, color, opacity, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false
}));

// A tiny "studio" so metal and glass get reflections without loading an HDR file.
export function makeEnvironment(renderer) {
  const pm = new THREE.PMREMGenerator(renderer); const env = new THREE.Scene();
  const skyG = new THREE.SphereGeometry(50, 32, 16); const sp = skyG.attributes.position; const cols = [];
  for (let i = 0; i < sp.count; i++) {
    const y = sp.getY(i) / 50;
    if (y >= 0) cols.push(0.08 + 0.45 * y, 0.1 + 0.4 * y, 0.35 + 0.55 * y); else cols.push(0.22 - 0.1 * y, 0.06, 0.28);
  }
  skyG.setAttribute('color', new THREE.Float32BufferAttribute(cols, 3));
  env.add(new THREE.Mesh(skyG, new THREE.MeshBasicMaterial({ side: THREE.BackSide, vertexColors: true })));
  const lamp = (col, x, y, z, s) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s, s), new THREE.MeshBasicMaterial({ color: col, side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0, 0); env.add(m);
  };
  lamp(new THREE.Color(7, 6.4, 5.6), -20, 25, 22, 18);
  lamp(new THREE.Color(1, 3.2, 4.2), 30, 2, -8, 14);
  lamp(new THREE.Color(4.2, 1.2, 2.6), 0, -26, 24, 12);
  const tex = pm.fromScene(env, 0.03).texture; pm.dispose(); return tex;
}

export function makeNebula() {
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOff: { value: 0 }, uAspect: { value: 2 }, uTint: { value: new THREE.Vector3(0, 0, 0) } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: /* glsl */`
      uniform float uTime; uniform float uOff; uniform float uAspect; uniform vec3 uTint; varying vec2 vUv;
      float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      float noise(vec2 p){ vec2 i = floor(p); vec2 f = fract(p); vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y); }
      float fbm(vec2 p){ float v = 0.0; float a = 0.5; for (int i = 0; i < 6; i++){ v += a * noise(p); p = p * 2.03 + vec2(1.7, 9.2); a *= 0.5; } return v; }
      void main(){
        vec2 p = vec2(vUv.x * uAspect, vUv.y) * 1.8 + vec2(uOff, 0.0);
        float q = fbm(p * 0.8 + vec2(0.0, uTime * 0.01));
        float n = fbm(p + 1.6 * vec2(q, q * 0.7));
        float n2 = fbm(p * 1.6 - vec2(3.1, 1.3) + q);
        vec3 col = vec3(0.018, 0.024, 0.085);
        col = mix(col, vec3(0.30, 0.10, 0.50) + uTint, smoothstep(0.42, 0.85, n) * 0.75);
        col = mix(col, vec3(0.04, 0.30, 0.55), smoothstep(0.48, 0.9, n2) * 0.55);
        col += vec3(0.95, 0.30, 0.50) * pow(smoothstep(0.55, 0.95, n * n2 * 1.7), 2.0) * 0.55;
        col += vec3(0.4, 0.8, 1.0) * pow(smoothstep(0.7, 1.0, n2), 3.0) * 0.25;
        float vig = smoothstep(1.25, 0.25, length((vUv - 0.5) * vec2(1.2, 1.6)));
        col *= mix(0.55, 1.0, vig);
        gl_FragColor = vec4(col, 1.0);
      }`,
    depthWrite: false, depthTest: false
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
  mesh.renderOrder = -10; return mesh;
}

// Three layers of twinkling stars that wrap around forever (parallax).
export function makeStarLayers(viewH) {
  const TILE = 2800; const layers = [];
  [[700, 0.04, 1.8, 0.6], [260, 0.12, 2.8, 0.85], [70, 0.3, 4.6, 1.0]].forEach(([n, par, size, bright], li) => {
    const pos = new Float32Array(n * 3), sz = new Float32Array(n), ph = new Float32Array(n), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = Math.random() * TILE; pos[i * 3 + 1] = (Math.random() - 0.5) * viewH * 1.35;
      sz[i] = size * (0.6 + Math.random() * 0.8); ph[i] = Math.random() * 6.283;
      const t = Math.random(); const c = t < 0.6 ? [1, 1, 1] : t < 0.82 ? [0.72, 0.84, 1] : [1, 0.88, 0.68];
      col[i * 3] = c[0] * bright; col[i * 3 + 1] = c[1] * bright; col[i * 3 + 2] = c[2] * bright;
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(sz, 1));
    g.setAttribute('aPhase', new THREE.BufferAttribute(ph, 1)); g.setAttribute('aColor', new THREE.BufferAttribute(col, 3));
    const m = new THREE.ShaderMaterial({
      uniforms: { uCamX: { value: 0 }, uPar: { value: par }, uTile: { value: TILE }, uTime: { value: 0 }, uPR: { value: 1 }, uScale: { value: 1 } },
      vertexShader: /* glsl */`
        uniform float uCamX; uniform float uPar; uniform float uTile; uniform float uTime; uniform float uPR; uniform float uScale;
        attribute float aSize; attribute float aPhase; attribute vec3 aColor; varying vec3 vC; varying float vT;
        void main(){ vec3 p = position; p.x = mod(p.x - uCamX * uPar, uTile) - uTile * 0.5;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
          vT = 0.6 + 0.4 * sin(uTime * 2.2 + aPhase); gl_PointSize = aSize * uPR * max(uScale, 0.6); vC = aColor; }`,
      fragmentShader: 'varying vec3 vC; varying float vT; void main(){ float d = length(gl_PointCoord - 0.5); float a = pow(smoothstep(0.5, 0.0, d), 1.5); gl_FragColor = vec4(vC * vT, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });
    const pts = new THREE.Points(g, m); pts.position.z = -2400 + li * 10; pts.frustumCulled = false;
    layers.push(pts);
  });
  return layers;
}

const PLANET_STYLES = {
  earth:   { glow: 0x4fb8ff },
  moon:    { glow: 0xb8c8ff },
  belt:    { glow: 0xd0b090 },
  mars:    { glow: 0xff7a40 },
  jupiter: { glow: 0xffb070 },
  saturn:  { glow: 0xffd890, ring: [240, 210, 160] },
  uranus:  { glow: 0x7ae0ff, ring: [190, 230, 240] },
  neptune: { glow: 0x5a8cff }
};

export function makePlanet(kind, r, glowTex, { texSize = 256, glow = 0.6 } = {}) {
  const grp = new THREE.Group();
  if (kind === 'blackhole') return makeBlackHole(r, glowTex);
  const style = PLANET_STYLES[kind] || PLANET_STYLES.moon;
  const sph = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 32),
    new THREE.MeshStandardMaterial({ map: planetTexture(kind, texSize), roughness: 0.92, metalness: 0 }));
  sph.rotation.x = 0.35; grp.add(sph); grp.userData.spin = sph;
  if (kind === 'earth') {
    const cl = new THREE.Mesh(new THREE.SphereGeometry(r * 1.015, 64, 32),
      new THREE.MeshStandardMaterial({ map: planetTexture('clouds', 256), transparent: true, roughness: 1, depthWrite: false }));
    cl.rotation.x = 0.35; grp.add(cl); grp.userData.clouds = cl;
  }
  const gl = glowSprite(glowTex, style.glow, glow); gl.scale.set(r * 2.9, r * 2.9, 1); gl.position.z = -r - 4; grp.add(gl);
  if (style.ring) {
    const r0 = r * 1.35, r1 = r * 2.15; const rg = new THREE.RingGeometry(r0, r1, 128, 1);
    const p = rg.attributes.position, uv = rg.attributes.uv, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); uv.setXY(i, (v.length() - r0) / (r1 - r0), 0.5); }
    const ring = new THREE.Mesh(rg, new THREE.MeshStandardMaterial({ map: ringTexture(style.ring), transparent: true, side: THREE.DoubleSide, roughness: 1, depthWrite: false }));
    ring.rotation.x = -1.22; ring.rotation.y = 0.28; grp.add(ring);
  }
  return grp;
}

function makeBlackHole(r, glowTex) {
  const grp = new THREE.Group();
  const outer = glowSprite(glowTex, 0xff8a30, 0.9); outer.scale.set(r * 3.6, r * 3.6, 1); outer.position.z = -r - 10; grp.add(outer);
  const disk = new THREE.Mesh(new THREE.RingGeometry(r * 1.1, r * 2.2, 128, 1), new THREE.MeshBasicMaterial({ color: 0xffa040, transparent: true, opacity: 0.55, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
  disk.rotation.x = -1.25; grp.add(disk);
  const hole = new THREE.Mesh(new THREE.SphereGeometry(r, 48, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  grp.add(hole);
  const rim = glowSprite(glowTex, 0xffd8a0, 0.6); rim.scale.set(r * 2.3, r * 2.3, 1); rim.position.z = -2; grp.add(rim);
  grp.userData.spin = disk;
  return grp;
}

// ---------- ships ----------
// Every ship points along +x and is roughly 90 world units long after scaling.
// The camera sees the +z side; the ship rocks around x a little, so the top/bottom show too.
// userData: fo/fc = flame sprites, shield, light, hot (nozzle glow), blink + blinkGlow (nav lights),
// tailX = nozzle exit in model units, tailWorld = same in world units (for exhaust particles).
export function makeShip(id, color, glowTex) {
  const g = new THREE.Group(); g.rotation.order = 'ZYX';
  const base = new THREE.Color(color);
  const std = (c, o = {}) => new THREE.MeshStandardMaterial({ color: c, metalness: 0.3, roughness: 0.3, ...o });
  const lit = (c, k = 1.6) => std(c, { emissive: c, emissiveIntensity: k, roughness: 0.4 });
  const M = {
    white: std(0xf2f5ff, { metalness: 0.25, roughness: 0.25 }),
    accent: std(base, { metalness: 0.35, roughness: 0.28 }),
    accentDark: std(base.clone().multiplyScalar(0.6), { metalness: 0.4, roughness: 0.32 }),
    dark: std(0x2a3150, { metalness: 0.85, roughness: 0.3, side: THREE.DoubleSide }),
    chrome: std(0xdde4f4, { metalness: 1, roughness: 0.14 }),
    gold: std(0xffc93c, { metalness: 0.9, roughness: 0.22, emissive: 0x4a2c00, emissiveIntensity: 0.4 }),
    glass: std(0x1c2c78, { metalness: 0.75, roughness: 0.05, emissive: 0x2ee6ff, emissiveIntensity: 0.22 }),
    neon: lit(0x3ee6ff, 1.1),
    hot: new THREE.MeshBasicMaterial({ color: 0xffb060 }),
    glint: new THREE.MeshBasicMaterial({ color: 0xffffff }),
    navG: lit(0x2bff88),
    blink: lit(0xff4d6d, 2)
  };
  const blinkGlow = [];

  const add = (geo, mat, x = 0, y = 0, z = 0, parent = g) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); parent.add(m); return m; };
  const sphere = (r, ws = 20, hs = 14) => new THREE.SphereGeometry(r, ws, hs);
  const rbox = (w, h, d, r) => new RoundedBoxGeometry(w, h, d, 3, r);
  // Profile [radius, along] spun around the ship's axis; `along` becomes +x (nose).
  const lathe = (pts, seg = 40) => { const geo = new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg); geo.rotateZ(-Math.PI / 2); return geo; };
  // Same, but spun around y (for the saucer).
  const latheY = (pts, seg = 48) => new THREE.LatheGeometry(pts.map((p) => new THREE.Vector2(p[0], p[1])), seg);
  // Flat plate (fins, wings) from an outline. A point [x, y, cx, cy] curves there via control point (cx, cy).
  const plate = (pts, depth = 3, bevel = 1.2) => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]);
    pts.slice(1).forEach((p) => (p.length === 4 ? s.quadraticCurveTo(p[2], p[3], p[0], p[1]) : s.lineTo(p[0], p[1])));
    s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });
    geo.translate(0, 0, -depth / 2); return geo;
  };
  const mirrorY = (mesh) => { const m = mesh.clone(); m.scale.y *= -1; m.position.y *= -1; g.add(m); return m; };
  const ring = (x, r, w, mat) => add(new THREE.CylinderGeometry(r, r, w, 40).rotateZ(Math.PI / 2), mat, x);
  // Engine bell opening backwards from x, with a hot glowing core and a chrome lip.
  const engine = (x, y, z, r, len) => {
    const e = new THREE.Group(); e.position.set(x, y, z); g.add(e);
    add(lathe([[r * 0.62, 0], [r * 0.8, -len * 0.45], [r, -len]], 28), M.dark, 0, 0, 0, e);
    add(new THREE.TorusGeometry(r, 1.3, 8, 28).rotateY(Math.PI / 2), M.chrome, -len, 0, 0, e);
    add(sphere(r * 0.72, 16, 10), M.hot, -len * 0.62, 0, 0, e).scale.x = 0.35;
    return e;
  };
  const navLight = (mat, x, y, z, r = 2.6) => {
    add(sphere(r, 10, 8), mat, x, y, z);
    const s = glowSprite(glowTex, mat.emissive, mat === M.blink ? 0 : 0.6); s.scale.set(r * 10, r * 10, 1); s.position.set(x, y, z + 2); g.add(s);
    if (mat === M.blink) blinkGlow.push(s);
  };
  // Round window: glass bubble, chrome rim, a white glint so it reads as shiny.
  const porthole = (x, y, z, r) => {
    add(sphere(r, 24, 16), M.glass, x, y, z).scale.z = 0.5;
    add(new THREE.TorusGeometry(r, r * 0.2, 10, 28), M.chrome, x, y, z + r * 0.18);
    add(sphere(r * 0.22, 8, 6), M.glint, x - r * 0.35, y + r * 0.35, z + r * 0.45);
  };

  let tailX = -50, scale = 0.92;

  if (id === 'saucer') {
    add(latheY([[0, -11], [14, -11], [28, -7.5], [40, -3], [46, 0]]), M.accentDark);   // belly
    add(latheY([[46, 0], [42, 3.5], [30, 7], [19, 9], [0, 9.5]]), M.accent);            // top deck
    add(new THREE.TorusGeometry(45.5, 2.4, 10, 64).rotateX(Math.PI / 2), M.white);
    add(new THREE.TorusGeometry(10, 1.8, 8, 28).rotateX(Math.PI / 2), M.neon, 0, -11, 0);   // tractor beam ring
    add(sphere(8, 16, 10), M.hot, 0, -11, 0).scale.y = 0.25;
    const bulb = lit(0xffc93c, 1.8);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      add(sphere(2.8, 10, 8), i % 2 ? M.blink : bulb, Math.cos(a) * 41, -3.2, Math.sin(a) * 41);
    }
    // a friendly little alien pilot
    const skin = std(0x7dff9a, { roughness: 0.55, metalness: 0 }), black = std(0x10142a, { roughness: 0.2 });
    add(sphere(7, 18, 12), skin, 0, 10, 0).scale.set(1, 0.7, 1);
    add(sphere(8.5, 24, 16), skin, 0, 17, 0);
    [-1, 1].forEach((s) => {
      add(sphere(3.2, 14, 10), M.white, s * 3.5, 18, 7);
      add(sphere(1.7, 10, 8), black, s * 3.4, 18, 9.5);
      add(sphere(0.6, 6, 4), M.glint, s * 3.4 - 0.6, 18.7, 11.1);
      add(new THREE.CylinderGeometry(0.6, 0.6, 8, 6), skin, s * 3.2, 27, 0).rotation.z = -s * 0.3;
      add(sphere(1.7, 10, 8), M.blink, s * 4.4, 31, 0);
    });
    add(new THREE.SphereGeometry(19, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
      std(0xa8f4ff, { metalness: 0.1, roughness: 0.04, transparent: true, opacity: 0.32, emissive: 0x2ee6ff, emissiveIntensity: 0.12, depthWrite: false }), 0, 8, 0).renderOrder = 2;
    add(new THREE.TorusGeometry(19, 1.8, 8, 40).rotateX(Math.PI / 2), M.gold, 0, 8.5, 0);
    tailX = -44;
  } else if (id === 'racer') {
    const red = std(0xff4d6d, { metalness: 0.35, roughness: 0.28 });
    add(lathe([[0, -44], [9, -44], [12, -30], [13, -6], [12.2, 14], [9.5, 28]]), M.accent);
    add(lathe([[9.5, 28], [6.5, 40], [3, 50], [0, 56]]), red);
    ring(28, 9.9, 2, M.white);
    add(sphere(1, 28, 18), M.glass, 12, 9, 0).scale.set(20, 7.5, 8.5);                    // canopy
    add(sphere(1.2, 8, 6), M.glint, 18, 15.6, 3);
    const wing = add(plate([[8, 0], [-22, 36], [-36, 38], [-32, 0]]), M.accentDark, 0, 7, 0);
    mirrorY(wing);
    const tip = add(plate([[-18, 28], [-22, 36], [-36, 38], [-34, 28]], 3.6), red, 0, 7, 0);
    mirrorY(tip);
    navLight(M.blink, -30, 46, 0); navLight(M.navG, -30, -46, 0);
    add(rbox(18, 6, 4, 1.8), M.dark, -6, -4, 11.5);                                      // air scoop
    add(new THREE.CylinderGeometry(1.1, 1.1, 36, 8).rotateZ(Math.PI / 2), red, -10, 3, 12.3);  // racing stripe
    engine(-42, 0, 0, 9.5, 11);
    tailX = -56;
  } else if (id === 'hauler') {
    add(rbox(78, 46, 42, 9), M.accent, -4, 0, 0);
    add(rbox(8, 49, 45, 3), M.gold, 22, 0, 0);
    add(sphere(23, 28, 18), M.white, 34, 0, 0).scale.set(1.05, 0.95, 0.9);                 // cockpit pod
    const ws = add(rbox(20, 14, 6, 2.8), M.glass, 44, 7, 16.5); ws.rotation.y = 0.5;
    add(sphere(1.4, 8, 6), M.glint, 41, 11, 20.5);
    add(sphere(3, 12, 8), M.glint, 57, -6, 6);                                             // headlight
    const hl = glowSprite(glowTex, 0xfff2b0, 0.8); hl.scale.set(30, 30, 1); hl.position.set(58, -6, 9); g.add(hl);
    [[-24, 0xff8a3c], [2, 0x3ee6ff]].forEach(([x, c]) => {                                 // cargo crates
      add(rbox(24, 16, 30, 3), std(c, { metalness: 0.3, roughness: 0.4 }), x, 30, 0);
      add(rbox(4, 17, 31, 1.5), M.dark, x, 30, 0);
    });
    [-24, 0].forEach((x) => {                                                               // side panels with bolts
      add(rbox(20, 24, 3, 1.4), M.white, x, -1, 20.6);
      [[-7, 9], [7, 9], [-7, -9], [7, -9]].forEach(([bx, by]) => add(sphere(1.4, 8, 6), M.chrome, x + bx, -1 + by, 22.4));
    });
    add(rbox(52, 3, 2, 1), M.neon, -12, -17, 21);
    add(new THREE.CylinderGeometry(0.9, 0.9, 14, 6), M.chrome, 30, 26, 0);                 // antenna
    navLight(M.blink, 30, 34, 0, 2.4);
    [-24, 12].forEach((x) => add(new THREE.CylinderGeometry(2.2, 2.2, 8, 10), M.dark, x, -26, 0));  // landing skid
    add(rbox(54, 3.5, 12, 1.5), M.chrome, -6, -31, 0);
    engine(-43, 12, 0, 11, 14); engine(-43, -12, 0, 11, 14);
    tailX = -60; scale = 0.8;
  } else {
    // Comet Cub — classic rocket
    add(lathe([[0, -40], [13, -40], [17.5, -32], [19.6, -16], [20, 0], [19.4, 14], [17.8, 21]]), M.white);
    add(lathe([[17.8, 21], [15.6, 30], [11.5, 39], [6, 45.5], [2.5, 47.5], [0, 48]]), M.accent);
    add(sphere(2.6, 12, 8), M.gold, 47.5, 0, 0);
    ring(21, 18.3, 2.5, M.gold); ring(-6, 20.3, 6, M.accent); ring(-30, 18.2, 2.5, M.gold);
    porthole(8, 3, 17, 9); porthole(-19, 1, 16.5, 4.5);
    const fg = plate([[-10, 0], [-40, 31, -20, 16], [-51, 33], [-42, 0, -49, 14]]);
    const f1 = add(fg, M.accent, 0, 13, 0); mirrorY(f1);
    add(fg, M.accentDark, 0, 0, 13).rotation.x = Math.PI / 2;
    engine(-40, 0, 0, 12, 12);
    tailX = -52;
  }

  const fo = glowSprite(glowTex, 0xff7a2a, 0.95); fo.position.set(tailX - 16, 0, 0); g.add(fo);
  const fc = glowSprite(glowTex, 0xfff2b0, 1); fc.position.set(tailX - 8, 0, 2); g.add(fc);
  const shield = glowSprite(glowTex, 0x3ee6ff, 0); shield.scale.set(170 / scale * 0.92, 170 / scale * 0.92, 1); g.add(shield);
  const light = new THREE.PointLight(0xff9a40, 0, 320, 1.6); light.position.set(tailX - 25, 0, 50); g.add(light);
  g.userData = { fo, fc, shield, light, tailX, tailWorld: tailX * scale, hot: M.hot, blink: M.blink, blinkGlow };
  g.scale.setScalar(scale);
  return g;
}

// ---------- pickups and obstacles ----------
export function makeRockGeos(count = 6) {
  const out = [];
  for (let s = 1; s <= count; s++) {
    const g = new THREE.IcosahedronGeometry(1, 2); const p = g.attributes.position, v = new THREE.Vector3();
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      const n = fbm3(v.x * 1.7 + s * 7.13 + 20, v.y * 1.7 + s * 3.31 + 20, v.z * 1.7 + 20, 3);
      v.multiplyScalar(0.62 + n * 0.8); p.setXYZ(i, v.x, v.y * 0.9, v.z);
    }
    g.computeVertexNormals(); out.push(g);
  }
  return out;
}

export const makeRockMats = (colors) => colors.map((c) => new THREE.MeshStandardMaterial({ color: c, roughness: 0.9, metalness: 0.08, flatShading: true }));

function starShape(R, r) {
  const s = new THREE.Shape();
  for (let i = 0; i < 10; i++) { const a = Math.PI / 2 + i * Math.PI / 5, rad = i % 2 ? r : R; const x = Math.cos(a) * rad, y = Math.sin(a) * rad; if (i) s.lineTo(x, y); else s.moveTo(x, y); }
  s.closePath(); return s;
}

export function makeCoin(glowTex) {
  const coin = new THREE.Group();
  const cg = new THREE.CylinderGeometry(13, 13, 3.6, 32); cg.rotateX(Math.PI / 2);
  coin.add(new THREE.Mesh(cg, new THREE.MeshStandardMaterial({ color: 0xffc93c, metalness: 0.8, roughness: 0.25, emissive: 0x8a5200, emissiveIntensity: 0.55 })));
  const starMat = new THREE.MeshStandardMaterial({ color: 0xfff0a8, metalness: 0.6, roughness: 0.2, emissive: 0xb07a00, emissiveIntensity: 0.6, side: THREE.DoubleSide });
  const sg = new THREE.ShapeGeometry(starShape(7.5, 3.4));
  const s1 = new THREE.Mesh(sg, starMat); s1.position.z = 1.9; coin.add(s1);
  const s2 = new THREE.Mesh(sg, starMat); s2.position.z = -1.9; s2.rotation.y = Math.PI; coin.add(s2);
  const gl = glowSprite(glowTex, 0xffb020, 0.5); gl.scale.set(54, 54, 1); gl.position.z = -8; coin.add(gl);
  return coin;
}

export function makeFuelCell(glowTex) {
  const fuel = new THREE.Group();
  fuel.add(new THREE.Mesh(new THREE.CapsuleGeometry(8, 18, 4, 16), new THREE.MeshStandardMaterial({ color: 0x2bff88, emissive: 0x19d46a, emissiveIntensity: 1.1, roughness: 0.25, metalness: 0.1 })));
  const capm = new THREE.MeshStandardMaterial({ color: 0xe8eeff, metalness: 0.7, roughness: 0.25 });
  const capG = new THREE.CylinderGeometry(8.6, 8.6, 4, 20);
  [8, -8].forEach((y) => { const c = new THREE.Mesh(capG, capm); c.position.y = y; fuel.add(c); });
  const gl = glowSprite(glowTex, 0x2bff88, 0.6); gl.scale.set(70, 70, 1); gl.position.z = -10; fuel.add(gl);
  return fuel;
}

export function makePortal(glowTex) {
  const ring = new THREE.Group();
  const tor = new THREE.Mesh(new THREE.TorusGeometry(165, 9, 20, 120), new THREE.MeshStandardMaterial({ color: 0x3ee6ff, emissive: 0x3ee6ff, emissiveIntensity: 2.2, roughness: 0.3, metalness: 0.2 }));
  tor.rotation.y = 1.18; ring.add(tor);
  const gl = glowSprite(glowTex, 0x3ee6ff, 0.4); gl.scale.set(150, 420, 1); ring.add(gl);
  ring.userData.tor = tor;
  return ring;
}
