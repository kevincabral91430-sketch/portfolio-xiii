import Lenis from "lenis"

let lenisInstance: Lenis | null = null

export function initLenis(): Lenis {
  if (lenisInstance) return lenisInstance

  lenisInstance = new Lenis({
    duration: 1.4,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    orientation: "vertical",
    gestureOrientation: "vertical",
    smoothWheel: true,
    wheelMultiplier: 0.9,
    touchMultiplier: 1.5,
  })

  return lenisInstance
}

export function getLenis(): Lenis | null {
  return lenisInstance
}

export function destroyLenis(): void {
  if (lenisInstance) {
    lenisInstance.destroy()
    lenisInstance = null
  }
}
