"use client"

import { useEffect, useRef } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import type { Chapter } from "@/lib/three/chapters"
import { getCameraForWeapon } from "@/lib/three/cameraShots"

interface CameraRigProps {
  activeChapter: Chapter
  chapterProgress: number
}

export default function CameraRig({ activeChapter, chapterProgress }: CameraRigProps) {
  const { camera } = useThree()
  const targetPos  = useRef(new THREE.Vector3(0, 2.5, 16))
  const targetLook = useRef(new THREE.Vector3(0, 0, 0))
  const currentLook = useRef(new THREE.Vector3(0, 0, 0))
  const tempTarget  = useRef(new THREE.Vector3())

  const mouse       = useRef({ x: 0, y: 0 })
  const smoothMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth  - 0.5) * 2
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  useFrame((state, delta) => {
    const t    = state.clock.elapsedTime
    const shot = getCameraForWeapon(activeChapter.weaponId, activeChapter.id)

    targetPos.current.set(...shot.position)
    targetLook.current.set(...shot.target)

    const perspCamera = camera as THREE.PerspectiveCamera

    // FOV — cinematic slow ease (1.6 → ~0.4s to 70% target)
    const fovAlpha = 1 - Math.exp(-1.6 * delta)
    const newFov   = THREE.MathUtils.lerp(perspCamera.fov, shot.fov, fovAlpha)
    if (Math.abs(newFov - perspCamera.fov) > 0.001) {
      perspCamera.fov = newFov
      perspCamera.updateProjectionMatrix()
    }

    // Mouse parallax — heavier inertia, softer depth
    smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, mouse.current.x, 0.028)
    smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, mouse.current.y, 0.028)

    const parallaxX = smoothMouse.current.x * 0.22
    const parallaxY = smoothMouse.current.y * 0.11

    tempTarget.current.copy(targetPos.current)
    tempTarget.current.x += parallaxX
    tempTarget.current.y += parallaxY

    // Position — frame-rate independent organic easing (lambda 2.2 → ~0.45s 86% travel)
    const posAlpha = 1 - Math.exp(-2.2 * delta)
    camera.position.lerp(tempTarget.current, posAlpha)

    // Breathing micro-oscillation — only when settled near target (< 0.5 units away)
    const distToTarget = camera.position.distanceTo(tempTarget.current)
    const breathWeight = Math.max(0, 1 - distToTarget * 5) * 0.006
    camera.position.y += Math.sin(t * 0.62) * breathWeight
    camera.position.x += Math.cos(t * 0.45 + 1.1) * breathWeight * 0.55

    // Lookpoint — slightly faster than position (creates natural lag)
    const lookAlpha = 1 - Math.exp(-2.6 * delta)
    currentLook.current.lerp(targetLook.current, lookAlpha)
    camera.lookAt(currentLook.current)
  })

  return null
}
