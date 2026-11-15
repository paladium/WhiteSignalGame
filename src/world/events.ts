import type { GroundPoint } from '../systems/movement';
import type { Save } from '../systems/save';
import type { Area } from './expedition-layout';
import { has } from './story';

// Scripted moments: short timelines that play once per session when the player
// enters an area in the right state. They show rather than tell.
export type Cue =
  | { kind: 'caption' | 'toast'; text: string }
  | { kind: 'voice'; speaker: string; text: string }
  | { kind: 'flicker'; seconds: number }
  | { kind: 'apparition'; at: GroundPoint; seconds: number }
  | { kind: 'trail'; points: GroundPoint[] }
  | { kind: 'stinger' | 'shake' | 'vibrate' };

export interface SceneEvent {
  id: string;
  area: Area;
  when: (save: Save) => boolean;
  cues: [seconds: number, cue: Cue][];
}

/** The Chapter 02 blackout: from Mara's locker until the annex is powered. */
export const blackout = (save: Save) => save.level === 'outside' && has(save, 'locker') && !has(save, 'power');

export const sceneEvents: SceneEvent[] = [
  {
    // Cold open: fresh bootprints in your size lead off into the dark and simply stop.
    id: 'cold-open', area: 'outside', when: save => !has(save, 'heard') && save.elapsed < 4,
    cues: [
      [0, { kind: 'caption', text: 'Wind screams across the ice' }],
      [.3, { kind: 'trail', points: [{ x: -5.6, z: 4.2 }, { x: -7.4, z: 1.2 }, { x: -9.6, z: -1.8 }, { x: -11.2, z: -4.6 }] }],
      [1.8, { kind: 'voice', speaker: 'UNKNOWN VOICE', text: '…Elias. You came back.' }],
      [1.8, { kind: 'stinger' }],
      [3.4, { kind: 'flicker', seconds: 1.4 }],
      [3.6, { kind: 'apparition', at: { x: -11.8, z: -5.6 }, seconds: 1.8 }],
      [3.6, { kind: 'vibrate' }],
      [6, { kind: 'toast', text: 'VOSS — Those are my bootprints. They stop in the middle of the snow.' }],
    ],
  },
  {
    id: 'radio-wakes', area: 'inside', when: save => !has(save, 'heard'),
    cues: [[.8, { kind: 'caption', text: 'The receiver hisses on its own' }]],
  },
  {
    id: 'quarters-ghost', area: 'quarters', when: save => has(save, 'manifest') && !has(save, 'footprints'),
    cues: [
      [.6, { kind: 'caption', text: 'Footsteps that aren’t yours' }],
      [2.2, { kind: 'toast', text: 'VOSS — Someone is walking in here. Only my light shows him.' }],
    ],
  },
  {
    id: 'blackout', area: 'outside', when: blackout,
    cues: [
      [0, { kind: 'flicker', seconds: 1.6 }],
      [.2, { kind: 'stinger' }],
      [.2, { kind: 'shake' }],
      [1.6, { kind: 'caption', text: 'The station hum dies' }],
      [1.8, { kind: 'voice', speaker: 'UNKNOWN VOICE', text: 'It’s dark now. He likes the dark.' }],
      [4.8, { kind: 'toast', text: 'Power is out. Keep to the lit doors, walk, and keep your light low.' }],
    ],
  },
  {
    id: 'power-back', area: 'annex', when: save => has(save, 'power'),
    cues: [
      [0, { kind: 'caption', text: 'The station hums back to life' }],
      [.5, { kind: 'toast', text: 'VOSS — Lights. Whatever was out there went back to waiting.' }],
    ],
  },
  {
    id: 'ridge-watcher', area: 'ridge', when: save => !has(save, 'west'),
    cues: [
      [2.5, { kind: 'apparition', at: { x: -9, z: -3 }, seconds: 2.2 }],
      [2.6, { kind: 'caption', text: 'Someone stands on the ridge, then doesn’t' }],
    ],
  },
  {
    id: 'trench-whisper', area: 'crevasse', when: save => !has(save, 'recorder'),
    cues: [
      [1.5, { kind: 'voice', speaker: 'UNKNOWN VOICE', text: 'Don’t look down. Look behind you.' }],
      [3.2, { kind: 'apparition', at: { x: -21, z: 7 }, seconds: 1.4 }],
      [3.2, { kind: 'vibrate' }],
    ],
  },
  {
    id: 'coast-hail', area: 'coast', when: save => !has(save, 'coastLog'),
    cues: [[1.2, { kind: 'voice', speaker: 'CALLER', text: 'Elias? Is that you on the shore?' }]],
  },
];

/** Voss's past self walks from the spare bunk to Mara's locker and into the wall. */
export const ghostPath: GroundPoint[] = [{ x: -.8, z: .7 }, { x: 1.2, z: -1.5 }, { x: 2.8, z: -3.3 }];
export const GHOST_LOOP = 9;

export function ghostAt(time: number): GroundPoint & { fade: number } {
  const walk = 7;
  const t = time % GHOST_LOOP;
  const progress = Math.min(1, t / walk);
  const segment = Math.min(ghostPath.length - 2, Math.floor(progress * (ghostPath.length - 1)));
  const local = progress * (ghostPath.length - 1) - segment;
  const from = ghostPath[segment], to = ghostPath[segment + 1];
  // Fades in, walks, then sinks into the wall over the last two seconds.
  const fade = t < .8 ? t / .8 : t > walk ? Math.max(0, 1 - (t - walk) / 2) : 1;
  return { x: from.x + (to.x - from.x) * local, z: from.z + (to.z - from.z) * local, fade };
}
