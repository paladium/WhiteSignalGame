import type { Body, GroundPoint } from './movement';

/**
 * Radio direction finding: the signal is strongest close to the target and when
 * Voss faces it, so players sweep the way they're looking to find a bearing.
 */
export function signalStrength(body: Pick<Body, 'x' | 'z' | 'facing'>, target: GroundPoint) {
  const dx = target.x - body.x;
  const dz = target.z - body.z;
  const range = Math.hypot(dx, dz);
  if (range < 2.5) return 1;
  const facing = (dx * body.facing.x + dz * body.facing.z) / (range * Math.hypot(body.facing.x, body.facing.z) || 1);
  const closeness = Math.max(0, 1 - range / 45);
  return Math.min(.95, .05 + closeness * (.25 + .75 * Math.max(0, facing)));
}
