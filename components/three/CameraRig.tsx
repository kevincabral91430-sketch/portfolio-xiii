"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { Chapter } from "@/lib/three/chapters"
import { getCameraForWeapon } from "@/lib/three/cameraShots"

// ─── Cinematic intro — camera starts high/far, descends into the sanctuaire ──
const INTRO_POS  = new THREE.Vector3(2.5, 20, 50)   // high overhead, far back
const INTRO_LOOK = new THREE.Vector3(0,  3,  0)     // gaze slightly above centre
const INTRO_FOV  = 54                                // wider — vast, encompassing

// Duration of the cinematic camera travel (seconds)
export const INTRO_CAM_DURATION = 5.2

// Ease: slow start (contemplative), sharp mid arrival, gentle settle
function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4)
}

interface CameraRigProps {
  activeChapter: Chapter
  chapterProgress: number
}

export default function CameraRig({ activeChapter }: CameraRigProps) {
  const { camera } = useThree()

  // All vectors pre-allocated — zero GC pressure in useFrame
  const currentLook  = useRef(new THREE.Vector3().copy(INTRO_LOOK))
  const blendPos     = useRef(new THREE.Vector3())
  const blendLook    = useRef(new THREE.Vector3())
  const shotPosRef   = useRef(new THREE.Vector3())
  const shotLookRef  = useRef(new THREE.Vector3())
  const tempPos      = useRef(new THREE.Vector3())

  const mouse        = useRef({ x: 0, y: 0 })
  const smoothMouse  = useRef({ x: 0, y: 0 })

  // Teleport camera to intro start on mount — prevents the 1-frame snap from
  // default Canvas camera position to the intro start
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

    // ── Intro progress ───────────────────────────────────────────────────────
    const introRaw  = Math.min(t / INTRO_CAM_DURATION, 1)
    const introEase = easeOutQuart(introRaw)

    // ── Blend target: intro start → chapter shot ─────────────────────────────
    shotPosRef.current.set(...shot.position)
    shotLookRef.current.set(...shot.target)

    blendPos.current.lerpVectors(INTRO_POS,  shotPosRef.current,  introEase)
    blendLook.current.lerpVectors(INTRO_LOOK, shotLookRef.current, introEase)

    // ── FOV — blend intro FOV → shot FOV ─────────────────────────────────────
    const targetFov = INTRO_FOV + (shot.fov - INTRO_FOV) * introEase
    const fovAlpha  = 1 - Math.exp(-1.6 * delta)
    const newFov    = THREE.MathUtils.lerp(perspCamera.fov, targetFov, fovAlpha)
    if (Math.abs(newFov - perspCamera.fov) > 0.001) {
      perspCamera.fov = newFov
      perspCamera.updateProjectionMatrix()
    }

    // ── Mouse parallax — eases in only once intro is past halfway ────────────
    const parallaxWeight = Math.max(0, introRaw * 2 - 1)  // 0 until t=2.6s, then 0→1
    smoothMouse.current.x = THREE.MathUtils.lerp(
      smoothMouse.current.x, mouse.current.x * parallaxWeight, 0.028
    )
    smoothMouse.current.y = THREE.MathUtils.lerp(
      smoothMouse.current.y, mouse.current.y * parallaxWeight, 0.028
    )

    tempPos.current.copy(blendPos.current)
    tempPos.current.x += smoothMouse.current.x * 0.22
    tempPos.current.y += smoothMouse.current.y * 0.11

    // ── Position — organic exponential lerp ──────────────────────────────────
    // Higher lambda during intro for tighter tracking of the moving target;
    // slightly lower lambda at rest (more floaty)
    const posLambda = introRaw < 1 ? 2.8 : 2.2
    const posAlpha  = 1 - Math.exp(-posLambda * delta)
    camera.position.lerp(tempPos.current, posAlpha)

    // ── Breathing — only once settled after intro ─────────────────────────────
    const distToTarget  = camera.position.distanceTo(tempPos.current)
    const settled       = Math.max(0, introRaw - 0.85) / 0.15   // ramps 0→1 in last 15% of intro
    const breathWeight  = Math.max(0, 1 - distToTarget * 5) * 0.006 * settled
    camera.position.y  += Math.sin(t * 0.62) * breathWeight
    camera.position.x  += Math.cos(t * 0.45 + 1.1) * breathWeight * 0.55

    // ── Lookpoint — slightly faster than position (natural lag) ──────────────
    const lookAlpha = 1 - Math.exp(-2.6 * delta)
    currentLook.current.lerp(blendLook.current, lookAlpha)
    camera.lookAt(currentLook.current)
  })

  return null
}
