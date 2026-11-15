// Floating touch joystick: the stick appears wherever a thumb lands in the left
// part of the screen and pushes Input like an analog gamepad stick.
const RADIUS = 52;
const DEADZONE = .14;

export class Joystick {
  x = 0;
  y = 0;
  private pointer?: number;
  private originX = 0;
  private originY = 0;

  constructor(private readonly zone: HTMLElement, private readonly base: HTMLElement, private readonly knob: HTMLElement) {
    zone.addEventListener('pointerdown', event => this.start(event));
    zone.addEventListener('pointermove', event => this.move(event));
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture'] as const) {
      zone.addEventListener(type, event => { if (event.pointerId === this.pointer) this.release(); });
    }
  }

  private start(event: PointerEvent) {
    if (this.pointer !== undefined || event.pointerType === 'mouse') return;
    event.preventDefault();
    this.pointer = event.pointerId;
    try { this.zone.setPointerCapture(event.pointerId); } catch { /* Synthetic pointers. */ }
    const bounds = this.zone.getBoundingClientRect();
    this.originX = event.clientX - bounds.left;
    this.originY = event.clientY - bounds.top;
    this.base.style.transform = `translate(${this.originX}px, ${this.originY}px)`;
    this.base.classList.add('active');
    this.place(0, 0);
  }

  private move(event: PointerEvent) {
    if (event.pointerId !== this.pointer) return;
    const bounds = this.zone.getBoundingClientRect();
    let dx = event.clientX - bounds.left - this.originX;
    let dy = event.clientY - bounds.top - this.originY;
    const length = Math.hypot(dx, dy);
    if (length > RADIUS) { dx *= RADIUS / length; dy *= RADIUS / length; }
    this.place(dx, dy);
  }

  private place(dx: number, dy: number) {
    this.knob.style.transform = `translate(${dx}px, ${dy}px)`;
    const strength = Math.hypot(dx, dy) / RADIUS;
    // Past the deadzone, a full push means running speed is one RUN press away.
    this.x = strength < DEADZONE ? 0 : dx / RADIUS;
    this.y = strength < DEADZONE ? 0 : dy / RADIUS;
  }

  release() {
    this.pointer = undefined;
    this.x = this.y = 0;
    this.base.classList.remove('active');
    this.knob.style.transform = '';
  }
}
