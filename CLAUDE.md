# Galaxy Hopper — notes for Claude Code

Kids' space game (target player: 8 years old). Read `docs/GAME_SPEC.md` before changing gameplay.

## Stack
- Vite 5 + vanilla JavaScript (ES modules), Three.js 0.170. No framework, no TypeScript (keep it simple unless asked).
- Menus/HUD are plain DOM (`src/ui/ui.js`) layered over one WebGL canvas (`src/game/Game.js`).
- No asset files: textures are procedural (canvas), sounds are synthesized (Web Audio). Keep it that way unless asked.

## Commands
- `npm run dev`: dev server (also on the LAN for phone testing)
- `npm run build`: production build to `dist/`

## Architecture rules
- Game data (stages, ships, difficulty) lives in `src/game/config.js`. Prefer data changes over code changes.
- `Game` exposes a small API (`setStage`, `setShip`, `setOptions`, `start`, `pause`, `resume`, `toIdle`, `setInput`) and reports via `onHud` / `onEnd`. The UI must not reach into game internals beyond that.
- World units: the screen is always 560 units tall (`VIEW_H`); width depends on aspect ratio. The ship flies along +x; y is clamped to ±245.
- Reuse geometries/materials (clone prototypes). Particles go through `Particles` (single draw call). Avoid per-frame allocations in `update()`/`loop()`.
- Progress is saved with `writeSave()` (localStorage). Bump the key in `save.js` if the save shape changes incompatibly.

## Quality bar
- Must run at 60 fps on mid-range phones; test with Chrome DevTools device mode + a real device.
- Touch first: big targets (≥44 px), multi-touch pedals, no hover-only UI, landscape layout from 640×320 up to tablets.
- Kid friendly: forgiving collisions, no punishing timers, encouraging copy, no ads/links/purchases with real money.
- After a change, run `npm run build` to be sure it compiles.
