"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// ─── Organic weapon glow — living energy, not a static filter ─────────────────
//
// Architecture: three concentric layers driven by uConcentration (controls radius)
//   core  — tight bright center      (55% weight)
//   mid   — medium halo              (32% weight)
//   bloom — wide ambient             (13% weight)
//
// Animation: drift (asymmetric), wobble (organic), breath (pulse), flicker (magic)
// Color: core shifts toward white — same luminous look as FFX sprite drop-shadows
//
// Wakka (blitzball) gets a lower concentration = wider visible glow.
// All other weapons share a standard concentration, plane scales with weapon.scale.

function getConcentration(weapon: Weapon): number {
  if (weapon.id === "wakka") return 6.0   // wider glow for the round blitzball
  return 14.0
}

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
uniform float uConcentration;
uniform vec3  uTint;
varying vec2 vUv;

void main() {
  if (uActive < 0.005) { gl_FragColor = vec4(0.0); return; }

  // ── Drift — glow center shifts over time ──────────────────────────────────
  // Creates the directional asymmetry: energy appears to emanate rather than sit still.
  vec2 drift = vec2(
    sin(uTime * 0.21)       * 0.036,
    cos(uTime * 0.17 + 0.8) * 0.030
  );
  vec2 d    = (vUv - 0.5) + drift;
  float rOrig = length(d);

  // ── Edge fade — guarantees plane boundary is never visible ─────────────────
  float edge = smoothstep(0.50, 0.28, rOrig);

  // ── Organic wobble — living non-circular shape ─────────────────────────────
  // Two inharmonic lobes rotating at different speeds → flame-like instability.
  // Amplitude ±5.5% keeps it circular enough to not look like a trail.
  float angle  = atan(d.y, d.x);
  float wobble = 1.0
    + sin(angle * 3.0 + uTime * 0.95)  * 0.055
    + sin(angle * 5.0 - uTime * 0.63)  * 0.025;
  float r = rOrig * wobble;

  // ── Three concentric layers ────────────────────────────────────────────────
  float core  = exp(-r * r * uConcentration);
  float mid   = exp(-r * r * uConcentration * 0.36);
  float bloom = exp(-r * r * uConcentration * 0.12);
  float glow  = core * 0.55 + mid * 0.32 + bloom * 0.13;

  // ── Breath — slow 4-second pulse ──────────────────────────────────────────
  // 2π / 4s = 1.5708 rad/s
  float breath = sin(uTime * 1.5708) * 0.13 + 0.87;

  // ── Organic flicker — 3 inharmonic micro-waves ────────────────────────────
  // Not a strobe — a subtle vibration, like a magic flame or spiritual energy.
  float flicker =
    sin(uTime * 2.31)        * 0.025 +
    sin(uTime * 3.73 + 1.17) * 0.018 +
    sin(uTime * 5.09 + 2.83) * 0.012 + 1.0;

  // ── Color — core drifts toward white (FFX sprite luminous look) ───────────
  // Same effect as CSS drop-shadow on white-ish characters: bright center, tinted edges.
  vec3 brightened = mix(uTint, vec3(1.0), 0.28);
  vec3 color      = mix(uTint, brightened, core * 0.5);

  float alpha = glow * edge * breath * flicker * uActive * 0.30;
  gl_FragColor = vec4(color, alpha);
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
    uTime:          { value: 0 },
    uActive:        { value: 0 },
    uConcentration: { value: getConcentration(weapon) },
    uTint:          { value: new THREE.Vector3(...weapon.tint) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [weapon.id, weapon.tint])

  const phase = useMemo(
    () => weapon.position[0] * 0.7 + weapon.position[2] * 0.4,
    [weapon.position]
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t      = state.clock.elapsedTime
    const target = (isActive && !isSocialChapter) ? 1.0 : 0.0

    // Mirror weapon float exactly
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

  // Plane scales with weapon — glow size proportional to weapon size
  const size = weapon.scale * 1.0

  return (
    <mesh
      ref={meshRef}
      position={[weapon.position[0], weapon.position[1], weapon.position[2] - 0.5]}
    >
      <planeGeometry args={[size, size]} />
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
