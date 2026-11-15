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

## Gameplay direction (vertical slice)

The owner's feedback was that the game felt slow. The slice reworks the core loop around the signal itself and is applied first to Chapters 01–02:

- **Radio direction finding replaces the amber marker** (Settings → Navigation can restore it). The HUD signal meter and finder blips grow when Voss is close to the objective and facing it, so players sweep to find a bearing.
- **Scene events** ([events.ts](../src/world/events.ts)) play short, wordless moments once per session: the cold open (your own bootprints lead into the dark and a figure stands where they stop), the receiver waking, sightings on the ridge and in the trench, the caller hailing you on the shore.
- **Chapter 02 blackout**: after Mara's locker the station loses power until the annex is restarted. A figure walks the yard ([stalker.ts](../src/systems/stalker.ts)); the three door lamps stay on and are safe. Being caught returns you to the last lit door.
- **Voss's past self**: in the crew quarters a pale double walks from the spare bunk to Mara's locker and into the wall. It shows only in the flashlight beam and replaces the old "trace the scuffs" step.
- **Mobile first**: a floating joystick replaces the arrow pad on touch screens.
- **Feel**: breath fog, flashlight stutter near danger, camera shake, vibration on Android, and a low stinger for scares.
- Long Chapter 01–02 lines were cut.

The same treatment now runs through the rest of the campaign:

- **Hands-on puzzles**: Mara's locker, the drill interlock and the tide lock use turnable dials. Every puzzle quotes the note it needs, sequence steps report what they changed (heater on, pump running, lamp out), and the dampers have a live needle.
- **Chapter 03**: a sighting after the third relay, and a forced whiteout right after triangulation — the way back to the trench is walked in a storm.
- **Chapter 04**: once the badge leaves the emergency receiver, the trench collapses on a countdown (42 s; 75 story, 32 hard). Running out drops you back at the heater with progress intact.
- **Chapter 05**: *Find your own voice* — three recordings answer as Voss; yours repeats your first words at the radio. Older saves past the transcript skip it.
- **Chapter 06**: the tide is live. Sea ice holds at low water and breaks at high water (26 s low, 18 s high), with flood water drawn over the ice.
- **Figures mirror you**: a nearby figure freezes when you stand still. **New Game+ echoes**: each cycle records your route per area, and the next cycle replays it as a pale Voss.
- Narrative lines in Chapters 03–06 were trimmed; the title menu suggests headphones.

Next: playtest on phones with 3–5 people and tune countdowns, tide timing and figure hearing from what they do.

## Next development priorities

Status as of November 2026: `npm run pacing` estimates the critical path at about 21 minutes (Chapters 01–05 about 15, Chapter 06 about 5) before optional evidence, hazards and retries. Every puzzle and both endings pass a scripted browser run ([browser-check.js](../scripts/browser-check.js)), and layouts were checked at 375×812 and 320×640.

Also in place: title menu and settings, key remapping, gamepad, sound captions, story/normal/hard difficulty, storms, flashlight battery, figures that follow footprints, the coast radio hut, three coast outcomes, New Game+, ten achievements, chapter splits, Field Notes pictograms, a Russian translation and offline play (PWA).

1. Time a blind desktop and mobile playthrough from a fresh checkpoint. Record time by chapter, wrong turns, puzzle stalls, and hazard recoveries, then tune for the 30-minute target. Add play value through decisions and interactions where chapters are short.
2. ~~Verify every puzzle and both endings in a browser.~~ Done by script. Still open: real touch input on a phone, and listening to the new ambience and heartbeat on actual speakers.
3. ~~Environmental storytelling, ambient sound and a cross-area clue chain~~ are in place. Further art work (real sprites and textures instead of code-drawn boxes) needs an artist or licensed assets.
4. ~~Extend the mystery from the final choice through a coastal station chapter.~~ Chapter 06 is in place. Next: give the coast its own interior (radio hut cutaway), a distinct ambient sound, and tune the shore figure’s patrol in playtests.
