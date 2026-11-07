# Galaxy Hopper

A Hill Climb Racing–style space game for kids: fly between planets, dodge asteroids, collect coins and fuel, earn stars to unlock new planets and buy new ships. 2D gameplay rendered with **Three.js** (orthographic camera, real 3D models and lighting), built for **phones and tablets in landscape**.

## Run it

You need **Node.js 18+** (https://nodejs.org).

```bash
npm install
npm run dev
```

Vite prints two addresses:

- `http://localhost:5173`: open it on your computer. Arrow keys / W-S work as pedals, Esc pauses.
- `http://192.168.x.x:5173`: open it **on your phone or tablet** (same Wi-Fi) to play with touch. Turn the device sideways.

`npm run build` creates a static site in `dist/` that you can host anywhere (GitHub Pages, Netlify, Vercel).

## Put it on GitHub

```bash
git init
git add .
git commit -m "Galaxy Hopper starter"
# create an empty repo on github.com, then:
git remote add origin https://github.com/<you>/galaxy-hopper.git
git push -u origin main
```

## Project layout

```
index.html              page shell: canvas + UI layer
src/main.js             boots the game and the UI
src/style.css           all menu/HUD styles (design tokens at the top)
src/save.js             progress saved in localStorage
src/game/config.js      STAGES, SHIPS, DIFFICULTY: game data, edit freely
src/game/Game.js        world, physics, collisions, camera, game loop
src/game/models.js      3D models: ships, planets, asteroids, coins, fuel cells, portal, nebula, stars
src/game/textures.js    procedural planet textures
src/game/particles.js   exhaust, explosions, sparkles (one draw call)
src/game/audio.js       all sounds synthesized with Web Audio (no audio files)
src/ui/ui.js            screens: title, star map, hangar, stage intro, HUD, pause, game over, stage complete
src/ui/icons.js         SVG icons and 2D ship art for menus
docs/GAME_SPEC.md       the game design: read this first
design/                 put the exported design screens here
CLAUDE.md               instructions for Claude Code
.github/copilot-instructions.md   instructions for GitHub Copilot
```

## Working with an AI assistant

- **Claude Code:** run `claude` in this folder. It reads `CLAUDE.md` automatically.
- **GitHub Copilot (VS Code):** open Copilot Chat in *Agent* mode. It reads `.github/copilot-instructions.md` automatically.

Ask for one feature at a time and test on a real device between steps. Example prompts:

- "Give the Asteroid Belt stage twice as many small rocks and add some rocks that move in circles."
- "Add a magnet power-up that pulls in coins from far away for 8 seconds."
- "Make the Black Hole stage pull the ship gently towards the bottom of the screen."
- "Add a 'Fuel tank' upgrade in the hangar that costs coins and increases max fuel by 20%."
- "Turn this into a PWA so it can be installed on the tablet's home screen."
- "Wrap the game with Capacitor so I can build an Android app."
