import { STAGES, SHIPS } from '../game/config.js';
import { writeSave, totalStars } from '../save.js';
import { ICON, SHIP_ART, PLANET_LOOK } from './icons.js';

/**
 * Plain-DOM menus on top of the WebGL canvas.
 * Each screen is a template function; render(screen) swaps #ui's contents.
 * The HUD is updated in place (no re-render) because it changes ~10x per second.
 */
export class UI {
  constructor(root, game, save) {
    this.root = root; this.game = game; this.save = save;
    this.screen = 'title'; this.stage = STAGES[0]; this.hangarPick = save.ship; this.lastResult = null;
    game.onHud = (h) => this.updateHud(h);
    game.onEnd = (r) => this.handleEnd(r);
    this.bind();
    this.render('title');
  }

  // ---------- helpers ----------
  persist() { writeSave(this.save); }
  ship() { return SHIPS.find((s) => s.id === this.save.ship) || SHIPS[0]; }
  isOpen(stage) { return totalStars(this.save) >= stage.needStars; }
  routeName(stage) { const i = STAGES.indexOf(stage); return `${i === 0 ? 'Earth' : STAGES[i - 1].name} → ${stage.name}`; }
  coinPill() { return `<div class="pill gold">${ICON.coin(22)}<span>${this.save.coins}</span></div>`; }
  starPill() { return `<div class="pill gold">${ICON.star(22)}<span>${totalStars(this.save)} / ${STAGES.length * 3}</span></div>`; }
  muteBtn() { return `<button class="icon-btn" data-act="mute" aria-label="${this.save.muted ? 'Turn sound on' : 'Turn sound off'}">${this.save.muted ? ICON.mute(20) : ICON.sound(20)}</button>`; }
  backBtn(to) { return `<button class="icon-btn" data-act="${to}" aria-label="Back">${ICON.back(20)}</button>`; }

  render(screen) {
    this.screen = screen;
    this.root.innerHTML = this[`tpl_${screen}`]();
    this.root.dataset.screen = screen;
    this.game.setMenuShip(screen === 'title' || screen === 'hangar');
  }

  // ---------- screens ----------
  tpl_title() {
    const diff = { easy: 'Easy', normal: 'Normal', hard: 'Hard' }[this.save.difficulty];
    return `
    <div class="screen shade-left">
      <div class="topbar"><div class="grow"></div>${this.coinPill()}${this.muteBtn()}</div>
      <div class="title-block">
        <span class="kicker">SPACE ADVENTURE</span>
        <h1 class="logo">Galaxy<br>Hopper</h1>
        <p class="lead">Fly from planet to planet, dodge the asteroids and grab every coin!</p>
        <div class="row">
          <button class="btn gold big" data-act="map">${ICON.play(22)} PLAY</button>
          <button class="btn ghost big" data-act="hangar">${ICON.rocket(22)} Hangar</button>
        </div>
        <button class="chip" data-act="diff">${ICON.gauge(16)} Difficulty: ${diff}</button>
      </div>
    </div>`;
  }

  tpl_map() {
    const pts = [[70, 190], [170, 105], [270, 190], [370, 95], [470, 180], [570, 85], [670, 170], [770, 85]];
    const reached = STAGES.filter((s) => this.isOpen(s)).length;
    const d = pts.map((p, i) => (i === 0 ? `M${p[0]} ${p[1]}` : `C${pts[i - 1][0] + 50} ${pts[i - 1][1]} ${p[0] - 50} ${p[1]} ${p[0]} ${p[1]}`)).join(' ');
    const nodes = STAGES.map((st, i) => {
      const open = this.isOpen(st), earned = this.save.stars[st.id] || 0, [a, b] = PLANET_LOOK[st.dest];
      const size = i === STAGES.length - 1 ? 64 : 54;
      const stars = [0, 1, 2].map((k) => ICON.star(15, k < earned ? '#FFC93C' : 'rgba(255,255,255,0.2)', 'none')).join('');
      return `
      <div class="node" style="left:${(pts[i][0] / 844) * 100}%;top:${(pts[i][1] / 260) * 100}%">
        <button class="planet ${open ? 'open' : 'locked'} ${open && !earned ? 'next' : ''}" ${open ? `data-act="stage" data-id="${st.id}"` : 'disabled'}
          aria-label="${open ? 'Play' : 'Locked'} stage ${st.id}: ${st.name}"
          style="width:${size}px;height:${size}px;background:radial-gradient(circle at 34% 30%, ${a} 0%, ${b} 78%)">
          ${open ? '' : `<span class="lock">${ICON.lock(13)}</span>`}
        </button>
        <span class="node-label ${open ? '' : 'dim'}">${st.id} · ${st.name}</span>
        ${open ? `<span class="stars">${stars}</span>` : `<span class="need">needs ${st.needStars} ★</span>`}
      </div>`;
    }).join('');
    return `
    <div class="screen">
      <div class="topbar">${this.backBtn('title')}<h1 class="h1">Star Map</h1><div class="grow"></div>${this.starPill()}${this.coinPill()}</div>
      <div class="map">
        <svg class="map-path" viewBox="0 0 844 260" preserveAspectRatio="none" aria-hidden="true">
          <path d="${d}" fill="none" stroke="rgba(62,230,255,0.28)" stroke-width="5" stroke-linecap="round" stroke-dasharray="2 14" vector-effect="non-scaling-stroke"/>
        </svg>
        ${nodes}
      </div>
      <div class="bottombar"><p class="hint">Earn stars by collecting coins — stars open new planets. (${reached}/${STAGES.length} open)</p><div class="grow"></div>
        <button class="btn ghost" data-act="hangar">${ICON.rocket(20)} Hangar</button></div>
    </div>`;
  }

  tpl_hangar() {
    const pick = SHIPS.find((s) => s.id === this.hangarPick) || SHIPS[0];
    const owned = this.save.owned.includes(pick.id), selected = this.save.ship === pick.id;
    const labels = { speed: 'Speed', thrust: 'Thrust', fuel: 'Fuel', shield: 'Shield' };
    const stats = Object.entries(pick.stats).map(([k, v]) => `
      <div class="stat"><span>${labels[k]}</span><div class="bars">${[0, 1, 2, 3, 4].map((i) => `<i class="${i < v ? 'on' : ''}"></i>`).join('')}</div></div>`).join('');
    let action;
    if (selected) action = `<button class="btn ok" disabled>Selected ✓</button>`;
    else if (owned) action = `<button class="btn gold" data-act="useShip">Use this ship</button>`;
    else if (this.save.coins >= pick.price) action = `<button class="btn gold" data-act="buyShip">${ICON.coin(20)} Buy for ${pick.price}</button>`;
    else action = `<button class="btn locked" disabled>${ICON.lock(16)} ${pick.price} coins · need ${pick.price - this.save.coins} more</button>`;
    const cards = SHIPS.map((sh) => {
      const own = this.save.owned.includes(sh.id);
      return `<button class="ship-card ${sh.id === pick.id ? 'picked' : ''}" data-act="pickShip" data-id="${sh.id}" aria-pressed="${sh.id === pick.id}">
        <span class="art ${own ? '' : 'dim'}">${SHIP_ART[sh.id](108)}</span>
        <span class="name">${sh.name}</span>
        <span class="badge ${own ? 'own' : ''}">${own ? (this.save.ship === sh.id ? 'Flying' : 'Owned') : `${sh.price} coins`}</span>
      </button>`;
    }).join('');
    return `
    <div class="screen">
      <div class="topbar">${this.backBtn('title')}<h1 class="h1">Hangar</h1><div class="grow"></div>${this.coinPill()}</div>
      <div class="hangar">
        <div class="ship-info">
          <div class="info-head"><h2>${pick.name}</h2><span>${pick.tag}</span></div>
          <div class="stats">${stats}</div>
          ${action}
        </div>
        <div class="ship-grid">${cards}</div>
      </div>
    </div>`;
  }

  tpl_intro() {
    const st = this.stage;
    return `
    <div class="screen center dim-bg">
      <div class="card">
        <span class="kicker">STAGE ${st.id}</span>
        <h1 class="h-big">${this.routeName(st)}</h1>
        <div class="legend">
          <span><b class="key cyan">${ICON.down(16)}</b>left = down</span>
          <span><b class="key gold">${ICON.up(16)}</b>right = up</span>
        </div>
        <p class="sub">Dodge the asteroids, grab coins and green fuel cells, and fly through the glowing ring!</p>
        <div class="row">
          <button class="btn ghost" data-act="map">${ICON.back(18)} Map</button>
          <button class="btn gold big" data-act="launch">LAUNCH!</button>
        </div>
      </div>
    </div>`;
  }

  tpl_hud() {
    return `
    <div class="hud">
      <div class="hearts" id="hud-hearts"></div>
      <div class="progress">
        <span class="dot earth"></span>
        <div class="track"><div class="fill" id="hud-fill"></div><div class="marker" id="hud-marker"></div></div>
        <span class="dot dest" style="background:radial-gradient(circle at 34% 30%, ${PLANET_LOOK[this.stage.dest][0]}, ${PLANET_LOOK[this.stage.dest][1]})"></span>
      </div>
      <div class="pill gold small">${ICON.coin(20)}<span id="hud-coins">0</span></div>
      <div class="fuel"><span id="hud-fuel-label">FUEL</span><div class="fuel-track"><div id="hud-fuel"></div></div></div>
      <button class="icon-btn" data-act="pause" aria-label="Pause">${ICON.pause(18)}</button>
      ${this.muteBtn()}
    </div>
    <button class="pedal down" data-pedal="down" aria-label="Fly down"><i></i>${ICON.down(44)}<i></i></button>
    <button class="pedal up" data-pedal="up" aria-label="Fly up"><i></i>${ICON.up(44)}<i></i></button>`;
  }

  tpl_paused() {
    return `
    <div class="screen center dim-bg">
      <div class="card">
        <h2 class="h-big">Paused</h2>
        <div class="row">
          <button class="btn gold" data-act="resume">Resume</button>
          <button class="btn ghost" data-act="launch">Restart</button>
          <button class="btn ghost" data-act="quit">Star map</button>
        </div>
      </div>
    </div>`;
  }

  tpl_over() {
    const r = this.lastResult;
    const fuel = r.result === 'fuel';
    return `
    <div class="screen center dim-bg">
      <div class="card red">
        <h2 class="h-big">${fuel ? 'Out of fuel!' : 'Boom! You crashed'}</h2>
        <span class="coins-line">${ICON.coin(22)} +${r.coins} coins</span>
        <p class="sub">${fuel ? 'Tip: grab the green fuel cells — holding a pedal burns fuel faster.' : 'Tip: tap the pedals in short bursts to slip between rocks.'}</p>
        <div class="row">
          <button class="btn gold big" data-act="launch">Try again</button>
          <button class="btn ghost" data-act="quit">Star map</button>
        </div>
      </div>
    </div>`;
  }

  tpl_won() {
    const r = this.lastResult;
    const stars = [0, 1, 2].map((k) => ICON.star(k === 1 ? 70 : 54, k < r.stars ? '#FFC93C' : 'rgba(255,255,255,0.15)', k < r.stars ? '#FFE7A0' : 'rgba(255,255,255,0.4)')).join('');
    const next = STAGES[STAGES.indexOf(this.stage) + 1];
    const nextOpen = next && this.isOpen(next);
    return `
    <div class="screen center dim-bg">
      <div class="card gold-border">
        <div class="stars-row">${stars}</div>
        <h2 class="h-big">Stage ${this.stage.id} complete!</h2>
        <span class="coins-line">${ICON.coin(22)} ${r.coins} / ${r.total} coins</span>
        ${r.unlocked ? `<span class="unlock">New planet unlocked: ${r.unlocked}!</span>` : ''}
        ${r.stars < 3 ? '<p class="sub">Collect 75% of the coins for 3 stars.</p>' : ''}
        <div class="row">
          <button class="btn ghost" data-act="launch">Play again</button>
          <button class="btn ghost" data-act="quit">Star map</button>
          ${nextOpen ? `<button class="btn gold big" data-act="nextStage">Next ${ICON.next(20)}</button>` : ''}
        </div>
      </div>
    </div>`;
  }

  // ---------- HUD ----------
  updateHud(h) {
    if (this.screen !== 'hud') return;
    const $ = (id) => this.root.querySelector('#' + id);
    const hearts = $('hud-hearts'); if (!hearts) return;
    const key = `${h.hearts}/${h.maxHearts}`;
    if (hearts.dataset.k !== key) { hearts.dataset.k = key; hearts.innerHTML = Array.from({ length: h.maxHearts }, (_, i) => ICON.heart(26, i < h.hearts)).join(''); }
    $('hud-fill').style.width = h.progress + '%';
    $('hud-marker').style.left = h.progress + '%';
    $('hud-coins').textContent = h.coins;
    const low = h.fuel < 25;
    $('hud-fuel').style.width = Math.max(0, h.fuel) + '%';
    $('hud-fuel').className = low ? 'low' : '';
    $('hud-fuel-label').textContent = low ? 'LOW FUEL!' : 'FUEL';
    $('hud-fuel-label').className = low ? 'low' : '';
  }

  handleEnd(r) {
    const before = STAGES.filter((s) => this.isOpen(s)).length;
    this.save.coins += r.coins;
    if (r.result === 'win') this.save.stars[this.stage.id] = Math.max(this.save.stars[this.stage.id] || 0, r.stars);
    const after = STAGES.filter((s) => this.isOpen(s));
    r.unlocked = after.length > before ? after[after.length - 1].name : null;
    this.persist();
    this.lastResult = r;
    this.render(r.result === 'win' ? 'won' : 'over');
  }

  // ---------- input ----------
  bind() {
    this.root.addEventListener('click', (e) => {
      const el = e.target.closest('[data-act]'); if (!el || el.disabled) return;
      this.game.audio.unlock();
      this.act(el.dataset.act, el.dataset);
    });

    // Pedals: pointer events + pointer capture = reliable multi-touch (one thumb per pedal).
    const setPedal = (el, on) => {
      const key = el.dataset.pedal; el.classList.toggle('on', on); this.game.setInput(key, on);
    };
    this.root.addEventListener('pointerdown', (e) => {
      const el = e.target.closest('[data-pedal]'); if (!el) return;
      e.preventDefault(); try { el.setPointerCapture(e.pointerId); } catch { /* ignore */ }
      setPedal(el, true);
    });
    ['pointerup', 'pointercancel', 'lostpointercapture'].forEach((type) => this.root.addEventListener(type, (e) => {
      const el = e.target.closest && e.target.closest('[data-pedal]'); if (el) setPedal(el, false);
    }));
    this.root.addEventListener('contextmenu', (e) => e.preventDefault());

    // Keyboard, handy when testing on a laptop.
    const keyMap = { ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down' };
    window.addEventListener('keydown', (e) => {
      if (keyMap[e.code] && this.screen === 'hud') { this.game.setInput(keyMap[e.code], true); e.preventDefault(); }
      if ((e.code === 'Escape' || e.code === 'KeyP') && (this.screen === 'hud' || this.screen === 'paused')) this.act(this.screen === 'hud' ? 'pause' : 'resume');
    });
    window.addEventListener('keyup', (e) => { if (keyMap[e.code]) this.game.setInput(keyMap[e.code], false); });

    // Auto-pause if the app goes to the background.
    document.addEventListener('visibilitychange', () => { if (document.hidden && this.screen === 'hud') this.act('pause'); });
  }

  act(a, data = {}) {
    const g = this.game;
    switch (a) {
      case 'title': case 'map': g.toIdle(); this.render(a); break;
      case 'hangar': this.hangarPick = this.save.ship; g.toIdle(); this.render('hangar'); break;
      case 'diff': {
        const order = ['easy', 'normal', 'hard'];
        this.save.difficulty = order[(order.indexOf(this.save.difficulty) + 1) % 3];
        g.setOptions({ difficulty: this.save.difficulty }); this.persist(); this.render('title'); break;
      }
      case 'mute':
        this.save.muted = !this.save.muted; g.setOptions({ muted: this.save.muted }); this.persist();
        this.root.querySelectorAll('[data-act="mute"]').forEach((b) => { b.innerHTML = this.save.muted ? ICON.mute(20) : ICON.sound(20); });
        break;
      case 'stage': this.stage = STAGES.find((s) => s.id === Number(data.id)); g.setStage(this.stage); this.render('intro'); break;
      case 'nextStage': this.stage = STAGES[STAGES.indexOf(this.stage) + 1]; g.setStage(this.stage); this.render('intro'); break;
      case 'launch': g.start(); this.render('hud'); g.pushHud(true); break;
      case 'pause': g.pause(); this.render('paused'); break;
      case 'resume': g.resume(); this.render('hud'); g.pushHud(true); break;
      case 'quit': g.toIdle(); this.render('map'); break;
      case 'pickShip': this.hangarPick = data.id; g.setShip(SHIPS.find((s) => s.id === data.id)); this.render('hangar'); break;
      case 'useShip': this.save.ship = this.hangarPick; this.persist(); this.render('hangar'); break;
      case 'buyShip': {
        const sh = SHIPS.find((s) => s.id === this.hangarPick);
        if (this.save.coins >= sh.price && !this.save.owned.includes(sh.id)) {
          this.save.coins -= sh.price; this.save.owned.push(sh.id); this.save.ship = sh.id; this.persist(); g.audio.sfx('fuel');
        }
        this.render('hangar'); break;
      }
    }
    // Leaving the hangar: make sure the flying ship is the selected one, not just the previewed one.
    if (this.screen !== 'hangar' && g.shipDef && g.shipDef.id !== this.save.ship) g.setShip(this.ship());
  }
}
