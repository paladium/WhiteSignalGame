# The White Signal

An isometric survival mystery set at Kestrel Station, Antarctica, on August 17, 1987. Dr. Elias Voss arrives to investigate a station that stopped responding at 03:14 UTC. A voice on 87.6 MHz insists he arrived three days earlier. Logs, stray objects, and footprints suggest an experiment beneath the ice is learning to imitate the researchers and replay their decisions.

The first campaign is a complete playable expedition with six chapters, eight connected areas, thirteen optional discoveries, and two endings followed by a coastal epilogue chapter. The target is a roughly 30-minute playthrough to the Borehole Nine choice, plus about 8–10 minutes for Chapter 06. That is a design target pending timed playtests.

## What the player does

1. Follow an objective through the station or snow. Walk, run, jump, and control the flashlight with keyboard or touch controls.
2. Read a note, listen to a transmission, or examine evidence. Field Notes records clues for later puzzles.
3. Apply those clues to a lock, a panel, or a radio. Puzzle choices support touch, mouse, and numbered keyboard input. Tone puzzles have visible labels.
4. Choose how to cross open ground. Sprinting covers distance quickly, walking quietly reduces attention, and switching off the flashlight can help evade the figure. Heated beacons restore warmth and give the player a recovery point.
5. Explore optional evidence to understand the crew and the signal. At Borehole Nine, choose whether to seal the chamber or warn the coast.

The game favors suspense through contradictions and environmental detail. Hazards return players to a heated beacon with completed objectives and evidence intact. The amber marker, direction and distance readout, and map help players find their next destination. Wrong puzzle inputs give feedback and allow retries.

## Campaign progression and solutions

The details below spoil the campaign. The canonical text, access conditions, and puzzle answers live in [story.ts](../src/world/story.ts).

| Chapter | Area and objective | Key clue or solution |
| --- | --- | --- |
| 1. The Arrival | Station yard → radio room. Tune the receiver to 87.6 MHz (a dial; static fades near the target) and archive the conversation. | The unknown speaker says Voss arrived three days ago. The radio log opens crew access. |
| 2. The Missing Crew | Read Mara's roster in the crew quarters, light the scuffed floor, open her locker. | BRAVO → DELTA → ALPHA. The recording identifies the yard fuse cache and the annex. |
| 2. The Missing Crew | Retrieve the fuse, read the annex service card, restore power, then open the dispatch. | Heater → Pump → Antenna → Lights. The dispatch describes a short, short, long pulse pattern. |
| 3. Three Returns | Calibrate the three ridge relays, read the survey board, then triangulate at the receiver. | West 87.8, center 88.6, east 87.7 MHz. Set short, short, long on each. Bearings 12°, 38°, and 81° correspond to Borehole Nine. |
| 4. The Crevasse | Find Mara's recorder, read the survey flags by flashlight inside the figure’s patrol, unlock the emergency receiver, release the lift. | The flags read low, high, middle; reverse them to get middle → high → low. Use the badge at the lift override. Thin ice can be jumped or bypassed. |
| 5. The Listening Chamber | Read the depth chart, stabilize the dampers, unlock the interlock, retrieve the routing transcript, reverse the signal. | Start at +3 and apply −2, +1, −2. Use depth 090 at the interlock. Route East → Center → West at the final desk. |
| 5. The Listening Chamber | Choose the final transmission. | Seal the chamber and see the station clock advance, or warn the coast and learn that it received the same warning yesterday. |
| 6. The Coast Road | Take the lift up, follow the erased road from the crevasse to Halvard coast station, read the operator’s log (text depends on the ending), read the tide board, open the boathouse. | Tide 2 dm at 00:00, +3 every six hours until 12:00, then falling: 5 → 8 → 5. |
| 6. The Coast Road | Cut the mast lamp feeds, then answer the radio inside the hut. | Lamps from the top are red, white, green; cut bottom, top, middle: Green → Red → White. Ask the caller what she called the dog. Then choose: pull the fuse (silence), keep listening (the loop holds), or — only with all 13 discoveries — read it the roll call (hidden outcome, the witnesses). |

Optional discoveries are **The unmade bed**, **Six shadows**, **Where the figures came from**, **Service bulletin 09**, **A familiar bootprint**, **Cassette B**, **The erased road**, **Mara’s unsent letter**, **The torn name tag** (coast boathouse, after the tide lock), and a cross-area chain: **Tally marks** (annex), **Three sleeping bags** (crevasse sled) and **Six chairs** (Borehole Nine) unlock **The roll call** at the coast radio hut. Props in each area mark where these traces are. Their text lives in [progress.ts](../src/systems/progress.ts). The player can continue exploring after the ending.

## Art and audio direction

- Use the orthographic isometric angle, open-front cutaway interiors, and upright pixel character. Keep doors, consoles, thin ice, and warm shelters readable at the default zoom.
- Outdoors, use blue-gray snow and ice, a dark horizon, drifting snow, and amber heat or doorway lights. Interiors use slate metal, pale fabric, amber lamps, and green or aqua terminal light. The borehole introduces colder green-blue light as the source draws nearer.
- Exact HUD colors, typography, and responsive layout are in [style.css](../src/style.css). The fonts are Barlow Condensed and IBM Plex Mono with fallbacks.
- All in-game art ships as source: the [scene geometry](../src/world/levels.ts), [pixel character](../src/systems/character.ts), and [camera](../src/systems/camera.ts) generate it at runtime. Original character and isometric reference images informed the style. No reference image is required to build the game. Current screenshots are indexed in the [asset guide](ASSETS.md).
- [Audio](../src/systems/audio.ts) uses Web Audio synthesis, including a per-area ambience (drone, wind level, and swell: generator hum in the annex, a slow pulse in Borehole Nine, surf on the coast), a heartbeat that starts when a figure hears the player and quickens with exposure, granular snow crunch, harder floor steps, landing sounds, and radio tones. Audio begins with a user gesture. Muting is stored independently of the campaign checkpoint.

## Next development priorities

Status as of November 2026: `npm run pacing` estimates the critical path at about 21 minutes (Chapters 01–05 about 15, Chapter 06 about 5) before optional evidence, hazards and retries. Every puzzle and both endings pass a scripted browser run ([browser-check.js](../scripts/browser-check.js)), and layouts were checked at 375×812 and 320×640.

Also in place: title menu and settings, key remapping, gamepad, sound captions, story/normal/hard difficulty, storms, flashlight battery, figures that follow footprints, the coast radio hut, three coast outcomes, New Game+, ten achievements, chapter splits, Field Notes pictograms, a Russian translation and offline play (PWA).

1. Time a blind desktop and mobile playthrough from a fresh checkpoint. Record time by chapter, wrong turns, puzzle stalls, and hazard recoveries, then tune for the 30-minute target. Add play value through decisions and interactions where chapters are short.
2. ~~Verify every puzzle and both endings in a browser.~~ Done by script. Still open: real touch input on a phone, and listening to the new ambience and heartbeat on actual speakers.
3. ~~Environmental storytelling, ambient sound and a cross-area clue chain~~ are in place. Further art work (real sprites and textures instead of code-drawn boxes) needs an artist or licensed assets.
4. ~~Extend the mystery from the final choice through a coastal station chapter.~~ Chapter 06 is in place. Next: give the coast its own interior (radio hut cutaway), a distinct ambient sound, and tune the shore figure’s patrol in playtests.
