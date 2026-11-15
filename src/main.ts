import * as THREE from 'three';
import './style.css';
import { createUI, el } from './ui';
import { Input } from './systems/input';
import { Character } from './systems/character';
import { FollowCamera } from './systems/camera';
import { AudioSystem } from './systems/audio';
import { move, type GroundPoint } from './systems/movement';
import { loadSave, saveGame, freshSave, ECHO_LIMIT } from './systems/save';
import { Levels } from './world/levels';
import { walkAreas } from './world/layout';
import { expedition, expeditionAreas, isFieldArea, type Area } from './world/expedition-layout';
import { available, chapter, coastEpilogue, codaOptions, codaTitles, currentObjective, endings, has, hotspots, matchesEnding, routeTarget, type Hotspot, type Line } from './world/story';
import { archive, type Ending } from './systems/progress';
import { FieldConditions } from './systems/field';
import { Encounter } from './systems/encounter';
import { pictogram } from './world/pictograms';
import { SceneEffects } from './world/effects';
import { setLanguage, t, tf } from './i18n';
import { actions, keyName, loadSettings, saveSettings, type Action } from './systems/settings';
import { Achievements, achievementList, type AchievementId } from './systems/achievements';
import type { PadCommand } from './systems/input';
import { Voice } from './systems/voice';
import { Joystick } from './systems/joystick';
import { signalStrength } from './systems/compass';
import { YardStalker } from './systems/stalker';
import { blackout, ghostAt, sceneEvents, type Cue } from './world/events';

createUI();
const state=loadSave();
const settings = loadSettings();
const achievements = new Achievements();
const voice = new Voice();
const joystick = new Joystick(el('stickZone'), el('stickBase'), el('stickKnob'));
let renderer: THREE.WebGLRenderer;
try { renderer=new THREE.WebGLRenderer({antialias:true,powerPreference:'high-performance'}); }
catch { el('viewport').innerHTML='<p style="padding:30vh 10%;position:relative;z-index:20">The White Signal needs WebGL. Please enable hardware acceleration and reload in a supported browser.</p>'; throw new Error('WebGL unavailable'); }
renderer.setPixelRatio(Math.min(window.devicePixelRatio,1.75));
renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.12;
el('viewport').append(renderer.domElement);
renderer.domElement.setAttribute('aria-label','Snow-covered Kestrel Station. Use WASD or the arrow keys to move. Press E to interact.');
const scene=new THREE.Scene();scene.background=new THREE.Color('#152b3b');scene.fog=new THREE.FogExp2('#243f50', .009);
const levels=new Levels(scene), player=new Character(scene), camera=new FollowCamera(), input=new Input(), audio=new AudioSystem();
const effects = new SceneEffects(scene);
const stalker = new YardStalker();
const field = new FieldConditions();
const encounter = new Encounter();
const arrow = el('objectiveArrow');

type Panel = 'menu' | 'pause' | 'journal' | 'map' | 'ending' | 'settings' | 'achievements';
let panel: Panel | undefined;
let dialogue: { lines: Line[]; index: number; tag: string; finish?: () => void } | undefined;
let nearby: Hotspot | undefined;
let navigation: Hotspot | undefined;
let accumulator = 0;
let last = performance.now();
let saveTimer = 0;
let toastTimer = 0;
let clock = 0;
let stepDistance = 0;
let wasCracking = false;
let lastFieldStatus = '';
let heartbeat = 0;
let captionTimer = 0;
let titleTimer = 0;
let idleTimer = 0;
let lastChapter = '';
let settingsReturn: Panel = 'pause';
let rebinding: Action | undefined;
let wasTracking = false;
let wasStorm = false;
// Set once the caller is verified, so stepping back from the last choice doesn't repeat the puzzle.
let callerVerified = false;
const visited = new Set<Area>();
// Scene events queue cues on the simulation clock, so pauses and menus hold them.
const scheduled: { at: number; cue: Cue }[] = [];
const played = new Set<string>();
let flickerUntil = 0;
let apparition: (GroundPoint & { start: number; until: number }) | undefined;
let lastPower = 1;
let lastSpeed = 0;
let wasHighTide = false;
let mimicNoticed = false;
let areaClock = 0;
let echoTimer = 0;
let echoNoticed = false;
// Chapter 04: once the badge is out of the receiver, the trench starts to collapse.
let collapseAt: number | undefined;
let collapseRumble = 0;
const collapseSeconds = () => settings.difficulty === 'story' ? 75 : settings.difficulty === 'hard' ? 32 : 42;
const collapsing = () => state.level === 'crevasse' && has(state, 'echo') && !has(state, 'override');

function vibrate(pattern: number | number[]) {
  try { navigator.vibrate?.(pattern); } catch { /* Not every browser can vibrate. */ }
}

function runEvents() {
  for (const event of sceneEvents) {
    if (played.has(event.id) || event.area !== state.level || !event.when(state)) continue;
    played.add(event.id);
    for (const [seconds, cue] of event.cues) scheduled.push({ at: clock + seconds, cue });
  }
}

function playCue(cue: Cue) {
  switch (cue.kind) {
    case 'caption': caption(cue.text); break;
    case 'toast': toast(cue.text); break;
    case 'voice':
      caption(`${t(cue.speaker)} — ${t(cue.text)}`, 4.5);
      audio.beep(310);
      if (!audio.muted) voice.speak(cue.speaker, t(cue.text), settings.language);
      break;
    case 'flicker': flickerUntil = clock + cue.seconds; break;
    case 'apparition': apparition = { ...cue.at, start: clock, until: clock + cue.seconds }; break;
    case 'trail': effects.layTrail(cue.points); break;
    case 'stinger': audio.stinger(); break;
    case 'shake': camera.shake(.7); break;
    case 'vibrate': vibrate([60, 40, 120]); break;
  }
}

const snowy = (area: Area) => area === 'outside' || isFieldArea(area);
const exposed = isFieldArea;
const placeName = (area: Area) => t(area === 'outside' ? 'Station yard' : area === 'inside' ? 'Radio room' : expedition[area].title);

function formatTime(seconds: number) {
  const whole = Math.floor(seconds);
  return `${Math.floor(whole / 60).toString().padStart(2, '0')}:${(whole % 60).toString().padStart(2, '0')}`;
}

function toast(message: string) {
  el('toast').textContent = t(message);
  el('toast').style.opacity = '1';
  toastTimer = 5;
}

/** Text for sounds, so the game reads the same with audio off. */
function caption(text: string, seconds = 3.2) {
  if (!settings.captions) return;
  el('caption').textContent = `[${t(text)}]`;
  el('caption').classList.add('show');
  captionTimer = seconds;
}

function award(id: AchievementId) {
  if (!achievements.unlock(id)) return;
  audio.beep(880);
  setTimeout(() => toast(tf('Achievement · {0}', t(achievementList[id].title))), 900);
}

const areaSounds: Partial<Record<Area, string>> = {
  inside: 'Radio static hisses under the hum of the racks',
  annex: 'Generators drone behind the wall',
  ridge: 'Wind howls across the ridge',
  crevasse: 'Ice creaks somewhere below',
  borehole: 'A slow pulse rises from the shaft',
  coast: 'Waves break against the sea ice',
  hut: 'A radio set hums, tuned to an empty channel',
};

const barks: Partial<Record<Area, string>> = {
  quarters: 'VOSS — Six bunks. Somebody kept making the seventh.',
  annex: 'VOSS — It smells of burnt insulation and coffee.',
  ridge: 'VOSS — Three towers. Three bearings. Keep the light low out here.',
  crevasse: 'VOSS — The trench swallows sound. Not footsteps, though.',
  borehole: 'VOSS — It’s warm down here. It shouldn’t be.',
  coast: 'VOSS — The coast was supposed to be safe.',
  hut: 'VOSS — Her coffee is still warm. So is the radio.',
};

function applySettings() {
  input.bindings = settings.keys;
  field.difficulty = settings.difficulty;
  audio.setVolume(settings.volume);
  voice.enabled = settings.voice;
  voice.volume = settings.volume;
  document.documentElement.style.setProperty('--text-scale', String(settings.textScale));
  document.documentElement.lang = settings.language;
  el('caption').classList.toggle('hidden-ui', !settings.captions);
  setLanguage(settings.language);
  document.title = settings.language === 'ru' ? 'Белый сигнал' : 'The White Signal';
  document.querySelectorAll<HTMLElement>('[data-i18n]').forEach(item => { item.textContent = t(item.dataset.i18n!); });
  document.querySelectorAll<HTMLElement>('[data-key]').forEach(item => { item.textContent = keyName(settings.keys[item.dataset.key as Action]); });
}

/** Re-applies every dynamic label, for example after the language changes. */
function refreshTexts() {
  areaLabels(state.level);
  updateObjective();
  updatePrompt();
  updateFieldHud();
  showSoundStatus();
  persist();
}

function persist() {
  state.x = player.body.x;
  state.z = player.body.z;
  el('saveLabel').textContent = t(saveGame(state) ? 'PROGRESS SAVED AUTOMATICALLY' : 'LOCAL STORAGE UNAVAILABLE');
}

function placePlayer(point: GroundPoint) {
  Object.assign(player.body, { x: point.x, z: point.z, y: 0, vx: 0, vy: 0, vz: 0, grounded: true });
  player.body.facing.x = Math.SQRT1_2;
  player.body.facing.z = -Math.SQRT1_2;
  stepDistance = 0;
  player.update(0);
  camera.update(player.body, 0, state.level, true);
}

function updateObjective() {
  const objective = currentObjective(state);
  navigation = routeTarget(state, objective.target);
  el('objectiveText').textContent = state.level === 'outside' && !has(state, 'heard')
    ? t('Reach the station and listen to the radio') : tf(objective.text, ...objective.values ?? []);
  el('objectiveRoute').textContent = navigation && navigation.id !== objective.target
    ? t(navigation.label) : '';
  const current = chapter(state);
  el('chapterText').textContent = tf('CHAPTER {0} / {1}', current.number, t(current.title));
  if (current.number !== lastChapter) {
    if (!(current.number in state.splits)) state.splits[current.number] = state.elapsed;
    if (lastChapter) showTitleCard(current.number, current.title);
    lastChapter = current.number;
  }
  el('flashState').textContent = tf('◉ FLASHLIGHT {0}', t(state.flashlight ? 'ON' : 'OFF'));
  el('evidenceCount').textContent = tf('EVIDENCE {0}/{1}', state.evidence.length, Object.keys(archive).length);
  const entries = 1 + state.progress.length + state.evidence.length;
  el('journalButton').querySelector('.unread')!.textContent = String(entries);
  el('journalButton').setAttribute('aria-label', tf('Field notes, {0} entries', entries));
}

function showTitleCard(number: string, title: string) {
  el('titleCardNumber').textContent = tf('CHAPTER {0}', number);
  el('titleCardTitle').textContent = t(title);
  el('titleCard').classList.add('show');
  titleTimer = 3.4;
}

function areaLabels(area: Area) {
  el('locationTitle').textContent = (area === 'outside' ? t('Kestrel Station') : placeName(area)).toUpperCase();
  el('sceneLabel').textContent = t(area === 'outside' ? 'EXTERIOR · STATION YARD'
    : area === 'inside' ? 'INTERIOR · RADIO ROOM' : expedition[area].subtitle);
}

function changeArea(area: Area, point: GroundPoint, announce = true) {
  if (state.level === 'crevasse' && area === 'borehole' && !field.tracked) award('ghost');
  state.level = area;
  const outdoors = snowy(area);
  levels.setLevel(area);
  field.reset(area);
  wasCracking = false;
  lastFieldStatus = '';
  audio.surface(outdoors);
  audio.ambience(area === 'outside' ? 'yard' : area === 'inside' ? 'radio' : area);
  scene.background = new THREE.Color(outdoors ? '#152b3b' : '#101c25');
  scene.fog = new THREE.FogExp2(outdoors ? '#243f50' : '#15232b', exposed(area) ? .012 : outdoors ? .009 : .0045);
  areaLabels(area);
  el('worldCaption').hidden = area !== 'outside';
  const dark = blackout(state);
  el('fieldMeters').hidden = !exposed(area) && !dark;
  el('warmth').parentElement!.hidden = dark;
  el('battery').parentElement!.hidden = dark || settings.difficulty === 'story';
  scheduled.length = 0;
  apparition = undefined;
  effects.layTrail([]);
  stalker.reset();
  lastPower = -1;
  collapseAt = undefined;
  wasHighTide = false;
  areaClock = 0;
  el('game').classList.toggle('indoors', !outdoors);
  nearby = undefined;
  placePlayer(point);
  updateObjective();
  updateFieldHud();
  updateScene(0);
  updatePrompt();
  if (announce) {
    persist();
    audio.beep(330);
    toast(placeName(area));
    const sound = areaSounds[area];
    if (sound) caption(sound);
    const bark = barks[area];
    if (bark && !visited.has(area)) setTimeout(() => { if (state.level === area && !dialogue) toast(bark); }, 2600);
  }
  visited.add(area);
  runEvents();
}

function addParagraph(content: HTMLElement, text: string, className = '') {
  const p = document.createElement('p');
  p.textContent = t(text);
  p.className = className;
  content.append(p);
}

function addHeading(content: HTMLElement, text: string) {
  const heading = document.createElement('h3');
  heading.textContent = t(text);
  content.append(heading);
}

const areaLocks: Partial<Record<Area, Hotspot['requires']>> = {
  quarters: ['heard'], annex: ['locker'], ridge: ['dispatch'], crevasse: ['triangulated'], borehole: ['override'],
};

function setPanel(next?: Panel) {
  panel = next;
  input.clear();
  el('overlay').hidden = !next;
  el('pauseButton').setAttribute('aria-label', t(next ? 'Resume game' : 'Pause game'));
  updatePrompt();
  audio.pause(document.hidden || Boolean(next && next !== 'ending'));
  if (next && next !== 'ending') voice.stop();
  if (!next) {
    last = performance.now();
    (document.activeElement as HTMLElement | null)?.blur();
    return;
  }

  el('panelTitle').textContent = t({
    menu: 'The White Signal', pause: 'Expedition paused', journal: 'Field notes', map: 'Expedition map',
    ending: 'Expedition complete', settings: 'Settings', achievements: 'Achievements',
  }[next]);
  const content = el('panelContent');
  const actionsBox = el('panelActions');
  content.replaceChildren();
  actionsBox.replaceChildren();
  const fixedButtons = next !== 'menu' && next !== 'settings' && next !== 'achievements';
  el('resumeButton').classList.toggle('hidden-ui', !fixedButtons);
  el('restartButton').classList.toggle('hidden-ui', next !== 'pause');
  const action = (label: string, run: () => void) => {
    const button = document.createElement('button');
    button.textContent = t(label);
    button.addEventListener('click', run);
    actionsBox.append(button);
    return button;
  };
  const k = (name: Action) => keyName(settings.keys[name]);
  if (next === 'menu') {
    addParagraph(content, 'Antarctica, August 17, 1987. Kestrel Station stopped answering at 03:14 UTC.');
    addParagraph(content, '🎧 Best with headphones: the radio, the wind and the figures are heard before they are seen.', 'map-route');
    if (state.cycle) addParagraph(content, tf('Cycle {0}. Some of this will feel familiar.', state.cycle + 1), 'map-route');
    const started = state.elapsed > 0 || state.progress.length > 0;
    if (started) action(tf('CONTINUE · {0} · CHAPTER {1}', formatTime(state.elapsed), chapter(state).number), () => setPanel());
    action(started ? 'NEW EXPEDITION' : 'BEGIN EXPEDITION', () => {
      if (started && !window.confirm(t('Start over and clear this checkpoint?'))) return;
      startExpedition(0);
    });
    if (has(state, 'caller')) action('NEW CYCLE · KEEP YOUR MEMORIES', () => startExpedition(state.cycle + 1));
    action('SETTINGS', () => { settingsReturn = 'menu'; setPanel('settings'); });
    action('ACHIEVEMENTS', () => { settingsReturn = 'menu'; setPanel('achievements'); });
  } else if (next === 'settings') {
    const row = (label: string, control: HTMLElement) => {
      const line = document.createElement('label');
      line.className = 'settings-row';
      line.append(t(label), control);
      content.append(line);
    };
    const toggle = (label: string, value: () => string, change: () => void) => {
      const button = document.createElement('button');
      button.textContent = t(value());
      button.addEventListener('click', () => {
        const languageBefore = settings.language;
        change();
        saveSettings(settings);
        applySettings();
        if (settings.language !== languageBefore) { refreshTexts(); setPanel('settings'); return; }
        button.textContent = t(value());
      });
      row(label, button);
      return button;
    };
    const volume = document.createElement('input');
    volume.type = 'range';
    volume.min = '0'; volume.max = '1'; volume.step = '.05';
    volume.value = String(settings.volume);
    volume.addEventListener('input', () => { settings.volume = Number(volume.value); saveSettings(settings); applySettings(); });
    row('Volume', volume);
    toggle('Text size', () => `${Math.round(settings.textScale * 100)}%`, () => {
      settings.textScale = settings.textScale === 1 ? 1.15 : settings.textScale === 1.15 ? 1.3 : 1;
    });
    toggle('Sound captions', () => settings.captions ? 'ON' : 'OFF', () => { settings.captions = !settings.captions; });
    toggle('Navigation', () => settings.navigation === 'radio' ? 'RADIO · sweep to find the signal' : 'MARKER · amber arrow', () => {
      settings.navigation = settings.navigation === 'radio' ? 'marker' : 'radio';
    });
    if (voice.available) toggle('Voice-over', () => settings.voice ? 'ON' : 'OFF', () => { settings.voice = !settings.voice; if (!settings.voice) voice.stop(); });
    toggle('Difficulty', () => ({ story: 'STORY · no capture, mild cold', normal: 'NORMAL', hard: 'HARD · colder, sharper ears' })[settings.difficulty], () => {
      settings.difficulty = settings.difficulty === 'normal' ? 'hard' : settings.difficulty === 'hard' ? 'story' : 'normal';
    });
    toggle('Language', () => settings.language === 'ru' ? 'РУССКИЙ' : 'ENGLISH', () => {
      settings.language = settings.language === 'en' ? 'ru' : 'en';
    });
    addHeading(content, 'Keys · click, then press a key');
    for (const name of actions) {
      const button = toggle(name.toUpperCase(), () => rebinding === name ? 'PRESS A KEY…' : k(name), () => { rebinding = name; });
      button.dataset.action = name;
    }
    addParagraph(content, 'Arrow keys and Enter always work. Gamepad: stick or D-pad to move, A interact, B jump, X flashlight, Y field notes, shoulder buttons run, Back map, Start pause.');
    action('BACK', () => setPanel(settingsReturn));
  } else if (next === 'achievements') {
    for (const [id, entry] of Object.entries(achievementList)) {
      const p = document.createElement('p');
      p.className = `achievement${achievements.earned.has(id as AchievementId) ? ' earned' : ''}`;
      const title = document.createElement('strong');
      title.textContent = `${achievements.earned.has(id as AchievementId) ? '◆' : '◇'} ${t(entry.title)}`;
      p.append(title, ` — ${t(entry.text)}`);
      content.append(p);
    }
    action('BACK', () => setPanel(settingsReturn));
  } else if (next === 'pause') {
    addParagraph(content, tf('{0}{1}{2}{3} or arrows to move · {4} to run · {5} to jump · {6} for flashlight · {7} to interact',
      k('up'), k('left'), k('down'), k('right'), k('run'), k('jump'), k('flashlight'), k('interact')));
    addParagraph(content, tf('{0} opens Field Notes. {1} shows the route to your objective. Use the sound button to mute or restore footsteps and signal tones.', k('journal'), k('map')));
    addSplits(content);
    action('SETTINGS', () => { settingsReturn = 'pause'; setPanel('settings'); });
    action('ACHIEVEMENTS', () => { settingsReturn = 'pause'; setPanel('achievements'); });
    action('MAIN MENU', () => setPanel('menu'));
  } else if (next === 'journal') {
    addHeading(content, 'August 17, 1987');
    addParagraph(content, state.cycle
      ? 'Kestrel stopped answering at 03:14. Again. The handwriting in these notes is already mine.'
      : 'Kestrel stopped answering at 03:14. No distress call. Just twelve seconds of white noise.');
    for (const spot of [...hotspots].reverse()) {
      if (!spot.proof || !has(state, spot.proof) || !matchesEnding(state, spot)) continue;
      addHeading(content, spot.label);
      for (const [speaker, line] of spot.lines ?? []) addParagraph(content, `${t(speaker)} — ${t(line)}`);
    }
    for (const id of state.evidence) {
      addHeading(content, archive[id].title);
      content.lastElementChild!.prepend(pictogram(id));
      addParagraph(content, archive[id].text);
    }
  } else if (next === 'map') {
    addParagraph(content, tf('You are here · {0}', placeName(state.level)));
    const objective = currentObjective(state);
    addParagraph(content, tf(objective.text, ...objective.values ?? []), 'map-route');
    if (navigation) addParagraph(content, tf(settings.navigation === 'radio' ? 'Sweep for the signal · {0}' : 'Follow the amber marker · {0}', t(navigation.label)));
    const list = document.createElement('ul');
    list.className = 'map-list';
    for (const area of ['outside', 'inside', ...expeditionAreas] as const) {
      const row = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = placeName(area);
      const status = document.createElement('span');
      const locked = area === 'coast' || area === 'hut' ? !state.ending : areaLocks[area]?.every(flag => has(state, flag)) === false;
      status.textContent = t(area === state.level ? 'YOU ARE HERE' : locked ? 'LOCKED' : 'OPEN');
      row.append(name, status);
      list.append(row);
    }
    content.append(list);
  } else {
    const epilogue = has(state, 'caller');
    addParagraph(content, state.ending === 'seal' ? 'Ending · The chamber is sealed' : 'Ending · The warning reaches the coast');
    if (epilogue) addParagraph(content, codaTitles[state.coda ?? 'silence']);
    addParagraph(content, tf('{0} active time · {1} of {2} optional discoveries archived', formatTime(state.elapsed), state.evidence.length, Object.keys(archive).length));
    addParagraph(content, epilogue
      ? 'Return to the station or the coast to look for any evidence you missed.'
      : 'Chapter 06 is open. Something on the coast is still answering. Take the lift up and follow the erased road from the crevasse.');
    addSplits(content);
    if (epilogue) action('NEW CYCLE · KEEP YOUR MEMORIES', () => startExpedition(state.cycle + 1));
  }
  (content.querySelector<HTMLElement>('button, input') ?? actionsBox.querySelector('button') ?? el('resumeButton')).focus();
  content.parentElement!.scrollTop = 0;
}

function addSplits(content: HTMLElement) {
  const chapters = Object.entries(state.splits).sort(([a], [b]) => a.localeCompare(b));
  if (!chapters.length) return;
  addHeading(content, 'Chapter splits');
  const table = document.createElement('table');
  table.className = 'splits';
  chapters.forEach(([number, start], index) => {
    const end = chapters[index + 1]?.[1] ?? state.elapsed;
    const row = table.insertRow();
    row.insertCell().textContent = tf('Chapter {0}', number);
    row.insertCell().textContent = formatTime(end - start);
  });
  const total = table.insertRow();
  total.insertCell().textContent = t('Total');
  total.insertCell().textContent = formatTime(state.elapsed);
  content.append(table);
}

function startExpedition(cycle: number) {
  // A new cycle remembers the route you just walked; a fresh expedition forgets everything.
  const remembered = cycle ? state.echoes : {};
  Object.assign(state, freshSave(), { ending: undefined, cycle, pastEchoes: remembered });
  encounter.close();
  dialogue = undefined;
  el('dialogue').hidden = true;
  voice.stop();
  lastChapter = '';
  callerVerified = false;
  visited.clear();
  if (cycle) award('loop');
  changeArea(state.level, state);
  setPanel();
}

function togglePanel(next: Panel) {
  setPanel(panel === next ? undefined : next);
}

function beginDialogue(lines: Line[], tag: string, finish?: () => void) {
  input.clear();
  player.body.vx = 0;
  player.body.vz = 0;
  dialogue = { lines, index: -1, tag, finish };
  advanceDialogue();
  updatePrompt();
}

function advanceDialogue() {
  if (!dialogue || panel || encounter.open) return;
  dialogue.index++;
  const line = dialogue.lines[dialogue.index];
  if (!line) {
    const finish = dialogue.finish;
    dialogue = undefined;
    el('dialogue').hidden = true;
    voice.stop();
    finish?.();
    updatePrompt();
    return;
  }
  const [speaker, text] = line;
  el('dialogue').hidden = false;
  el('dialogueTag').textContent = t(dialogue.tag);
  el('speaker').textContent = t(speaker);
  el('dialogueText').textContent = t(text);
  el('nextDialogue').firstChild!.textContent = `${t(dialogue.index + 1 === dialogue.lines.length ? 'ARCHIVE' : 'CONTINUE')} `;
  el('nextDialogue').querySelector('kbd')!.textContent = keyName(settings.keys.interact);
  audio.beep(speaker.includes('VOICE') ? 310 : 460);
  if (!audio.muted) voice.speak(speaker, t(text), settings.language);
}

function complete(spot: Hotspot) {
  if (spot.proof === 'caller' && !has(state, 'caller')) { callerVerified = true; chooseCoda(); return; }
  if (spot.proof && !has(state, spot.proof)) state.progress.push(spot.proof);
  if (spot.record && !state.evidence.includes(spot.record)) state.evidence.push(spot.record);
  if (spot.proof === 'heard') award('signal');
  // Story beats that change the place itself, right after the step that causes them.
  if (spot.proof === 'triangulated') {
    field.forceStorm(22);
    scheduled.push({ at: clock + .4, cue: { kind: 'caption', text: 'A wall of snow rolls over the ridge' } });
    scheduled.push({ at: clock + .4, cue: { kind: 'shake' } });
    scheduled.push({ at: clock + 1.2, cue: { kind: 'voice', speaker: 'UNKNOWN VOICE', text: 'You found me. Now find your way back.' } });
  }
  if (spot.proof === 'east') {
    scheduled.push({ at: clock + .8, cue: { kind: 'apparition', at: { x: 21, z: -6 }, seconds: 2 } });
    scheduled.push({ at: clock + .8, cue: { kind: 'flicker', seconds: 1.2 } });
  }
  if (state.evidence.length === Object.keys(archive).length) award('archivist');

  updateObjective();
  persist();
  if (spot.proof === 'heard') toast('The crew quarters are now accessible.');
  else if (spot.record) toast('Evidence archived in Field Notes.');
  else if (spot.proof) toast('Objective updated.');
}

/** The last call in Chapter 06: a choice, then the epilogue it leads to. */
function chooseCoda() {
  const options = codaOptions(state);
  encounter.show(t('One call left'), t('The line is still open. Whatever you do next, the signal will remember it.'), options.map(option => t(option.label)), choice => {
    encounter.close();
    state.coda = options[choice].id;
    state.progress.push('caller');
    award(state.coda === 'witness' ? 'witness' : 'silence');
    if (state.elapsed < 25 * 60) award('swift');
    updateObjective();
    persist();
    beginDialogue(coastEpilogue(state), 'HALVARD COAST · LAST TRANSMISSION', () => setPanel('ending'));
  });
}

function tell(spot: Hotspot) {
  const entry = spot.record && archive[spot.record];
  const lines: Line[] = entry ? [[entry.title.toUpperCase(), entry.text]]
    : [...spot.lines ?? [], ...state.cycle ? spot.cycleLines ?? [] : []];
  if (!lines.length) { complete(spot); return; }
  const tag = spot.id === 'terminal' ? 'INCOMING TRANSMISSION · 87.6 MHz' : spot.area === 'coast' ? 'HALVARD COAST · FIELD RECORD' : 'KESTREL · FIELD RECORD';
  beginDialogue(lines, tag, () => complete(spot));
}

function finishExpedition(ending: Ending) {
  encounter.close();
  beginDialogue(endings[ending], 'BOREHOLE NINE · FINAL TRANSMISSION', () => {
    state.ending = ending;
    award(ending === 'seal' ? 'sealed' : 'warned');
    updateObjective();
    persist();
    setPanel('ending');
  });
}

function interact() {
  if (panel || encounter.open) return;
  if (dialogue) { advanceDialogue(); return; }
  if (!nearby || !available(state, nearby)) return;
  const spot = nearby;
  if (spot.needsLight && !state.flashlight) {
    toast('Too dark to see the floor. Switch on your flashlight.');
    return;
  }
  if (spot.destination) {
    changeArea(spot.destination.area, spot.destination.point);
  } else if (spot.finale) {
    encounter.show(t('One transmission left'), t('The signal is contained for now. What should your last transmission do?'), [t('Seal the chamber'), t('Warn the coast')], choice =>
      finishExpedition(choice === 0 ? 'seal' : 'send'));
  } else if (spot.id === 'caller' && callerVerified) {
    chooseCoda();
  } else if (spot.puzzle) {
    const source = spot.puzzle.note && hotspots.find(item => item.id === spot.puzzle!.note!.spot);
    encounter.puzzle(spot.puzzle, choice => audio.beep(spot.id === 'echo' ? [240, 420, 620][choice] : 380 + choice * 85), () => tell(spot),
      closeness => audio.tuning(closeness), source?.lines?.[spot.puzzle.note!.line]);
  } else tell(spot);
}

function updatePrompt() {
  const wall = Boolean(panel || encounter.open);
  const show = nearby && !dialogue && !wall;
  el('interact').hidden = !show;
  if (show) el('interactText').textContent = t(nearby!.label);
  el('interact').querySelector('kbd')!.textContent = keyName(settings.keys.interact);
  const action = el<HTMLButtonElement>('touchAction');
  action.disabled = wall || (!nearby && !dialogue);
  action.textContent = t(dialogue ? 'NEXT' : nearby?.destination ? 'ENTER' : 'USE');
}

function updateFieldHud() {
  el<HTMLMeterElement>('warmth').value = field.warm;
  el<HTMLMeterElement>('attention').value = field.alert * 100;
  el('warmthValue').textContent = field.shelter ? t('HEATING') : `${Math.round(field.warm)}%`;
  el('attentionValue').textContent = t(field.alert > .50 ? 'TRACKED' : field.alert > .12 ? 'HEARD' : 'QUIET');
  el('whiteout').style.opacity = String(Math.max(0, (37 - field.warm) / 77, field.storm * .35));
  el<HTMLMeterElement>('battery').value = field.battery;
  el('batteryValue').textContent = `${Math.round(field.battery)}%`;
}

function updateScene(dt: number) {
  const { x, z } = player.body;
  player.update(dt);
  levels.update(dt * (1 + field.storm * 2.5), x, z);
  camera.update(player.body, dt, state.level);
  const dark = blackout(state);
  if (state.level === 'outside') {
    // Station lights stutter during a flicker cue and stay off in the blackout.
    const power = clock < flickerUntil ? (Math.sin(clock * 41) > .2 ? .12 : 1) : dark ? 0 : 1;
    if (power !== lastPower) { levels.setPower(power); lastPower = power; }
  }
  const ghostVisible = state.level === 'quarters' && has(state, 'manifest') && !has(state, 'footprints');
  let ghost: (GroundPoint & { opacity: number }) | undefined;
  if (ghostVisible) {
    const point = ghostAt(clock);
    const dx = point.x - x, dz = point.z - z, range = Math.hypot(dx, dz);
    const facing = (dx * player.body.facing.x + dz * player.body.facing.z) / (range || 1);
    const lit = state.flashlight && range < 8.5 && facing > .82;
    ghost = { ...point, opacity: point.fade * (lit ? .62 : .05) };
  }
  // New Game+: last cycle's Voss walks his old route through this area.
  const past = state.cycle ? state.pastEchoes[state.level] : undefined;
  if (!ghost && past && past.length >= 4) {
    const step = areaClock / .5;
    const index = Math.floor(step);
    if (index < past.length / 2 - 1) {
      const blend = step - index;
      const ex = past[index * 2] + (past[index * 2 + 2] - past[index * 2]) * blend;
      const ez = past[index * 2 + 1] + (past[index * 2 + 3] - past[index * 2 + 1]) * blend;
      ghost = { x: ex, z: ez, opacity: .32 + Math.sin(clock * 6) * .04 };
      if (!echoNoticed && Math.hypot(ex - x, ez - z) < 10) {
        echoNoticed = true;
        // Queued, so the area-name toast on arrival doesn't cover it.
        scheduled.push({ at: clock + 2.5, cue: { kind: 'toast', text: 'VOSS — That’s me. The last time I came through here.' } });
      }
    }
  }
  const sighting = apparition && clock < apparition.until
    ? { ...apparition, opacity: .85 * Math.min(1, (clock - apparition.start) / .3, (apparition.until - clock) / .5) } : undefined;
  effects.breathe(player.body, dt, snowy(state.level), lastSpeed > 3.5);
  effects.update(clock, player.body, {
    ghost, apparition: sighting, flicker: clock < flickerUntil,
    tide: state.level === 'coast' ? Number(field.highTide) : undefined,
    flashlight: state.flashlight,
    marker: navigation && !dialogue && !encounter.open && (settings.navigation === 'marker' ||
      Math.hypot(navigation.x - x, navigation.z - z) < 4) ? navigation : undefined,
    showPrints: exposed(state.level), prints: field.prints,
    figure: exposed(state.level) ? field.figure : dark ? stalker.figure : undefined,
    alert: exposed(state.level) ? field.alert : dark ? stalker.alert : 0,
  });
  const radio = settings.navigation === 'radio';
  arrow.hidden = !navigation || radio;
  el('signalHud').hidden = !navigation || !radio;
  if (navigation) {
    const dx = navigation.x - x;
    const dz = navigation.z - z;
    const range = Math.hypot(dx, dz);
    const angle = Math.atan2((dx + dz) / Math.sqrt(3), dx - dz);
    arrow.style.transform = `rotate(${angle}rad)`;
    const distance = el('objectiveDistance');
    const left = collapseAt !== undefined ? Math.max(0, Math.ceil(collapseAt - clock)) : undefined;
    const readout = left !== undefined ? tf('COLLAPSE IN {0} S', left)
      : range < 1.7 ? t('NEARBY') : radio ? '' : tf('{0} M', Math.round(range));
    if (distance.textContent !== readout) distance.textContent = readout;
    if (radio) {
      const strength = signalStrength(player.body, navigation);
      el('signalHud').querySelectorAll('i').forEach((bar, i) => bar.classList.toggle('on', i < Math.round(strength * 8)));
      el('signalHud').classList.toggle('locked', strength > .8);
      audio.compass(dialogue || encounter.open ? null : strength, dt);
    } else audio.compass(null, dt);
  } else {
    el('objectiveDistance').textContent = '';
    audio.compass(null, dt);
  }
  levels.terminalLight.intensity = 5 + Math.sin(clock * 3) * .4;
}

function fixed(dt: number) {
  input.touchStick = encounter.open ? { x: 0, y: 0 } : { x: joystick.x, y: joystick.y };
  if (!has(state, 'caller')) state.elapsed += dt;
  clock += dt;
  if (input.pressed('flashlight') && !encounter.open) {
    if (!state.flashlight && exposed(state.level) && field.battery <= 0) toast('Battery flat. Recharge at a heated beacon.');
    else {
      state.flashlight = !state.flashlight;
      updateObjective();
      audio.beep(240);
    }
  }
  if (state.flashlight && exposed(state.level) && field.battery <= 0) {
    state.flashlight = false;
    updateObjective();
    toast('Your flashlight died. Heated beacons recharge it.');
    caption('Flashlight clicks off');
  }

  const before = { x: player.body.x, z: player.body.z };
  const grounded = player.body.grounded;
  const stopped = Boolean(dialogue || encounter.open);
  move(player.body, {
    right: stopped ? 0 : input.right,
    down: stopped ? 0 : input.down,
    run: input.held('run'),
    jump: input.pressed('jump') && !stopped,
  }, dt, walkAreas[state.level]);
  const actualDistance = Math.hypot(player.body.x - before.x, player.body.z - before.z);
  const speed = actualDistance / dt;
  lastSpeed = speed;
  areaClock += dt;
  // Record this cycle's route for the next one.
  echoTimer += dt;
  if (echoTimer >= .5) {
    echoTimer = 0;
    const route = state.echoes[state.level] ??= [];
    if (route.length < ECHO_LIMIT * 2 && speed > .2) route.push(Math.round(player.body.x * 10) / 10, Math.round(player.body.z * 10) / 10);
  }
  for (let i = scheduled.length - 1; i >= 0; i--) {
    if (scheduled[i].at > clock) continue;
    const [{ cue }] = scheduled.splice(i, 1);
    playCue(cue);
  }
  if (player.body.grounded) {
    const surface = snowy(state.level) ? 'snow' : 'floor';
    if (!grounded) {
      audio.step(surface, 1.2, true);
      stepDistance = 0;
    } else if (speed > .27) {
      stepDistance += actualDistance;
      const stride = speed > 3.5 ? 1.23 : .89;
      if (stepDistance >= stride) {
        stepDistance -= stride;
        audio.step(surface, speed > 3.5 ? 1.03 : .74);
      }
    } else stepDistance = 0;
  }

  if (!stopped && exposed(state.level)) {
    const result = field.tick(state.level, player.body, speed, state.flashlight, dt);
    const cracking = field.ice > 0;
    if (cracking && !wasCracking) {
      audio.step('snow', 1.3);
      toast('Thin ice cracking. Jump or move back.');
      caption('Ice cracking underfoot');
      camera.shake(.35, .4);
      vibrate(50);
    }
    const storming = field.storm > .4;
    if (storming !== wasStorm) {
      toast(storming ? 'Storm gust. Colder, but the wind hides your steps.' : 'The gust passes.');
      caption(storming ? 'Wind rising to a roar' : 'Wind dropping');
      wasStorm = storming;
    }
    audio.gust(field.storm);
    if (state.level === 'coast' && field.highTide !== wasHighTide) {
      wasHighTide = field.highTide;
      toast(wasHighTide ? 'The tide is coming in. The sea ice won’t hold.' : 'The tide is going out. The ice holds again.');
      caption(wasHighTide ? 'Water rushes under the ice' : 'The water drains away with a hiss');
    }
    if (field.tracking && !wasTracking) caption('Slow footsteps, following your trail');
    if (field.mimicking && !mimicNoticed && field.figure && Math.hypot(field.figure.x - player.body.x, field.figure.z - player.body.z) < 9) {
      mimicNoticed = true;
      toast('VOSS — It stopped when I stopped. It’s copying me.');
    }
    wasTracking = field.tracking;
    wasCracking = cracking;
    if (result) {
      placePlayer(result.checkpoint);
      toast(result.message);
      camera.shake(1, .7);
      vibrate([120, 60, 220]);
      award('thaw');
      persist();
    }
    const status = field.shelter ? 'heater' : field.alert > .50 ? 'alert' : field.warm < 26 ? 'cold' : '';
    if (!result && status !== lastFieldStatus) {
      if (status === 'heater') toast('Heated beacon · Warmth recovering');
      if (status === 'alert') { audio.beep(130); toast('Something noticed you. Slow down, switch off your light, or reach a beacon.'); }
      if (status === 'cold') toast('Warmth low. Find a heated beacon.');
    }
    lastFieldStatus = status;
    // The heartbeat starts once the figure hears you and quickens as it closes in.
    heartbeat -= dt;
    if (field.alert > .12 && !field.shelter && heartbeat <= 0) {
      if (heartbeat < -1.5) caption('Your heartbeat, loud in your ears');
      audio.heartbeat(field.alert);
      heartbeat = 1.25 - field.alert * .7;
    }
    updateFieldHud();
  }

  if (collapsing() && !dialogue) {
    if (collapseAt === undefined) {
      collapseAt = clock + collapseSeconds();
      audio.stinger();
      camera.shake(.8, .8);
      vibrate([100, 50, 100]);
      caption('The trench groans. Ice is breaking up behind you');
      toast('The trench is collapsing. Reach the lift override before it goes.');
    }
    collapseRumble -= dt;
    if (collapseRumble <= 0) {
      collapseRumble = 2.5 + Math.random() * 2;
      camera.shake(.3, .4);
      audio.step('snow', 1.4, true);
    }
    if (clock >= collapseAt) {
      placePlayer({ x: 5.5, z: -3.3 });
      toast('The ice gave way. You hauled yourself back up by the heater. Try again.');
      camera.shake(1.1, .8);
      vibrate([150, 60, 250]);
      audio.stinger();
      collapseAt = clock + collapseSeconds();
      persist();
    }
  } else if (!collapsing()) collapseAt = undefined;

  if (!stopped && blackout(state)) {
    stalker.difficulty = settings.difficulty;
    const caught = stalker.tick(player.body, speed, state.flashlight, dt);
    if (caught) {
      placePlayer(caught.checkpoint);
      toast('It caught you in the dark. You came to by a lit door.');
      camera.shake(1, .7);
      vibrate([120, 60, 220]);
      audio.stinger();
      award('thaw');
      persist();
    }
    const status = stalker.safe ? 'light' : stalker.alert > .45 ? 'alert' : '';
    if (!caught && status !== lastFieldStatus) {
      if (status === 'light') toast('Lamplight · It won’t step into the light');
      if (status === 'alert') { audio.beep(130); vibrate(80); toast('It heard you. Freeze, kill your light, or get to a lit door.'); }
    }
    lastFieldStatus = status;
    heartbeat -= dt;
    if (stalker.alert > .12 && !stalker.safe && heartbeat <= 0) {
      audio.heartbeat(stalker.alert);
      heartbeat = 1.25 - stalker.alert * .7;
    }
    el<HTMLMeterElement>('attention').value = stalker.alert * 100;
    el('attentionValue').textContent = t(stalker.safe ? 'SAFE' : stalker.alert > .45 ? 'TRACKED' : stalker.alert > .12 ? 'HEARD' : 'QUIET');
  }

  nearby = undefined;
  if (!stopped && player.body.y < .6) {
    let nearest = Infinity;
    for (const spot of hotspots) {
      if (spot.area !== state.level || !available(state, spot)) continue;
      const distance = Math.hypot(player.body.x - spot.x, player.body.z - spot.z);
      if (distance < spot.radius && distance < nearest) { nearby = spot; nearest = distance; }
    }
  }
  if (input.pressed('interact')) interact();
  if (input.pressed('journal')) togglePanel('journal');
  if (input.pressed('map')) togglePanel('map');
  // A gentle nudge for players who stop moving for a long time.
  idleTimer = speed > .2 || dialogue || encounter.open ? 0 : idleTimer + dt;
  if (idleTimer > 50) {
    idleTimer = 0;
    toast(tf('VOSS — Where was I headed? ({0}: map)', keyName(settings.keys.map)));
  }
  updatePrompt();
  updateScene(dt);

  saveTimer += dt;
  if (saveTimer >= 5) { persist(); saveTimer = 0; }
  if (toastTimer > 0) {
    toastTimer -= dt;
    if (toastTimer <= 0) el('toast').style.opacity = '0';
  }
  if (captionTimer > 0) {
    captionTimer -= dt;
    if (captionTimer <= 0) el('caption').classList.remove('show');
  }
  if (titleTimer > 0) {
    titleTimer -= dt;
    if (titleTimer <= 0) el('titleCard').classList.remove('show');
  }
}

el('interactButton').addEventListener('click', interact);
el('nextDialogue').addEventListener('click', advanceDialogue);
el('exitPuzzle').addEventListener('click', () => encounter.close());
el('pauseButton').addEventListener('click', () => togglePanel('pause'));
el('journalButton').addEventListener('click', () => togglePanel('journal'));
el('mapButton').addEventListener('click', () => togglePanel('map'));
el('resumeButton').addEventListener('click', () => setPanel());
const soundButton = el('soundButton');
const soundPreference = 'the-white-signal:sound';
try { audio.muted = localStorage.getItem(soundPreference) === 'off'; }
catch { audio.muted = false; }
function showSoundStatus() {
  el('soundLabel').textContent = t(audio.muted ? 'SOUND OFF' : 'SOUND ON');
  soundButton.setAttribute('aria-label', t(audio.muted ? 'Enable audio' : 'Mute audio'));
}
showSoundStatus();
function enableSoundOnInput(event: Event) {
  if (!event.isTrusted) return;
  window.removeEventListener('keydown', enableSoundOnInput);
  window.removeEventListener('pointerdown', enableSoundOnInput);
  audio.start();
}
window.addEventListener('keydown', enableSoundOnInput);
window.addEventListener('pointerdown', enableSoundOnInput);
soundButton.addEventListener('click', () => {
  audio.toggle();
  if (audio.muted) voice.stop();
  try { localStorage.setItem(soundPreference, audio.muted ? 'off' : 'on'); } catch { /* Audio still works without storage. */ }
  showSoundStatus();
});
el('restartButton').addEventListener('click', () => {
  if (!window.confirm(t('Restart the expedition and clear this checkpoint?'))) return;
  startExpedition(0);
});

function back() {
  if (panel === 'settings' || panel === 'achievements') setPanel(settingsReturn);
  else if (panel === 'menu') return;
  else if (panel) setPanel();
  else if (encounter.open) encounter.close();
  else togglePanel('pause');
}

// Capture phase, so a key being rebound never also triggers its old action.
window.addEventListener('keydown', event => {
  if (!rebinding) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  if (event.code !== 'Escape') {
    // A key used by another action swaps over, so no two actions share a key.
    const clash = actions.find(name => name !== rebinding && settings.keys[name] === event.code);
    if (clash) settings.keys[clash] = settings.keys[rebinding];
    settings.keys[rebinding] = event.code;
    saveSettings(settings);
    applySettings();
  }
  rebinding = undefined;
  setPanel('settings');
}, true);

window.addEventListener('keydown', event => {
  if (event.repeat) return;
  if (event.code === 'Escape') {
    event.preventDefault();
    back();
    return;
  }
  // The journal and map keys close their own panel and switch between the two.
  if (panel === 'journal' || panel === 'map') {
    if (input.matches('journal', event.code)) togglePanel('journal');
    else if (input.matches('map', event.code)) togglePanel('map');
  }
  if (!panel && encounter.open && /^Digit[1-9]$/.test(event.code)) encounter.press(Number(event.key) - 1);
});

// Gamepad focus moves between the buttons of whichever menu or puzzle is open.
input.onPad = (command: PadCommand) => {
  if (command === 'pause') {
    if (panel === 'pause') setPanel();
    else if (!panel && !encounter.open) setPanel('pause');
    return;
  }
  if (command === 'back') { back(); return; }
  const container = panel ? el('overlay') : el('puzzle');
  const focusable = Array.from(container.querySelectorAll<HTMLElement>('button:not([disabled]):not(.hidden-ui), input'))
    .filter(item => item.offsetParent !== null);
  const active = document.activeElement as HTMLElement | null;
  if (command === 'confirm') {
    (active && focusable.includes(active) ? active : focusable[0])?.click();
    return;
  }
  if (active instanceof HTMLInputElement && active.type === 'range' && (command === 'left' || command === 'right')) {
    if (command === 'left') active.stepDown(); else active.stepUp();
    active.dispatchEvent(new Event('input'));
    return;
  }
  const index = active ? focusable.indexOf(active) : -1;
  const step = command === 'up' || command === 'left' ? -1 : 1;
  focusable[(index + step + focusable.length) % focusable.length]?.focus();
};
document.addEventListener('visibilitychange', () => {
  input.clear();
  accumulator = 0;
  last = performance.now();
  if (document.hidden) { persist(); voice.stop(); }
  audio.pause(document.hidden || Boolean(panel));
});
window.addEventListener('pagehide', persist);

function resize() {
  const viewport = el('viewport');
  renderer.setSize(viewport.clientWidth, viewport.clientHeight);
  camera.resize(viewport.clientWidth, viewport.clientHeight);
  camera.update(player.body, 0, state.level, true);
}
window.addEventListener('resize', resize);

function frame(now: number) {
  requestAnimationFrame(frame);
  const delta = Math.min((now - last) / 1000, .1);
  last = now;
  if (document.hidden) return;
  input.pollGamepad(Boolean(panel || encounter.open));
  if (!panel) {
    accumulator += delta;
    while (accumulator >= 1 / 60) { fixed(1 / 60); accumulator -= 1 / 60; }
  }
  el('elapsed').textContent = formatTime(state.elapsed);
  renderer.render(scene, camera.camera);
}

// Development-only hooks for browser checks. Vite strips this block from production builds.
if (import.meta.env.DEV) {
  void import('./debug').then(module => module.installDebugOverlay(scene, state));
  Object.assign(window, { whiteSignal: {
    state,
    go: (area: Area, x: number, z: number) => changeArea(area, { x, z }),
    close: () => setPanel(),
    field,
    body: () => player.body,
    audio,
    scheduled,
    persist,
    pad: () => input.pollGamepad(Boolean(panel || encounter.open)),
    grant: (...flags: typeof state.progress) => { state.progress.push(...flags.filter(flag => !has(state, flag))); updateObjective(); },
    // Advance the fixed simulation without rendering, for checks in a hidden tab.
    tick: (frames = 1) => { for (let i = 0; i < frames; i++) if (!panel) fixed(1 / 60); },
  } });
}

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => { /* The game works online without it. */ });
}

applySettings();
showSoundStatus();
resize();
changeArea(state.level, state, false);
setPanel('menu');
requestAnimationFrame(frame);
