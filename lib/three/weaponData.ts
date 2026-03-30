export type WeaponId = "tidus" | "yuna" | "auron" | "wakka" | "lulu" | "rikku" | "kimahri"

export interface Weapon {
  id: WeaponId
  label: string
  texture: string
  color: string
  tint: [number, number, number]
  position: [number, number, number]
  rotation: [number, number, number]
  scale: number
  floatSpeed: number
  floatAmplitude: number
}

export const weapons: Weapon[] = [
  {
    id: "tidus",
    label: "Caladbolg",
    texture: "/assets/weapons/final-fantasy-10-weapon-ultima_0.png",
    color: "#67e8f9",
    tint: [0.404, 0.91, 0.976],
    position: [0, 0, 0],
    rotation: [0, 0.1, 0.05],
    scale: 3.5,
    floatSpeed: 0.8,
    floatAmplitude: 0.12,
  },
  {
    id: "yuna",
    label: "Nirvana",
    texture: "/assets/weapons/Nirvana_FFX.png",
    color: "#c4b5fd",
    tint: [0.769, 0.71, 0.992],
    position: [16, 5, -4],
    rotation: [0, -0.15, 0.03],
    scale: 3.2,
    floatSpeed: 0.6,
    floatAmplitude: 0.1,
  },
  {
    id: "auron",
    label: "Masamune",
    texture: "/assets/weapons/final-fantasy-10-weapon-masamune.png",
    color: "#f87171",
    tint: [0.973, 0.443, 0.443],
    position: [-16, -1, -3],
    rotation: [0, 0.2, -0.05],
    scale: 4.0,
    floatSpeed: 0.5,
    floatAmplitude: 0.08,
  },
  {
    id: "wakka",
    label: "World Champion",
    texture: "/assets/weapons/FFX_Weapon_-_World_Champion.png",
    color: "#fb923c",
    tint: [0.984, 0.573, 0.235],
    position: [14, -5, -2],
    rotation: [0, -0.1, 0.08],
    scale: 2.8,
    floatSpeed: 1.0,
    floatAmplitude: 0.14,
  },
  {
    id: "lulu",
    label: "Onion Knight",
    texture: "/assets/weapons/chevalier onion.png",
    color: "#a78bfa",
    tint: [0.655, 0.545, 0.98],
    position: [-12, 6, -5],
    rotation: [0, 0.25, -0.02],
    scale: 2.8,
    floatSpeed: 0.7,
    floatAmplitude: 0.09,
  },
  {
    id: "rikku",
    label: "God Hand",
    texture: "/assets/weapons/final-fantasy-10-weapon-godhand.png",
    color: "#34d399",
    tint: [0.204, 0.827, 0.6],
    position: [10, -8, -4],
    rotation: [0.1, -0.2, 0.06],
    scale: 3.0,
    floatSpeed: 1.1,
    floatAmplitude: 0.16,
  },
  {
    id: "kimahri",
    label: "Longinus",
    texture: "/assets/weapons/final-fantasy-10-weapon-longinus.png",
    color: "#60a5fa",
    tint: [0.376, 0.647, 0.98],
    position: [-2, -11, -6],
    rotation: [0.05, 0, -0.03],
    scale: 4.2,
    floatSpeed: 0.45,
    floatAmplitude: 0.07,
  },
]
