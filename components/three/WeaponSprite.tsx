"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

const vertexShader = `
uniform float uTime;
uniform float uActive;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  float pulseMag = sin(uTime * 2.0) * 0.012 * uActive;
  pos *= 1.0 + pulseMag;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
uniform float uActive;
uniform float uVisibility;
uniform vec3 uTint;
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  if (texColor.a < 0.05) discard;

  vec3 baseColor = texColor.rgb;

  // Subtle tint — preserve original texture detail
  vec3 tintedColor = mix(baseColor, uTint, 0.08 + uActive * 0.07);

  vec2 centeredUv = vUv - 0.5;
  float edgeDist = length(centeredUv);

  // Soft aquatic rim — tinted, never white
  float rim = smoothstep(0.2, 0.5, edgeDist);
  vec3 rimColor = uTint * rim * uActive * 0.28;

  // Inner energy shimmer — very fine, FFX-spirit feel
  float shimmerWave = sin(vUv.y * 10.0 - uTime * 2.0) * 0.5 + 0.5;
  float shimmer = shimmerWave * uActive * 0.04 * max(0.0, 1.0 - edgeDist * 2.2);

  // Slow diffuse pulse — warm halo, not a strobe
  float pulse = sin(uTime * 1.2) * 0.5 + 0.5;
  vec3 halo = uTint * uActive * pulse * 0.12;

  vec3 finalColor = tintedColor + rimColor + shimmer + halo;

  // Gentle luminosity lift on active — no clipping to white
  finalColor = mix(finalColor, finalColor * 1.08, uActive * 0.6);

  float finalAlpha = texColor.a * (0.85 + uActive * 0.15) * uVisibility;
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`

interface WeaponSpriteProps {
  weapon: Weapon
  isActive: boolean
  fadeOut: boolean      // true when another weapon is focused
  isSocialChapter: boolean  // true when social formations are shown
}

export default function WeaponSprite({ weapon, isActive, fadeOut, isSocialChapter }: WeaponSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(
      weapon.texture,
      (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace
        setTexture(tex)
      },
    )
  }, [weapon.texture])

  // 1x1 fully-transparent fallback — avoids sampling an uninitialized texture
  // on Intel WebGL drivers, which can corrupt the shader state permanently
  const fallbackTexture = useMemo(() => {
    const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
    tex.needsUpdate = true
    return tex
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uActive: { value: 0 },
      uVisibility: { value: 1 },
      uTint: { value: new THREE.Vector3(...weapon.tint) },
      uTexture: { value: fallbackTexture },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weapon.tint]
  )

  const phase = useMemo(() => weapon.position[0] * 0.7 + weapon.position[2] * 0.4, [weapon.position])

  // Sync texture into uniform once loaded
  useEffect(() => {
    if (!meshRef.current || !texture) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTexture.value = texture
    mat.needsUpdate = true
  }, [texture])

  useFrame((state) => {
    if (!meshRef.current) return
    const t = state.clock.elapsedTime
    const mat = meshRef.current.material as THREE.ShaderMaterial

    mat.uniforms.uTime.value = t

    const targetActive = isActive ? 1.0 : 0.0
    const curActive = mat.uniforms.uActive.value
    if (Math.abs(curActive - targetActive) > 0.001)
      mat.uniforms.uActive.value = THREE.MathUtils.lerp(curActive, targetActive, 0.05)

    // Visibility: hidden in social chapter, full when active, faded when another weapon is focused
    const targetVisibility = isSocialChapter ? 0.0 : isActive ? 1.0 : fadeOut ? 0.04 : 0.75
    const curVis = mat.uniforms.uVisibility.value
    if (Math.abs(curVis - targetVisibility) > 0.001)
      mat.uniforms.uVisibility.value = THREE.MathUtils.lerp(curVis, targetVisibility, 0.04)

    const floatY = Math.sin(t * weapon.floatSpeed + phase) * weapon.floatAmplitude
    const floatY2 = Math.cos(t * weapon.floatSpeed * 0.6 + phase + 1.2) * weapon.floatAmplitude * 0.4

    // Static position — camera stays fixed, weapons don't orbit
    meshRef.current.position.set(
      weapon.position[0],
      weapon.position[1] + floatY + floatY2,
      weapon.position[2]
    )

    // Pendular oscillation on Y axis — ±0.13 rad (~7.5°), never profile view
    // Each weapon has a unique speed & phase offset so they never look synchronised
    const pendulumY = Math.sin(t * (0.28 + weapon.floatSpeed * 0.15) + phase) * 0.13

    // Very subtle tilt on X & Z — micro-life without breaking 2D
    const tiltX = Math.sin(t * weapon.floatSpeed * 0.4 + phase) * 0.022
    const tiltZ = Math.cos(t * weapon.floatSpeed * 0.3 + phase + 2.0) * 0.018

    meshRef.current.rotation.set(
      weapon.rotation[0] + tiltX,
      weapon.rotation[1] + pendulumY,
      weapon.rotation[2] + tiltZ
    )
  })

  return (
    <mesh ref={meshRef} position={weapon.position} rotation={weapon.rotation}>
      <planeGeometry args={[weapon.scale, weapon.scale * 1.6]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
