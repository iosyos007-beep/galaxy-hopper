import * as THREE from 'three';

const KEYS = ['x', 'y', 'vx', 'vy', 'life', 'max', 'size', 'r0', 'g0', 'b0', 'r1', 'g1', 'b1', 'drag'];

// One draw call for every spark, flame puff and explosion bit.
export class Particles {
  constructor(cap = 1600) {
    this.cap = cap; this.n = 0;
    KEYS.forEach((k) => { this[k] = new Float32Array(cap); });
    this.pos = new Float32Array(cap * 3); this.col = new Float32Array(cap * 3);
    this.sz = new Float32Array(cap); this.al = new Float32Array(cap);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aSize', new THREE.BufferAttribute(this.sz, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('aAlpha', new THREE.BufferAttribute(this.al, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo = g;
    this.material = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 1 }, uPR: { value: 1 } },
      vertexShader: 'attribute float aSize; attribute float aAlpha; attribute vec3 aColor; varying vec3 vC; varying float vA; uniform float uScale; uniform float uPR; void main(){ vC = aColor; vA = aAlpha; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_PointSize = aSize * uScale * uPR; }',
      fragmentShader: 'varying vec3 vC; varying float vA; void main(){ float d = length(gl_PointCoord - 0.5); float a = smoothstep(0.5, 0.0, d); gl_FragColor = vec4(vC, a * a * vA); }',
      blending: THREE.AdditiveBlending, depthWrite: false, transparent: true
    });
    this.points = new THREE.Points(g, this.material); this.points.frustumCulled = false; this.points.position.z = 60;
  }

  emit(x, y, vx, vy, life, size, c0, c1, drag = 0) {
    if (this.n >= this.cap) return; const i = this.n++;
    this.x[i] = x; this.y[i] = y; this.vx[i] = vx; this.vy[i] = vy; this.life[i] = life;
    this.max[i] = life; this.size[i] = size;
    this.r0[i] = c0[0]; this.g0[i] = c0[1]; this.b0[i] = c0[2]; this.r1[i] = c1[0]; this.g1[i] = c1[1]; this.b1[i] = c1[2]; this.drag[i] = drag;
  }

  burst(x, y, n, kind, r = 20) {
    const R = Math.random;
    for (let i = 0; i < n; i++) {
      const a = R() * Math.PI * 2;
      if (kind === 'coin') { const s = 80 + R() * 160; this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.35 + R() * 0.3, 9 + R() * 6, [1, 0.9, 0.4], [1, 0.45, 0.1], 3); }
      else if (kind === 'fuel') { const s = 70 + R() * 180; this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.5 + R() * 0.3, 12 + R() * 8, [0.4, 1, 0.65], [0.1, 0.5, 1], 2.5); }
      else if (kind === 'fire') { const s = 60 + R() * 340; this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.45 + R() * 0.7, 16 + R() * 22, [1, 0.95, 0.7], [1, 0.22, 0.12], 2.2); }
      else if (kind === 'rock') { const s = 40 + R() * 240, rr = r * 0.6 * R(); this.emit(x + Math.cos(a) * rr, y + Math.sin(a) * rr, Math.cos(a) * s, Math.sin(a) * s, 0.7 + R() * 0.8, 6 + R() * 8, [0.55, 0.45, 0.38], [0.18, 0.14, 0.12], 1.4); }
      else if (kind === 'spark') { const s = 20 + R() * 60; this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s, 0.6 + R() * 0.5, 7 + R() * 7, [0.6, 1, 1], [0.2, 0.4, 1], 1); }
    }
  }

  clear() { this.n = 0; this.geo.setDrawRange(0, 0); }

  update(dt) {
    let i = 0;
    while (i < this.n) {
      this.life[i] -= dt;
      if (this.life[i] <= 0) { const j = --this.n; if (j !== i) for (let k = 0; k < KEYS.length; k++) this[KEYS[k]][i] = this[KEYS[k]][j]; continue; }
      const dr = Math.exp(-this.drag[i] * dt); this.vx[i] *= dr; this.vy[i] *= dr; this.x[i] += this.vx[i] * dt; this.y[i] += this.vy[i] * dt; i++;
    }
    for (i = 0; i < this.n; i++) {
      const t = 1 - this.life[i] / this.max[i];
      this.pos[i * 3] = this.x[i]; this.pos[i * 3 + 1] = this.y[i]; this.pos[i * 3 + 2] = 0;
      this.col[i * 3] = this.r0[i] + (this.r1[i] - this.r0[i]) * t;
      this.col[i * 3 + 1] = this.g0[i] + (this.g1[i] - this.g0[i]) * t;
      this.col[i * 3 + 2] = this.b0[i] + (this.b1[i] - this.b0[i]) * t;
      this.sz[i] = this.size[i] * (1 - t * 0.55); this.al[i] = 1 - t;
    }
    const a = this.geo.attributes;
    a.position.needsUpdate = a.aColor.needsUpdate = a.aSize.needsUpdate = a.aAlpha.needsUpdate = true;
    this.geo.setDrawRange(0, this.n);
  }
}
