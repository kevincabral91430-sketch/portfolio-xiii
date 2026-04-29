// ─── socialData.ts ───────────────────────────────────────────────────────────
// Métadonnées des trois liens "social". Plus aucune génération géométrique
// ici : SocialFormation utilise textToParticles.ts pour produire le moule
// invisible des particules à partir de la rasterisation du texte lui-même.

import type { TextLine } from "./textToParticles"

export interface SocialTextSpec {
  /** Une ligne par bloc de texte. Permet "XIII" + "PRODUCTION" empilés. */
  lines: TextLine[]
  /** Largeur en unités-monde de la ligne la plus large. */
  worldWidth: number
  /** Nombre total de particules (≈ densité). */
  count: number
}

export interface SocialLink {
  id: string
  label: string
  fullName: string
  url: string
  /** Couleur principale (utilisée par d'autres composants UI). */
  color: string
  /** Tinte RGB linéaire (0–1) injectée dans le shader. */
  tint: [number, number, number]
  /** Description (utilisée par SocialHoverLabel / overlays). */
  description: string[]
  /** Spec de rasterisation du texte → moule de particules. */
  text: SocialTextSpec
}

// Palette FFX — pyreflies, âmes, énergie sacrée
export const socialLinks: SocialLink[] = [
  // Tintes désaturées — voir docs/skills/particle-typography/SKILL.md §9.
  // Brûler en blanc = échec ; on saturé sans jamais clipper.
  {
    id:          "instagram",
    label:       "Instagram",
    fullName:    "INSTAGRAM",
    url:         "",
    color:       "#6cb4dc",                          // bleu Farplane (visible UI)
    tint:        [0.42, 0.72, 0.88],                 // "Farplane mist"
    description: ["Exploration visuelle", "Direction artistique", "Inspiration & recherches"],
    text: {
      lines:      [{ text: "INSTAGRAM" }],
      worldWidth: 16.0,
      // Densité ré-haussée pour la tenue de la forme (+22 %).
      // On reste sous le seuil "blob" : particules toujours distinctes.
      count:      980,
    },
  },
  {
    id:          "linkedin",
    label:       "LinkedIn",
    fullName:    "LINKEDIN",
    url:         "",
    color:       "#66c8c2",                          // aquamarine spirit
    tint:        [0.40, 0.80, 0.78],
    description: ["Parcours professionnel", "Expertise & savoir-faire", "Réseau & collaborations"],
    text: {
      lines:      [{ text: "LINKEDIN" }],
      worldWidth: 14.5,
      count:      830,
    },
  },
  {
    id:          "xiii",
    label:       "XIII Production",
    fullName:    "XIII PRODUCTION",
    url:         "",
    color:       "#c8a85a",                          // amber sobre
    tint:        [0.78, 0.66, 0.32],
    description: ["XIII Production", "Studio digital premium", "Expériences immersives"],
    text: {
      // Deux lignes : "XIII" plus grand, "PRODUCTION" en sous-couche
      lines: [
        { text: "XIII",       scale: 1.00 },
        { text: "PRODUCTION", scale: 0.46 },
      ],
      worldWidth: 12.0,
      count:      1170,
    },
  },
]
