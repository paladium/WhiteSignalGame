import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { canStandAt } from '../systems/movement';
import { freshSave, loadSave } from '../systems/save';
import { archive, milestones } from '../systems/progress';
import { expedition, fieldAreas, heaters, type Area } from './expedition-layout';
import { walkAreas } from './layout';
import type { Save } from '../systems/save';
import { available, coastEpilogue, codaOptions, currentObjective, endings, hotspots, routeTarget } from './story';

function followObjectives(save: Save, visited: Set<string>) {
  for (let i = 0; i < 80; i++) {
    const objective = currentObjective(save);
    if (!objective.target) return;
    const target = routeTarget(save, objective.target);
    assert.ok(target, objective.text);
    assert.equal(save.level, target.area);
    assert.ok(available(save, target), target.id);
    if (target.destination) {
      save.level = target.destination.area;
      continue;
    }
    assert.equal(target.id, objective.target);
    assert.ok(!visited.has(target.id));
    visited.add(target.id);
    if (target.finale) return;
    assert.ok(target.proof, target.id);
    save.progress.push(target.proof);
  }
  assert.fail('objective chain did not finish');
}

test('a fresh expedition reaches both endings and the coast epilogue', () => {
  const save = freshSave();
  const visited = new Set<string>();
  followObjectives(save, visited);
  assert.ok(visited.has('decision'));
  for (const ending of Object.keys(endings) as (keyof typeof endings)[]) {
    const branch: Save = { ...save, progress: [...save.progress], evidence: [], ending };
    const coast = new Set<string>();
    followObjectives(branch, coast);
    assert.equal(branch.level, 'hut');
    assert.ok(coast.has(`coast-log-${ending}`));
    assert.ok(!coast.has(`coast-log-${ending === 'seal' ? 'send' : 'seal'}`));
    assert.ok(coast.has('caller'));
    assert.equal(currentObjective(branch).target, '');
    assert.equal(coastEpilogue(branch).length, 3);
    assert.equal(coastEpilogue({ ...branch, evidence: ['letter'] }).length, 4);
  }
  assert.deepEqual(hotspots.flatMap(spot => spot.record ? [spot.record] : []).sort(), Object.keys(archive).sort());
});

test('coast hotspots stay hidden until the borehole choice is made', () => {
  const save = freshSave();
  save.progress.push('reverse');
  for (const spot of hotspots.filter(spot => spot.afterEnding)) assert.equal(available(save, spot), false, spot.id);
});

test('a completed checkpoint from before the coast chapter continues into it', () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify({ level: 'borehole', x: -13, z: 7, progress: ['override', 'reverse'], evidence: [], ending: 'send', elapsed: 1500 }) },
  });
  try {
    const save = loadSave();
    assert.equal(save.ending, 'send');
    assert.equal(currentObjective(save).target, 'coast-log-send');
    assert.equal(routeTarget(save, 'coast-log-send')?.id, 'lift-return');
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('all prompts and portals are reachable from their area entry points', () => {
  const spacing = .25;
  const offsets = [[1, 0], [0, 1], [-1, 0], [0, -1]];
  for (const area of Object.keys(walkAreas) as Area[]) {
    const walk = walkAreas[area];
    const spots = hotspots.filter(spot => spot.area === area);
    const arrivals = hotspots.flatMap(spot => spot.destination?.area === area ? [spot.destination.point] : []);
    if (area === 'outside') arrivals.push(freshSave());
    assert.ok(arrivals.length, area);
    for (const arrival of arrivals) assert.ok(canStandAt(arrival.x, arrival.z, walk), `${area} arrival blocked`);

    const start = [Math.round(arrivals[0].x / spacing), Math.round(arrivals[0].z / spacing)];
    const queue = [start];
    const seen = new Set([start.join(',')]);
    for (const [x, z] of queue) {
      for (const [dx, dz] of offsets) {
        const point = [x + dx, z + dz];
        const id = point.join(',');
        if (seen.has(id) || !canStandAt(point[0] * spacing, point[1] * spacing, walk)) continue;
        seen.add(id);
        queue.push(point);
      }
    }
    for (const spot of spots) {
      assert.ok(queue.some(([x, z]) => Math.hypot(x * spacing - spot.x, z * spacing - spot.z) < spot.radius), `${spot.id} unreachable`);
    }
  }
});

test('an older radio checkpoint unlocks the new crew quarters objective', () => {
  const previousStorage = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: { getItem: () => JSON.stringify({ level: 'inside', x: 3.5, heard: true, flashlight: false }) },
  });
  try {
    const save = loadSave();
    assert.deepEqual(save.progress, ['heard']);
    assert.equal(save.flashlight, false);
    assert.equal(currentObjective(save).target, 'roster');
    assert.equal(routeTarget(save, 'roster')?.id, 'exit');
  } finally {
    if (previousStorage) Object.defineProperty(globalThis, 'localStorage', previousStorage);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});

test('the roll call only appears once all three earlier traces are archived', () => {
  const roll = hotspots.find(spot => spot.id === 'roll')!;
  const save: Save = { ...freshSave(), level: 'coast', ending: 'seal', progress: ['reverse', 'coastLog'], evidence: ['tally', 'sled'] };
  assert.equal(available(save, roll), false);
  save.evidence.push('chairs');
  assert.equal(available(save, roll), true);
});

test('a checkpoint that already has the lift badge skips the survey flags', () => {
  const before = milestones.slice(0, milestones.indexOf('triangulated') + 1);
  const save: Save = { ...freshSave(), level: 'crevasse', progress: [...before, 'recorder', 'echo'] };
  assert.equal(currentObjective(save).target, 'override');
  save.progress = [...before, 'recorder'];
  assert.equal(currentObjective(save).target, 'flags');
});

test('the hidden coast outcome needs every discovery', () => {
  const save: Save = { ...freshSave(), ending: 'seal', progress: ['reverse', 'coastLog', 'mast'], evidence: [] };
  assert.deepEqual(codaOptions(save).map(option => option.id), ['silence', 'listen']);
  save.evidence = Object.keys(archive) as Save['evidence'];
  assert.deepEqual(codaOptions(save).map(option => option.id), ['silence', 'listen', 'witness']);
  for (const coda of ['silence', 'listen', 'witness'] as const) assert.ok(coastEpilogue({ ...save, coda }).length >= 3, coda);
});

test('solid props block movement and leave beacons and patrols walkable', () => {
  const solid: [Area, number, number][] = [
    ['outside', -8.7, 12.25], ['outside', -8.5, 2.65], ['outside', -13, -3], ['outside', 15.6, -3.3],
    ['outside', -21, -4], ['outside', -22, 10], ['crevasse', -22, -15], ['borehole', -1.5, -4],
  ];
  for (const [area, x, z] of solid) assert.equal(canStandAt(x, z, walkAreas[area]), false, `${area} ${x},${z}`);
  for (const area of fieldAreas) {
    for (const heater of heaters[area]) assert.ok(canStandAt(heater.x, heater.z, walkAreas[area]), `${area} heater ${heater.x},${heater.z}`);
    assert.ok(canStandAt(expedition[area].spawn.x, expedition[area].spawn.z, walkAreas[area]), `${area} spawn`);
  }
});
