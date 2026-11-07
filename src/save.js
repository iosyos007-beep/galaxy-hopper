// Progress is stored in the browser (localStorage) so coins, stars and ships survive a reload.
const KEY = 'galaxy-hopper-save-v1';

const fresh = () => ({ coins: 0, stars: {}, owned: ['cub'], ship: 'cub', difficulty: 'easy', music: true, muted: false });

export function loadSave() {
  try { return { ...fresh(), ...JSON.parse(localStorage.getItem(KEY) || '{}') }; } catch { return fresh(); }
}

export function writeSave(s) {
  try { localStorage.setItem(KEY, JSON.stringify(s)); } catch { /* private mode: progress just won't persist */ }
}

export const totalStars = (s) => Object.values(s.stars).reduce((a, b) => a + b, 0);
