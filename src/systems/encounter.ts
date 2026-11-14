import { el } from '../ui';
import type { Puzzle } from '../world/story';
import { t, tf } from '../i18n';

export class Encounter {
  private select?: (choice: number) => void;
  private keys: HTMLButtonElement[] = [];
  private attempt: number[] = [];

  get open() { return !el('puzzle').hidden; }

  show(title: string, hint: string, choices: string[], select: (choice: number) => void) {
    this.select = select;
    el('encounterTitle').textContent = t(title);
    el('encounterHint').textContent = t(hint);
    el('sequence').replaceChildren();
    el('puzzleFeedback').textContent = '';
    this.keys = choices.map((choice, index) => {
      const button = document.createElement('button');
      const key = document.createElement('kbd');
      key.textContent = String(index + 1);
      button.append(key, t(choice));
      button.addEventListener('click', () => this.press(index));
      return button;
    });
    el('choices').replaceChildren(...this.keys);
    el('puzzle').hidden = false;
    this.keys[0]?.focus();
  }

  private stopTuning?: () => void;

  /** `tuning` receives how close a dial is to its target, 0 to 1, and null when it closes. */
  puzzle(puzzle: Puzzle, sound: (choice: number) => void, solved: () => void, tuning?: (closeness: number | null) => void) {
    if (puzzle.dial) { this.tune(puzzle, sound, solved, tuning); return; }
    this.attempt = [];
    const gauge = () => this.attempt.reduce((value, index) =>
      value + Number(puzzle.choices[index].replace('−', '-')), 3);
    this.show(puzzle.title, puzzle.hint, puzzle.choices, choice => {
      sound(choice);
      const index = this.attempt.length;
      this.attempt.push(choice);
      if (puzzle.feedback === 'prefix' && choice !== puzzle.answer[index]) {
        this.attempt = [];
        this.feedback(t(puzzle.reject ?? 'The lock rejected that step. Sequence reset.'));
      } else if (this.attempt.length === puzzle.answer.length) {
        const correct = puzzle.answer.filter((entry, i) => entry === this.attempt[i]).length;
        if (correct === puzzle.answer.length) {
          this.close();
          solved();
          return;
        }
        const result = puzzle.feedback === 'gauge'
          ? tf('Final vibration: {0}. The gauge reset to +3. Check the required sequence.', gauge())
          : tf('{0} of {1} dials were in the right position. Try again.', correct, puzzle.answer.length);
        this.attempt = [];
        this.feedback(result);
      } else if (puzzle.feedback === 'gauge') this.feedback(tf('Vibration: {0}. Enter the next adjustment.', gauge()));
      else this.feedback(t('Enter the next step.'));
      const slots = puzzle.answer.map((_, i) => {
        const slot = document.createElement('span');
        slot.textContent = t(puzzle.choices[this.attempt[i]] ?? '—');
        return slot;
      });
      el('sequence').replaceChildren(...slots);
    });
  }

  /** A dial the player sweeps; static in the feedback line fades near the target. */
  private tune(puzzle: Puzzle, sound: (choice: number) => void, solved: () => void, tuning?: (closeness: number | null) => void) {
    const dial = puzzle.dial!;
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = String(dial.min);
    slider.max = String(dial.max);
    slider.step = String(dial.step);
    slider.value = String(dial.min);
    slider.className = 'dial';
    slider.setAttribute('aria-label', tf('Frequency in {0}', t(dial.unit)));
    const readout = document.createElement('span');
    const value = () => Number(slider.value);
    // Anything within the tolerance counts as tuned, so the dial is easy to catch on touch screens.
    const tuned = () => Math.abs(value() - dial.target) <= dial.tolerance + 1e-6;
    // Twelve signal bars fill as the dial nears the channel and turn green on it.
    const meter = document.createElement('span');
    meter.className = 'signal-meter';
    meter.setAttribute('aria-hidden', 'true');
    const bars = Array.from({ length: 12 }, () => meter.appendChild(document.createElement('i')));
    const update = () => {
      readout.textContent = `${value().toFixed(1)} ${t(dial.unit)}`;
      const off = Math.abs(value() - dial.target);
      const closeness = tuned() ? 1 : Math.max(0, 1 - (off - dial.tolerance) / 1.6) * .85;
      bars.forEach((bar, i) => bar.classList.toggle('on', i < Math.round(closeness * bars.length)));
      meter.classList.toggle('locked', tuned());
      slider.classList.toggle('locked', tuned());
      tuning?.(closeness);
      const direction = tuned() ? '' : ` ${t(value() < dial.target ? 'Turn the dial higher.' : 'Turn the dial lower.')}`;
      this.feedback(t(tuned() ? 'A voice, clear through the static. Lock it now.'
        : off < .8 ? 'Faint words under the static.' : off < 1.6 ? 'Static, with a rhythm in it.' : 'Heavy static.') + direction);
    };
    this.show(puzzle.title, puzzle.hint, puzzle.choices, () => {
      sound(0);
      if (tuned()) {
        slider.value = String(dial.target);
        update();
        this.close();
        solved();
      } else this.feedback(tf('Nothing but static on {0} {1}. Keep sweeping.', value().toFixed(1), t(dial.unit)));
    });
    slider.addEventListener('input', update);
    el('sequence').replaceChildren(slider, readout, meter);
    this.stopTuning = () => tuning?.(null);
    update();
    slider.focus();
  }

  press(choice: number) {
    if (this.open && this.keys[choice]) this.select?.(choice);
  }

  private feedback(message: string) { el('puzzleFeedback').textContent = message; }

  close() {
    this.stopTuning?.();
    this.stopTuning = undefined;
    this.select = undefined;
    el('puzzle').hidden = true;
    (document.activeElement as HTMLElement | null)?.blur();
  }
}
