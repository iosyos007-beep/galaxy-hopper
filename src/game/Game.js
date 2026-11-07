import * as THREE from 'three';
import { DIFFICULTY, starsFor } from './config.js';
import { clamp, lerp, makeRng } from './noise.js';
import { glowTexture } from './textures.js';
import {
  makeEnvironment, makeNebula, makeStarLayers, makePlanet, makeShip,
  makeRockGeos, makeRockMats, makeCoin, makeFuelCell, makePortal
} from './models.js';
import { Particles } from './particles.js';
import { GameAudio } from './audio.js';

const VIEW_H = 560;      // world units visible top-to-bottom (the game is scaled to fit any screen)
const BOUND_Y = 245;     // how far up/down the ship may fly

/**
 * The whole game world. The UI talks to it through a small API:
 *   setStage(stage), setShip(ship), setOptions({difficulty, music, muted}),
 *   start(), pause(), resume(), toIdle(), setInput('up'|'down', bool)
 * and listens with callbacks: onHud(hud), onEnd({ result, coins, total, stars }).
 * phase: 'idle' (attract mode behind menus) | 'playing' | 'paused' | 'ending' | 'done'
 */
export class Game {
  constructor(canvas, { onHud = () => {}, onEnd = () => {} } = {}) {
    this.canvas = canvas; this.onHud = onHud; this.onEnd = onEnd;
    this.input = { up: false, down: false };
    this.opts = { difficulty: 'easy', music: true, muted: false };
    this.phase = 'idle'; this.t = 0; this.hudT = 0; this.menuShip = true;
    this.audio = new GameAudio();

    const R = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    R.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    R.toneMapping = THREE.ACESFilmicToneMapping; R.toneMappingExposure = 1.05;
    this.renderer = R;

    const scene = new THREE.Scene(); this.scene = scene;
    const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, -3000, 3000); cam.position.set(0, 0, 1000);
    scene.add(cam); this.cam = cam;
    this.glowTex = glowTexture();
    scene.environment = makeEnvironment(R);
    const sun = new THREE.DirectionalLight(0xfff0dd, 2.4); sun.position.set(-0.6, 0.75, 1); scene.add(sun);
    scene.add(new THREE.AmbientLight(0x6878ff, 0.3));

    this.bg = makeNebula(); this.bg.position.z = -2500; cam.add(this.bg);
    this.starLayers = makeStarLayers(VIEW_H); this.starLayers.forEach((p) => cam.add(p));

    // far-away planets that slide by slowly (parallax)
    this.decor = [];
    this.addDecor(makePlanet('mars', 55, this.glowTex, { glow: 0.5 }), 380, 170, -2000, 0.07);
    this.addDecor(makePlanet('saturn', 105, this.glowTex, { glow: 0.45 }), 1450, -150, -1900, 0.13);
    this.addDecor(makePlanet('uranus', 32, this.glowTex, { glow: 0.6 }), 1700, 200, -1950, 0.18);

    this.earth = makePlanet('earth', 420, this.glowTex, { texSize: 512, glow: 0.95 });
    this.earth.position.set(-150, -650, -700); scene.add(this.earth);

    this.portal = makePortal(this.glowTex); scene.add(this.portal);
    this.rockGeos = makeRockGeos(6);
    this.coinProto = makeCoin(this.glowTex);
    this.fuelProto = makeFuelCell(this.glowTex);
    this.particles = new Particles(); scene.add(this.particles.points);

    this.resize();
    this.ro = new ResizeObserver(() => this.resize()); this.ro.observe(canvas);
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.phase === 'playing') this.pause(); });
    this.last = performance.now();
    this.raf = requestAnimationFrame((t) => this.loop(t));
  }

  addDecor(mesh, baseX, y, z, par) { mesh.position.set(baseX, y, z); this.cam.add(mesh); const d = { mesh, baseX, par }; this.decor.push(d); return d; }

  // ---------- public API ----------
  setOptions(o) {
    Object.assign(this.opts, o);
    this.audio.setMuted(!!this.opts.muted); this.audio.setMusic(this.opts.music !== false);
  }

  setShip(ship) {
    this.shipDef = ship;
    if (this.shipGroup) {
      // free the old model's GPU buffers (the shared glow texture is left alone)
      this.scene.remove(this.shipGroup);
      this.shipGroup.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) o.material.dispose(); });
    }
    this.shipGroup = makeShip(ship.id, ship.color, this.glowTex); this.scene.add(this.shipGroup);
    const s = ship.stats;
    this.shipPhys = { speedMul: 0.85 + s.speed * 0.07, thrust: 700 + s.thrust * 110, drainMul: 1.3 - s.fuel * 0.12, hearts: s.shield };
    if (this.stage && this.phase === 'idle') this.resetRun();
  }

  setStage(stage) {
    this.stage = stage;
    if (this.dest) { this.cam.remove(this.dest.mesh); this.decor.splice(this.decor.indexOf(this.dest), 1); }
    const LEN = stage.length;
    // destination planet: parallax 0.3 so it drifts into view during the last ~10 seconds
    this.dest = this.addDecor(makePlanet(stage.dest, 250, this.glowTex, { texSize: 512, glow: 0.55 }), 150 + (LEN + 280) * 0.3, 30, -1500, 0.3);
    this.portal.position.set(LEN, 0, 0);
    this.rockMats = makeRockMats(stage.rockColors);
    if (this.shipGroup) this.resetRun();
  }

  start() {
    this.audio.unlock();
    this.input.up = this.input.down = false;
    this.resetRun();
    this.phase = 'playing'; this.last = performance.now();
    this.audio.sfx('start');
    this.pushHud(true);
  }
  pause() { if (this.phase === 'playing') { this.phase = 'paused'; this.input.up = this.input.down = false; } }
  resume() { if (this.phase === 'paused') { this.phase = 'playing'; this.last = performance.now(); } }
  toIdle() { this.phase = 'idle'; this.resetRun(); }
  setInput(key, val) { this.input[key] = val; if (val) this.audio.unlock(); }
  // Menus: show the hovering ship behind the title and hangar, hide it behind the star map.
  setMenuShip(show) { this.menuShip = show; }

  // ---------- level ----------
  buildLevel() {
    if (this.level) this.scene.remove(this.level);
    const L = new THREE.Group(); this.level = L; this.scene.add(L);
    const D = DIFFICULTY[this.opts.difficulty] || DIFFICULTY.easy; this.D = D;
    const LEN = this.stage.length;
    const stageMul = 1 - (this.stage.id - 1) * 0.04;          // later stages = denser asteroids
    const rnd = makeRng(12345 + this.stage.id * 999);

    this.coins = []; let x = 650;
    while (x < LEN - 450) {
      const type = Math.floor(rnd() * 3), n = 6 + Math.floor(rnd() * 4), y0 = (rnd() - 0.5) * 340;
      for (let i = 0; i < n; i++) {
        const k = i / (n - 1); let cy;
        if (type === 0) cy = y0 + Math.sin(k * Math.PI * 2) * 70;          // wave
        else if (type === 1) cy = y0;                                        // line
        else cy = y0 + Math.sin(k * Math.PI) * 110 * (y0 > 0 ? -1 : 1);     // arc
        const m = this.coinProto.clone(); const c = { x: x + i * 44, y: clamp(cy, -235, 235), m, taken: false, ph: rnd() * 6 };
        m.position.set(c.x, c.y, 0); L.add(m); this.coins.push(c);
      }
      x += n * 44 + 260 + rnd() * 320;
    }

    this.rocks = []; x = 620;
    while (x < LEN - 260) {
      const gap = lerp(D.gap[0], D.gap[1], x / LEN) * stageMul;
      const r = rnd() < D.bigRock ? 58 + rnd() * 22 : 17 + rnd() * 27;
      let y = (rnd() - 0.5) * 480;
      for (let k = 0; k < 5; k++) { if (!this.coins.some((c) => Math.abs(c.x - x) < r + 28 && Math.abs(c.y - y) < r + 28)) break; y = (rnd() - 0.5) * 480; }
      const m = new THREE.Mesh(this.rockGeos[Math.floor(rnd() * 6)], this.rockMats[Math.floor(rnd() * this.rockMats.length)]);
      m.scale.set(r * (0.9 + rnd() * 0.25), r, r * (0.9 + rnd() * 0.2)); m.rotation.set(rnd() * 6, rnd() * 6, rnd() * 6);
      m.position.set(x, y, 0); L.add(m);
      this.rocks.push({ x, y, r, m, alive: true, vx: (rnd() - 0.5) * 24, vy: (rnd() - 0.5) * 36, sx: (rnd() - 0.5) * 1.4, sy: (rnd() - 0.5) * 1.4 });
      x += gap * (0.6 + rnd() * 0.8);
    }

    this.fuels = [];
    for (let fx = D.fuelEvery; fx < LEN - 300; fx += D.fuelEvery) {
      let fy = (rnd() - 0.5) * 380;
      for (let k = 0; k < 8; k++) { if (!this.rocks.some((r) => Math.abs(r.x - fx) < r.r + 70 && Math.abs(r.y - fy) < r.r + 70)) break; fy = (rnd() - 0.5) * 380; }
      const m = this.fuelProto.clone(); m.position.set(fx, fy, 0); L.add(m);
      this.fuels.push({ x: fx, y: fy, m, taken: false });
    }
  }

  resetRun() {
    this.buildLevel();
    this.ship = { x: 0, y: 0, vy: 0, vx: this.D.speed[0], fuel: 100, hearts: this.shipPhys.hearts, coins: 0, inv: 0, dead: false, won: false, over: false, noFuelT: 0 };
    this.shipGroup.visible = true; this.shake = 0; this.ending = null; this.particles.clear();
    this.cam.position.set(this.halfW * 0.42, 0, 1000);
  }

  // ---------- events ----------
  endRun(result) {
    const S = this.ship; if (S.over) return; S.over = true;
    this.phase = 'ending'; this.ending = { result, t: result === 'crash' ? 1.4 : result === 'win' ? 1.1 : 0.8 };
    if (result === 'fuel') this.audio.sfx('nofuel');
    if (result === 'win') { S.won = true; this.audio.sfx('win'); for (let i = 0; i < 4; i++) this.particles.burst(this.stage.length, (Math.random() - 0.5) * 300, 30, 'spark'); }
  }

  hitRock(r) {
    const S = this.ship, P = this.particles;
    r.alive = false; r.m.visible = false;
    P.burst(r.x, r.y, 26, 'rock', r.r); P.burst((r.x + S.x) / 2, (r.y + S.y) / 2, 34, 'fire');
    S.hearts -= 1; S.inv = 1.8; this.shake = 0.45; S.vy += (S.y > r.y ? 1 : -1) * 260;
    this.audio.sfx('hit');
    try { navigator.vibrate && navigator.vibrate(120); } catch (_) { /* not supported */ }
    if (S.hearts <= 0) {
      S.dead = true; S.inv = 0; this.shipGroup.visible = false;
      P.burst(S.x, S.y, 90, 'fire'); P.burst(S.x, S.y, 30, 'rock', 30); this.shake = 0.8;
      this.audio.sfx('boom'); this.endRun('crash');
    }
  }

  pushHud(force) {
    const S = this.ship;
    const hud = { coins: S.coins, total: this.coins.length, fuel: Math.round(S.fuel), progress: Math.round(clamp(S.x / this.stage.length, 0, 1) * 1000) / 10, hearts: Math.max(0, S.hearts), maxHearts: this.shipPhys.hearts };
    const prev = this.lastHud;
    if (force || !prev || prev.coins !== hud.coins || prev.fuel !== hud.fuel || prev.progress !== hud.progress || prev.hearts !== hud.hearts) { this.lastHud = hud; this.onHud(hud); }
  }

  // ---------- simulation ----------
  update(dt) {
    const S = this.ship, D = this.D, LEN = this.stage.length, P = this.particles, phys = this.shipPhys, R = Math.random;
    const ctrl = this.phase === 'playing' && !S.dead && !S.won;
    const hasFuel = S.fuel > 0;
    const up = ctrl && hasFuel && this.input.up, dn = ctrl && hasFuel && this.input.down;
    const thr = (up ? 1 : 0) - (dn ? 1 : 0);

    S.vy += thr * phys.thrust * dt;
    if (!hasFuel && !S.won) S.vy -= 150 * dt;            // engine dead: drift down
    if (S.won) S.vy += (0 - S.y) * 2 * dt;                // autopilot to the middle
    S.vy *= Math.exp(-1.6 * dt); S.vy = clamp(S.vy, -430, 430);
    let target = lerp(D.speed[0], D.speed[1], clamp(S.x / LEN, 0, 1)) * phys.speedMul;
    if (!hasFuel && !S.won) target = 40;
    if (S.won) target = 150;
    if (S.dead) target = 0;
    S.vx += (target - S.vx) * Math.min(1, dt * (hasFuel ? 2 : 0.6));
    S.x += S.vx * dt; S.y += S.vy * dt;
    if (S.y > BOUND_Y) { S.y = BOUND_Y; S.vy = -Math.abs(S.vy) * 0.4; }
    if (S.y < -BOUND_Y) { S.y = -BOUND_Y; S.vy = Math.abs(S.vy) * 0.4; }
    if (ctrl) S.fuel = Math.max(0, S.fuel - (D.drain + (up || dn ? D.thrustDrain : 0)) * phys.drainMul * dt);
    if (ctrl && S.fuel <= 0) { S.noFuelT += dt; if (S.noFuelT > 3.2) this.endRun('fuel'); } else S.noFuelT = 0;
    if (S.inv > 0) S.inv -= dt;

    // asteroids (ship hitbox = two circles)
    const hc = [[S.x + 22, S.y, 15], [S.x - 14, S.y, 19]];
    for (const r of this.rocks) {
      if (!r.alive) continue;
      r.x += r.vx * dt; r.y += r.vy * dt; r.m.position.x = r.x; r.m.position.y = r.y;
      r.m.rotation.x += r.sx * dt; r.m.rotation.y += r.sy * dt;
      if (ctrl && S.inv <= 0 && Math.abs(r.x - S.x) < r.r + 70) {
        for (const c of hc) { const dx = r.x - c[0], dy = r.y - c[1], rr = r.r * 0.8 + c[2]; if (dx * dx + dy * dy < rr * rr) { this.hitRock(r); break; } }
      }
    }
    // coins, with a friendly magnet
    for (const c of this.coins) {
      if (c.taken || Math.abs(c.x - S.x) > 900) continue;
      const dx = S.x - c.x, dy = S.y - c.y, d2 = dx * dx + dy * dy;
      if (ctrl && d2 < 100 * 100) { const d = Math.sqrt(d2) || 1, pull = Math.min(d, 460 * dt); c.x += dx / d * pull; c.y += dy / d * pull; }
      if (ctrl && d2 < 34 * 34) { c.taken = true; c.m.visible = false; S.coins += 1; this.audio.sfx('coin'); P.burst(c.x, c.y, 12, 'coin'); continue; }
      c.m.position.set(c.x, c.y + Math.sin(this.t * 3 + c.ph) * 3, 0); c.m.rotation.y = this.t * 3 + c.ph;
    }
    // fuel cells
    this.fuels.forEach((f, i) => {
      if (f.taken) return;
      f.m.rotation.z = Math.sin(this.t * 2 + i) * 0.4; f.m.rotation.y = this.t * 1.5;
      const dx = S.x - f.x, dy = S.y - f.y;
      if (ctrl && dx * dx + dy * dy < 40 * 40) { f.taken = true; f.m.visible = false; S.fuel = Math.min(100, S.fuel + D.fuelGain); this.audio.sfx('fuel'); P.burst(f.x, f.y, 26, 'fuel'); }
    });
    if (ctrl && S.x >= LEN) this.endRun('win');

    // engine exhaust + side thrusters
    if (!S.dead) {
      const rot = this.shipGroup.rotation.z, tail = this.shipGroup.userData.tailWorld;
      const tx = S.x + tail * Math.cos(rot), ty = S.y + tail * Math.sin(rot);
      const engineOn = hasFuel || S.won;
      this.emitAcc = (this.emitAcc || 0) + (engineOn ? (thr !== 0 ? 120 : 60) : 6) * dt;
      while (this.emitAcc > 1) {
        this.emitAcc -= 1; const sp = 220 + R() * 120;
        P.emit(tx, ty + (R() - 0.5) * 8, S.vx - sp * Math.cos(rot), S.vy * 0.3 - sp * Math.sin(rot) + (R() - 0.5) * 40, 0.3 + R() * 0.3, (thr !== 0 ? 22 : 16) + R() * 8, [1, 0.92, 0.6], [0.95, 0.2, 0.4], 1.5);
      }
      if (up && R() < 0.7) P.emit(S.x - 6, S.y - 20, S.vx + (R() - 0.5) * 40, -160 - R() * 80, 0.25, 11, [0.7, 0.95, 1], [0.2, 0.4, 1], 3);
      if (dn && R() < 0.7) P.emit(S.x - 6, S.y + 20, S.vx + (R() - 0.5) * 40, 160 + R() * 80, 0.25, 11, [0.7, 0.95, 1], [0.2, 0.4, 1], 3);
    }
    if (Math.abs(this.cam.position.x - LEN) < this.halfW + 300 && R() < 0.8) {
      const a = R() * Math.PI * 2; P.emit(LEN + Math.cos(a) * 60, Math.sin(a) * 165, (R() - 0.5) * 30, (R() - 0.5) * 30, 0.8, 9 + R() * 6, [0.6, 1, 1], [0.3, 0.3, 1], 0.5);
    }

    if (this.ending) {
      this.ending.t -= dt;
      if (this.ending.t <= 0) {
        const { result } = this.ending; this.ending = null; this.phase = 'done';
        this.input.up = this.input.down = false;
        this.onEnd({ result, coins: S.coins, total: this.coins.length, stars: result === 'win' ? starsFor(S.coins, this.coins.length) : 0 });
      }
    }
    this.hudT -= dt; if (this.hudT <= 0) { this.hudT = 0.1; this.pushHud(); }
    this.thrusting = thr !== 0; this.engineOn = !S.dead && (hasFuel || S.won);
  }

  idle(dt) {
    const S = this.ship, R = Math.random;
    S.x = 0; S.y = Math.sin(this.t * 1.6) * 14; S.vy = Math.cos(this.t * 1.6) * 22;
    for (const r of this.rocks) { r.m.rotation.x += r.sx * dt; r.m.rotation.y += r.sy * dt; }
    for (const c of this.coins) c.m.rotation.y = this.t * 3 + c.ph;
    const tail = this.shipGroup.userData.tailWorld;
    if (!this.menuShip) { this.engineOn = false; return; }
    this.emitAcc = (this.emitAcc || 0) + 50 * dt;
    while (this.emitAcc > 1) { this.emitAcc -= 1; this.particles.emit(S.x + tail, S.y + (R() - 0.5) * 6, -240 - R() * 100, (R() - 0.5) * 30, 0.35 + R() * 0.25, 16 + R() * 6, [1, 0.92, 0.6], [0.95, 0.2, 0.4], 1.5); }
    this.thrusting = false; this.engineOn = true;
  }

  // ---------- rendering ----------
  resize() {
    const c = this.canvas, w = c.clientWidth || window.innerWidth, h = c.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    const aspect = w / h; this.halfH = VIEW_H / 2; this.halfW = this.halfH * aspect;
    Object.assign(this.cam, { left: -this.halfW, right: this.halfW, top: this.halfH, bottom: -this.halfH }); this.cam.updateProjectionMatrix();
    this.bg.scale.set(this.halfW * 2.3, VIEW_H * 1.2, 1); this.bg.material.uniforms.uAspect.value = aspect;
    const sc = h / VIEW_H, pr = this.renderer.getPixelRatio();
    this.starLayers.forEach((p) => { p.material.uniforms.uScale.value = sc; p.material.uniforms.uPR.value = pr; });
    this.particles.material.uniforms.uScale.value = sc; this.particles.material.uniforms.uPR.value = pr;
  }

  loop(now) {
    this.raf = requestAnimationFrame((t) => this.loop(t));
    const dt = Math.min(0.033, Math.max(0.0005, (now - this.last) / 1000)); this.last = now;
    const ph = this.phase, paused = ph === 'paused';
    if (!paused) this.t += dt;
    if (ph === 'idle') this.idle(dt); else if (!paused) this.update(dt);
    this.particles.update(paused ? 0 : dt);

    const S = this.ship, sg = this.shipGroup, cam = this.cam, u = sg.userData;
    sg.position.set(S.x, S.y, 20);
    sg.rotation.z = clamp(S.vy * 0.0011, -0.45, 0.45);
    sg.rotation.x = Math.sin(this.t * 1.7) * 0.35 + (this.input.up ? -0.25 : 0) + (this.input.down ? 0.25 : 0);
    if (!S.dead) sg.visible = ph === 'idle' ? this.menuShip : S.inv > 0 ? Math.floor(this.t * 14) % 2 === 0 : true;
    this.level.visible = ph !== 'idle';   // keep menus uncluttered
    const fl = this.engineOn ? (this.thrusting ? 1.3 : 0.85) : 0.08, jit = 0.9 + Math.random() * 0.2;
    u.fo.scale.set(80 * fl * jit, 34 * (0.85 + fl * 0.2), 1); u.fo.position.x = u.tailX - 18 * fl;
    u.fc.scale.set(44 * fl * jit, 18, 1); u.fc.position.x = u.tailX - 8 * fl;
    u.light.intensity = this.engineOn ? (this.thrusting ? 2600 : 1400) * jit : 0;
    u.hot.color.setRGB(fl, fl * 0.68, fl * 0.36);
    const blinkOn = (this.t * 1.2) % 1 < 0.2;
    u.blink.emissiveIntensity = blinkOn ? 3 : 0.35;
    for (let i = 0; i < u.blinkGlow.length; i++) u.blinkGlow[i].material.opacity = blinkOn ? 0.9 : 0;
    u.shield.material.opacity = S.inv > 0 ? 0.35 + 0.15 * Math.sin(this.t * 20) : 0;

    const stopX = this.stage.length + this.halfW * 0.42 + 420;
    const tx = Math.min(S.x + this.halfW * 0.42, stopX);
    cam.position.x += (tx - cam.position.x) * Math.min(1, dt * 8);
    cam.position.y += (S.y * 0.12 - cam.position.y) * Math.min(1, dt * 3);
    let shx = 0, shy = 0;
    if (this.shake > 0 && !paused) { this.shake -= dt; const k = Math.max(0, this.shake) * 22; shx = (Math.random() - 0.5) * k; shy = (Math.random() - 0.5) * k; }
    const cx = cam.position.x; cam.position.x += shx; cam.position.y += shy;

    this.bg.material.uniforms.uTime.value = this.t; this.bg.material.uniforms.uOff.value = cx * 0.00035;
    this.starLayers.forEach((p) => { p.material.uniforms.uCamX.value = cx; p.material.uniforms.uTime.value = this.t; });
    for (const d of this.decor) { d.mesh.position.x = d.baseX - cx * d.par; if (d.mesh.userData.spin) d.mesh.userData.spin.rotation.y = this.t * 0.03; }
    this.earth.userData.spin.rotation.y = this.t * 0.02; this.earth.userData.clouds.rotation.y = this.t * 0.03;
    this.portal.userData.tor.rotation.z = this.t * 0.6;

    this.audio.tick({ engineOn: this.engineOn && (ph === 'playing' || ph === 'idle'), thrusting: this.thrusting, paused });
    this.renderer.render(this.scene, cam);
    cam.position.x -= shx; cam.position.y -= shy;
  }
}
