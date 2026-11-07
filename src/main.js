import './style.css';
import { Game } from './game/Game.js';
import { STAGES, SHIPS } from './game/config.js';
import { UI } from './ui/ui.js';
import { loadSave } from './save.js';

const save = loadSave();
const canvas = document.getElementById('game');

let game;
try {
  game = new Game(canvas);
} catch (err) {
  console.error(err);
  document.getElementById('ui').innerHTML = '<div class="screen center"><div class="card"><h2 class="h-big">Oops!</h2><p class="sub">This browser couldn’t start the 3D graphics. Try the latest Chrome or Safari.</p></div></div>';
  throw err;
}

game.setOptions({ difficulty: save.difficulty, music: save.music, muted: save.muted });
game.setShip(SHIPS.find((s) => s.id === save.ship) || SHIPS[0]);
game.setStage(STAGES[0]);

new UI(document.getElementById('ui'), game, save);

// Expose for debugging in the browser console: window.galaxy.game
window.galaxy = { game, save };
