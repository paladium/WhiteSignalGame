import type { Body, GroundPoint } from './movement';
import type { Difficulty } from './settings';

// During the Chapter 02 blackout a figure walks the station yard. The door lamps
// stay lit on emergency power; standing in their light is safe.
export const yardPatrol: GroundPoint[] = [
  { x: -2, z: 9 }, { x: 5, z: 13 }, { x: 13, z: 9 }, { x: 19, z: 13 }, { x: 9, z: 16 }, { x: 0, z: 14 },
];
export const lightPools: GroundPoint[] = [{ x: -16, z: 4.2 }, { x: 25, z: 15 }, { x: 10.2, z: 1.4 }];
const POOL_RADIUS = 2.4;
const distance = (a: GroundPoint, b: GroundPoint) => Math.hypot(a.x - b.x, a.z - b.z);

export class YardStalker {
  figure: GroundPoint = { ...yardPatrol[0] };
  alert = 0;
  safe = false;
  mimicking = false;
  difficulty: Difficulty = 'normal';
  private target = 1;
  private trail?: GroundPoint;
  private checkpoint: GroundPoint = lightPools[0];

  reset() {
    this.figure = { ...yardPatrol[0] };
    this.alert = 0;
    this.target = 1;
    this.trail = undefined;
  }

  tick(body: Body, speed: number, flashlight: boolean, dt: number) {
    const pool = lightPools.find(point => distance(point, body) < POOL_RADIUS);
    this.safe = Boolean(pool);
    if (pool) this.checkpoint = pool;
    const range = distance(this.figure, body);
    const hard = this.difficulty === 'hard' ? 1.25 : this.difficulty === 'story' ? .8 : 1;
    const hears = range < (speed > 3.5 ? 9.5 : speed > .4 ? 3.4 : 2) * hard;
    const sees = flashlight && range < 7 * hard;
    const noticed = !pool && (hears || sees);
    this.alert = Math.min(1, Math.max(0, this.alert + dt * (noticed ? .8 : -.5)));
    if (noticed) this.trail = { x: body.x, z: body.z };
    if (pool || this.alert === 0) this.trail = undefined;
    if (this.difficulty !== 'story' && !pool && this.alert > .65 && range < 1.1) {
      this.alert = 0;
      this.trail = undefined;
      this.figure = { ...yardPatrol[0] };
      return { checkpoint: this.checkpoint };
    }
    const chasing = this.trail && this.alert > .45;
    const goal = chasing ? this.trail! : yardPatrol[this.target];
    const gap = distance(goal, this.figure);
    if (!chasing && gap < .4) this.target = (this.target + 1) % yardPatrol.length;
    this.mimicking = !chasing && speed < .2 && range < 14;
    if (gap > .05 && !this.mimicking) {
      // It will not step into lamplight.
      const step = Math.min(gap, dt * (chasing ? 3.4 : 1.6) * hard) / gap;
      const next = { x: this.figure.x + (goal.x - this.figure.x) * step, z: this.figure.z + (goal.z - this.figure.z) * step };
      if (!lightPools.some(point => distance(point, next) < POOL_RADIUS - .4)) this.figure = next;
      else if (!chasing) this.target = (this.target + 1) % yardPatrol.length;
    }
  }
}
