import type { WalkArea } from '../systems/movement';
import { expedition, outbuildings, type Area } from './expedition-layout';

export const station = {
  building: { x: 8.5, z: -5.5, width: 13, depth: 7 },
  entrance: { x: 10.2, z: 0.65, radius: 1.7 },
  spawn: { x: -5, z: 5 },
  crates: [
    { x: -3.1, z: 2.4, width: 1.45, depth: 1.1 },
    { x: -1.5, z: 2.4, width: 1.25, depth: 1.1 },
    { x: 15.8, z: 0.9, width: 1.5, depth: 1.2 },
  ],
};

export const radioRoom = {
  spawn: { x: -5.6, z: 2.9 },
  exit: { x: -5.6, z: 4.1, radius: 1.3 },
  terminal: { x: 3.5, z: -1.8, radius: 1.65 },
  desk: { x: 3.5, z: -3.35, width: 5.8, depth: 1.45 },
  rack: { x: -3.1, z: -3.6, width: 3.8, depth: 1.45 },
  bench: { x: -6.5, z: -0.3, width: 1.55, depth: 3.25 },
};

// Solid yard props that are drawn in levels.ts but are not buildings or crates.
// The ice ridges use the steep inner part of their footprint; their gentle edges stay walkable.
export const yardProps = [
  { x: -8.7, z: 12.25, width: 1.45, depth: 1.1 }, // green fuse cache
  { x: -8.5, z: 2.65, width: 2.4, depth: .3 }, // STATION 04 signpost
  ...[-13, -2, 20].map(x => ({ x, z: -3, width: .4, depth: .4 })), // power poles
  { x: 15.6, z: -3.3, width: 1.3, depth: 2.3 }, // generator box on the station's east side
  { x: 10.2, z: -1.65, width: 1.6, depth: .4 }, // entrance door frame
  ...[[-8, 6.4], [-3, 6.1], [2, 5.35], [6.7, 3.5], [10.9, 1.75]].map(([x, z]) => ({ x, z, width: .25, depth: .25 })), // guide stakes
  { x: -20.7, z: -3.4, width: 6.6, depth: 10.6 }, // west ice ridge
  { x: -21.75, z: 10, width: 4.5, depth: 8.4 }, // southwest ice ridge
  { x: -6, z: -15.5, width: 36, depth: 1.2 }, // foot of the back ridges
];

export const walkAreas: Record<Area, WalkArea> = {
  outside: {
    minX: -24, maxX: 32, minZ: -16, maxZ: 21,
    obstacles: [station.building, ...station.crates, ...outbuildings, ...yardProps],
  },
  quarters: expedition.quarters.walk,
  annex: expedition.annex.walk,
  ridge: expedition.ridge.walk,
  crevasse: expedition.crevasse.walk,
  borehole: expedition.borehole.walk,
  coast: expedition.coast.walk,
  hut: expedition.hut.walk,
  inside: {
    minX: -7.5, maxX: 7.5, minZ: -4.55, maxZ: 4.55,
    obstacles: [radioRoom.desk, radioRoom.rack, radioRoom.bench],
  },
};
