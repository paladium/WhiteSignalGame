export const achievementList = {
  signal: { title: 'Contact', text: 'Listen to the transmission on 87.6 MHz.' },
  sealed: { title: 'Closed loop', text: 'Seal the listening chamber.' },
  warned: { title: 'Advance warning', text: 'Warn the coast.' },
  silence: { title: 'Radio silence', text: 'Finish the coast epilogue.' },
  archivist: { title: 'Archivist', text: 'Archive every optional discovery in one expedition.' },
  ghost: { title: 'Ghost in the trench', text: 'Leave the crevasse by lift without the figure ever tracking you there.' },
  thaw: { title: 'Second wind', text: 'Recover at a heated beacon after a whiteout, a fall, or an encounter.' },
  swift: { title: 'Ahead of the signal', text: 'Finish the coast epilogue in under 25 minutes of active time.' },
  witness: { title: 'Witness', text: 'Reach the hidden third outcome.' },
  loop: { title: 'Again', text: 'Begin a new cycle with your memories intact.' },
} as const;
export type AchievementId = keyof typeof achievementList;

const KEY = 'the-white-signal:achievements';

export class Achievements {
  earned = new Set<AchievementId>();

  constructor() {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY) || '[]');
      if (Array.isArray(saved)) for (const id of saved) if (id in achievementList) this.earned.add(id);
    } catch { /* Achievements are optional. */ }
  }

  /** Returns true when the achievement is new. */
  unlock(id: AchievementId) {
    if (this.earned.has(id)) return false;
    this.earned.add(id);
    try { localStorage.setItem(KEY, JSON.stringify([...this.earned])); } catch { /* Kept for this session. */ }
    return true;
  }
}
