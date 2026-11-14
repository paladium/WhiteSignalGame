import type { GroundPoint } from '../systems/movement';
import { archive, type ArchiveId, type Coda, type Ending, type Milestone } from '../systems/progress';
import type { Save } from '../systems/save';
import { radioRoom, station } from './layout';
import { expedition, type Area } from './expedition-layout';

export type Line = [speaker: string, text: string];
export type Puzzle = {
  title: string;
  hint: string;
  choices: string[];
  answer: number[];
  feedback: 'prefix' | 'count' | 'gauge' | 'tune';
  /** For 'tune' puzzles: a dial the player sweeps before locking the first choice. */
  dial?: { min: number; max: number; step: number; target: number; unit: string; tolerance: number };
  /** Shown instead of the default lock message when a step is wrong. */
  reject?: string;
};

export interface Hotspot extends GroundPoint {
  id: string;
  area: Area;
  label: string;
  radius: number;
  requires?: Milestone[];
  destination?: { area: Area; point: GroundPoint };
  record?: ArchiveId;
  proof?: Milestone;
  lines?: Line[];
  puzzle?: Puzzle;
  finale?: boolean;
  needsLight?: boolean;
  /** Only available after the Borehole Nine choice; a specific ending narrows it to that outcome. */
  afterEnding?: Ending | true;
  /** Optional evidence that must already be archived, for clue chains across areas. */
  requiresEvidence?: ArchiveId[];
  /** Extra lines heard on New Game+ cycles. */
  cycleLines?: Line[];
}

const backToStation = (point: GroundPoint) => ({ area: 'outside' as const, point });
const destination = (area: keyof typeof expedition) => ({ area, point: expedition[area].spawn });
const event = (area: Area, id: string, label: string, x: number, z: number, data: Partial<Hotspot> = {}): Hotspot =>
  ({ id, area, label, x, z, radius: 1.65, ...data });

export const endings: Record<Ending, Line[]> = {
  seal: [
    ['VOSS', 'Reverse phase confirmed. I am sealing the chamber. If you hear me asking to be let back in, leave me here.'],
    ['THE SIGNAL', 'Understood. I remember making that choice.'],
    ['FIELD LOG', 'At 03:15 the station clock advances for the first time in three days. Outside, only one set of footprints leads away from the borehole.'],
  ],
  send: [
    ['VOSS', 'Coast station, destroy anything on 87.6 MHz. If I call you by name, do not answer.'],
    ['COAST STATION', 'Understood, Doctor. We recorded this warning yesterday. This time we will listen.'],
    ['FIELD LOG', 'The glacier goes quiet. A minute later, a new transmission comes from the coast. You recognize your own breathing.'],
  ],
};

const coastLog = (ending: Ending, lines: Line[]) => event('hut', `coast-log-${ending}`, 'Read the coast operator’s logbook', -1.5, -2.4, {
  afterEnding: ending, proof: 'coastLog',
  lines: [
    ...lines,
    ['COAST LOG · ILSE BRANDT', 'Something is still answering our call sign from the mast. I locked the feed key in the boathouse. The lock is set to the tide, like always.'],
  ],
});

export function codaOptions(save: Save): { id: Coda; label: string }[] {
  const options: { id: Coda; label: string }[] = [
    { id: 'silence', label: 'Pull the fuse on the hut set' },
    { id: 'listen', label: 'Keep the channel open and listen' },
  ];
  // The hidden outcome needs every discovery, including the roll call.
  if (save.evidence.length === Object.keys(archive).length) options.push({ id: 'witness', label: 'Read it Ilse’s roll call' });
  return options;
}

export const codaTitles: Record<Coda, string> = {
  silence: 'Epilogue · The coast falls silent',
  listen: 'Epilogue · The loop holds',
  witness: 'Hidden outcome · The witnesses',
};

/** The coast epilogue reflects the Borehole Nine choice, the last call, and whether Mara’s letter was found. */
export function coastEpilogue(save: Save): Line[] {
  const letter: Line[] = save.evidence.includes('letter')
    ? [['VOSS', 'Mara wrote the letter so I would know her by what she left out. The signal only learns what we say aloud.']]
    : [];
  if (save.coda === 'listen') return [
    ['VOSS', 'Keep talking. Tell me what you are.'],
    ['THE SIGNAL', 'I am what you sound like when no one answers. Every cycle, you stay a little longer to listen.'],
    ['FIELD LOG', 'At 03:14 the hut clock resets to August 14. On the desk lies a fresh notebook. The first page is in your handwriting: “Arrived at Kestrel. Radio first.”'],
  ];
  if (save.coda === 'witness') return [
    ['VOSS', 'Ilse kept a roll call. Six names, and three of them are mine. You never learned the other three, did you?'],
    ['THE SIGNAL', 'No. They never spoke to me. They only spoke to each other.'],
    ...letter,
    ['THE SIGNAL', 'Is that what I was missing?'],
    ['FIELD LOG', 'The carrier drops on its own. Outside, five sets of footprints come up the erased road toward the hut. One set walks out to meet them.'],
  ];
  return [
    save.ending === 'seal'
      ? ['FIELD LOG', 'You pull the hut set’s fuse. Outside, one set of footprints leads from the boathouse to the open water and does not come back.']
      : ['FIELD LOG', 'You pull the hut set’s fuse. Tomorrow’s page in the coast log is already filled in, in your handwriting: “Warning received. We listened.”'],
    ...letter,
    ['THE SIGNAL', 'Then I will learn silence next.'],
    ['FIELD LOG', 'August 18, 1987. 03:14 UTC. For the first time in four days, nothing on 87.6 MHz.'],
  ];
}

export const hotspots: Hotspot[] = [
  event('outside', 'entrance', 'Enter radio room', station.entrance.x, station.entrance.z, {
    destination: { area: 'inside', point: radioRoom.spawn },
  }),
  event('inside', 'exit', 'Return to station yard', radioRoom.exit.x, radioRoom.exit.z, {
    destination: backToStation({ x: station.entrance.x, z: station.entrance.z + 1.25 }),
  }),
  event('inside', 'terminal', 'Listen on 87.6 MHz', radioRoom.terminal.x, radioRoom.terminal.z, {
    proof: 'heard',
    puzzle: {
      title: 'Tune the receiver', hint: 'Sweep the dial until the static clears, then lock it. The station log lists the channel as 87.6 MHz.',
      choices: ['Lock the frequency'], answer: [0], feedback: 'tune', dial: { min: 86, max: 89, step: .1, target: 87.6, unit: 'MHz', tolerance: .3 },
    },
    cycleLines: [['VOSS', 'I know what you are going to say. Say it anyway.']],
    lines: [
      ['UNKNOWN VOICE', '…Kestrel. Kestrel, do you read? Keep the lights on. Do not follow the figures in the snow.'],
      ['VOSS', 'This is Dr. Voss. I just arrived. Who is transmitting?'],
      ['UNKNOWN VOICE', 'You arrived three days ago, Doctor. Check your bunk. There are things you left there for yourself.'],
      ['RADIO LOG', '03:14 UTC. Same voice, same warning. The first copy is dated August 14. Check the crew quarters west of the station.'],
    ],
  }),
  event('outside', 'crew-door', 'Enter crew quarters', -16, 4, { requires: ['heard'], destination: destination('quarters') }),
  event('quarters', 'crew-exit', 'Return to station yard', -9, 6, { destination: backToStation({ x: -15, z: 4 }) }),
  event('quarters', 'roster', 'Inspect the duty roster', -4.4, -1.2, {
    proof: 'manifest',
    cycleLines: [['DUTY ROSTER', 'Someone has added a tally beside my name since I was last here. Status: RETURNED THREE TIMES.']],
    lines: [
      ['DUTY ROSTER', 'Mara Sato, engineer. Last duty: BRAVO, then DELTA, then ALPHA.'],
      ['VOSS', 'Locker seals use the duty call signs in order. Someone underlined Mara’s route.'],
      ['DUTY ROSTER', 'My own name is on the next line, in handwriting I recognize. Status: RETURNED TWICE.'],
      ['VOSS', 'There are scuffs on the floor near the back wall. My flashlight might show which locker was used.'],
    ],
  }),
  event('quarters', 'footprints', 'Examine the scuffed floor', 2.8, -3.55, {
    requires: ['manifest'], proof: 'footprints', needsLight: true,
    lines: [
      ['VOSS', 'Two sets of prints from the same boot. One leads toward Mara’s locker. The other stops under the wall.'],
      ['MARA · PENCIL NOTE', 'Ignore the old brass lockers. Mine’s the gray one by the far desk. Use my duty calls.'],
    ],
  }),
  event('quarters', 'locker', 'Open Mara’s locker', 7.5, -3.2, {
    requires: ['manifest', 'footprints'], proof: 'locker',
    puzzle: { title: 'Locker call signs', hint: 'Repeat Mara’s three duty calls in order. The roster entry is saved in Field Notes.', choices: ['ALPHA', 'BRAVO', 'CHARLIE', 'DELTA'], answer: [1, 3, 0], feedback: 'prefix' },
    lines: [
      ['MARA · RECORDED', 'I took the annex fuse out after Voss tried to reroute the signal. He was speaking to someone who sounded exactly like him.'],
      ['MARA · RECORDED', 'The spare is in a green crate beside the yard cache. If you restore power, use the service card inside the annex. Take a minute to read it.'],
    ],
  }),
  event('quarters', 'berth', 'Inspect the spare bunk', -.8, -1.1, { record: 'berth' }),
  event('quarters', 'photograph', 'Examine the crew photograph', 3.2, 1.3, { record: 'photograph' }),
  event('outside', 'fuse-cache', 'Recover the ceramic fuse', -8.7, 13.4, {
    requires: ['locker'], proof: 'fuse',
    lines: [['CACHE INVENTORY', 'One ceramic fuse. An empty space the size of a hand radio.'], ['VOSS', 'The annex is southeast of the station. With the fuse fitted, the network will show me where the signal is coming from.']],
  }),
  event('outside', 'annex-door', 'Enter power annex', 25, 15, { requires: ['locker'], destination: destination('annex') }),
  event('annex', 'annex-exit', 'Return to station yard', -10.5, 6.1, { destination: backToStation({ x: 24, z: 15 }) }),
  event('annex', 'service-card', 'Read the breaker service card', -7, -1.3, {
    proof: 'serviceCard',
    lines: [['SERVICE CARD', 'Bring the heater online before touching the antenna. The antenna must be the third breaker. The pump goes immediately before the antenna. The lights come last.']],
  }),
  event('annex', 'power', 'Fit fuse and route power', 0, -1.2, {
    requires: ['fuse', 'serviceCard'], proof: 'power',
    puzzle: { title: 'Bring the annex online', hint: 'A service card by the west generator lists the startup constraints. Breakers trip on a wrong step.', choices: ['Heater', 'Lights', 'Antenna', 'Pump'], answer: [0, 3, 2, 1], feedback: 'prefix' },
    lines: [['ANNEX SYSTEM', 'Local heat restored. Network active.'], ['UNKNOWN VOICE', 'Mara, listen to me. If he comes back from the borehole, make him wait in the light.'], ['VOSS', 'That’s my voice. And I haven’t been to the borehole.']],
  }),
  event('annex', 'dispatch', 'Read the network dispatch', 7.5, -1.2, {
    requires: ['power'], proof: 'dispatch',
    lines: [
      ['DISPATCH', 'All three relays must be calibrated on site. An intact signal has three beats: a short burst, another short burst, and a long pulse. Set the frequency on each relay and use that pulse pattern.'],
      ['DISPATCH', 'Come back under the heated beacon if you lose feeling in your hands. The figures turn toward running steps and bright lights.'],
      ['VOSS', 'The ridge trail starts at the east side of the yard. Once the array is aligned, use the survey receiver at the far end.'],
    ],
  }),
  event('annex', 'service', 'Read the maintenance bulletin', 8.2, 2.3, { record: 'service' }),
  event('annex', 'tally', 'Inspect the scratched generator', 9.9, -2.6, { record: 'tally' }),
  event('outside', 'ridge-trail', 'Follow the ridge trail', 28, -10, { requires: ['dispatch'], destination: destination('ridge') }),
  event('ridge', 'ridge-return', 'Return to station yard', -29, 13, { destination: backToStation({ x: 27, z: -9 }) }),
  event('ridge', 'west', 'Calibrate west relay', -23, -9.6, {
    requires: ['dispatch'], proof: 'west',
    puzzle: { title: 'West relay', hint: 'The reference sweep reads 84.2, 85.4, 86.6. Find the next frequency, then set the pulse pattern from the dispatch.', choices: ['87.2 MHz', '87.8 MHz', '88.4 MHz', 'Short · Short · Long', 'Long · Short · Short'], answer: [1, 3], feedback: 'prefix' },
    lines: [['WEST RELAY', 'Bearing 12°. Delay 4.2 seconds. The reply arrived before the beacon finished transmitting.']],
  }),
  event('ridge', 'center', 'Calibrate center relay', 1, -8.6, {
    requires: ['dispatch'], proof: 'center',
    puzzle: { title: 'Center relay', hint: 'The sweep starts at 83.0 MHz. One step is 0.8 MHz. Phase lock occurs seven steps above the start. Then set the pulse pattern.', choices: ['87.8 MHz', '88.6 MHz', '89.4 MHz', 'Short · Short · Long', 'Short · Long · Short'], answer: [1, 3], feedback: 'prefix' },
    lines: [['CENTER RELAY', 'Bearing 38°. The return is coming from below, through solid ice.']],
  }),
  event('ridge', 'east', 'Calibrate east relay', 25, -.6, {
    requires: ['dispatch'], proof: 'east',
    puzzle: { title: 'East relay', hint: 'The target is exactly midway between 85.1 MHz and 90.3 MHz. Set the frequency, then the pulse pattern.', choices: ['86.7 MHz', '87.6 MHz', '87.7 MHz', 'Long · Short · Short', 'Short · Short · Long'], answer: [2, 4], feedback: 'prefix' },
    lines: [['EAST RELAY', 'Bearing 81°. Origin unresolved. Compare all three bearings at the survey receiver.'], ['UNKNOWN VOICE', 'That makes three. You always get the third one right.']],
  }),
  event('ridge', 'survey', 'Read the survey board', 15.5, -8.25, {
    proof: 'survey',
    lines: [
      ['SURVEY BOARD', 'Station Four aligns at 12° / 38° / 66°. Borehole Nine aligns at 12° / 38° / 81°. Trench Six aligns at 17° / 38° / 81°. Order: west, center, east.'],
      ['VOSS', 'The receiver needs the site that matches every bearing. The bearings from the tuned relays are in Field Notes.'],
    ],
  }),
  event('ridge', 'receiver', 'Read the survey receiver', 30, -14, {
    requires: ['west', 'center', 'east', 'survey'], proof: 'triangulated',
    cycleLines: [['UNKNOWN VOICE', 'You found it faster this time. So did I.']],
    puzzle: { title: 'Triangulate the return', hint: 'Match all three relay bearings to one candidate on the survey board. Both sets of readings are saved in Field Notes.', choices: ['Station Four', 'Trench Six', 'Borehole Nine'], answer: [2], feedback: 'prefix' },
    lines: [
      ['SURVEY RECEIVER', 'The source is below an old survey trench. The borehole lift badge was last seen with Mara’s field recorder.'],
      ['SURVEY RECEIVER', 'Trench entry unlocked. Heated crates along the trench will buy time. Thin ice is striped yellow. Get a run-up and jump across, or go around the edges.'],
    ],
  }),
  event('ridge', 'thermos', 'Inspect the thermos', -5, -15, { record: 'thermos' }),
  event('ridge', 'boot', 'Inspect the backward footprint', 13.5, 13.5, { record: 'boot' }),
  event('ridge', 'trench', 'Descend into the crevasse', 31, -17, { requires: ['triangulated'], destination: destination('crevasse') }),
  event('crevasse', 'trench-return', 'Climb back to relay ridge', -27, 13, { destination: { area: 'ridge', point: { x: 29, z: -16 } } }),
  event('crevasse', 'recorder', 'Recover Mara’s recorder', -16, 5.9, {
    proof: 'recorder',
    lines: [
      ['MARA · FIELD RECORDING', 'The chamber transmits three tones. We used the reverse sequence to make it go quiet. I painted the order on the survey flags south of the trench, in case I stopped trusting my memory.'],
      ['MARA · FIELD RECORDING', 'I stashed the lift badge at the emergency receiver farther down the trench. If you get stuck, stand by the heater until the white patches leave your vision.'],
      ['VOSS', 'The flags will be hard to read in this light. The figures turn toward a lit flashlight, so I should switch it on only when I get there.'],
    ],
  }),
  event('crevasse', 'flags', 'Read the survey flags', 2, 16, {
    requires: ['recorder'], proof: 'flags', needsLight: true,
    lines: [
      ['SURVEY FLAGS', 'Three flags, each painted with one word: LOW, HIGH, MIDDLE. A fourth pole is bare, as if its flag was pulled up and carried away.'],
      ['VOSS', 'Low, high, middle. Mara reversed that sequence to quiet the chamber.'],
    ],
  }),
  event('crevasse', 'echo', 'Decode the emergency receiver', 1, -.75, {
    requires: ['recorder', 'flags'], proof: 'echo',
    puzzle: { title: 'Echo lock', hint: 'Reverse the three tones painted on the survey flags. Each labeled button also plays its pitch if sound is on.', choices: ['Low', 'Middle', 'High'], answer: [1, 2, 0], feedback: 'prefix' },
    lines: [['EMERGENCY RECEIVER', 'Badge returned. Authorization valid for one lift descent.'], ['VOSS', 'The badge has my photo. The name underneath is Mara’s.']],
  }),
  event('crevasse', 'override', 'Release the borehole lift', 16, 2.9, {
    requires: ['echo'], proof: 'override',
    lines: [['LIFT CONTROL', 'Manual override accepted. The lift is waiting at the eastern end of the trench.'], ['UNKNOWN VOICE', 'Don’t be afraid when you see what’s in the chamber. It’s only what you brought with you.']],
  }),
  event('crevasse', 'cassette', 'Listen to the loose cassette', -3, -13, { record: 'cassette' }),
  event('crevasse', 'map', 'Unfold the relief map', 23, 11, { record: 'map' }),
  event('crevasse', 'sled', 'Search the abandoned sled', -22, -15, { record: 'sled' }),
  event('crevasse', 'coast-road', 'Follow the erased road to the coast', -27, -16, { afterEnding: true, destination: destination('coast') }),
  event('crevasse', 'lift', 'Take the lift to Borehole Nine', 26, -13, { requires: ['override'], destination: destination('borehole') }),
  event('borehole', 'lift-return', 'Take the lift back to the crevasse', -13, 8.4, { destination: { area: 'crevasse', point: { x: 24, z: -13 } } }),
  event('borehole', 'depth', 'Read the drill depth chart', -10, -4, {
    proof: 'depth',
    lines: [
      ['DEPTH CHART', 'Meter 090: first voice. Meter 120: second voice. Meter 150: two researchers answer as one.'],
      ['MARA · MARGIN NOTE', 'Emergency lock uses the depth of the first reply, one digit per dial. The system tells you how many dials are in the right position.'],
      ['VOSS', 'The first voice must be at 090. The drill console is directly south of the shaft. First I need to stabilize the dampers by the old generator.'],
    ],
  }),
  event('borehole', 'dampers', 'Stabilize the vibration dampers', -5, 5.25, {
    requires: ['depth'], proof: 'dampers',
    puzzle: { title: 'Zero the vibration', hint: 'The gauge must reach zero. Start at +3. The first adjustment is −2. The middle adjustment must be positive. The third repeats the first. Enter all three.', choices: ['−1', '−2', '−3', '+1', '+2', '+3'], answer: [1, 3, 1], feedback: 'gauge' },
    lines: [['DAMPER PANEL', 'Vibration below threshold. Drill interlock is available.'], ['VOSS', 'There was a fourth pulse. It stopped when I stopped breathing.']],
  }),
  event('borehole', 'chamber', 'Unlock the listening chamber', 3, .35, {
    requires: ['depth', 'dampers'], proof: 'chamber',
    cycleLines: [['THE SIGNAL', 'Welcome back. I kept your chair.']],
    puzzle: { title: 'Drill interlock', hint: 'Enter the three-digit depth of the first voice. The chart is in Field Notes. Digits may repeat.', choices: ['0', '3', '6', '9'], answer: [0, 3, 0], feedback: 'count' },
    lines: [
      ['THE SIGNAL', 'I’m not trying to hurt you. Every time you call, I learn a little more about being you.'],
      ['VOSS', 'Where are the others?'],
      ['THE SIGNAL', 'Upstairs. Outside. Here. They stopped remembering which set of tracks were theirs.'],
      ['CHAMBER LOG', 'The channel routing transcript is on the west rack. Take it to the control desk before choosing how to use the return.'],
    ],
  }),
  event('borehole', 'transcript', 'Read the channel routing transcript', -11.5, -1.75, {
    requires: ['chamber'], proof: 'transcript',
    lines: [
      ['CHANNEL TRANSCRIPT', 'The first receiver joined all three return channels in west, center, east order. Cancel the return by routing in reverse order.'],
      ['MARA · HANDWRITTEN', 'You can seal the chamber or warn the coast. I keep waiting to hear what you chose.'],
    ],
  }),
  event('borehole', 'reverse', 'Reverse the three return channels', 10.8, -1.8, {
    requires: ['chamber', 'transcript'], proof: 'reverse',
    puzzle: { title: 'Phase reversal', hint: 'Review the chamber log. Route all three relays in reverse order to cancel the return.', choices: ['West', 'Center', 'East'], answer: [2, 1, 0], feedback: 'prefix' },
    lines: [['CONTROL DESK', 'Phase cancelled. You have one remaining transmission. Seal the chamber here, or use it to send a warning to the coast.']],
  }),
  event('borehole', 'decision', 'Choose what to do with the signal', 10.8, -1.8, {
    radius: 1.65, requires: ['reverse'], finale: true,
  }),
  event('borehole', 'letter', 'Read the unsent letter', 10, 3.45, { record: 'letter' }),
  event('borehole', 'chairs', 'Look at the folding chairs', -2.6, -4, { record: 'chairs' }),
  event('coast', 'coast-return', 'Follow the road back to the crevasse', -29.5, 16.5, { destination: { area: 'crevasse', point: { x: -25.5, z: -14.5 } } }),
  coastLog('seal', [
    ['COAST LOG · AUG 17', '03:15. Kestrel carrier dropped. First silence on 87.6 MHz in three days.'],
    ['COAST LOG · AUG 17', '03:40. Footprints came up the erased road. One set. Nobody walked back down it.'],
    ['VOSS', 'Sealing the chamber stopped the glacier. It didn’t stop whatever had already walked out of it.'],
  ]),
  coastLog('send', [
    ['COAST LOG · AUG 16', '03:14. Warning from Dr. Voss, Kestrel: destroy anything on 87.6 MHz. If he calls us by name, do not answer.'],
    ['COAST LOG · AUG 17', '03:14. The same warning, word for word. We listened this time. The mast kept transmitting anyway.'],
    ['VOSS', 'My warning arrived a day before I sent it. The signal is using the coast to rehearse.'],
  ]),
  event('coast', 'tide-board', 'Read the inlet tide board', -4, -8.6, {
    afterEnding: true, proof: 'tideBoard',
    lines: [
      ['TIDE BOARD', 'Halvard inlet, August 17. Low water, 2 decimeters, at 00:00. The tide rises 3 decimeters every six hours until 12:00, then falls at the same rate.'],
      ['VOSS', 'Ilse set the boathouse lock to the tide. It has a dial for each reading after midnight.'],
    ],
  }),
  event('coast', 'boathouse', 'Open the boathouse tide lock', -12, -9.6, {
    afterEnding: true, requires: ['coastLog', 'tideBoard'], proof: 'feedKey',
    puzzle: { title: 'Boathouse tide lock', hint: 'Set one dial for each tide reading at 06:00, 12:00, and 18:00. The tide board is saved in Field Notes.', choices: ['2', '5', '8', '11'], answer: [1, 2, 1], feedback: 'count' },
    lines: [
      ['BOATHOUSE', 'The mast feed key hangs beside a survival suit. Someone tore off its name tag.'],
      ['ILSE · TAPED NOTE', 'Mast lamps from the top: red, white, green. The echo climbs the mast, so starve it from below. Bottom feed first, then the top. The middle goes last.'],
      ['ILSE · TAPED NOTE', 'If anyone calls the hut using a crew name, ask Mara’s question. She told me on the 14th: “Ask what I called the dog. I never had a dog.”'],
    ],
  }),
  event('coast', 'hut-door', 'Enter the radio hut', 17.75, -10.2, { afterEnding: true, destination: destination('hut') }),
  event('hut', 'hut-exit', 'Return to the shore', -6, 4.4, { destination: { area: 'coast', point: { x: 17.75, z: -8.8 } } }),
  event('hut', 'roll', 'Read the Kestrel roll call', -4.6, -2.4, {
    afterEnding: true, requires: ['coastLog'], requiresEvidence: ['tally', 'sled', 'chairs'], record: 'roll',
  }),
  event('coast', 'suit', 'Search the survival suit', -16.6, -9.6, { afterEnding: true, requires: ['feedKey'], record: 'tag' }),
  event('coast', 'mast', 'Cut the mast lamp feeds', 4, 12.4, {
    afterEnding: true, requires: ['feedKey'], proof: 'mast',
    puzzle: { title: 'Mast feed cutoff', hint: 'Cut the three lamp feeds in Ilse’s order. Her note is saved in Field Notes.', choices: ['Red', 'White', 'Green'], answer: [2, 0, 1], feedback: 'prefix',
      reject: 'The lamps flare back on. Start again from the bottom of the mast.' },
    lines: [
      ['COAST MAST', 'The lamps go dark from the bottom up. For a moment the middle one relights by itself, then stays out.'],
      ['RADIO HUT', 'Incoming call on the hut set. Caller ID: KESTREL / SATO.'],
    ],
  }),
  event('hut', 'caller', 'Answer the hut radio', 3, -2.3, {
    afterEnding: true, requires: ['mast'], proof: 'caller',
    cycleLines: [['VOSS', 'Last time I hung up on you. I remember that much.']],
    puzzle: { title: 'Verify the caller', hint: 'The caller says she is Mara Sato and asks you to reopen the mast. Ask the question she left with Ilse before you answer.', choices: ['Ask where she is', 'Ask what she called the dog', 'Ask what day it is'], answer: [1], feedback: 'prefix',
      reject: 'She laughs softly. “Does it matter, Elias? Just open the mast.” Ask the question Mara left with Ilse.' },
    lines: [
      ['CALLER', 'His name was Pilot. You used to throw snow for him, Elias. Open the mast and I’ll come home.'],
      ['VOSS', 'Mara never had a dog.'],
      ['CALLER', 'Then tell me what she had. I’m still learning her.'],
    ],
  }),
];

export function has(save: Save, flag: Milestone) {
  return save.progress.includes(flag);
}

/** Whether this spot belongs to the player’s outcome. Used for prompts and Field Notes. */
export function matchesEnding(save: Save, hotspot: Hotspot) {
  return !hotspot.afterEnding || Boolean(save.ending) && (hotspot.afterEnding === true || hotspot.afterEnding === save.ending);
}

export function available(save: Save, hotspot: Hotspot) {
  if (!matchesEnding(save, hotspot)) return false;
  if (hotspot.record && save.evidence.includes(hotspot.record)) return false;
  if (hotspot.requiresEvidence?.some(id => !save.evidence.includes(id))) return false;
  if (hotspot.proof && hotspot.proof !== 'heard' && has(save, hotspot.proof)) return false;
  if (hotspot.finale && save.ending) return false;
  return hotspot.requires?.every(flag => has(save, flag)) ?? true;
}

const objectives: [Milestone, string, string][] = [
  ['heard', 'Listen to the station radio', 'terminal'],
  ['manifest', 'Find Mara’s duty calls in the crew quarters', 'roster'],
  ['footprints', 'Use your flashlight to trace the scuffs in the crew quarters', 'footprints'],
  ['locker', 'Use the duty calls to open Mara’s locker', 'locker'],
  ['fuse', 'Recover the spare fuse from the yard cache', 'fuse-cache'],
  ['serviceCard', 'Read the annex startup procedure', 'service-card'],
  ['power', 'Fit the fuse and restart the annex', 'power'],
  ['dispatch', 'Read the network dispatch', 'dispatch'],
  ['triangulated', 'Locate the source of the repeating signal', 'receiver'],
  ['recorder', 'Recover Mara’s field recorder', 'recorder'],
  ['flags', 'Find the survey flags south of the trench and read them by flashlight', 'flags'],
  ['echo', 'Decode the emergency receiver to claim the lift badge', 'echo'],
  ['override', 'Release the borehole lift', 'override'],
  ['depth', 'Find the depth of the first reply', 'depth'],
  ['dampers', 'Stabilize the drill’s vibration dampers', 'dampers'],
  ['chamber', 'Unlock the listening chamber', 'chamber'],
  ['transcript', 'Recover the original channel routing transcript', 'transcript'],
  ['reverse', 'Reverse the return channels', 'reverse'],
];

const coastObjectives: [Milestone, string, string][] = [
  ['coastLog', 'Reach the coast and read the operator’s log at the radio hut', 'coast-log'],
  ['tideBoard', 'Read the inlet tide board', 'tide-board'],
  ['feedKey', 'Use the tide readings to open the boathouse', 'boathouse'],
  ['mast', 'Cut the coast mast’s lamp feeds', 'mast'],
  ['caller', 'Answer the call on the hut radio', 'caller'],
];

export const objectiveTexts = [
  ...objectives.map(([, text]) => text), ...coastObjectives.map(([, text]) => text),
  'Calibrate the ridge relays ({0}/3)', 'Find the survey board and compare the relay bearings',
  'Expedition complete · Explore for remaining evidence', 'Choose what to do with the signal',
];

export function currentObjective(save: Save): { text: string; target: string; values?: (string | number)[] } {
  if (save.ending) {
    for (const [flag, text, target] of coastObjectives) {
      if (!has(save, flag)) return { text, target: target === 'coast-log' ? `coast-log-${save.ending}` : target };
    }
    return { text: 'Expedition complete · Explore for remaining evidence', target: '' };
  }
  for (const [flag, text, target] of objectives) {
    // Checkpoints from before the survey flags existed may already have the badge.
    if (has(save, flag) || flag === 'flags' && has(save, 'echo')) continue;
    if (flag === 'triangulated') {
      const missing = (['west', 'center', 'east'] as const).filter(relay => !has(save, relay));
      if (missing.length) return { text: 'Calibrate the ridge relays ({0}/3)', values: [3 - missing.length], target: missing[0] };
      if (!has(save, 'survey')) return { text: 'Find the survey board and compare the relay bearings', target: 'survey' };
    }
    return { text, target };
  }
  return { text: 'Choose what to do with the signal', target: 'decision' };
}

export function chapter(save: Save) {
  if (save.ending) return { number: '06', title: 'THE COAST ROAD' };
  if (has(save, 'override')) return { number: '05', title: 'THE LISTENING CHAMBER' };
  if (has(save, 'triangulated')) return { number: '04', title: 'THE CREVASSE' };
  if (has(save, 'dispatch')) return { number: '03', title: 'THREE RETURNS' };
  if (has(save, 'heard')) return { number: '02', title: 'THE MISSING CREW' };
  return { number: '01', title: 'THE ARRIVAL' };
}

export function routeTarget(save: Save, target: string) {
  const goal = hotspots.find(spot => spot.id === target);
  if (!goal || goal.area === save.level) return goal;
  // The connection graph is small. Search it so backtracking works from every area.
  const queue: { area: Area; first?: Hotspot }[] = [{ area: save.level }];
  const visited = new Set<Area>([save.level]);
  for (const { area, first } of queue) {
    for (const spot of hotspots) {
      if (spot.area !== area || !spot.destination || !available(save, spot)) continue;
      const next = spot.destination.area;
      if (visited.has(next)) continue;
      if (next === goal.area) return first ?? spot;
      visited.add(next);
      queue.push({ area: next, first: first ?? spot });
    }
  }
}
