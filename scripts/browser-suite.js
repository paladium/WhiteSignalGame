// Browser checks for systems that unit tests can't reach: real input, menus,
// field hazards, saves, gamepad and touch. Run `npm run dev`, open the game,
// then in the devtools console:
//   await import('/WhiteSignalGame/scripts/browser-suite.js'); await whiteSignalSuite()
// It uses the dev-only window.whiteSignal hook and overwrites the local checkpoint.
window.whiteSignalSuite = async () => {
  const ws = window.whiteSignal, S = ws.state, $ = id => document.getElementById(id);
  const results = [];
  const check = (name, ok, detail = '') => results.push(`${ok ? 'PASS' : 'FAIL'} ${name}${detail ? ` · ${detail}` : ''}`);
  const down = (code, key = code) => document.body.dispatchEvent(new KeyboardEvent('keydown', { code, key, bubbles: true }));
  const up = (code, key = code) => document.body.dispatchEvent(new KeyboardEvent('keyup', { code, key, bubbles: true }));
  const press = (code, key) => { down(code, key); ws.tick(1); up(code, key); ws.tick(1); };
  const hold = (codes, frames) => { codes.forEach(c => down(c)); ws.tick(frames); codes.forEach(c => up(c)); ws.tick(1); };
  const open = () => !$('overlay').hidden;
  const title = () => $('panelTitle').textContent;
  const reset = () => {
    ws.close();
    Object.assign(S, { progress: [], evidence: [], ending: undefined, coda: undefined, elapsed: 0, splits: { '01': 0 }, cycle: 0, flashlight: true });
  };

  reset();

  // Movement and collision
  ws.go('outside', -5, 5);
  hold(['KeyD'], 60);
  const body = ws.body();
  check('walking moves the player', Math.hypot(body.x - (-5), body.z - 5) > 1.5, `${body.x.toFixed(2)}, ${body.z.toFixed(2)}`);
  ws.go('quarters', -8, 5);
  hold(['KeyW'], 400);
  const blocked = ws.body();
  check('walls and furniture stop the player', blocked.z > -7 && blocked.z < 6, `z ${blocked.z.toFixed(2)}`);
  ws.go('outside', -5, 5);
  const walkStart = ws.body().x;
  hold(['KeyD'], 30);
  const walked = ws.body().x - walkStart;
  ws.go('outside', -5, 5);
  hold(['KeyD', 'ShiftLeft'], 30);
  const ran = ws.body().x - walkStart;
  check('running is faster than walking', ran > walked * 1.4, `${walked.toFixed(2)} vs ${ran.toFixed(2)}`);
  press('Space', ' ');
  check('space jumps', ws.body().y > 0);
  ws.tick(60);

  // Flashlight toggle
  const light = S.flashlight;
  press('KeyF', 'f');
  check('F toggles the flashlight', S.flashlight === !light);
  press('KeyF', 'f');

  // Menus and shortcuts
  press('Escape', 'Escape');
  check('Escape opens pause', open() && $('restartButton').offsetParent !== null);
  press('Escape', 'Escape');
  check('Escape closes pause', !open());
  press('KeyJ', 'j');
  check('J opens Field Notes', open());
  press('KeyJ', 'j');
  check('J closes Field Notes', !open());
  press('KeyM', 'm');
  const mapTitle = title();
  press('KeyJ', 'j');
  check('J switches from the map to Field Notes', open() && title() !== mapTitle, title());
  press('Escape', 'Escape');
  check('Escape closes Field Notes', !open());

  // Dialogue cannot be skipped by opening panels
  ws.go('inside', 3.5, -1.8);
  press('KeyE', 'e');
  check('the radio opens the tuning dial', !$('puzzle').hidden && !!document.querySelector('#sequence .dial'));
  press('Digit1', '1');
  check('locking on the wrong frequency keeps the puzzle open', !$('puzzle').hidden, $('puzzleFeedback').textContent);
  press('Escape', 'Escape');
  check('Escape steps back from a puzzle', $('puzzle').hidden && !open());

  // Field hazards
  ws.go('ridge', -27, 11);
  check('exposure meters show outdoors', !$('fieldMeters').hidden);
  // Stand in the open with the light on, two meters from the figure.
  S.flashlight = true;
  ws.go('ridge', ws.field.figure.x + 2, ws.field.figure.z);
  let caught = false, heard = false;
  for (let i = 0; i < 600 && !caught; i++) {
    ws.tick(1);
    heard ||= ws.field.alert > .5;
    caught = Math.hypot(ws.body().x + 27, ws.body().z - 11) < .5;
  }
  check('a lit flashlight draws the figure, which catches the player', heard && caught);

  ws.go('crevasse', -7.7, -1.4);
  let fell = false;
  for (let i = 0; i < 120 && !fell; i++) { ws.tick(1); fell = Math.abs(ws.body().x + 7.7) > 1; }
  check('standing on thin ice breaks it', fell, `${ws.body().x.toFixed(1)}`);

  ws.go('coast', 0, 15);
  S.flashlight = true;
  ws.field.battery = 1;
  ws.tick(200);
  check('a flat battery switches the flashlight off', !S.flashlight && ws.field.battery === 0);
  press('KeyF', 'f');
  check('a flat flashlight cannot be switched back on outdoors', !S.flashlight);
  ws.go('coast', -10, 7);
  ws.tick(120);
  press('KeyF', 'f');
  check('a heater recharges the battery', ws.field.battery > 30 && S.flashlight, `${Math.round(ws.field.battery)}%`);

  ws.go('ridge', -27, 11);
  ws.tick(50 * 60);
  check('storm gusts arrive on their rhythm', ws.field.storm > .5, `${ws.field.storm.toFixed(2)}`);

  ws.go('coast', -27, 13);
  ws.field.warm = 1;
  ws.go('coast', 0, 15);
  ws.field.warm = .01;
  ws.tick(2);
  check('a whiteout returns the player to a beacon', Math.hypot(ws.body().x + 27, ws.body().z - 13) < .5);

  // Saves and reloads keep progress, splits, cycle and coda
  Object.assign(S, { progress: ['heard', 'manifest'], evidence: ['berth'], cycle: 2, splits: { '01': 0, '02': 12 } });
  ws.go('quarters', -6, 4);
  ws.persist();
  const saved = JSON.parse(localStorage.getItem('the-white-signal:v1'));
  check('saves keep level, progress, evidence, cycle and splits',
    saved.level === 'quarters' && saved.progress.length === 2 && saved.evidence[0] === 'berth' && saved.cycle === 2 && saved.splits['02'] === 12);

  // Gamepad
  const pad = { buttons: Array.from({ length: 17 }, () => ({ pressed: false })), axes: [0, 0, 0, 0] };
  const realPads = navigator.getGamepads;
  navigator.getGamepads = () => [pad];
  ws.go('outside', -5, 5);
  pad.axes[0] = 1;
  for (let i = 0; i < 40; i++) { ws.pad(); ws.tick(1); }
  pad.axes[0] = 0; ws.pad();
  check('the gamepad stick moves the player', ws.body().x > -4, `${ws.body().x.toFixed(2)}`);
  pad.buttons[9].pressed = true; ws.pad(); pad.buttons[9].pressed = false; ws.pad();
  check('Start opens pause', open());
  const focusBefore = document.activeElement;
  pad.buttons[13].pressed = true; ws.pad(); pad.buttons[13].pressed = false; ws.pad();
  check('the D-pad moves menu focus', document.activeElement !== focusBefore);
  pad.buttons[1].pressed = true; ws.pad(); pad.buttons[1].pressed = false; ws.pad();
  check('B closes the menu', !open());
  const tap = index => { pad.buttons[index].pressed = true; ws.pad(); ws.tick(1); pad.buttons[index].pressed = false; ws.pad(); ws.tick(1); };
  const lightBefore = S.flashlight;
  tap(2);
  check('X toggles the flashlight', S.flashlight !== lightBefore);
  tap(3);
  check('Y opens Field Notes', open());
  tap(1);
  ws.go('outside', 10.2, .65);
  tap(0);
  check('A uses the nearby door', S.level === 'inside');
  navigator.getGamepads = realPads;

  // Touch controls
  const touch = document.querySelector('[data-control="right"]');
  const startX = ws.body().x;
  touch.dispatchEvent(new PointerEvent('pointerdown', { pointerId: 7, bubbles: true }));
  ws.tick(40);
  touch.dispatchEvent(new PointerEvent('pointerup', { pointerId: 7, bubbles: true }));
  check('the touch pad moves the player', ws.body().x - startX > .5, `${(ws.body().x - startX).toFixed(2)}`);

  // Key remapping swaps clashing keys
  press('Escape', 'Escape');
  [...$('panelActions').querySelectorAll('button')].find(b => /SETTINGS|НАСТРОЙКИ/.test(b.textContent)).click();
  const bindButton = action => [...$('panelContent').querySelectorAll('button')].find(b => b.parentElement.textContent.startsWith(action));
  bindButton('INTERACT').click();
  press('KeyJ', 'j');
  const keys = JSON.parse(localStorage.getItem('the-white-signal:settings')).keys;
  check('binding a used key swaps it with the other action', keys.interact === 'KeyJ' && keys.journal === 'KeyE', JSON.stringify([keys.interact, keys.journal]));
  bindButton('INTERACT').click(); press('KeyE', 'e');
  const restored = JSON.parse(localStorage.getItem('the-white-signal:settings')).keys;
  check('keys can be swapped back', restored.interact === 'KeyE' && restored.journal === 'KeyJ');

  // Language switches live
  const languageButton = [...$('panelContent').querySelectorAll('button')].find(b => /ENGLISH|РУССКИЙ/.test(b.textContent));
  const wasRussian = languageButton.textContent === 'РУССКИЙ';
  languageButton.click();
  const nowTitle = $('panelTitle').textContent;
  check('the language switches without reloading', wasRussian ? nowTitle === 'Settings' : nowTitle === 'Настройки', nowTitle);
  check('static labels follow the language', document.querySelector('[data-i18n="CURRENT OBJECTIVE"]').textContent === (wasRussian ? 'CURRENT OBJECTIVE' : 'ТЕКУЩАЯ ЦЕЛЬ'));
  [...$('panelContent').querySelectorAll('button')].find(b => /ENGLISH|РУССКИЙ/.test(b.textContent)).click();
  [...$('panelActions').querySelectorAll('button')].find(b => /BACK|НАЗАД/.test(b.textContent)).click();
  check('Back returns to the pause menu', $('restartButton').offsetParent !== null);
  press('Escape', 'Escape');

  // Stepping back from the last call keeps the verification
  reset();
  Object.assign(S, { ending: 'seal', progress: ['reverse', 'coastLog', 'tideBoard', 'feedKey', 'mast'] });
  ws.go('hut', 3, -2.3);
  press('KeyE', 'e'); press('Digit2', '2');
  for (let n = 0; n < 10 && !$('dialogue').hidden; n++) press('KeyE', 'e');
  check('the last call offers a choice', !$('puzzle').hidden && $('choices').children.length === 2);
  press('Escape', 'Escape');
  press('KeyE', 'e');
  check('stepping back and returning skips the verification', !$('puzzle').hidden && $('choices').children.length === 2 && !document.querySelector('#sequence span'));
  press('Digit2', '2');
  for (let n = 0; n < 10 && !$('dialogue').hidden; n++) press('KeyE', 'e');
  check('the listen outcome is recorded', S.coda === 'listen' && S.progress.includes('caller') && open());
  const cycleButton = [...$('panelActions').querySelectorAll('button')].find(b => /CYCLE|ЦИКЛ/.test(b.textContent));
  check('the ending offers a new cycle', Boolean(cycleButton));
  cycleButton?.click();
  check('a new cycle resets progress and counts up', S.cycle === 1 && S.progress.length === 0 && !open());

  // Main menu
  ws.close();
  ws.tick(30);
  press('Escape', 'Escape');
  [...$('panelActions').querySelectorAll('button')].find(b => /MAIN MENU|ГЛАВНОЕ МЕНЮ/.test(b.textContent)).click();
  check('the main menu offers Continue', [...$('panelActions').querySelectorAll('button')].some(b => /CONTINUE|ПРОДОЛЖИТЬ/.test(b.textContent)));
  press('Escape', 'Escape');
  check('Escape does not dismiss the main menu', open());
  [...$('panelActions').querySelectorAll('button')].find(b => /CONTINUE|ПРОДОЛЖИТЬ/.test(b.textContent)).click();
  check('Continue resumes play', !open());

  reset();
  ws.go('outside', -5, 5);
  return results;
};
