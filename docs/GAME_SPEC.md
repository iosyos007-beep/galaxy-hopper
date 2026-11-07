# Galaxy Hopper — Game Spec

## Vision
A bright, friendly space game for an **8-year-old**. Like *Hill Climb Racing*, but between planets: simple two-pedal controls, a fuel gauge that adds tension, coins to collect, stars and ships to unlock. Short runs (30–60 s), instant retry, no reading required to play.

## Platform
- Phones and tablets, **landscape**, touch first. Must hold 60 fps on mid-range devices.
- Web app (Vite + Three.js). Later: PWA and/or Capacitor for app stores.
- Laptop keyboard support for testing (arrows / W-S, Esc to pause).

## Look & feel
- 2D side-scrolling gameplay, rendered in 3D with an orthographic camera: lit, shiny models; glowing particles; animated nebula; parallax star layers and planets.
- Palette: deep space `#070B24`, cyan `#3EE6FF`, gold `#FFC93C`, pink `#FF4D6D`, green `#2BFF88`, violet `#8B6CFF`.
- Fonts: Fredoka (headings, buttons), Nunito (text).
- Big touch targets (≥ 44 px; pedals ~100×120 px). No small text during play.
- Sound: cheerful looping arpeggio music, engine hum that rises when thrusting, coin "ding", fuel jingle, crash, win fanfare. All synthesized (`src/game/audio.js`).

## Controls
- **Right pedal = UP thrust, left pedal = DOWN thrust.** Both are hold-to-thrust and can be pressed together (multi-touch).
- The ship flies forward on its own and speeds up as the stage progresses.
- Without input the ship drifts (damped), so short taps steer precisely.

## Core loop
1. Pick a stage on the **Star Map**. 2. Fly from the start planet to the destination planet. 3. Dodge asteroids, collect coins and fuel cells. 4. Fly through the **glowing ring** to finish. 5. Earn coins (always) and stars (on finish). 6. Spend coins in the **Hangar**; stars unlock new planets.

## Rules
| Thing | Rule |
|---|---|
| Hearts | Depends on ship (Shield stat). Asteroid hit = −1 heart, 1.8 s invulnerable (ship blinks), screen shake, phone vibrates. 0 hearts = crash. |
| Fuel | 100 max. Drains slowly all the time, faster while a pedal is held. Fuel cell = +40 (easy). Empty tank: engine dies, ship drifts down; after ~3 s → "Out of fuel!" |
| Coins | Placed in waves, lines and arcs. A small magnet pulls nearby coins in. Coins are banked even if you crash. |
| Stars | Finishing = 1★, ≥40% coins = 2★, ≥75% coins = 3★. Best result per stage is kept. |
| Unlocks | Stage N opens when total stars ≥ `needStars`. Ships are bought with coins. |
| Difficulty | Easy / Normal / Hard changes asteroid spacing, fuel drain, fuel cell spacing and speed (`DIFFICULTY` in config.js). Default Easy. |

## Stages (`STAGES` in config.js)
| # | Destination | Needs ★ | Length | Idea for its own twist (not built yet) |
|---|---|---|---|---|
| 1 | Moon | 0 | 9000 | Tutorial feel, wide gaps |
| 2 | Mars | 2 | 10000 | Red dust storms reduce visibility |
| 3 | Asteroid Belt | 4 | 11000 | Many small rocks, some orbiting |
| 4 | Jupiter | 7 | 12000 | Strong gravity pull downward near the end |
| 5 | Saturn | 10 | 12500 | Fly through ring gaps |
| 6 | Uranus | 13 | 13000 | Ice rocks that split in two |
| 7 | Neptune | 16 | 13500 | Wind gusts push the ship |
| 8 | Black Hole | 19 | 14000 | Boss stage: everything is pulled toward the hole |

Every stage already works: each has its own layout seed, asteroid colors and destination planet, and is a little denser than the one before. The twists are the next features to build.

## Ships (`SHIPS` in config.js)
| Ship | Price | Speed | Thrust | Fuel | Shield |
|---|---|---|---|---|---|
| Comet Cub | free | 2 | 2 | 2 | 3 |
| Star Saucer | 500 | 2 | 5 | 3 | 3 |
| Nova Racer | 1200 | 5 | 3 | 2 | 3 |
| Moon Hauler | 2500 | 2 | 2 | 5 | 5 |

Stats → physics (Game.js `setShip`): speed ×(0.85+0.07·speed), thrust accel 700+110·thrust, fuel drain ×(1.3−0.12·fuel), hearts = shield.

## Screens
Title → Star Map → Stage intro → Play (HUD + pedals) → Pause / Game over / Stage complete. Hangar is reachable from Title and Star Map. The design mockups are in `design/`.

## Backlog ideas
- Power-ups: magnet, shield bubble, turbo, double coins.
- Ship upgrades (fuel tank, engine, armor) bought with coins, like Hill Climb.
- Daily reward, achievements, ghost of your best run.
- Parent settings: sound volume, difficulty lock, play-time reminder.
- PWA install + offline; Capacitor build for Android/iOS.
