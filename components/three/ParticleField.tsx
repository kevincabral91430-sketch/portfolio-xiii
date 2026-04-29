"use client"

import { useRef, useMemo, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// ─── ParticleField — three Z-stratified layers of pyrefly souls ──────────────
//
// Layer 0 — Deep   (600 pts, z=-15→-28): tiny, cool blue, very slow rise
// Layer 1 — Mid    (500 pts, z=-5→-14):  medium, mixed gold/blue, moderate rise
// Layer 2 — Near   (150 pts, z=-1→-4):   warm gold, large, slow — 15% weapon tint
//
// Stream behavior: 6 loose current "archetypes" (aStream 0-5). Particles in the
// same stream share a base drift frequency, creating the impression of souls
// travelling together in gentle currents toward the Farplane.
//
// Upward bias: all layers drift slowly upward (rising souls). Deep = slowest.

const DEEP_COUNT  = 600
const MID_COUNT   = 500
const NEAR_COUNT  = 150
const TOTAL       = DEEP_COUNT + MID_COUNT + NEAR_COUNT

const particleVert = `
uniform float uTime;
uniform vec3  uTint;
attribute float aOffset;
attribute float aSpeed;
attribute float aLayer;    // 0=deep  1=mid  2=near
attribute float aStream;   // 0–5  stream archetype
varying float vAlpha;
varying vec3  vColor;

void main() {
  vec3 pos = position;

  // ── Upward drift — souls rising toward the Farplane ──────────────────────
  // Rise speed scales with layer: deep slowest, near fastest.
  float riseSpeed = (0.028 + aLayer * 0.022) * aSpeed;
  float yProgress = mod(pos.y + uTime * riseSpeed + aOffset * 32.0, 32.0) - 16.0;
  pos.y = yProgress;

  // ── Stream-based lateral drift — 6 distinct current archetypes ───────────
  // Each stream has a unique base phase and oscillation frequency.
  // aOffset adds per-particle variation within the stream.
  float streamPhase = aStream * 1.0472;          // 2π/6 per stream
  float streamFreq  = 0.075 + aStream * 0.013;

  pos.x += sin(uTime * streamFreq       + streamPhase + aOffset * 6.28) * 0.85
         + sin(uTime * streamFreq * 0.5 + aOffset * 3.14 + 1.7)         * 0.30;
  pos.z += cos(uTime * streamFreq * 0.7 + streamPhase)                  * 0.38
         + cos(uTime * streamFreq * 0.4 + aOffset * 4.71 + 0.9)         * 0.16;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // ── Point size — larger for near layer, smaller for deep ─────────────────
  float baseSize  = 0.9 + aLayer * 1.5;   // deep=0.9  mid=2.4  near=3.9
  float sizePulse = 1.0 + sin(uTime * aSpeed * 0.8 + aOffset * 5.0) * 0.18;
  gl_PointSize = baseSize * (280.0 / -mvPosition.z) * sizePulse;
  gl_PointSize = clamp(gl_PointSize, 0.3, 4.8);

  // ── Alpha — deeper = dimmer + individual twinkle ──────────────────────────
  float baseAlpha = 0.08 + aLayer * 0.17;
  float fadeY     = 1.0 - abs(yProgress / 16.0);
  float twinkle   = sin(uTime * (1.1 + aOffset * 3.8) + aOffset * 8.2) * 0.32 + 0.68;
  vAlpha = baseAlpha * fadeY * twinkle;

  // ── Color — branchless layer selection ────────────────────────────────────
  // Deep: cold blue   Mid: mixed gold/blue   Near: warm gold + weapon tint (15%)
  vec3 deepColor = vec3(0.42, 0.70, 1.00);
  vec3 midColor  = mix(vec3(0.52, 0.76, 1.00), vec3(1.00, 0.82, 0.26), aOffset);
  vec3 nearColor = mix(vec3(1.00, 0.78, 0.20), clamp(uTint * 1.4, 0.0, 1.0), 0.15);

  vColor = deepColor;
  vColor = mix(vColor, midColor,  step(0.5,  aLayer));
  vColor = mix(vColor, nearColor, step(1.5,  aLayer));
}
`

const particleFrag = `
varying float vAlpha;
varying vec3  vColor;

void main() {
  vec2  center = gl_PointCoord - 0.5;
  float dist   = length(center);
  if (dist > 0.5) discard;

  // Soft gaussian — no hard circle, no gl_PointSize rectangle artifact
  float alpha = exp(-dist * dist * 7.0) * vAlpha;
  gl_FragColor = vec4(vColor, alpha);
}
`

interface ParticleFieldProps {
  tint?: [number, number, number]
}

export default function ParticleField({ tint = [0.404, 0.91, 0.976] }: ParticleFieldProps) {
  const meshRef = useRef<THREE.Points>(null)
  const tintRef = useRef(tint)
  useEffect(() => { tintRef.current = tint }, [tint])

  const { positions, offsets, speeds, layers, streams } = useMemo(() => {
    const positions = new Float32Array(TOTAL * 3)
    const offsets   = new Float32Array(TOTAL)
    const speeds    = new Float32Array(TOTAL)
    const layers    = new Float32Array(TOTAL)
    const streams   = new Float32Array(TOTAL)

    let idx = 0

    for (let d = 0; d < DEEP_COUNT; d++, idx++) {
      positions[idx * 3]     = (Math.random() - 0.5) * 54
      positions[idx * 3 + 1] = (Math.random() - 0.5) * 32
      positions[idx * 3 + 2] = -(15 + Math.random() * 13)
      offsets[idx] = Math.random()
      speeds[idx]  = 0.14 + Math.random() * 0.24
      layers[idx]  = 0
      streams[idx] = Math.floor(Math.random() * 6)
    }

    for (let m = 0; m < MID_COUNT; m++, idx++) {
      positions[idx * 3]     = (Math.random() - 0.5) * 52
      positions[idx * 3 + 1] = (Math.random() - 0.5) * 32
      positions[idx * 3 + 2] = -(5 + Math.random() * 9)
      offsets[idx] = Math.random()
      speeds[idx]  = 0.18 + Math.random() * 0.32
      layers[idx]  = 1
      streams[idx] = Math.floor(Math.random() * 6)
    }

    for (let n = 0; n < NEAR_COUNT; n++, idx++) {
      positions[idx * 3]     = (Math.random() - 0.5) * 50
      positions[idx * 3 + 1] = (Math.random() - 0.5) * 32
      positions[idx * 3 + 2] = -(1 + Math.random() * 3)
      offsets[idx] = Math.random()
      speeds[idx]  = 0.09 + Math.random() * 0.16
      layers[idx]  = 2
      streams[idx] = Math.floor(Math.random() * 6)
    }

    return { positions, offsets, speeds, layers, streams }
  }, [])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTint: { value: new THREE.Vector3(...tint) },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime

    const [tr, tg, tb] = tintRef.current
    const v = mat.uniforms.uTint.value as THREE.Vector3
    v.x = THREE.MathUtils.lerp(v.x, tr, 0.010)
    v.y = THREE.MathUtils.lerp(v.y, tg, 0.010)
    v.z = THREE.MathUtils.lerp(v.z, tb, 0.010)
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
        <bufferAttribute args={[offsets,   1]} attach="attributes-aOffset"  />
        <bufferAttribute args={[speeds,    1]} attach="attributes-aSpeed"   />
        <bufferAttribute args={[layers,    1]} attach="attributes-aLayer"   />
        <bufferAttribute args={[streams,   1]} attach="attributes-aStream"  />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVert}
        fragmentShader={particleFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
