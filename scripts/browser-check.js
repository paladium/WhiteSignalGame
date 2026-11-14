// Full-campaign browser check. Run `npm run dev`, open the game, then paste this
// into the devtools console. It uses the dev-only window.whiteSignal hook and real
// key events, advances the simulation manually (works in a hidden tab), and types
// puzzle answers derived from the in-game hints, not from story.ts.
// Usage: await whiteSignalCheck('seal')  or  await whiteSignalCheck('send', '2')
// The second argument picks the last-call option: 1 silence, 2 listen.
// It overwrites the local checkpoint.
window.whiteSignalCheck = async (ending = 'seal', coda = '1') => {
  const story = await import('/WhiteSignalGame/src/world/story.ts');
  const ws = window.whiteSignal, S = ws.state, $ = id => document.getElementById(id);
  const key = (code, k) => {
    document.body.dispatchEvent(new KeyboardEvent('keydown', { code, key: k, bubbles: true })); ws.tick(1);
    document.body.dispatchEvent(new KeyboardEvent('keyup', { code, key: k, bubbles: true })); ws.tick(1);
  };
  const answers = { locker: '241', power: '1432', west: '24', center: '24', east: '35', receiver: '3', echo: '231',
    dampers: '242', chamber: '141', reverse: '321', boathouse: '232', mast: '312', caller: '2' };
  ws.close();
  Object.assign(S, { progress: [], evidence: [], ending: undefined, elapsed: 0, splits: { '01': 0 }, cycle: 0 });
  ws.go('outside', -5, 5);
  const log = [];
  for (let i = 0; i < 120; i++) {
    const objective = story.currentObjective(S);
    if (!objective.target) break;
    const target = story.routeTarget(S, objective.target);
    if (!target) throw new Error(`No route to ${objective.target}`);
    ws.go(S.level, target.x, target.z); ws.tick(2);
    const before = `${S.progress.length}${S.level}${S.ending ?? ''}`;
    key('KeyE', 'e');
    const dial = document.querySelector('#sequence .dial');
    if (dial) { dial.value = '87.6'; dial.dispatchEvent(new Event('input')); key('Digit1', '1'); }
    for (const digit of answers[target.id] ?? '') key(`Digit${digit}`, digit);
    if (target.finale) key(ending === 'seal' ? 'Digit1' : 'Digit2', ending === 'seal' ? '1' : '2');
    if (!$('puzzle').hidden) throw new Error(`${target.id}: ${$('puzzleFeedback').textContent}`);
    for (let n = 0; n < 25 && !$('dialogue').hidden; n++) key('KeyE', 'e');
    // The last call offers silence, listening, or (with every discovery) the hidden outcome.
    if (target.id === 'caller') {
      key(`Digit${coda}`, coda);
      for (let n = 0; n < 25 && !$('dialogue').hidden; n++) key('KeyE', 'e');
    }
    if (!$('overlay').hidden) ws.close();
    if (before === `${S.progress.length}${S.level}${S.ending ?? ''}`) throw new Error(`${target.id} did nothing`);
    log.push(target.id);
  }
  for (const spot of story.hotspots.filter(spot => spot.record)) {
    ws.go(spot.area, spot.x, spot.z); ws.tick(2); key('KeyE', 'e');
    for (let n = 0; n < 10 && !$('dialogue').hidden; n++) key('KeyE', 'e');
  }
  return { steps: log.length, ending: S.ending, evidence: $('evidenceCount').textContent, objective: story.currentObjective(S).text };
};
