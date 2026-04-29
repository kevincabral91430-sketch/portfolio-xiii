// ─── textToParticles.ts ──────────────────────────────────────────────────────
// Rasterise du texte sur un canvas hors écran et échantillonne par rejet
// des points dans les pixels opaques → nuage dense conforme à la fonte.
// Le texte n'est jamais rendu dans le DOM ni dans la scène : c'est un
// "moule invisible" dont seules les positions servent de cibles aux particules.

type Pt3 = [number, number, number]

export interface TextLine {
  text: string
  /** Échelle relative à la taille de base (1 par défaut). Permet "XIII" + "PRODUCTION" sur deux lignes. */
  scale?: number
}

export interface SampleOptions {
  lines: TextLine[]
  /** Nombre de particules cibles à générer. */
  count: number
  /** Largeur en unités-monde occupée par la ligne la plus large. */
  worldWidth: number
  /** Poids de fonte (700 ou 800 conseillé pour des silhouettes lisibles). */
  fontWeight?: number | string
  /** Famille CSS — utilise la variable Geist du projet, fallback système. */
  fontFamily?: string
  /** Espace entre lignes en multiple de la hauteur de ligne (1.10 par défaut). */
  lineGap?: number
  /** Seuil d'alpha (0–255) pour considérer un pixel comme "dans la lettre" — 128 = silhouette nette. */
  alphaThreshold?: number
  /** Seed déterministe pour la dispersion (stable d'un build à l'autre). */
  seed?: number
}

const SYSTEM_FALLBACK =
  '"Helvetica Neue", "Inter", "Arial", system-ui, sans-serif'

/** Résout la variable CSS de la fonte Geist en valeur utilisable par le canvas. */
function resolveFontFamily(custom?: string): string {
  if (custom) return custom
  if (typeof window === "undefined") return SYSTEM_FALLBACK
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--font-geist-sans")
    .trim()
  return v ? `${v}, ${SYSTEM_FALLBACK}` : SYSTEM_FALLBACK
}

/**
 * Échantillonne par rejet uniforme un nuage de points contenu dans les
 * glyphes des lignes fournies. Retour : tableau de [x,y,0] en unités-monde,
 * centré sur l'origine. La hauteur monde est dérivée du ratio du canvas.
 */
export function sampleTextToParticles(opts: SampleOptions): Pt3[] {
  if (typeof document === "undefined") return []

  const {
    lines,
    count,
    worldWidth,
    fontWeight = 800,
    lineGap = 1.10,
    alphaThreshold = 128,
    seed = 1,
  } = opts

  if (lines.length === 0 || count <= 0) return []

  const fontFamily = resolveFontFamily(opts.fontFamily)

  // ── Mesure : taille de fonte qui fait tenir la ligne la plus large dans 92 % du canvas
  const canvasW = 2048
  const probe = document.createElement("canvas")
  const pctx = probe.getContext("2d")
  if (!pctx) return []

  const refSize = 200
  let maxLineW = 1
  for (const line of lines) {
    const sz = refSize * (line.scale ?? 1)
    pctx.font = `${fontWeight} ${sz}px ${fontFamily}`
    const w = pctx.measureText(line.text).width
    if (w > maxLineW) maxLineW = w
  }
  const targetPx = canvasW * 0.92
  const baseSize = (refSize * targetPx) / maxLineW

  // ── Layout vertical : empile les lignes (espacement = lineGap)
  const lineHeights = lines.map(
    (l) => baseSize * (l.scale ?? 1) * lineGap
  )
  // somme des hauteurs ; on déduit l'excédent du dernier inter-ligne
  let totalH = lineHeights.reduce((a, b) => a + b, 0)
  totalH -= (lineHeights[lineHeights.length - 1] * (lineGap - 1)) / lineGap
  const canvasH = Math.max(64, Math.ceil(totalH + baseSize * 0.4))

  // ── Canvas final
  const canvas = document.createElement("canvas")
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext("2d", { willReadFrequently: true })
  if (!ctx) return []

  ctx.fillStyle = "#fff"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"

  // Empilage des lignes, centré verticalement
  let yCursor = canvasH / 2 - totalH / 2
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const sz = baseSize * (line.scale ?? 1)
    ctx.font = `${fontWeight} ${sz}px ${fontFamily}`
    yCursor += lineHeights[i] / 2
    ctx.fillText(line.text, canvasW / 2, yCursor)
    yCursor += lineHeights[i] / 2
  }

  // ── Échantillonnage par rejet ───────────────────────────────────────
  const data = ctx.getImageData(0, 0, canvasW, canvasH).data
  const aspectH = canvasH / canvasW
  const worldH = worldWidth * aspectH

  const points: Pt3[] = []
  const maxAttempts = count * 80

  // LCG déterministe → stable d'un build à l'autre
  let s = (seed * 2654435761) >>> 0
  const rand = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }

  let i = 0
  let attempts = 0
  while (i < count && attempts < maxAttempts) {
    attempts++
    const px = Math.floor(rand() * canvasW)
    const py = Math.floor(rand() * canvasH)
    const idx = (py * canvasW + px) * 4 + 3 // canal alpha
    if (data[idx] >= alphaThreshold) {
      const wx = (px / canvasW - 0.5) * worldWidth
      const wy = -(py / canvasH - 0.5) * worldH
      points.push([wx, wy, 0])
      i++
    }
  }

  return points
}
