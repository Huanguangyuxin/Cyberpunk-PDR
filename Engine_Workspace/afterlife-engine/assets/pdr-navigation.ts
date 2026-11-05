/** Metre/Y-up inspection walking and jumping; no rigid-body collision claim. */
export const WALK = Object.freeze({eyeHeight: 1.64, speed: 1.4, sprintSpeed: 2.8,
  gravity: 9.81, jumpSpeed: 4.2, stepDown: 0.30});

export interface WalkState {
  x: number; feetY: number; z: number; supportY: number;
  velocityY: number; grounded: boolean; jumpHeld: boolean;
  jumps: number; landings: number;
}
export function createWalkState(camera: readonly number[], eyeHeight: number): WalkState {
  return {x: camera[0], feetY: camera[1] - eyeHeight, z: camera[2],
    supportY: camera[1] - eyeHeight, velocityY: 0, grounded: true,
    jumpHeld: false, jumps: 0, landings: 0};
}

export function stepWalk(previous: WalkState, input: {
  right: number; forward: number; yaw: number; sprint: boolean; jump: boolean;
}, delta: number, floorAt: (x: number, z: number, previousFloor: number) => number): WalkState {
  const dt = Math.min(0.05, Math.max(0, delta));
  const next = {...previous};
  const length = Math.max(1, Math.hypot(input.right, input.forward));
  const distance = (input.sprint ? WALK.sprintSpeed : WALK.speed) * dt / length;
  // Walking is horizontal even when the observer looks up/down.
  next.x += (Math.cos(input.yaw) * input.right - Math.sin(input.yaw) * input.forward) * distance;
  next.z += (-Math.sin(input.yaw) * input.right - Math.cos(input.yaw) * input.forward) * distance;
  next.supportY = floorAt(next.x, next.z, previous.supportY);
  if (next.grounded) {
    if (next.supportY < next.feetY - WALK.stepDown) next.grounded = false;
    else next.feetY = next.supportY;
  }
  if (input.jump && !previous.jumpHeld && next.grounded) {
    next.velocityY = WALK.jumpSpeed; next.grounded = false; next.jumps++;
  }
  next.jumpHeld = input.jump;
  if (!next.grounded) {
    next.feetY += next.velocityY * dt - 0.5 * WALK.gravity * dt * dt;
    next.velocityY -= WALK.gravity * dt;
    if (next.velocityY <= 0 && next.feetY <= next.supportY) {
      next.feetY = next.supportY; next.velocityY = 0;
      next.grounded = true; next.landings++;
    }
  }
  return next;
}
