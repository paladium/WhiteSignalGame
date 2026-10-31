export class Input {
  private keys = new Set<string>();
  private taps = new Set<string>();
  private touch = new Map<number, string>();
  constructor() {
    window.addEventListener('keydown', e => {
      if ((e.target as HTMLElement).closest('input, textarea, [contenteditable]')) return;
      if (e.code === 'Enter' && (e.target as HTMLElement).closest('button')) return;
      if (['Space','ArrowLeft','ArrowRight','ArrowUp'].includes(e.code)) e.preventDefault();
      if (!e.repeat) this.taps.add(e.code);
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.clear());
    document.querySelectorAll<HTMLElement>('[data-control]').forEach(button => {
      button.addEventListener('pointerdown', e => {
        e.preventDefault(); button.setPointerCapture(e.pointerId);
        const code = button.dataset.control!;
        this.touch.set(e.pointerId, code); this.taps.add(code); button.classList.add('held');
      });
      const release = (e: PointerEvent) => { this.touch.delete(e.pointerId); button.classList.remove('held'); };
      button.addEventListener('pointerup', release); button.addEventListener('pointercancel', release);
      button.addEventListener('lostpointercapture', release);
    });
  }
  held(...codes: string[]) { return codes.some(c => this.keys.has(c) || [...this.touch.values()].includes(c)); }
  pressed(...codes: string[]) { let result = false; codes.forEach(c => { if(this.taps.delete(c)) result = true; }); return result; }
  get axis() { return Number(this.held('KeyD','ArrowRight')) - Number(this.held('KeyA','ArrowLeft')); }
  clear() { this.keys.clear(); this.taps.clear(); this.touch.clear(); document.querySelectorAll('.held').forEach(e=>e.classList.remove('held')); }
}
