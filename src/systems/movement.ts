export interface Body { x: number; y: number; vx: number; vy: number; facing: number; grounded: boolean }
export interface MovementInput { axis: number; run: boolean; jump: boolean }
export function move(body: Body, input: MovementInput, dt: number, min: number, max: number) {
  const target = input.axis * (input.run ? 5.2 : 2.8);
  body.vx += (target - body.vx) * Math.min(1, dt * 14);
  if (input.axis) body.facing = Math.sign(input.axis);
  if (input.jump && body.grounded) { body.vy = 6.3; body.grounded = false; }
  body.vy -= 17 * dt;
  body.x = Math.max(min, Math.min(max, body.x + body.vx * dt));
  body.y += body.vy * dt;
  if (body.y <= 0) { body.y = 0; body.vy = 0; body.grounded = true; }
}
