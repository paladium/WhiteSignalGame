# Developer handoff

Start with the [game design and campaign walkthrough](GAME_DESIGN.md), then run:

```sh
npm ci
npm test
npm run build
npm run dev
```

Vite serves the game at http://localhost:5173/WhiteSignalGame/. Production deploys to [GitHub Pages](https://paladium.github.io/WhiteSignalGame/) after a push to `main` passes the [Pages workflow](../.github/workflows/pages.yml).

## Where to continue

- [story.ts](../src/world/story.ts) owns checkpoints, objective prerequisites, portal connections, dialogue, and puzzle sequences. Declare a milestone in [progress.ts](../src/systems/progress.ts) when it must survive reloads. The objective router follows currently unlocked portal links to the target's area.
- [expedition-layout.ts](../src/world/expedition-layout.ts) and [layout.ts](../src/world/layout.ts) define navigable space, collision footprints, spawns, and field landmarks. [levels.ts](../src/world/levels.ts) builds the Three.js scenes. Keep hotspot placement consistent with collision footprints when adding props.
- [main.ts](../src/main.ts) connects area changes, the fixed simulation loop, input, prompts, dialogue, and the HUD. [field.ts](../src/systems/field.ts) owns outdoor hazards and beacon recovery. [encounter.ts](../src/systems/encounter.ts) handles puzzle feedback and choices.
- [save.ts](../src/systems/save.ts) validates browser checkpoints under `the-white-signal:v1`. Prior isometric and side-scrolling saves using `heard` migrate to the corresponding milestone. Saves track position, progress, evidence, ending, flashlight, and elapsed time. Puzzle attempts and transient field conditions reset after reload. The sound preference has a separate storage key. To test a fresh campaign, use **Restart Expedition** or an isolated browser profile.

## Verification and known limits

- Translations: story data stays in English and English strings are the keys of [ru.ts](../src/i18n/ru.ts). After adding or changing text, run `npm run strings`; `npm test` fails if a story string has no Russian line. Interface text goes through `t()`/`tf()` in code or `data-i18n` in [ui.ts](../src/ui.ts).
- Input is action based ([settings.ts](../src/systems/settings.ts)): use `input.pressed('interact')`, not key codes. Touch buttons use `data-control="<action>"`; the gamepad maps to the same actions.
- Saves now also store `splits`, `cycle` (New Game+) and `coda` (the Chapter 06 choice). All are optional and validated on load.
- `npm run pacing` walks the objective route on the collision grid and prints an estimated time per chapter.
- In `npm run dev`, `window.whiteSignal` exposes `state`, `go(area, x, z)`, `grant(...milestones)`, `close()`, `field` and `tick(frames)`; press ` for the collision overlay. It is stripped from production builds. [browser-check.js](../scripts/browser-check.js) uses it to play both endings and collect all evidence with real key events. [browser-suite.js](../scripts/browser-suite.js) runs 44 checks of movement, menus and shortcuts, field hazards, saves, gamepad (emulated), touch, key remapping, live language switching, the last-call choice and New Game+: `await import('/WhiteSignalGame/scripts/browser-suite.js'); await whiteSignalSuite()`.

- The tests cover movement, grounded thin ice, exposure and beacon recovery, migration of the original radio checkpoint, objective prerequisites through the ending choice, and collision-aware reachability of prompts and portals.
- Browser smoke checks covered loading an earlier checkpoint, the radio room, the map, the station yard, the crew quarters, and locker puzzle feedback. Full timed playthroughs of both endings and a comprehensive mobile/audio pass remain the next verification tasks.
- Chapter 06 (Halvard coast station) unlocks after either ending via the `coast-road` portal in the crevasse. Coast hotspots use `afterEnding` in [story.ts](../src/world/story.ts); the operator’s log has one variant per ending. Field hazards, heaters, and thin ice are keyed by `FieldArea` in [expedition-layout.ts](../src/world/expedition-layout.ts). Completing `caller` plays `coastEpilogue` and stops the active-time clock. Checkpoints saved after an ending continue into the chapter.
- The expedition is playable through two endings. Its 30-minute goal is a pacing estimate, and the figure behavior, environmental art, and synthesized footsteps are ready for tuning. Vite emits its existing bundle size advisory for the Three.js build.

See [ASSETS.md](ASSETS.md) for code-generated assets and committed screenshots.
