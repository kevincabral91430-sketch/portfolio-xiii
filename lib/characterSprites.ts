// ─── Character sprite configuration — idle animations ─────────────────────
// All sprites are from Final Fantasy Brave Exvius (FFBE), 7★/6★ versions.
// Each entry describes the sprite sheet grid so the animator can cycle frames.

export interface SpriteConfig {
  characterId: string
  /** Public path — served from /public, used directly as <img src> */
  src: string
  /** Full sprite sheet width in pixels (native resolution) */
  sheetW: number
  /** Full sprite sheet height in pixels (native resolution) */
  sheetH: number
  /** Number of columns in the animation grid */
  cols: number
  /** Number of rows in the animation grid */
  rows: number
  /** Active frame count — may be less than cols × rows if last slot is blank */
  frameCount: number
  /** Animation speed in frames per second */
  fps: number
  /** Target display height in pixels (nav size, approximately native height) */
  displayH: number
}

const BASE = "/assets/Personnages"

export const characterSprites: Record<string, SpriteConfig> = {
  // displayH targets a compact ~60px nav slot.
  // For characters with wide frames (Lulu: 150px wide), height is capped lower
  // so the display width stays under ~100px and doesn't invade the content area.
  tidus: {
    characterId: "tidus",
    src: `${BASE}/Mobile - Final Fantasy_ Brave Exvius - Characters_ Final Fantasy X _ X-2 - Tidus/Tidus (7)/210000107_idle.png`,
    sheetW: 321, sheetH: 132,
    cols: 3, rows: 2,
    frameCount: 5,   // 3+2 grid, last slot of row 2 is blank
    fps: 8,
    displayH: 60,    // native 66px → 0.91× scale → 97px wide
  },
  yuna: {
    characterId: "yuna",
    src: `${BASE}/Mobile - Final Fantasy_ Brave Exvius - Characters_ Final Fantasy X _ X-2 - Yuna/Yuna (7)/210000207_idle.png`,
    sheetW: 246, sheetH: 152,
    cols: 2, rows: 2,
    frameCount: 4,
    fps: 8,
    displayH: 60,    // native 76px → 0.79× scale → 97px wide
  },
  auron: {
    characterId: "auron",
    src: `${BASE}/Mobile - Final Fantasy_ Brave Exvius - Characters_ Final Fantasy X _ X-2 - Auron (1)/Auron/Auron (7)/unit_idle_210000607.png`,
    sheetW: 231, sheetH: 150,
    cols: 2, rows: 2,
    frameCount: 4,
    fps: 8,
    displayH: 60,    // native 75px → 0.80× scale → 92px wide
  },
  wakka: {
    characterId: "wakka",
    src: `${BASE}/Mobile - Final Fantasy_ Brave Exvius - Characters_ Final Fantasy X _ X-2 - Wakka/Wakka/Wakka (6)/210000306_idle.png`,
    sheetW: 261, sheetH: 178,
    cols: 3, rows: 2,
    frameCount: 5,   // 3+2 grid, last slot is blank
    fps: 8,
    displayH: 60,    // native 89px → 0.67× scale → 58px wide (squarish frame)
  },
  lulu: {
    characterId: "lulu",
    src: `${BASE}/Mobile - Final Fantasy_ Brave Exvius - Characters_ Final Fantasy X _ X-2 - Lulu/Lulu (7)/210000407_idle.png`,
    sheetW: 300, sheetH: 148,
    cols: 2, rows: 2,
    frameCount: 4,
    fps: 8,
    displayH: 48,    // native 74px → 0.65× → 97px wide (wide wings, constrained)
  },
  rikku: {
    characterId: "rikku",
    src: `${BASE}/Mobile - Final Fantasy_ Brave Exvius - Characters_ Final Fantasy X _ X-2 - Rikku/Rikku (6)/210000706_idle.png`,
    sheetW: 228, sheetH: 126,
    cols: 3, rows: 2,
    frameCount: 4,   // 3 top + 1 bottom, last 2 slots blank
    fps: 8,
    displayH: 60,    // native 63px → 0.95× scale → 72px wide
  },
  kimahri: {
    characterId: "kimahri",
    src: `${BASE}/Mobile - Final Fantasy_ Brave Exvius - Characters_ Final Fantasy X _ X-2 - Kimahri/Kimahri/Kimahri (7)/unit_idle_210000507.png`,
    sheetW: 279, sheetH: 351,
    cols: 3, rows: 3,
    frameCount: 8,   // 3+3+2 grid, last slot is blank
    fps: 8,
    displayH: 60,    // native 117px → 0.51× scale → 48px wide (portrait frame)
  },
}
