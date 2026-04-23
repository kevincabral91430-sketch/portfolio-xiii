"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// ─── Silhouette glow shaders ───────────────────────────────────────────────
// The glow plane is 1.5× the weapon plane.
// Its UVs are remapped so the weapon texture occupies the central region.
// For each pixel outside the weapon silhouette, we sample the texture at
// 12 nearby offsets — if any neighbour has weapon alpha, we render a soft
// glow in the weapon's tint colour. This makes the halo follow the exact
// silhouette shape rather than being a simple circle.

const glowVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const glowFrag = `
uniform float     uTime;
uniform float     uActive;
uniform vec3      uTint;
uniform sampler2D uTexture;
varying vec2 vUv;

// Bounded sample — returns vec4(0) for UVs outside [0,1]
vec4 smp(vec2 uv) {
  vec2 ok  = step(0.001, uv) * step(uv, vec2(0.999));
  float v  = ok.x * ok.y;
  return texture2D(uTexture, clamp(uv, 0.001, 0.999)) * v;
}

void main() {
  // Early exit — saves 12 texture fetches when inactive
  if (uActive < 0.01) { gl_FragColor = vec4(0.0); return; }

  // Remap: the glow plane is 1.25× weapon size, so weapon UVs occupy
  // the central 1/1.25 = 0.800 of this plane's UV range.
  float s   = 0.800;
  vec2  wuv = (vUv - 0.5) * s + 0.5;

  float ownAlpha = smp(wuv).a;

  // 12-tap neighbourhood — finds nearby weapon silhouette
  float R  = 0.050;   // search radius in weapon-UV space
  float R2 = R * 0.71;
  float R3 = R * 1.45;

  float nb = 0.0;
  nb = max(nb, smp(wuv + vec2( R,  0.0)).a);
  nb = max(nb, smp(wuv + vec2(-R,  0.0)).a);
  nb = max(nb, smp(wuv + vec2( 0.0,  R)).a);
  nb = max(nb, smp(wuv + vec2( 0.0, -R)).a);
  nb = max(nb, smp(wuv + vec2( R2,  R2)).a);
  nb = max(nb, smp(wuv + vec2(-R2,  R2)).a);
  nb = max(nb, smp(wuv + vec2( R2, -R2)).a);
  nb = max(nb, smp(wuv + vec2(-R2, -R2)).a);
  // Wider taps for a softer outer falloff
  nb = max(nb, smp(wuv + vec2( R3,  0.0)).a * 0.5);
  nb = max(nb, smp(wuv + vec2(-R3,  0.0)).a * 0.5);
  nb = max(nb, smp(wuv + vec2( 0.0,  R3)).a * 0.5);
  nb = max(nb, smp(wuv + vec2( 0.0, -R3)).a * 0.5);

  // Glow appears only where the weapon silhouette is nearby but not present
  float glow = nb * (1.0 - ownAlpha);

  // Radial falloff so the halo doesn't extend to the very corners of the plane
  float dist    = length(vUv - 0.5);
  float falloff = 1.0 - smoothstep(0.10, 0.30, dist);

  // Slow organic breath — not a strobe, not a hard loop
  float breath  = sin(uTime * 0.41 + 0.9) * 0.14 + 0.86;
  float pulse   = sin(uTime * 0.19) * 0.07 + 0.93;

  float alpha = glow * falloff * breath * pulse * uActive * 0.22;

  gl_FragColor = vec4(uTint, alpha);
}
`

// ─── Spirit particle shaders ───────────────────────────────────────────────
// ~24 tiny pale-white motes that drift slowly upward from the weapon.
// They suggest spiritual energy leaking from the relic — not a particle
// explosion, just a quiet emanation.

const particleVert = `
uniform float uTime;
attribute float aOffset;
attribute float aSpeed;
attribute float aSeed;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Each particle cycles through a 5-unit lifetime at its own pace
  float life = mod(uTime * aSpeed * 0.15 + aOffset * 5.0, 5.0);
  float t    = life / 5.0;   // 0..1 normalised lifetime

  // Slow upward drift
  pos.y += life * 0.45;

  // Gentle irregular wander — two frequencies to avoid mechanical look
  pos.x += sin(uTime * aSpeed * 0.20 + aSeed * 6.28) * 0.40
         + sin(uTime * aSpeed * 0.11 + aSeed * 3.14 + 1.3) * 0.15;
  pos.z += cos(uTime * aSpeed * 0.16 + aSeed * 4.71) * 0.22;

  vec4 mvPos   = modelViewMatrix * vec4(pos, 1.0);
  gl_Position  = projectionMatrix * mvPos;

  // Very small — these are delicate motes, not orbs
  float sz = (1.0 + aSeed * 0.9) * (260.0 / -mvPos.z);
  gl_PointSize = clamp(sz, 0.4, 2.5);

  // Fade in 0..20% of life, sustain, fade out 75..100% — no hard pop
  float fadeIn  = smoothstep(0.00, 0.20, t);
  float fadeOut = 1.0 - smoothstep(0.75, 1.00, t);
  float twinkle = sin(uTime * (1.8 + aSeed * 2.6) + aSeed * 6.1) * 0.15 + 0.85;

  vAlpha = fadeIn * fadeOut * twinkle * (0.22 + aSeed * 0.30);
}
`

const particleFrag = `
uniform float uActive;
varying float vAlpha;

void main() {
  vec2  c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  // Soft circular falloff
  float a = pow(1.0 - d * 2.0, 2.0) * vAlpha * uActive;

  // Pale warm-white — not harsh, not neon
  gl_FragColor = vec4(0.94, 0.97, 1.00, a);
}
`

const PARTICLE_COUNT = 24

interface WeaponAuraProps {
  weapon: Weapon
  isActive: boolean
  isSocialChapter: boolean
}

export default function WeaponAura({ weapon, isActive, isSocialChapter }: WeaponAuraProps) {
  const glowRef     = useRef<THREE.Mesh>(null)
  const particleRef = useRef<THREE.Points>(null)

  // ── Load texture into glow shader ─────────────────────────────────────────
  const fallbackTex = useMemo(() => {
    const t = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
    t.needsUpdate = true
    return t
  }, [])

  const glowUniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uActive:  { value: 0 },
    uTint:    { value: new THREE.Vector3(...weapon.tint) },
    uTexture: { value: fallbackTex },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [weapon.tint])

  const particleUniforms = useMemo(() => ({
    uTime:   { value: 0 },
    uActive: { value: 0 },
  }), [])

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(weapon.texture, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      if (!glowRef.current) return
      const mat = glowRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTexture.value = tex
      mat.needsUpdate = true
    })
  }, [weapon.texture])

  // ── Particle geometry — relative positions around weapon centre ───────────
  const { positions, offsets, speeds, seeds } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const offsets   = new Float32Array(PARTICLE_COUNT)
    const speeds    = new Float32Array(PARTICLE_COUNT)
    const seeds     = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      // Spawn within weapon footprint — randomised around origin
      const angle  = Math.random() * Math.PI * 2
      const radius = Math.random() * 0.7
      positions[i * 3]     = Math.cos(angle) * radius * 0.9
      positions[i * 3 + 1] = (Math.random() - 0.5) * 1.8
      positions[i * 3 + 2] = (Math.random() - 0.5) * 0.4 - 0.2  // slightly behind

      offsets[i] = Math.random()
      speeds[i]  = 0.30 + Math.random() * 0.40
      seeds[i]   = Math.random()
    }
    return { positions, offsets, speeds, seeds }
  }, [])  // weapon position changes not expected at runtime

  const phase = useMemo(
    () => weapon.position[0] * 0.7 + weapon.position[2] * 0.4,
    [weapon.position]
  )

  // ── Animation loop ─────────────────────────────────────────────────────────
  useFrame((state) => {
    const t      = state.clock.elapsedTime
    const target = (isActive && !isSocialChapter) ? 1.0 : 0.0

    // Weapon float — sync glow position with the sprite
    const floatY  = Math.sin(t * weapon.floatSpeed + phase) * weapon.floatAmplitude
    const floatY2 = Math.cos(t * weapon.floatSpeed * 0.58 + phase + 1.3) * weapon.floatAmplitude * 0.38
    const posX = weapon.position[0]
    const posY = weapon.position[1] + floatY + floatY2
    const posZ = weapon.position[2] - 0.4   // slightly behind sprite

    if (glowRef.current) {
      glowRef.current.position.set(posX, posY, posZ)
      const mat = glowRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = t
      const cur = mat.uniforms.uActive.value
      if (Math.abs(cur - target) > 0.001)
        mat.uniforms.uActive.value = THREE.MathUtils.lerp(cur, target, 0.04)
    }

    if (particleRef.current) {
      // Particle world-position offset = weapon centre + float (particles in local space)
      particleRef.current.position.set(posX, posY, posZ)
      const mat = particleRef.current.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = t
      const cur = mat.uniforms.uActive.value
      if (Math.abs(cur - target) > 0.001)
        mat.uniforms.uActive.value = THREE.MathUtils.lerp(cur, target, 0.035)
    }
  })

  // Glow plane: 1.25× weapon scale — tight enough to stay near the silhouette
  const gW = weapon.scale * 1.25
  const gH = weapon.scale * 1.6 * 1.25

  return (
    <>
      {/* Silhouette-following coloured halo */}
      <mesh
        ref={glowRef}
        position={[weapon.position[0], weapon.position[1], weapon.position[2] - 0.4]}
      >
        <planeGeometry args={[gW, gH]} />
        <shaderMaterial
          vertexShader={glowVert}
          fragmentShader={glowFrag}
          uniforms={glowUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Spirit particles — pale motes drifting upward from the weapon */}
      <points
        ref={particleRef}
        position={[weapon.position[0], weapon.position[1], weapon.position[2] - 0.4]}
      >
        <bufferGeometry>
          <bufferAttribute args={[positions, 3]} attach="attributes-position" />
          <bufferAttribute args={[offsets,   1]} attach="attributes-aOffset"  />
          <bufferAttribute args={[speeds,    1]} attach="attributes-aSpeed"   />
          <bufferAttribute args={[seeds,     1]} attach="attributes-aSeed"    />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={particleVert}
          fragmentShader={particleFrag}
          uniforms={particleUniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
    </>
  )
}
