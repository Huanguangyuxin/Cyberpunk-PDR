/** Blender (x,y,z) becomes Engine (x,z,-y). */
export const PLAYER_SPAWN: [number, number, number] = [23.5, .92, 16.0];
export const PLAYER_YAW = 1.1;
export function areaAt(position: readonly number[]): string {
  if (position[1] > 5.1) return 'Upper Lounge';
  if (position[0] < -17.4) return 'Main Stage';
  if (position[0] < -6) return 'Performance Floor';
  if (position[0] > 26.5) return 'Water Ribbon Walk';
  return 'Main Bar';
}
