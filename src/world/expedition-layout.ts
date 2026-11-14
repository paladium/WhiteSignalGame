import type { GroundPoint, WalkArea } from '../systems/movement';

export const expeditionAreas = ['quarters', 'annex', 'ridge', 'crevasse', 'borehole', 'coast', 'hut'] as const;
export type ExpeditionArea = typeof expeditionAreas[number];
export type Area = 'outside' | 'inside' | ExpeditionArea;
export type FieldArea = 'ridge' | 'crevasse' | 'coast';
type Fixture = WalkArea['obstacles'][number] & {
  kind: 'bed' | 'desk' | 'shelf' | 'generator' | 'rock' | 'tower' | 'drill' | 'crate' | 'hut' | 'prop'; name?: string;
};

function room(width: number, depth: number, obstacles: Fixture[]) {
  return { minX: -width / 2 + .5, maxX: width / 2 - .5, minZ: -depth / 2 + .5, maxZ: depth / 2 - .5, obstacles };
}

function fixture(kind: Fixture['kind'], x: number, z: number, width: number, depth: number, name?: string): Fixture {
  return { kind, x, z, width, depth, name };
}

export const expedition = {
  quarters: {
    title: 'Crew quarters', subtitle: 'INTERIOR · BLOCK B', snow: false, spawn: { x: -8, z: 5 },
    walk: room(21, 14, [
      fixture('bed', -8, -4, 2.3, 4), fixture('bed', -4.3, -4, 2.3, 4), fixture('bed', -.6, -4, 2.3, 4),
      fixture('desk', 7.7, -4.9, 4, 2), fixture('shelf', -9, 1, 1.4, 2.6), fixture('desk', 3.3, 2.7, 3.4, 1.8),
    ]),
  },
  annex: {
    title: 'Power annex', subtitle: 'INTERIOR · UTILITY BLOCK', snow: false, spawn: { x: -9, z: 5 },
    walk: room(24, 15, [
      fixture('generator', -7, -3.6, 3.1, 3.3), fixture('generator', 0, -3.6, 3.1, 3.3),
      fixture('generator', 7.5, -3.6, 3.1, 3.3), fixture('shelf', 10, 2.2, 1.9, 3.8),
      fixture('crate', -4, 2.8, 2.6, 1.9),
    ]),
  },
  ridge: {
    title: 'Relay ridge', subtitle: 'EXTERIOR · NORTH ARRAY', snow: true, spawn: { x: -27, z: 11 },
    walk: room(70, 42, [
      fixture('rock', -21, 1, 4, 7), fixture('rock', -11, -6, 6, 6), fixture('rock', -6, 10, 5, 5),
      fixture('rock', 9, 3, 5, 8), fixture('rock', 18, -12, 7, 5), fixture('rock', 23, 10, 4.5, 6),
      fixture('tower', -23, -12, 3, 3), fixture('tower', 1, -11, 3, 3), fixture('tower', 25, -3, 3, 3),
    ]),
  },
  crevasse: {
    title: 'The crevasse', subtitle: 'EXTERIOR · GLACIER TRENCH', snow: true, spawn: { x: -24, z: 12 },
    walk: room(62, 39, [
      fixture('rock', -17, -8, 9, 8), fixture('rock', -4, 6, 6, 10), fixture('rock', 6, -11, 9, 7),
      fixture('rock', 11, 10, 7, 8), fixture('rock', 21, -5, 5, 8), fixture('crate', -17, 8, 2, 2),
      fixture('crate', 1, -3, 2, 2), fixture('crate', 16, 5, 2, 2),
    ]),
  },
  borehole: {
    title: 'Borehole Nine', subtitle: 'SUBSURFACE · LISTENING CHAMBER', snow: false, spawn: { x: -13, z: 7 },
    walk: room(31, 21, [
      fixture('drill', 3, -4, 7.5, 7.5), fixture('shelf', -12, -5, 2.7, 5),
      fixture('desk', 10.8, -4, 4.2, 2.6), fixture('generator', -5, 3, 3.2, 3.6), fixture('crate', 10, 5, 3.2, 2.4),
    ]),
  },
  coast: {
    title: 'Halvard coast', subtitle: 'EXTERIOR · COAST STATION SHORELINE', snow: true, spawn: { x: -27, z: 13 },
    walk: room(64, 40, [
      fixture('hut', 20, -13.5, 9, 5, 'RADIO HUT'), fixture('hut', -12, -13.5, 7, 5, 'BOATHOUSE'),
      fixture('tower', 4, 10, 3, 3), fixture('rock', -20, 2, 5, 7), fixture('rock', 0, -4, 6, 5),
      fixture('rock', 13, 3, 5, 6), fixture('rock', 27, 10, 5, 6), fixture('crate', -5, -12, 2, 2),
    ]),
  },
  hut: {
    title: 'Radio hut', subtitle: 'INTERIOR · HALVARD COAST', snow: false, spawn: { x: -4.5, z: 3 },
    walk: room(16, 11, [
      fixture('desk', 3, -3.7, 4.2, 1.6), fixture('desk', -1.5, -3.8, 2.6, 1.4),
      fixture('shelf', -6.2, -2.4, 1.4, 3), fixture('bed', 6, 1.6, 2, 3.4),
    ]),
  },
} satisfies Record<ExpeditionArea, {
  title: string; subtitle: string; snow: boolean; spawn: GroundPoint; walk: ReturnType<typeof room>;
}>;

export const heaters: Record<FieldArea, GroundPoint[]> = {
  ridge: [{ x: -27, z: 11 }, { x: -14, z: -12 }, { x: 4.5, z: -7.7 }, { x: 26, z: 2 }],
  crevasse: [{ x: -24, z: 12 }, { x: -10, z: 1 }, { x: 5.5, z: -4.3 }, { x: 21, z: 5 }],
  coast: [{ x: -27, z: 13 }, { x: -10, z: 7 }, { x: 10.5, z: -7 }, { x: 22, z: 3 }],
};

export const fieldAreas: readonly FieldArea[] = ['ridge', 'crevasse', 'coast'];

// Collision for story props and heater cabinets. They are drawn separately in levels.ts,
// so the 'prop' kind adds a footprint without drawing a generic box.
const props: Partial<Record<ExpeditionArea, Fixture[]>> = {
  crevasse: [fixture('prop', -22, -15, 2.7, 1.3), fixture('prop', 2.1, 17.2, 3, .3)], // sled, survey flags
  borehole: [fixture('prop', -1.5, -3.9, .7, 6.4)], // folding chairs
};
for (const area of fieldAreas) {
  for (const heater of heaters[area]) expedition[area].walk.obstacles.push(fixture('prop', heater.x, heater.z - .85, 1.35, .78));
}
for (const [area, list] of Object.entries(props) as [ExpeditionArea, Fixture[]][]) expedition[area].walk.obstacles.push(...list);
export const isFieldArea = (area: Area): area is FieldArea => (fieldAreas as readonly Area[]).includes(area);

export const thinIce = [
  { x: -7.7, z: -1.4, width: 2.35, depth: 11.5 },
  { x: 12.2, z: -1.8, width: 2.5, depth: 10.5 },
];

// Sea ice along the inlet. Each sheet leaves a dry route around one end.
export const seaIce = [
  { x: -3.5, z: 10, width: 2.5, depth: 12 },
  { x: 6, z: -12.5, width: 2.6, depth: 9 },
];

export const iceSheets: Record<FieldArea, typeof thinIce> = { ridge: [], crevasse: thinIce, coast: seaIce };

export const outbuildings = [
  { x: -16, z: .75, width: 7, depth: 4 },
  { x: 25, z: 11.65, width: 8, depth: 4.2 },
];
