// Lists every player-facing story string. `npm run strings` prints them as JSON,
// which is the checklist for translations in src/i18n/ru.ts.
import { archive, type Coda, type Ending } from '../src/systems/progress';
import { achievementList } from '../src/systems/achievements';
import { expedition } from '../src/world/expedition-layout';
import { freshSave } from '../src/systems/save';
import { chapter, coastEpilogue, codaOptions, codaTitles, endings, hotspots, objectiveTexts } from '../src/world/story';
import { sceneEvents } from '../src/world/events';

export function storyStrings() {
  const out = new Set<string>();
  const add = (text?: string) => { if (text) out.add(text); };
  for (const spot of hotspots) {
    add(spot.label);
    for (const [speaker, text] of [...spot.lines ?? [], ...spot.cycleLines ?? []]) { add(speaker); add(text); }
    if (spot.puzzle) {
      add(spot.puzzle.title); add(spot.puzzle.hint); add(spot.puzzle.reject);
      spot.puzzle.choices.forEach(add);
      spot.puzzle.steps?.forEach(add);
    }
  }
  for (const entry of Object.values(archive)) { add(entry.title); add(entry.title.toUpperCase()); add(entry.text); }
  for (const lines of Object.values(endings)) for (const [speaker, text] of lines) { add(speaker); add(text); }
  const all = Object.keys(archive) as (keyof typeof archive)[];
  for (const ending of ['seal', 'send'] as Ending[]) for (const coda of ['silence', 'listen', 'witness'] as Coda[]) {
    for (const evidence of [[], all]) {
      const save = { ...freshSave(), ending, coda, evidence };
      for (const [speaker, text] of coastEpilogue(save)) { add(speaker); add(text); }
      codaOptions(save).forEach(option => add(option.label));
    }
  }
  Object.values(codaTitles).forEach(add);
  objectiveTexts.forEach(add);
  for (const area of Object.values(expedition)) { add(area.title); add(area.title.toUpperCase()); add(area.subtitle); }
  for (const entry of Object.values(achievementList)) { add(entry.title); add(entry.text); }
  for (const event of sceneEvents) {
    for (const [, cue] of event.cues) {
      if ('text' in cue) add(cue.text);
      if ('speaker' in cue) add(cue.speaker);
    }
  }
  const save = freshSave();
  for (const flags of [[], ['heard'], ['dispatch'], ['triangulated'], ['override']] as const) {
    add(chapter({ ...save, progress: [...flags] }).title);
  }
  add(chapter({ ...save, ending: 'seal' }).title);
  return [...out];
}

if (process.argv[1]?.endsWith('strings.ts')) console.log(JSON.stringify(storyStrings(), null, 1));
