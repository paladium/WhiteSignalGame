# The White Signal

A browser-based 2.5D survival mystery. Antarctica, 1987. Three.js, TypeScript, Vite; no backend or game engine dependency.

## Run

Requires Node.js 20.19+ or 22.12+.

```sh
npm install
npm run dev
```

Open the printed local URL (normally http://localhost:5173). For a phone on the same network, open the printed Network URL; allow the development server through the firewall if needed.

```sh
npm test       # movement, jump, world bounds, timestep behavior
npm run build # TypeScript check and production bundle
npm run preview # serve production build locally
```

Deploy the `dist/` directory to any static host. No environment variables or backend are required. The two web fonts are optional; system fallbacks work offline.

## Play

- A/D or left/right arrows: move
- Shift: run
- Space/W/up arrow: jump
- F: flashlight
- E/Enter: interact / advance transmission
- J: field notes
- Escape: pause
- Sound button: enable synthesized wind and radio tones (starts muted)

Touch controls appear on phones/tablets and narrow screens. Hold arrows to move, RUN to sprint, ↑ to jump, ☀ for flashlight; the context action changes to ENTER / EXIT / USE / NEXT. Rotate to landscape for a wider view.

Walk right to the orange-lit station door. Enter, approach the green radio terminal, and advance the mysterious transmission. The ending records a new field note and objective; further investigation is beyond this prologue.

Progress, location, and flashlight state save to browser localStorage every five active seconds, on level changes, after the transmission, and when leaving the tab. Saves are local to the browser/origin. Storage failures do not prevent play. Restart Prologue in the pause menu resets the checkpoint. The game freezes while the tab is hidden.

## Structure

- `src/main.ts`: game lifecycle, fixed 60 Hz loop, state, interaction/dialogue flow
- `src/world/levels.ts`: outdoor station, layered mountains, interior, batched snow particles
- `src/systems/movement.ts`: deterministic movement and collision bounds
- `src/systems/character.ts`: original procedural pixel sprite and animation
- `src/systems/camera.ts`: orthographic camera, responsive framing, smooth follow
- `src/systems/input.ts`: keyboard and multi-pointer mobile input
- `src/systems/audio.ts`: opt-in synthesized wind and radio cues
- `src/systems/save.ts`: validated, versioned local saves
- `src/ui.ts`, `src/style.css`: responsive HUD, journal, menus, controls

The supplied character sheet is a visual reference, not a transparent, frame-aligned game atlas. This slice uses original code-drawn pixel art reflecting its dark expedition suit and orange trim. No text or embedded instructions from the reference are treated as project requirements. Environment geometry, effects, and audio are procedural placeholders.

Rendering caps device pixel ratio at 1.75. Snow is a single Points draw call; static station details are instanced by material and geometry/materials are shared, no real-time shadows or postprocessing passes are used. Rendering uses WebGL with an explanatory fallback when unavailable. This first slice has atmospheric survival presentation, not hunger/combat/death systems.

## GitHub Pages

The game is configured for https://paladium.github.io/WhiteSignalGame/.
The Pages workflow tests, builds, and deploys every push to `main`. Repository Settings → Pages must use **GitHub Actions** as its source. The Vite base path is `/WhiteSignalGame/`; the local development URL is therefore http://localhost:5173/WhiteSignalGame/.
