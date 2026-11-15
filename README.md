# The White Signal

A browser-based isometric survival mystery. Antarctica, 1987. Built with Three.js, TypeScript, and Vite.

[Play The White Signal](https://paladium.github.io/WhiteSignalGame/) · [Game design and campaign walkthrough](docs/GAME_DESIGN.md) · [Developer handoff](docs/HANDOFF.md) · [Art, audio, and screenshots](docs/ASSETS.md)

![Isometric Kestrel Station](docs/images/expedition-preview.jpg)

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the printed local URL (normally http://localhost:5173). For a phone on the same network, open the printed Network URL; allow the development server through the firewall if needed.

```sh
npm test       # movement, field hazards, objective routing, checkpoint compatibility
npm run build # TypeScript check and production bundle
npm run pacing # estimated critical-path time per chapter
npm run preview # serve production build locally
```

Deploy the `dist/` directory to any static host. No environment variables or backend are required. The two web fonts are optional; system fallbacks work offline.

## Play

- WASD or the arrow keys: move
- Shift: run
- Space: jump
- F: flashlight
- E/Enter: interact / advance transmission
- J: field notes
- Escape: pause
- M: expedition map and current route
- Sound button: mute or restore footsteps, wind, and clue tones. Audio starts on your first input.
- Keys can be remapped in Settings; arrows and Enter always work.
- Gamepad: stick or D-pad to move, A interact, B jump, X flashlight, Y field notes, shoulder buttons run, Back map, Start pause. Menus and puzzles are navigable with the D-pad.

The title menu offers Continue, New expedition, New cycle (after the epilogue), Settings and Achievements. Settings cover volume, text size, sound captions, difficulty (story, normal, hard), language (English or Russian) and key bindings.

Touch controls appear on phones, tablets, and narrow screens. Put a thumb anywhere on the left side of the screen to get a floating stick, hold RUN to sprint, and ⤒ to jump. For puzzles, tap an answer or press its number on the keyboard.

Find your way with the radio: the SIGNAL meter and finder blips get stronger as you near the objective and face it (Settings → Navigation switches to the classic amber marker). Start at the radio room and listen to the transmission. The journey continues through eight connected areas, including the crew quarters, power annex, relay ridge, glacier trench, Borehole Nine, and — after the final choice — Halvard coast station. Field Notes preserves the clues you’ll need for later puzzles.

Running and using the flashlight can give away your position around the figures. The flashlight battery drains outdoors and recharges at heated beacons. Storm gusts arrive on a steady rhythm: colder, but the wind masks footsteps and erases tracks. The figures follow fresh footprints. Rewarm and set a recovery point at heated beacons. Sprint and jump across yellow-striped thin ice, or take the longer route around it. Cracking ice, whiteouts, and encounters send you back to the last beacon with your discoveries intact.

The six chapters, thirteen optional discoveries, two endings and three outcomes of the coastal epilogue (one hidden) are designed around a roughly 40-minute first playthrough. A New Game+ cycle keeps your memories and changes some lines. Ten achievements and per-chapter splits are kept in the browser. Actual playtime depends on exploration and puzzle solving. The ending screen reports active time.

Checkpoints from the earlier side-scrolling version restore on a clear part of the map. Progress, location, and flashlight state save to browser localStorage every five active seconds, on level changes, after the transmission, and when leaving the tab. Saves are local to the browser/origin. Storage failures do not prevent play. Restart Expedition in the pause menu resets the checkpoint. The game freezes while the tab is hidden.

The game installs as an app (PWA) and runs offline after the first visit.

## Structure

- `src/main.ts`: game lifecycle, fixed 60 Hz loop, checkpoint state, interaction and dialogue
- `src/world/levels.ts`: outdoor station, ice ridges, cutaway radio room, batched snow particles
- `src/world/layout.ts`: shared landmarks, walkable areas, and collision footprints
- `src/systems/movement.ts`: deterministic movement and collision bounds
- `src/systems/character.ts`: original procedural pixel sprite and animation
- `src/systems/camera.ts`: isometric orthographic camera, responsive framing, smooth follow
- `src/systems/input.ts`: keyboard and multi-pointer mobile input
- `src/world/story.ts`: objectives, clues, puzzles, area connections, and endings
- `src/systems/field.ts`: warmth, thin ice, figure behavior, and beacon recovery
- `src/systems/audio.ts`: synthesized snow and floor footsteps, wind, and radio cues
- `src/systems/save.ts`: validated, versioned local saves
- `src/ui.ts`, `src/style.css`: responsive HUD, journal, menus, controls
- `src/systems/settings.ts`, `src/systems/achievements.ts`: preferences, key bindings, achievements
- `src/i18n.ts`, `src/i18n/ru.ts`: translation helpers and the Russian strings
- `src/world/effects.ts`, `src/world/pictograms.ts`: flashlight, marker, figure, footprints; Field Notes icons
- `src/debug.ts`: development-only overlay (press ` in `npm run dev`)
- `public/`: PWA manifest, icons and service worker

The supplied character sheet is a visual reference, not a transparent, frame-aligned game atlas. This slice uses original code-drawn pixel art reflecting its dark expedition suit and orange trim. No text or embedded instructions from the reference are treated as project requirements. Environment geometry, effects, and audio are procedural placeholders.

Rendering caps device pixel ratio at 1.75. Snow is a single Points draw call; static station details are instanced by material and geometry/materials are shared, no real-time shadows or postprocessing passes are used. Rendering uses WebGL with an explanatory fallback when unavailable. The expedition uses non-combat hazards and recovery at heated beacons.

## GitHub Pages

The game is configured for https://paladium.github.io/WhiteSignalGame/.
The Pages workflow tests, builds, and deploys every push to `main`. Repository Settings → Pages must use **GitHub Actions** as its source. The Vite base path is `/WhiteSignalGame/`; the local development URL is therefore http://localhost:5173/WhiteSignalGame/.
