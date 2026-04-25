"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// ─── Weapon glow — same principle as NavCharacters drop-shadow ────────────────
// CSS drop-shadow on characters = circular, localized, small, soft.
// We replicate the same idea in 3D: a small radial gaussian blob of colored light
// placed BEHIND the weapon center. No texture, no silhouette, no elongated shape.
//
// Key constraint: the glow must NEVER follow the weapon's length or shape.
// It is always circular, always centered, always contained.

// Fixed world-space diameter of the glow plane — intentionally small so it
// covers the weapon's CENTER ONLY, not its full length.
// Weapons range from scale 2.8 to 4.2 (height 4.5 to 6.7 units).
// A 2.8-unit diameter glow covers the central ~45–60% at most.
const GLOW_DIAMETER = 2.8

const glowVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const glowFrag = `
uniform float uTime;
uniform float uActive;
uniform vec3  uTint;
varying vec2 vUv;

void main() {
  if (uActive < 0.005) { gl_FragColor = vec4(0.0); return; }

  // Circular distance from center — isotropic, never follows weapon shape
  vec2 d = vUv - 0.5;
  float r = length(d);

  // Single smooth gaussian falloff — bright center, fully transparent at edges
  // k=18 → nearly invisible at r=0.45 (90% of radius), clean at r=0.5 (edge)
  float glow = exp(-r * r * 18.0);

  // Gentle breath — same cadence as NavCharacters active state
  float breath = sin(uTime * 0.30) * 0.07 + 0.93;

  float alpha = glow * breath * uActive * 0.28;
  gl_FragColor = vec4(uTint, alpha);
}
`

interface WeaponAuraProps {
  weapon: Weapon
  isActive: boolean
  isSocialChapter: boolean
}

export default function WeaponAura({ weapon, isActive, isSocialChapter }: WeaponAuraProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    uTime:   { value: 0 },
    uActive: { value: 0 },
    uTint:   { value: new THREE.Vector3(...weapon.tint) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [weapon.tint])

  const phase = useMemo(
    () => weapon.position[0] * 0.7 + weapon.position[2] * 0.4,
    [weapon.position]
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t      = state.clock.elapsedTime
    const target = (isActive && !isSocialChapter) ? 1.0 : 0.0

    // Mirror weapon float so glow tracks with the weapon exactly
    const floatY  = Math.sin(t * weapon.floatSpeed + phase) * weapon.floatAmplitude
    const floatY2 = Math.cos(t * weapon.floatSpeed * 0.58 + phase + 1.3) * weapon.floatAmplitude * 0.38

    meshRef.current.position.set(
      weapon.position[0],
      weapon.position[1] + floatY + floatY2,
      weapon.position[2] - 0.5
    )

    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = t

    const cur = mat.uniforms.uActive.value
    if (Math.abs(cur - target) > 0.001)
      mat.uniforms.uActive.value = THREE.MathUtils.lerp(cur, target, 0.035)
  })

  return (
    <mesh
      ref={meshRef}
      position={[weapon.position[0], weapon.position[1], weapon.position[2] - 0.5]}
    >
      <planeGeometry args={[GLOW_DIAMETER, GLOW_DIAMETER]} />
      <shaderMaterial
        vertexShader={glowVert}
        fragmentShader={glowFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
