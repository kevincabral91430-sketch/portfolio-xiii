type Pt3 = [number, number, number]

function seg(x1: number, y1: number, x2: number, y2: number, n: number): Pt3[] {
  const pts: Pt3[] = []
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0 : i / (n - 1)
    pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0])
  }
  return pts
}

function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n: number): Pt3[] {
  const pts: Pt3[] = []
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0 : i / (n - 1)
    const a = a0 + (a1 - a0) * t
    pts.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry, 0])
  }
  return pts
}

// ─── Letter builders (h = glyph height, centered at cx,cy) ───────────────────
const D = 18  // density scalar — 18 gives rich pyrefly clouds

function mkI(cx: number, cy: number, h: number): Pt3[] {
  const sw = h * 0.22, hh = h * 0.5
  return [
    ...seg(cx - sw, cy + hh, cx + sw, cy + hh, Math.ceil(D * 0.6)),
    ...seg(cx, cy + hh * 0.85, cx, cy - hh * 0.85, Math.ceil(D * 1.5)),
    ...seg(cx - sw, cy - hh, cx + sw, cy - hh, Math.ceil(D * 0.6)),
  ]
}

function mkN(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.30, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.6)),
    ...seg(cx - hw, cy + hh, cx + hw, cy - hh, Math.ceil(D * 1.6)),
    ...seg(cx + hw, cy + hh, cx + hw, cy - hh, Math.ceil(D * 1.6)),
  ]
}

function mkS(cx: number, cy: number, h: number): Pt3[] {
  const rx = h * 0.26, ry = h * 0.25
  const PI = Math.PI
  return [
    ...arc(cx, cy + ry * 0.9, rx, ry, PI * 0.15, PI * 1.1, Math.ceil(D * 1.8)),
    ...arc(cx, cy - ry * 0.9, rx, ry, PI * 1.1, PI * 2.05, Math.ceil(D * 1.8)),
  ]
}

function mkT(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.40, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx + hw, cy + hh, Math.ceil(D * 1.8)),
    ...seg(cx, cy + hh, cx, cy - hh, Math.ceil(D * 2.2)),
  ]
}

function mkA(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.30, hh = h * 0.5
  return [
    ...seg(cx, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.8)),
    ...seg(cx, cy + hh, cx + hw, cy - hh, Math.ceil(D * 1.8)),
    ...seg(cx - hw * 0.45, cy + hh * 0.05, cx + hw * 0.45, cy + hh * 0.05, Math.ceil(D * 0.8)),
  ]
}

function mkG(cx: number, cy: number, h: number): Pt3[] {
  const rx = h * 0.30, ry = h * 0.44
  const PI = Math.PI
  return [
    ...arc(cx, cy, rx, ry, PI * 0.22, PI * 2.0, Math.ceil(D * 2.6)),
    ...seg(cx + rx * 0.05, cy, cx + rx * 0.95, cy, Math.ceil(D * 0.7)),
    ...seg(cx + rx * 0.95, cy, cx + rx * 0.95, cy - ry * 0.42, Math.ceil(D * 0.8)),
  ]
}

function mkR(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.28, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.8)),
    ...arc(cx - hw * 0.05, cy + hh * 0.24, hw * 1.05, hh * 0.40, -Math.PI / 2, Math.PI / 2, Math.ceil(D * 2.0)),
    ...seg(cx, cy + hh * 0.24, cx + hw, cy - hh, Math.ceil(D * 1.8)),
  ]
}

function mkM(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.34, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.8)),
    ...seg(cx - hw, cy + hh, cx, cy + hh * 0.08, Math.ceil(D * 1.6)),
    ...seg(cx, cy + hh * 0.08, cx + hw, cy + hh, Math.ceil(D * 1.6)),
    ...seg(cx + hw, cy + hh, cx + hw, cy - hh, Math.ceil(D * 1.8)),
  ]
}

function mkL(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.28, hh = h * 0.5
  const xl = cx - hw * 0.3
  return [
    ...seg(xl, cy + hh, xl, cy - hh, Math.ceil(D * 1.8)),
    ...seg(xl, cy - hh, cx + hw * 0.65, cy - hh, Math.ceil(D * 0.9)),
  ]
}

function mkK(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.30, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.8)),
    ...seg(cx - hw, cy, cx + hw, cy + hh, Math.ceil(D * 1.8)),
    ...seg(cx - hw, cy, cx + hw, cy - hh, Math.ceil(D * 1.8)),
  ]
}

function mkE(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.28, hh = h * 0.5
  const xl = cx - hw * 0.2
  return [
    ...seg(xl, cy + hh, xl, cy - hh, Math.ceil(D * 1.8)),
    ...seg(xl, cy + hh, cx + hw, cy + hh, Math.ceil(D * 0.9)),
    ...seg(xl, cy, cx + hw * 0.68, cy, Math.ceil(D * 0.7)),
    ...seg(xl, cy - hh, cx + hw, cy - hh, Math.ceil(D * 0.9)),
  ]
}

function mkD(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.30, hh = h * 0.5
  const xl = cx - hw * 0.35
  return [
    ...seg(xl, cy + hh, xl, cy - hh, Math.ceil(D * 1.8)),
    ...arc(xl + hw * 0.22, cy, hw * 0.94, hh, -Math.PI / 2, Math.PI / 2, Math.ceil(D * 2.6)),
  ]
}

function mkX(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.30, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx + hw, cy - hh, Math.ceil(D * 1.8)),
    ...seg(cx + hw, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.8)),
  ]
}

function mkP(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.28, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.8)),
    ...arc(cx - hw * 0.1, cy + hh * 0.28, hw * 1.05, hh * 0.38, -Math.PI / 2, Math.PI / 2, Math.ceil(D * 2.0)),
  ]
}

function mkO(cx: number, cy: number, h: number): Pt3[] {
  const rx = h * 0.27, ry = h * 0.44
  return arc(cx, cy, rx, ry, 0, Math.PI * 2, Math.ceil(D * 3))
}

function mkU(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.28, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh * 0.30, Math.ceil(D * 1.8)),
    ...arc(cx, cy - hh * 0.30, hw, hh * 0.28, Math.PI, 0, Math.ceil(D * 1.8)),
    ...seg(cx + hw, cy - hh * 0.02, cx + hw, cy + hh, Math.ceil(D * 1.8)),
  ]
}

function mkC(cx: number, cy: number, h: number): Pt3[] {
  const rx = h * 0.27, ry = h * 0.44
  return arc(cx, cy, rx, ry, Math.PI * 0.22, Math.PI * 1.78, Math.ceil(D * 2.6))
}

function mkH(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.28, hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh, Math.ceil(D * 1.8)),
    ...seg(cx - hw, cy, cx + hw, cy, Math.ceil(D * 0.8)),
    ...seg(cx + hw, cy + hh, cx + hw, cy - hh, Math.ceil(D * 1.8)),
  ]
}

// ─── Word composition ─────────────────────────────────────────────────────────
const H    = 2.4             // glyph height in world units — monumental presence
const KERN = H * 0.72        // letter spacing

type LetterFn = (cx: number, cy: number, h: number) => Pt3[]

function word(fns: LetterFn[], h: number = H, kern: number = KERN, cy = 0): Pt3[] {
  const totalW = (fns.length - 1) * kern
  const startX = -totalW / 2
  return fns.flatMap((fn, i) => fn(startX + i * kern, cy, h))
}

// ─── INSTAGRAM ───────────────────────────────────────────────────────────────
const INSTAGRAM_PARTICLES: Pt3[] = word([mkI, mkN, mkS, mkT, mkA, mkG, mkR, mkA, mkM])

// ─── LINKEDIN ────────────────────────────────────────────────────────────────
const LINKEDIN_PARTICLES: Pt3[] = word([mkL, mkI, mkN, mkK, mkE, mkD, mkI, mkN])

// ─── XIII PRODUCTION — two rows, scaled to new H ─────────────────────────────
const XIII_PARTICLES: Pt3[] = [
  // Row 1: XIII — larger, elevated
  ...word([mkX, mkI, mkI, mkI], H * 1.15, H * 1.15 * 0.72, H * 0.92),
  // Row 2: PRODUCTION — slightly smaller, below
  ...word([mkP, mkR, mkO, mkD, mkU, mkC, mkT, mkI, mkO, mkN], H * 0.70, H * 0.70 * 0.72, -H * 0.86),
]

// ─── Public types ─────────────────────────────────────────────────────────────
export interface SocialLink {
  id: string
  label: string
  fullName: string
  url: string
  color: string
  tint: [number, number, number]
  particles: Pt3[]
  description: string[]
}

// FFX spiritual palette — pyreflies, souls, sacred energy
export const socialLinks: SocialLink[] = [
  {
    id:          "instagram",
    label:       "Instagram",
    fullName:    "INSTAGRAM",
    url:         "",
    color:       "#4ab8ff",   // azure pyrefly blue
    tint:        [0.28, 0.70, 1.00],
    particles:   INSTAGRAM_PARTICLES,
    description: ["Exploration visuelle", "Direction artistique", "Inspiration & recherches"],
  },
  {
    id:          "linkedin",
    label:       "LinkedIn",
    fullName:    "LINKEDIN",
    url:         "",
    color:       "#2de8e8",   // aquamarine spirit
    tint:        [0.18, 0.90, 0.90],
    particles:   LINKEDIN_PARTICLES,
    description: ["Parcours professionnel", "Expertise & savoir-faire", "Réseau & collaborations"],
  },
  {
    id:          "xiii",
    label:       "XIII Production",
    fullName:    "XIII PRODUCTION",
    url:         "",
    color:       "#d4a830",   // sacred amber gold
    tint:        [0.84, 0.66, 0.18],
    particles:   XIII_PARTICLES,
    description: ["XIII Production", "Studio digital premium", "Expériences immersives"],
  },
]
