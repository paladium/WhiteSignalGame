import { radioRoom, station, walkAreas } from '../world/layout';
import { expedition, expeditionAreas, type Area } from '../world/expedition-layout';
import { canStandAt, type GroundPoint } from './movement';
import { archive, milestones, type ArchiveId, type Coda, type Ending, type Milestone } from './progress';

export interface Save extends GroundPoint {
  level: Area;
  flashlight: boolean;
  progress: Milestone[];
  evidence: ArchiveId[];
  ending?: Ending;
  coda?: Coda;
  elapsed: number;
  /** Active time when each chapter began, keyed by chapter number. */
  splits: Record<string, number>;
  /** 0 for the first expedition; New Game+ increments it. */
  cycle: number;
}

const KEY = 'the-white-signal:v1';
const areas: readonly Area[] = ['outside', 'inside', ...expeditionAreas];

export const freshSave = (): Save => ({
  level: 'outside', ...station.spawn, flashlight: true, progress: [], evidence: [], elapsed: 0, splits: { '01': 0 }, cycle: 0,
});

export function loadSave(): Save {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || !areas.includes(saved.level) || !Number.isFinite(saved.x)) return freshSave();
    const level: Area = saved.level;
    const spawn = level === 'inside' ? radioRoom.spawn
      : level === 'outside' ? station.spawn : expedition[level].spawn;
    const area = walkAreas[level];
    const x = Math.max(area.minX, Math.min(area.maxX, saved.x));
    const z = Number.isFinite(saved.z) ? Math.max(area.minZ, Math.min(area.maxZ, saved.z)) : spawn.z;
    const position = canStandAt(x, z, area) ? { x, z } : spawn;
    const progress = milestones.filter(flag => Array.isArray(saved.progress) && saved.progress.includes(flag) ||
      flag === 'heard' && saved.heard === true);
    const evidence = (Object.keys(archive) as ArchiveId[]).filter(id =>
      Array.isArray(saved.evidence) && saved.evidence.includes(id));
    const ending = progress.includes('reverse') && (saved.ending === 'seal' || saved.ending === 'send')
      ? saved.ending : undefined;
    return {
      level, ...position, flashlight: saved.flashlight !== false, progress, evidence, ending,
      elapsed: Number.isFinite(saved.elapsed) ? Math.max(0, saved.elapsed) : 0,
      splits: Object.fromEntries(Object.entries(saved.splits ?? {}).filter(([chapter, time]) =>
        /^\d\d$/.test(chapter) && Number.isFinite(time))) as Record<string, number>,
      cycle: Number.isInteger(saved.cycle) && saved.cycle > 0 ? saved.cycle : 0,
      coda: progress.includes('caller') && ['silence', 'listen', 'witness'].includes(saved.coda) ? saved.coda : undefined,
    };
  } catch {
    return freshSave();
  }
}

export function saveGame(save: Save) {
  try {
    localStorage.setItem(KEY, JSON.stringify(save));
    return true;
  } catch {
    return false;
  }
}
