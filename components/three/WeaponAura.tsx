"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// ─── Radial glow — clean ambient bloom behind the weapon ──────────────────────
// Pure gaussian falloff from weapon center — no texture sampling, no silhouette
// blur, zero ghosting. Two layers: tight core + wide ambient halo.

const AURA_SIZE = 2.2  // world-space size of the glow plane (weapon-independent)

const auraVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const auraFrag = `
uniform float uTime;
uniform float uActive;
uniform vec3  uTint;
varying vec2 vUv;

void main() {
  if (uActive < 0.005) { gl_FragColor = vec4(0.0); return; }

  // Distance from center, with mild vertical squeeze (sprite is taller than wide)
  vec2 d = vUv - 0.5;
  d.y *= 0.72;
  float r = length(d);

  // Two-layer radial gaussian — tight core + wide ambient bloom
  // No texture shape involved — just light, no ghost
  float core  = exp(-r * r * 22.0);   // tight concentrated glow
  float bloom = exp(-r * r * 5.5);    // wide soft ambient

  float glow = core * 0.65 + bloom * 0.35;

  // Slow organic breath
  float breath = sin(uTime * 0.30) * 0.09 + 0.91;
  float micro  = sin(uTime * 0.58 + 1.7) * 0.035 + 0.965;

  float alpha = glow * breath * micro * uActive * 0.38;
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

    // Mirror the sprite float exactly
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
      <planeGeometry args={[AURA_SIZE, AURA_SIZE]} />
      <shaderMaterial
        vertexShader={auraVert}
        fragmentShader={auraFrag}
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
