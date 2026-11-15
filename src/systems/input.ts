import { defaultKeys, fixedKeys, type Action } from './settings';

export type PadCommand = 'confirm' | 'back' | 'pause' | 'up' | 'down' | 'left' | 'right';

// Standard gamepad mapping: A interact, B jump, X flashlight, Y field notes,
// LB/RB/RT run, Back map, Start pause, D-pad or left stick to move.
const padButtons: [number, Action][] = [[0, 'interact'], [1, 'jump'], [2, 'flashlight'], [3, 'journal'], [8, 'map']];
const padRun = [4, 5, 7];
const deadzone = .28;

export class Input {
  private keys = new Set<string>();
  private taps = new Set<string>();
  private touch = new Map<number, Action>();
  private actionTaps = new Set<Action>();
  private padHeld = new Set<Action>();
  private padPrevious = new Set<number>();
  private stickDirection = '';
  private stick = { x: 0, y: 0 };
  /** Set by the touch joystick every frame. */
  touchStick = { x: 0, y: 0 };
  bindings: Record<Action, string> = { ...defaultKeys };
  /** Receives gamepad presses for menus, puzzles and pause. */
  onPad?: (command: PadCommand) => void;

  constructor() {
    window.addEventListener('keydown', e => {
      const target = e.target as HTMLElement;
      if (target.closest?.('input, textarea, select, [contenteditable]')) return;
      if (e.code === 'Enter' && target.closest?.('button')) return;
      if (['Space', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.taps.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    document.querySelectorAll<HTMLElement>('[data-control]').forEach(button => {
      button.addEventListener('pointerdown', e => {
        e.preventDefault();
        // Capture keeps a held button pressed when the finger slides off it.
        try { button.setPointerCapture(e.pointerId); } catch { /* Synthetic or already released pointers. */ }
        const action = button.dataset.control as Action;
        this.touch.set(e.pointerId, action); this.actionTaps.add(action); button.classList.add('held');
      });
      const release = (e: PointerEvent) => { this.touch.delete(e.pointerId); button.classList.remove('held'); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    });
  }

  private codes(action: Action) { return [this.bindings[action], ...fixedKeys[action] ?? []]; }

  /** Whether a keyboard code triggers an action, for shortcuts handled outside the simulation. */
  matches(action: Action, code: string) { return this.codes(action).includes(code); }

  held(action: Action) {
    return this.codes(action).some(code => this.keys.has(code)) ||
      [...this.touch.values()].includes(action) || this.padHeld.has(action);
  }

  pressed(action: Action) {
    let result = this.actionTaps.delete(action);
    for (const code of this.codes(action)) if (this.taps.delete(code)) result = true;
    return result;
  }

  get right() {
    return Math.max(-1, Math.min(1, Number(this.held('right')) - Number(this.held('left')) + this.stick.x + this.touchStick.x));
  }

  get down() {
    return Math.max(-1, Math.min(1, Number(this.held('down')) - Number(this.held('up')) + this.stick.y + this.touchStick.y));
  }

  /** Polls the first connected gamepad. Call once per rendered frame. */
  pollGamepad(menuOpen: boolean) {
    const pad = navigator.getGamepads?.().find(Boolean);
    if (!pad) {
      this.stick = { x: 0, y: 0 };
      this.padHeld.clear();
      return;
    }
    const down = new Set(pad.buttons.flatMap((button, index) => button.pressed ? [index] : []));
    const previous = this.padPrevious;
    const tapped = (index: number) => down.has(index) && !previous.has(index);
    this.padPrevious = down;
    const axis = (value = 0) => Math.abs(value) > deadzone ? value : 0;
    const x = axis(pad.axes[0]) + Number(down.has(15)) - Number(down.has(14));
    const y = axis(pad.axes[1]) + Number(down.has(13)) - Number(down.has(12));
    if (tapped(9)) this.onPad?.('pause');

    if (menuOpen) {
      this.stick = { x: 0, y: 0 };
      this.padHeld.clear();
      // One menu step per push of the stick or D-pad.
      const direction = Math.abs(x) > Math.abs(y) ? (x > .5 ? 'right' : x < -.5 ? 'left' : '') : (y > .5 ? 'down' : y < -.5 ? 'up' : '');
      if (direction && direction !== this.stickDirection) this.onPad?.(direction as PadCommand);
      this.stickDirection = direction;
      if (tapped(0)) this.onPad?.('confirm');
      if (tapped(1)) this.onPad?.('back');
      return;
    }

    this.stickDirection = '';
    this.stick = { x, y };
    this.padHeld.clear();
    if (padRun.some(index => down.has(index))) this.padHeld.add('run');
    for (const [index, action] of padButtons) {
      if (down.has(index)) this.padHeld.add(action);
      if (tapped(index)) this.actionTaps.add(action);
    }
  }

  clear() {
    this.keys.clear(); this.taps.clear(); this.touch.clear(); this.actionTaps.clear();
    document.querySelectorAll('.held').forEach(e => e.classList.remove('held'));
  }
}
