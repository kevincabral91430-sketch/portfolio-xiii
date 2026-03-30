"use client"

import { Canvas } from "@react-three/fiber"
import * as THREE from "three"
import WeaponSprite from "./WeaponSprite"
import CameraRig from "./CameraRig"
import ParticleField from "./ParticleField"
import AbyssBackground from "./AbyssBackground"
import LightNappes from "./LightNappes"
import SocialScene from "./SocialScene"
import { weapons } from "@/lib/three/weaponData"
import type { Chapter } from "@/lib/three/chapters"

interface ExperienceCanvasProps {
  activeChapter: Chapter
  chapterProgress: number
  onSocialHover: (id: string | null) => void
}

export default function ExperienceCanvas({
  activeChapter,
  chapterProgress,
  onSocialHover,
}: ExperienceCanvasProps) {
  const isSocialChapter = activeChapter.id === "social"
  const hasActiveWeapon = activeChapter.weaponId !== null

  return (
    <Canvas
      camera={{ position: [0, 0, 26], fov: 55, near: 0.1, far: 200 }}
      gl={{
        antialias: false,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.1,
        failIfMajorPerformanceCaveat: false,
      }}
      dpr={[1, 2]}
      style={{ background: "#03080f", width: "100%", height: "100%" }}
    >
      <fog attach="fog" args={["#020810", 30, 90]} />

      <ambientLight intensity={0.08} color="#1a4060" />
      <directionalLight position={[2, 6, 8]} intensity={0.6} color="#80d4ff" />
      <pointLight position={[0, 0, 4]} intensity={1.2} color="#67e8f9" distance={20} decay={2} />

      {/* Abyss Spirit Ocean background */}
      <AbyssBackground />

      {/* Atmospheric light nappes */}
      <LightNappes />

      {/* Particles */}
      <ParticleField />

      {/* Weapons — each loads independently, no Suspense needed */}
      {weapons.map((weapon) => (
        <WeaponSprite
          key={weapon.id}
          weapon={weapon}
          isActive={activeChapter.weaponId === weapon.id}
          fadeOut={hasActiveWeapon && activeChapter.weaponId !== weapon.id}
          isSocialChapter={isSocialChapter}
        />
      ))}

      {/* Social particle formations — only in social chapter */}
      {isSocialChapter && (
        <SocialScene onHoverChange={onSocialHover} />
      )}

      <CameraRig
        activeChapter={activeChapter}
        chapterProgress={chapterProgress}
      />
    </Canvas>
  )
}
