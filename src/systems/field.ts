import { expedition, heaters, iceSheets, isFieldArea, type Area, type FieldArea } from '../world/expedition-layout';
import { canStandAt, type Body, type GroundPoint } from './movement';
import type { Difficulty } from './settings';

const patrols: Record<FieldArea, GroundPoint[]> = {
  ridge: [{ x: -15, z: -1 }, { x: -9, z: 3 }, { x: 0, z: 1 }, { x: 5, z: 7 }],
  crevasse: [{ x: 4, z: 2 }, { x: 7, z: .5 }, { x: 12, z: -2 }, { x: 19, z: 2 }],
  // The shore figure walks between the boathouse and the radio hut.
  coast: [{ x: -2, z: -9 }, { x: 4, z: -6 }, { x: 12, z: -9.5 }, { x: 18, z: -7 }, { x: 8, z: 1 }],
};

const tuning: Record<Difficulty, { cold: number; hearing: number; pace: number; catches: boolean; ice: number; battery: number }> = {
  story: { cold: .35, hearing: .8, pace: .85, catches: false, ice: 1.6, battery: 0 },
  normal: { cold: 1, hearing: 1, pace: 1, catches: true, ice: 1, battery: 1 },
  hard: { cold: 1.4, hearing: 1.25, pace: 1.25, catches: true, ice: .8, battery: 1.5 },
};

// Storms arrive on a fixed rhythm so they can be learned: 46 calm seconds, then 14 of whiteout wind.
export const stormCycle = { period: 60, start: 46 };
const PRINT_SPACING = .85;
const PRINT_LIFE = 26;
const STORM_PRINT_LIFE = 7;

const distance = (a: GroundPoint, b: GroundPoint) => Math.hypot(a.x - b.x, a.z - b.z);

export interface Print extends GroundPoint { age: number; angle: number }

export class FieldConditions {
  warm = 100;
  alert = 0;
  ice = 0;
  battery = 100;
  storm = 0;
  shelter = false;
  /** True while the figure follows the player's footprints instead of its patrol. */
  tracking = false;
  /** True once the figure has hunted the player in this area. */
  tracked = false;
  figure?: GroundPoint;
  prints: Print[] = [];
  difficulty: Difficulty = 'normal';
  private checkpoint?: GroundPoint;
  private patrolIndex = 1;
  private trail?: GroundPoint;
  private clock = 0;
  private lastPrint?: GroundPoint;

  reset(area: Area) {
    const exposed = isFieldArea(area);
    this.warm = 100;
    this.alert = this.ice = this.storm = 0;
    this.shelter = this.tracking = this.tracked = false;
    this.trail = this.lastPrint = undefined;
    this.prints = [];
    this.patrolIndex = 1;
    this.clock = 0;
    this.figure = exposed ? { ...patrols[area][0] } : undefined;
    this.checkpoint = exposed ? expedition[area].spawn : undefined;
  }

  /** Storm strength from 0 to 1 for a given time in the area. */
  static stormAt(time: number) {
    const phase = time % stormCycle.period - stormCycle.start;
    const length = stormCycle.period - stormCycle.start;
    if (phase < 0) return 0;
    return Math.min(1, phase / 2, (length - phase) / 2);
  }

  tick(area: Area, body: Body, speed: number, flashlight: boolean, dt: number) {
    if (!isFieldArea(area) || !this.figure) return;
    const tune = tuning[this.difficulty];
    this.clock += dt;
    this.storm = FieldConditions.stormAt(this.clock) * (this.difficulty === 'story' ? .6 : 1);
    const heater = heaters[area].find(point => distance(body, point) <= 2.6);
    this.shelter = Boolean(heater);
    if (heater) this.checkpoint = heater;
    const exposure = (speed > 3.5 ? .75 : .52) * tune.cold * (1 + this.storm * 1.4);
    this.warm = Math.min(100, Math.max(0, this.warm + dt * (heater ? 26 : -exposure)));
    this.battery = Math.min(100, Math.max(0, this.battery + dt * (heater ? 30 : flashlight ? -.45 * tune.battery : 0)));

    const thin = body.grounded && iceSheets[area].some(sheet =>
      Math.abs(body.x - sheet.x) < sheet.width / 2 && Math.abs(body.z - sheet.z) < sheet.depth / 2);
    this.ice = thin ? Math.min(1, this.ice + dt / (.75 * tune.ice)) : 0;
    if (this.ice >= 1) return this.recover('The ice broke. You pulled yourself back to the last heated beacon.');
    if (this.warm <= 0) return this.recover('Whiteout. You made it back to the last heated beacon.');

    this.updatePrints(body, dt);

    const figure = this.figure;
    const range = distance(figure, body);
    const walk = expedition[area].walk;
    // Ice blocks the beam. Loud footsteps still carry around a ridge, but storm wind masks them.
    const seesLight = flashlight && range < 8 * (1 - this.storm * .4) && [0.25, 0.5, 0.75].every(fraction =>
      canStandAt(figure.x + (body.x - figure.x) * fraction, figure.z + (body.z - figure.z) * fraction, walk));
    const hearing = tune.hearing * (1 - this.storm * .45);
    const hearsSteps = range < (speed > 3.5 ? 10.5 : speed > .4 ? 3.8 : 2.3) * hearing;
    const noticed = !heater && (seesLight || hearsSteps);
    this.alert = Math.min(1, Math.max(0, this.alert + dt * (noticed ? .72 : -.55)));
    if (noticed) this.trail = { x: body.x, z: body.z };
    if (heater || this.alert === 0) this.trail = undefined;
    if (this.alert > .5) this.tracked = true;
    if (tune.catches && !heater && this.alert > .68 && range < 1.1) {
      return this.recover('Something stepped into your tracks. You came to beneath the last heated beacon.');
    }

    const patrol = patrols[area];
    const chasing = this.trail && this.alert > .50;
    const print = chasing ? undefined : this.nextPrint(figure);
    this.tracking = Boolean(print);
    const target = chasing ? this.trail! : print ?? patrol[this.patrolIndex];
    const gap = distance(target, figure);
    if (gap < .45 && !chasing && !print) this.patrolIndex = (this.patrolIndex + 1) % patrol.length;
    if (gap > .05) {
      const pace = (chasing ? 3.3 : print ? 1.9 : 1.5) * tune.pace;
      const step = Math.min(gap, dt * pace) / gap;
      const x = figure.x + (target.x - figure.x) * step;
      const z = figure.z + (target.z - figure.z) * step;
      // The figure can pass through ice, but the player always has a route around it.
      if (canStandAt(x, z, walk) || chasing || print) { figure.x = x; figure.z = z; }
      else this.patrolIndex = (this.patrolIndex + 1) % patrol.length;
    }
  }

  private updatePrints(body: Body, dt: number) {
    const life = this.storm > .5 ? STORM_PRINT_LIFE : PRINT_LIFE;
    for (const print of this.prints) print.age += dt * (PRINT_LIFE / life);
    this.prints = this.prints.filter(print => print.age < PRINT_LIFE);
    if (!body.grounded) return;
    if (!this.lastPrint || distance(this.lastPrint, body) >= PRINT_SPACING) {
      const angle = this.lastPrint ? Math.atan2(body.z - this.lastPrint.z, body.x - this.lastPrint.x) : 0;
      this.lastPrint = { x: body.x, z: body.z };
      this.prints.push({ x: body.x, z: body.z, age: 0, angle });
      if (this.prints.length > 80) this.prints.shift();
    }
  }

  /** The figure follows fresh prints toward the newest one it can find nearby. */
  private nextPrint(figure: GroundPoint) {
    let best: Print | undefined;
    for (const print of this.prints) {
      if (print.age > PRINT_LIFE * .6 || distance(print, figure) > 2.4 || distance(print, figure) < .3) continue;
      if (!best || print.age < best.age) best = print;
    }
    return best;
  }

  private recover(message: string) {
    this.warm = 65;
    this.alert = this.ice = 0;
    this.trail = undefined;
    this.prints = [];
    this.lastPrint = undefined;
    this.battery = Math.max(this.battery, 40);
    return { message, checkpoint: this.checkpoint! };
  }
}
