export interface Save { level: 'outside' | 'inside'; x: number; heard: boolean; flashlight: boolean }
const KEY = 'the-white-signal:v1';
export const freshSave = (): Save => ({ level: 'outside', x: -5, heard: false, flashlight: true });
export function loadSave(): Save {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (s && ['outside','inside'].includes(s.level) && Number.isFinite(s.x) && typeof s.heard === 'boolean')
      return { level:s.level, x:Math.max(-16,Math.min(s.level === 'inside'?8:24,s.x)), heard:s.heard, flashlight:s.flashlight !== false };
  } catch { /* Storage can be unavailable in private browsing. */ }
  return freshSave();
}
export function saveGame(s: Save) { try { localStorage.setItem(KEY, JSON.stringify(s)); return true; } catch { return false; } }
