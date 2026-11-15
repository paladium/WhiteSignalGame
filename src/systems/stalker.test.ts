import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import type { Body, GroundPoint } from './movement';
import { lightPools, YardStalker } from './stalker';

const body = (point: GroundPoint): Body => ({ ...point, y: 0, vx: 0, vy: 0, vz: 0, facing: { x: 1, z: 0 }, grounded: true });

test('the yard figure catches a runner in the dark and returns them to the last lit door', () => {
  const stalker = new YardStalker();
  stalker.tick(body(lightPools[1]), 0, false, 1 / 60);
  let caught;
  const spot = body({ x: 3, z: 11 });
  for (let i = 0; i < 1800 && !caught; i++) caught = stalker.tick(spot, 5, true, 1 / 60);
  assert.deepEqual(caught?.checkpoint, lightPools[1]);
});

test('lamplight is safe: no alert, no capture', () => {
  const stalker = new YardStalker();
  stalker.figure = { x: lightPools[0].x + 2.6, z: lightPools[0].z };
  for (let i = 0; i < 600; i++) assert.equal(stalker.tick(body(lightPools[0]), 5, true, 1 / 60), undefined);
  assert.equal(stalker.alert, 0);
  assert.equal(stalker.safe, true);
});

test('story difficulty never captures in the yard', () => {
  const stalker = new YardStalker();
  stalker.difficulty = 'story';
  for (let i = 0; i < 900; i++) assert.equal(stalker.tick(body({ x: stalker.figure.x + .5, z: stalker.figure.z }), 5, true, 1 / 60), undefined);
});
