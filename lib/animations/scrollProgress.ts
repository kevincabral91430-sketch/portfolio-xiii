export function getNormalizedProgress(scrollY: number, totalScrollHeight: number): number {
  if (totalScrollHeight <= 0) return 0
  return Math.max(0, Math.min(1, scrollY / totalScrollHeight))
}

export function getLoopedProgress(scrollY: number, totalScrollHeight: number): number {
  if (totalScrollHeight <= 0) return 0
  const raw = scrollY / totalScrollHeight
  return ((raw % 1) + 1) % 1
}
