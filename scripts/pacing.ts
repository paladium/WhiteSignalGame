// Estimates first-playthrough time per chapter by walking the objective route.
// Walking time comes from shortest paths on the collision grid; reading and puzzle
// time are rough constants. Compare these numbers against real timed playtests.
import { canStandAt, type GroundPoint } from '../src/systems/movement';
import { freshSave, type Save } from '../src/systems/save';
import { walkAreas } from '../src/world/layout';
import type { Area } from '../src/world/expedition-layout';
import { chapter, coastEpilogue, currentObjective, endings, routeTarget, type Line } from '../src/world/story';

const WALK = 2.8; // m/s, movement.ts
const WORDS_PER_SECOND = 3.3;
const PUZZLE_SECONDS = 35;
const LOOK_AROUND = 1.35; // players rarely walk the optimal line

const spacing = .25;
function pathLength(area: Area, from: GroundPoint, to: GroundPoint, radius: number) {
  const walk = walkAreas[area];
  const key = (x: number, z: number) => `${x},${z}`;
  const start: [number, number] = [Math.round(from.x / spacing), Math.round(from.z / spacing)];
  const dist = new Map([[key(...start), 0]]);
  let frontier: [number, number][] = [start];
  const steps = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, Math.SQRT2], [1, -1, Math.SQRT2], [-1, 1, Math.SQRT2], [-1, -1, Math.SQRT2]];
  while (frontier.length) {
    frontier.sort((a, b) => dist.get(key(...a))! - dist.get(key(...b))!);
    const [x, z] = frontier.shift()!;
    const d = dist.get(key(x, z))!;
    if (Math.hypot(x * spacing - to.x, z * spacing - to.z) < radius * .8) return d * spacing;
    for (const [dx, dz, cost] of steps) {
      const nx = x + dx, nz = z + dz, k = key(nx, nz);
      if (dist.has(k) || !canStandAt(nx * spacing, nz * spacing, walk)) continue;
      dist.set(k, d + cost);
      frontier.push([nx, nz]);
    }
  }
  return Infinity;
}

const reading = (lines: Line[] = []) => lines.reduce((t, [, text]) => t + 1 + text.split(' ').length / WORDS_PER_SECOND, 0);

function run(save: Save, totals: Map<string, number>, stopAtEnding: boolean) {
  let position: GroundPoint = { x: save.x, z: save.z };
  for (let i = 0; i < 120; i++) {
    const objective = currentObjective(save);
    if (!objective.target) return;
    const label = `${chapter(save).number} ${chapter(save).title}`;
    const target = routeTarget(save, objective.target)!;
    let seconds = pathLength(save.level, position, target, target.radius) / WALK * LOOK_AROUND;
    if (target.destination) {
      save.level = target.destination.area;
      position = target.destination.point;
    } else if (target.finale) {
      seconds += reading(endings.seal) + 10;
      totals.set(label, (totals.get(label) ?? 0) + seconds);
      if (stopAtEnding) return;
      save.ending = 'seal';
      continue;
    } else {
      position = target;
      seconds += reading(target.lines) + (target.puzzle ? PUZZLE_SECONDS : 0);
      save.progress.push(target.proof!);
      if (target.proof === 'caller') seconds += reading(coastEpilogue(save));
    }
    totals.set(label, (totals.get(label) ?? 0) + seconds);
  }
}

const totals = new Map<string, number>();
run(freshSave(), totals, false);
let sum = 0;
for (const [label, seconds] of totals) {
  sum += seconds;
  console.log(`${label.padEnd(30)} ${(seconds / 60).toFixed(1).padStart(5)} min`);
}
console.log(`${'Critical path total'.padEnd(30)} ${(sum / 60).toFixed(1).padStart(5)} min`);
console.log('Excludes optional evidence, hazard recoveries, wrong turns and puzzle retries.');
