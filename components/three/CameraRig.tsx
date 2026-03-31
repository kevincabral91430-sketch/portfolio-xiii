"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { Chapter } from "@/lib/three/chapters"
import { getCameraForWeapon } from "@/lib/three/cameraShots"

// ─── Cinematic intro — camera starts very far, high above the abyss ──────────
// Gives a sense of immensity before the descent into the sanctuaire
const INTRO_POS  = new THREE.Vector3(3, 32, 88)   // deep outer space — scene is a distant glimmer
const INTRO_LOOK = new THREE.Vector3(0,  2,  0)   // gaze toward the weapon silhouette
const INTRO_FOV  = 56                              // slightly wider — universe-scale feeling

// Duration of the cinematic camera travel (seconds)
// Longer = more solemnity, more time in the darkness before arrival
export const INTRO_CAM_DURATION = 6.5

// Ease: contemplative slow start (0–40%), sharper approach (40–85%), silky settle (85–100%)
function easeIntro(t: number): number {
  if (t < 0.40) return t * t * 2.8 * 0.40 / 0.40   // gentle quadratic start
  const t2 = (t - 0.40) / 0.60
  return 0.448 + (1 - 0.448) * (1 - Math.pow(1 - t2, 3.8))
}

interface CameraRigProps {
  activeChapter: Chapter
  chapterProgress: number
}

export default function CameraRig({ activeChapter }: CameraRigProps) {
  const { camera } = useThree()

  const currentLook  = useRef(new THREE.Vector3().copy(INTRO_LOOK))
  const blendPos     = useRef(new THREE.Vector3())
  const blendLook    = useRef(new THREE.Vector3())
  const shotPosRef   = useRef(new THREE.Vector3())
  const shotLookRef  = useRef(new THREE.Vector3())
  const tempPos      = useRef(new THREE.Vector3())

  const mouse        = useRef({ x: 0, y: 0 })
  const smoothMouse  = useRef({ x: 0, y: 0 })

  // Teleport camera to intro start on mount — no 1-frame snap
  useEffect(() => {
    camera.position.copy(INTRO_POS)
    currentLook.current.copy(INTRO_LOOK)
    const perspCamera = camera as THREE.PerspectiveCamera
    perspCamera.fov = INTRO_FOV
    perspCamera.updateProjectionMatrix()
  }, [camera])

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x =  (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  useFrame((state, delta) => {
    const t    = state.clock.elapsedTime
    const shot = getCameraForWeapon(activeChapter.weaponId, activeChapter.id)
    const perspCamera = camera as THREE.PerspectiveCamera

    // ── Intro progress ────────────────────────────────────────────────────────
    const introRaw  = Math.min(t / INTRO_CAM_DURATION, 1)
    const introEase = easeIntro(introRaw)

    // ── Blend: intro start → chapter shot ────────────────────────────────────
    shotPosRef.current.set(...shot.position)
    shotLookRef.current.set(...shot.target)

    blendPos.current.lerpVectors(INTRO_POS,  shotPosRef.current,  introEase)
    blendLook.current.lerpVectors(INTRO_LOOK, shotLookRef.current, introEase)

    // ── FOV — wide cosmic → cinematic close ──────────────────────────────────
    const targetFov = INTRO_FOV + (shot.fov - INTRO_FOV) * introEase
    const fovAlpha  = 1 - Math.exp(-1.6 * delta)
    const newFov    = THREE.MathUtils.lerp(perspCamera.fov, targetFov, fovAlpha)
    if (Math.abs(newFov - perspCamera.fov) > 0.001) {
      perspCamera.fov = newFov
      perspCamera.updateProjectionMatrix()
    }

    // ── Mouse parallax — eases in only after 60% of intro ────────────────────
    const parallaxWeight = Math.max(0, introRaw * (1 / 0.40) - 1.5)  // 0 until 60%, then 0→1
    smoothMouse.current.x = THREE.MathUtils.lerp(
      smoothMouse.current.x, mouse.current.x * Math.min(parallaxWeight, 1), 0.028
    )
    smoothMouse.current.y = THREE.MathUtils.lerp(
      smoothMouse.current.y, mouse.current.y * Math.min(parallaxWeight, 1), 0.028
    )

    tempPos.current.copy(blendPos.current)
    tempPos.current.x += smoothMouse.current.x * 0.22
    tempPos.current.y += smoothMouse.current.y * 0.11

    // ── Position — tighter lambda during travel for clean tracking ────────────
    const posLambda = introRaw < 1 ? 3.2 : 2.2
    const posAlpha  = 1 - Math.exp(-posLambda * delta)
    camera.position.lerp(tempPos.current, posAlpha)

    // ── Breathing — only after travel completes ───────────────────────────────
    const settled      = Math.max(0, (introRaw - 0.88) / 0.12)
    const distToTarget = camera.position.distanceTo(tempPos.current)
    const breathWeight = Math.max(0, 1 - distToTarget * 5) * 0.006 * settled
    camera.position.y += Math.sin(t * 0.62) * breathWeight
    camera.position.x += Math.cos(t * 0.45 + 1.1) * breathWeight * 0.55

    // ── Lookpoint ─────────────────────────────────────────────────────────────
    const lookAlpha = 1 - Math.exp(-2.6 * delta)
    currentLook.current.lerp(blendLook.current, lookAlpha)
    camera.lookAt(currentLook.current)
  })

  return null
}
