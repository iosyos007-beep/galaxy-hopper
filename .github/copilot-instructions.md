# Copilot instructions — Galaxy Hopper

This is a kids' space game (player age ~8) built with **Vite + vanilla JavaScript + Three.js 0.170**. The full design is in `docs/GAME_SPEC.md`; follow it.

- Gameplay is 2D side-scrolling, rendered with a Three.js **orthographic** camera. The screen is always 560 world units tall; the ship flies along +x.
- `src/game/config.js` holds STAGES, SHIPS and DIFFICULTY. Add content there first.
- `src/game/Game.js` owns the world, physics, collisions and the render loop. The UI (`src/ui/ui.js`) only uses Game's public API: `setStage`, `setShip`, `setOptions`, `start`, `pause`, `resume`, `toIdle`, `setInput`, plus the `onHud`/`onEnd` callbacks.
- Menus and HUD are plain DOM + CSS (`src/style.css`, tokens at the top). Use the existing button classes (`btn gold`, `btn ghost`, `icon-btn`, `pill`) and icons from `src/ui/icons.js`. No emoji in UI.
- Textures are procedural and sounds are synthesized (`src/game/audio.js`); don't add binary assets unless asked.
- Performance: 60 fps on phones. Clone prototypes instead of creating new geometries; no allocations inside the per-frame loop; use the shared `Particles` system for effects.
- Touch first: pedals use pointer events with pointer capture; targets ≥ 44 px; landscape only.
- Keep code plain ES modules, small functions, short comments explaining *why*.
- Verify with `npm run build` after changes.
