export const DEFAULT_MIN_SCALE = 0.1
export const DEFAULT_MAX_SCALE = 20

export function clampScale(scale: number, minScale: number, maxScale: number): number {
  return Math.max(minScale, Math.min(maxScale, scale))
}
