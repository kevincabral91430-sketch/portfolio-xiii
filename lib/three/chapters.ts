import type { WeaponId } from "./weaponData"

export interface Chapter {
  id: string
  weaponId: WeaponId | null
  start: number
  end: number
  kicker: string
  title: string
  subtitle: string
  caption: string
  tags: string[]
}

export const chapters: Chapter[] = [
  {
    id: "tidus",
    weaponId: "tidus",
    start: 0.0,
    end: 0.17,
    kicker: "Caladbolg — Tidus",
    title: "Kevin Cabral",
    subtitle: "Directeur associé & co-fondateur",
    caption: "XIII Production",
    tags: ["Direction artistique", "Création web", "Motion design"],
  },
  {
    id: "yuna",
    weaponId: "yuna",
    start: 0.17,
    end: 0.32,
    kicker: "Nirvana — Yuna",
    title: "Ce que je fais",
    subtitle: "Conception & développement de sites web premium",
    caption: "Des expériences numériques qui marquent les esprits",
    tags: ["Next.js", "Three.js", "GSAP", "Direction créative"],
  },
  {
    id: "auron",
    weaponId: "auron",
    start: 0.32,
    end: 0.46,
    kicker: "Masamune — Auron",
    title: "Monolith Studio",
    subtitle: "Refonte d'un studio créatif haut de gamme",
    caption: "Direction artistique radicale — typographie massive — scroll maîtrisé",
    tags: ["Next.js", "GSAP", "Lenis", "5 semaines"],
  },
  {
    id: "wakka",
    weaponId: "wakka",
    start: 0.46,
    end: 0.60,
    kicker: "World Champion — Wakka",
    title: "Pulse Interaction System",
    subtitle: "Système d'interactions sur mesure pour une plateforme digitale immersive",
    caption: "Chaque micro-mouvement synchronisé avec le rythme global du site",
    tags: ["GSAP", "ScrollTrigger", "React", "3 semaines"],
  },
  {
    id: "lulu",
    weaponId: "lulu",
    start: 0.60,
    end: 0.72,
    kicker: "Onion Knight — Lulu",
    title: "Aether WebGL Experience",
    subtitle: "Expérience WebGL immersive — shaders GLSL temps réel",
    caption: "Lumière, matière et profondeur pour une interface vivante",
    tags: ["Three.js", "GLSL", "React Three Fiber", "6 semaines"],
  },
  {
    id: "rikku",
    weaponId: "rikku",
    start: 0.72,
    end: 0.85,
    kicker: "God Hand — Rikku",
    title: "Core Performance Framework",
    subtitle: "Architecture front-end optimisée — expériences riches sans compromis",
    caption: "Animation avancée et optimisation fine — fluidité et stabilité",
    tags: ["Next.js", "WebGL", "Lazy loading", "4 semaines"],
  },
  {
    id: "kimahri",
    weaponId: "kimahri",
    start: 0.85,
    end: 0.93,
    kicker: "Longinus — Kimahri",
    title: "XIII Production Showcase",
    subtitle: "Plateforme démonstrative des capacités du studio",
    caption: "Direction artistique, motion design et ingénierie — impact immédiat",
    tags: ["Three.js", "GSAP", "GLSL", "Next.js", "5 semaines"],
  },
  {
    id: "social",
    weaponId: null,
    start: 0.93,
    end: 1.0,
    kicker: "",
    title: "",
    subtitle: "",
    caption: "",
    tags: [],
  },
]

export function getActiveChapter(progress: number): Chapter {
  const p = ((progress % 1) + 1) % 1
  return chapters.find((c) => p >= c.start && p < c.end) ?? chapters[0]
}

export function getChapterProgress(chapter: Chapter, progress: number): number {
  const p = ((progress % 1) + 1) % 1
  const range = chapter.end - chapter.start
  if (range <= 0) return 0
  return Math.max(0, Math.min(1, (p - chapter.start) / range))
}
