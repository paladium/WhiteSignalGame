import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { expedition, heaters, seaIce, thinIce } from '../world/expedition-layout';
import type { Body, GroundPoint } from './movement';
import { FieldConditions } from './field';

function body(point: GroundPoint): Body {
  return { ...point, y: 0, vx: 0, vy: 0, vz: 0, facing: { x: 1, z: 0 }, grounded: true };
}

test('sprinting near the figure builds exposure and heaters restore warmth safely', () => {
  const field = new FieldConditions();
  field.reset('ridge');
  const runner = body({ x: -11, z: 0 });
  for (let i = 0; i < 60; i++) field.tick('ridge', runner, 5, false, 1 / 60);
  assert.ok(field.alert > .5);
  assert.ok(field.warm < 100);

  const safe = body(heaters.ridge[0]);
  for (let i = 0; i < 160; i++) field.tick('ridge', safe, 0, true, 1 / 60);
  assert.equal(field.alert, 0);
  assert.equal(field.warm, 100);
  assert.equal(field.shelter, true);
});

test('thin ice only cracks under a grounded player and recovers at the last beacon', () => {
  const field = new FieldConditions();
  field.reset('crevasse');
  const safe = heaters.crevasse[1];
  field.tick('crevasse', body(safe), 0, false, 1 / 60);
  const crossing = { ...body(thinIce[0]), grounded: false, y: 1 };
  for (let i = 0; i < 60; i++) assert.equal(field.tick('crevasse', crossing, 5, false, 1 / 60), undefined);
  assert.equal(field.ice, 0);
  let failure;
  for (let i = 0; i < 55 && !failure; i++) failure = field.tick('crevasse', body(thinIce[0]), 0, false, 1 / 60);
  assert.deepEqual(failure?.checkpoint, safe);
});

test('a whiteout returns the player to the trail entry when no other heater has been visited', () => {
  const field = new FieldConditions();
  field.reset('ridge');
  field.warm = .01;
  const outcome = field.tick('ridge', body({ x: 31, z: 14 }), 0, false, 1 / 60 * 2);
  assert.deepEqual(outcome?.checkpoint, expedition.ridge.spawn);
});

test('coast sea ice holds at low water and cracks at high tide', () => {
  const field = new FieldConditions();
  field.reset('coast');
  assert.ok(field.figure);
  // Low water: the ice holds.
  for (let i = 0; i < 120; i++) assert.equal(field.tick('coast', body(seaIce[0]), 0, false, 1 / 60), undefined);
  assert.equal(field.ice, 0);
  // Wait at a heater for high water, then step onto the ice.
  field.reset('coast');
  while (!field.highTide) field.tick('coast', body(heaters.coast[0]), 0, false, 1 / 60);
  let failure;
  for (let i = 0; i < 55 && !failure; i++) failure = field.tick('coast', body(seaIce[0]), 0, false, 1 / 60);
  assert.deepEqual(failure?.checkpoint, heaters.coast[0]);
});

test('storms follow a fixed rhythm and mask footsteps', () => {
  assert.equal(FieldConditions.stormAt(10), 0);
  assert.equal(FieldConditions.stormAt(53), 1);
  assert.equal(FieldConditions.stormAt(60), 0);
  const calm = new FieldConditions();
  const stormy = new FieldConditions();
  calm.reset('ridge');
  stormy.reset('ridge');
  // Advance the stormy field into the gust while standing at a heater.
  for (let i = 0; i < 53 * 60; i++) stormy.tick('ridge', body(heaters.ridge[0]), 0, false, 1 / 60);
  assert.equal(stormy.storm, 1);
  stormy.alert = calm.alert = 0;
  const walker = body({ x: -15, z: 2.8 });
  for (let i = 0; i < 30; i++) {
    calm.tick('ridge', { ...walker }, 2.8, false, 1 / 60);
    stormy.tick('ridge', { ...walker }, 2.8, false, 1 / 60);
  }
  assert.ok(calm.alert > 0);
  assert.ok(stormy.alert < calm.alert);
});

test('the flashlight drains outdoors and recharges at a heater', () => {
  const field = new FieldConditions();
  field.reset('coast');
  for (let i = 0; i < 600; i++) field.tick('coast', body({ x: 0, z: 15 }), 0, true, 1 / 60);
  assert.ok(field.battery < 100);
  const drained = field.battery;
  for (let i = 0; i < 60; i++) field.tick('coast', body(heaters.coast[1]), 0, true, 1 / 60);
  assert.ok(field.battery > drained);
});

test('the figure follows fresh footprints', () => {
  const field = new FieldConditions();
  field.reset('crevasse');
  const start = { ...field.figure! };
  // Lay a quiet trail leading away from the figure's patrol.
  for (let i = 0; i <= 10; i++) field.tick('crevasse', body({ x: start.x + .2, z: start.z + 1 + i * .9 }), .3, false, 1 / 60);
  for (let i = 0; i < 60; i++) field.tick('crevasse', body({ x: start.x + .2, z: start.z + 18 }), 0, false, 1 / 60);
  assert.ok(field.tracking || field.figure!.z > start.z + 1);
});

test('story difficulty never captures the player', () => {
  const field = new FieldConditions();
  field.difficulty = 'story';
  field.reset('ridge');
  const target = body({ ...field.figure! });
  let outcome;
  for (let i = 0; i < 300 && !outcome; i++) outcome = field.tick('ridge', target, 5.2, true, 1 / 60);
  assert.equal(outcome, undefined);
});

test('a figure freezes while a nearby player stands still', () => {
  const field = new FieldConditions();
  field.reset('ridge');
  const near = { x: field.figure!.x + 6, z: field.figure!.z };
  const start = { ...field.figure! };
  for (let i = 0; i < 120; i++) field.tick('ridge', body(near), 0, false, 1 / 60);
  assert.ok(field.mimicking);
  assert.deepEqual(field.figure, start);
});
