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
        antialias: true,
        alpha: false,
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 0.92,
        failIfMajorPerformanceCaveat: false,
      }}
      dpr={[1, 1.5]}
      style={{ background: "#030811", width: "100%", height: "100%" }}
    >
      {/* Fog — slightly less dense, gives more depth to the scene */}
      <fog attach="fog" args={["#020810", 35, 100]} />

      {/* Lighting — cooler, more atmospheric */}
      <ambientLight intensity={0.055} color="#12263d" />
      <directionalLight position={[3, 8, 10]} intensity={0.40} color="#6ec8ff" />
      <pointLight position={[0, 1, 5]}  intensity={0.80} color="#48d4f0" distance={28} decay={2} />
      <pointLight position={[-4, -2, 2]} intensity={0.28} color="#1a3a8a" distance={20} decay={2} />

      <AbyssBackground />
      <LightNappes />
      <ParticleField />

      {weapons.map((weapon) => (
        <WeaponSprite
          key={weapon.id}
          weapon={weapon}
          isActive={activeChapter.weaponId === weapon.id}
          fadeOut={hasActiveWeapon && activeChapter.weaponId !== weapon.id}
          isSocialChapter={isSocialChapter}
        />
      ))}

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
