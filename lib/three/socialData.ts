type Pt3 = [number, number, number]

function seg(x1: number, y1: number, x2: number, y2: number, n: number): Pt3[] {
  const pts: Pt3[] = []
  for (let i = 0; i < n; i++) {
    const t = n <= 1 ? 0 : i / (n - 1)
    pts.push([x1 + (x2 - x1) * t, y1 + (y2 - y1) * t, 0])
  }
  return pts
}

// --- Letter builders — all centered at (cx, cy), height h ---

function mkI(cx: number, cy: number, h: number): Pt3[] {
  const sw = h * 0.26
  const hh = h * 0.5
  return [
    ...seg(cx - sw, cy + hh, cx + sw, cy + hh, 6),
    ...seg(cx, cy + hh * 0.82, cx, cy - hh * 0.82, 10),
    ...seg(cx - sw, cy - hh, cx + sw, cy - hh, 6),
  ]
}

function mkN(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.32
  const hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx - hw, cy - hh, 13),
    ...seg(cx - hw, cy + hh, cx + hw, cy - hh, 11),
    ...seg(cx + hw, cy + hh, cx + hw, cy - hh, 13),
  ]
}

function mkL(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.30
  const hh = h * 0.5
  const xl = cx - hw * 0.35
  return [
    ...seg(xl, cy + hh, xl, cy - hh, 13),
    ...seg(xl, cy - hh, cx + hw * 0.7, cy - hh, 8),
  ]
}

function mkX(cx: number, cy: number, h: number): Pt3[] {
  const hw = h * 0.32
  const hh = h * 0.5
  return [
    ...seg(cx - hw, cy + hh, cx + hw, cy - hh, 14),
    ...seg(cx + hw, cy + hh, cx - hw, cy - hh, 14),
  ]
}

// --- Formation particle sets (local space, centered at origin) ---

const IN_PARTICLES: Pt3[] = [
  ...mkI(-1.8, 0, 3.5),
  ...mkN(1.4, 0, 3.5),
]

const LN_PARTICLES: Pt3[] = [
  ...mkL(-1.7, 0, 3.5),
  ...mkN(1.4, 0, 3.5),
]

const XIII_PARTICLES: Pt3[] = [
  ...mkX(-3.1, 0, 3.0),
  ...mkI(-1.5, 0, 2.7),
  ...mkI(0.0, 0, 2.7),
  ...mkI(1.5, 0, 2.7),
]

// --- Public interface ---

export interface SocialLink {
  id: string
  label: string
  url: string           // TODO: fill in real URLs
  color: string
  tint: [number, number, number]
  worldPosition: [number, number, number]
  particles: Pt3[]
  description: string[]
  interactW: number
  interactH: number
}

export const socialLinks: SocialLink[] = [
  {
    id: "instagram",
    label: "IN",
    url: "",            // TODO: Instagram URL
    color: "#f472b6",
    tint: [0.957, 0.443, 0.714],
    worldPosition: [-6, 0, 0],
    particles: IN_PARTICLES,
    description: ["Exploration visuelle", "Direction artistique", "Inspiration & recherches"],
    interactW: 5.5,
    interactH: 4.2,
  },
  {
    id: "linkedin",
    label: "LN",
    url: "",            // TODO: LinkedIn URL
    color: "#38bdf8",
    tint: [0.22, 0.74, 0.973],
    worldPosition: [0, 0, 0],
    particles: LN_PARTICLES,
    description: ["Parcours professionnel", "Expertise & savoir-faire", "Réseau & collaborations"],
    interactW: 5.5,
    interactH: 4.2,
  },
  {
    id: "xiii",
    label: "XIII",
    url: "",            // TODO: XIII Production URL
    color: "#fbbf24",
    tint: [0.984, 0.749, 0.141],
    worldPosition: [7, 0, 0],
    particles: XIII_PARTICLES,
    description: ["XIII Production", "Studio digital premium", "Expériences immersives"],
    interactW: 8.0,
    interactH: 3.8,
  },
]
