export type Difficulty = 'story' | 'normal' | 'hard';
export type Language = 'en' | 'ru';
export const actions = ['up', 'down', 'left', 'right', 'run', 'jump', 'flashlight', 'interact', 'journal', 'map'] as const;
export type Action = typeof actions[number];

export interface Settings {
  volume: number;
  textScale: number;
  captions: boolean;
  voice: boolean;
  /** Radio direction finding, or the classic amber marker and arrow. */
  navigation: 'radio' | 'marker';
  difficulty: Difficulty;
  language: Language;
  keys: Record<Action, string>;
}

export const defaultKeys: Record<Action, string> = {
  up: 'KeyW', down: 'KeyS', left: 'KeyA', right: 'KeyD', run: 'ShiftLeft',
  jump: 'Space', flashlight: 'KeyF', interact: 'KeyE', journal: 'KeyJ', map: 'KeyM',
};

// Arrow keys, Enter and the right Shift always work alongside the remappable keys.
export const fixedKeys: Partial<Record<Action, string[]>> = {
  up: ['ArrowUp'], down: ['ArrowDown'], left: ['ArrowLeft'], right: ['ArrowRight'],
  run: ['ShiftRight'], interact: ['Enter'],
};

const KEY = 'the-white-signal:settings';

export const defaultSettings = (): Settings => ({
  volume: .8, textScale: 1, captions: true, voice: true, navigation: 'radio', difficulty: 'normal',
  language: typeof navigator !== 'undefined' && navigator.language?.startsWith('ru') ? 'ru' : 'en',
  keys: { ...defaultKeys },
});

export function loadSettings(): Settings {
  const settings = defaultSettings();
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (!saved || typeof saved !== 'object') return settings;
    if (Number.isFinite(saved.volume)) settings.volume = Math.min(1, Math.max(0, saved.volume));
    if ([1, 1.15, 1.3].includes(saved.textScale)) settings.textScale = saved.textScale;
    if (typeof saved.captions === 'boolean') settings.captions = saved.captions;
    if (typeof saved.voice === 'boolean') settings.voice = saved.voice;
    if (saved.navigation === 'radio' || saved.navigation === 'marker') settings.navigation = saved.navigation;
    if (['story', 'normal', 'hard'].includes(saved.difficulty)) settings.difficulty = saved.difficulty;
    if (['en', 'ru'].includes(saved.language)) settings.language = saved.language;
    for (const action of actions) {
      if (typeof saved.keys?.[action] === 'string') settings.keys[action] = saved.keys[action];
    }
  } catch { /* Defaults work without storage. */ }
  return settings;
}

export function saveSettings(settings: Settings) {
  try { localStorage.setItem(KEY, JSON.stringify(settings)); } catch { /* Settings still apply this session. */ }
}

export function keyName(code: string) {
  return code.replace(/^Key/, '').replace(/^Digit/, '').replace(/Left$|Right$/, '').replace('Arrow', '↕ ').toUpperCase();
}
