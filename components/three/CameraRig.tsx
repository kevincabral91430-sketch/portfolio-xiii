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
  const targetPos = useRef(new THREE.Vector3(0, 2.5, 16))
  const targetLook = useRef(new THREE.Vector3(0, 0, 0))
  const currentLook = useRef(new THREE.Vector3(0, 0, 0))
  // Persistent temp vector — avoids allocating a new Vector3 every frame
  const tempTarget = useRef(new THREE.Vector3())

  const mouse = useRef({ x: 0, y: 0 })
  const smoothMouse = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      mouse.current.x = (e.clientX / window.innerWidth - 0.5) * 2
      mouse.current.y = -(e.clientY / window.innerHeight - 0.5) * 2
    }
    window.addEventListener("mousemove", onMove)
    return () => window.removeEventListener("mousemove", onMove)
  }, [])

  useFrame(() => {
    const shot = getCameraForWeapon(activeChapter.weaponId, activeChapter.id)

    targetPos.current.set(...shot.position)
    targetLook.current.set(...shot.target)

    const perspCamera = camera as THREE.PerspectiveCamera
    const newFov = THREE.MathUtils.lerp(perspCamera.fov, shot.fov, 0.04)
    // Only call updateProjectionMatrix when fov actually changed meaningfully
    if (Math.abs(newFov - perspCamera.fov) > 0.001) {
      perspCamera.fov = newFov
      perspCamera.updateProjectionMatrix()
    }

    // Smooth mouse parallax
    smoothMouse.current.x = THREE.MathUtils.lerp(smoothMouse.current.x, mouse.current.x, 0.04)
    smoothMouse.current.y = THREE.MathUtils.lerp(smoothMouse.current.y, mouse.current.y, 0.04)

    const PARALLAX_STRENGTH = 0.3
    const parallaxX = smoothMouse.current.x * PARALLAX_STRENGTH
    const parallaxY = smoothMouse.current.y * PARALLAX_STRENGTH * 0.5

    // Reuse persistent temp vector — no allocation per frame
    tempTarget.current.copy(targetPos.current).x += parallaxX
    tempTarget.current.y += parallaxY
    camera.position.lerp(tempTarget.current, 0.035)
    currentLook.current.lerp(targetLook.current, 0.035)
    camera.lookAt(currentLook.current)
  })

  return null
}
