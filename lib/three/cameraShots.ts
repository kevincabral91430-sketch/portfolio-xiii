import type { WeaponId } from "./weaponData"

export interface CameraShot {
  position: [number, number, number]
  target: [number, number, number]
  fov: number
}

export const cameraShots: Record<string, CameraShot> = {
  // Fallback overview (used if weaponId is null)
  overview: {
    position: [0, 0, 26],
    target: [0, 0, 0],
    fov: 55,
  },
  // Camera target is shifted -1.5 on X relative to the weapon position.
  // This makes the camera look slightly LEFT of the weapon, which moves the
  // weapon to the RIGHT in screen space — centring it between the text block
  // (left) and the character nav column (right).
  // Camera positions are unchanged; only the look-at point is adjusted.
  // FOV personnalisé par arme — chaque chapitre a une signature optique propre.
  // Étroit = compression épique / large = énergie, présence physique.
  tidus: {
    position: [0.4, 0.6, 9],
    target: [-1.5, 0, 0],
    fov: 34,   // intime — lame fine, cadrage serré
  },
  yuna: {
    position: [16.5, 5.5, 4],
    target: [14.5, 5, -4],
    fov: 38,   // légèrement ouvert — créature spirituelle, présence organique
  },
  auron: {
    position: [-15.5, 0.2, 8],
    target: [-17.5, -1, -3],
    fov: 38,   // élargi — katana massif (h=6.4), recul caméra pour visibilité complète
  },
  wakka: {
    position: [14.5, -4.5, 6],
    target: [12.5, -5, -2],
    fov: 40,   // ouvert — blitzball, énergie sportive
  },
  lulu: {
    position: [-11.5, 6.5, 3],
    target: [-13.5, 6, -5],
    fov: 33,   // resserré — magie noire, mystère
  },
  rikku: {
    position: [10.5, -7.5, 4],
    target: [8.5, -8, -4],
    fov: 42,   // le plus large — God Hand, agilité, vitesse
  },
  kimahri: {
    position: [-1.5, -10.5, 7],
    target: [-3.5, -11, -6],
    fov: 36,   // élargi — lance (h=6.72), recul caméra pour visibilité complète
  },
  // Social chapter — telephoto framing for monumental presence
  social: {
    position: [0, 0, 16],
    target:   [0, 0, 0],
    fov:      60,
  },
}

export function getCameraForWeapon(weaponId: WeaponId | null, chapterId?: string): CameraShot {
  if (chapterId === "social") return cameraShots.social
  if (!weaponId) return cameraShots.overview
  return cameraShots[weaponId] ?? cameraShots.overview
}
