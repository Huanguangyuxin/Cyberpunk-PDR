export function neonFactor(time: number, period: number, phase: number, index: number): number {
  const u = ((time + phase) % period + period) % period;
  const dropout = (u > .12 && u < .24) || (u > .32 && u < .40);
  return (.86 + .14 * Math.sin(time * 1.7 + index)) * (dropout ? .06 : 1);
}
export const NEON_LEVELS = [.035, .23, .48, .7, .86, 1] as const;
export function neonLevel(value: number): number {
  let best = 0;
  for (let i = 1; i < NEON_LEVELS.length; i++) if (Math.abs(NEON_LEVELS[i] - value) < Math.abs(NEON_LEVELS[best] - value)) best = i;
  return best;
}
