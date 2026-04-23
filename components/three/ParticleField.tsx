"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const PARTICLE_COUNT = 1500

const particleVertexShader = `
uniform float uTime;
attribute float aOffset;
attribute float aSpeed;
varying float vAlpha;
varying float vWarmth;

void main() {
  vec3 pos = position;

  // Two-frequency drift — wraps across the full scene height (±16)
  float yProgress = mod(pos.y + uTime * aSpeed * 0.24 + aOffset * 32.0, 32.0) - 16.0;
  pos.y = yProgress;

  pos.x += sin(uTime * aSpeed * 0.18 + aOffset * 6.28) * 0.88
         + sin(uTime * aSpeed * 0.09 + aOffset * 3.14 + 1.7) * 0.32;
  pos.z += cos(uTime * aSpeed * 0.13 + aOffset * 3.14) * 0.55
         + cos(uTime * aSpeed * 0.07 + aOffset * 4.71 + 0.9) * 0.22;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Slightly larger — pyreflies have presence
  float sizePulse = 1.0 + sin(uTime * aSpeed * 0.72 + aOffset * 4.3) * 0.22;
  gl_PointSize = (2.0 + aOffset * 1.8) * (370.0 / -mvPosition.z) * sizePulse;
  gl_PointSize = clamp(gl_PointSize, 0.4, 3.8);

  // Twinkle — each pyrefly breathes at its own rhythm
  float fadeY   = 1.0 - abs(yProgress / 16.0);
  float twinkle = sin(uTime * (1.4 + aOffset * 2.8) + aOffset * 7.5) * 0.32 + 0.68;
  vAlpha = fadeY * (0.18 + aOffset * 0.42) * twinkle;

  // 70% warm gold, 30% cool blue-white — based on per-particle offset
  // aOffset is uniform [0,1] so step(0.30, aOffset) = 70% warm
  vWarmth = step(0.30, aOffset);
}
`

const particleFragmentShader = `
varying float vAlpha;
varying float vWarmth;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  float alpha = pow(1.0 - dist * 2.0, 2.0) * vAlpha;

  // Warm: gold core → amber halo | Cool: white-blue core → pale blue edge
  // Warm pyreflies = authentic FFX spirit energy (gold/amber luminescence)
  // Cool pyreflies = distant fading souls or water-reflected Farplane light
  vec3 warmColor = mix(vec3(1.00, 0.88, 0.35), vec3(0.90, 0.52, 0.08), dist * 2.0);
  vec3 coolColor = mix(vec3(0.85, 0.95, 1.00), vec3(0.55, 0.78, 1.00), dist * 2.0);
  vec3 color = mix(coolColor, warmColor, vWarmth);

  gl_FragColor = vec4(color, alpha);
}
`

export default function ParticleField() {
  const meshRef = useRef<THREE.Points>(null)

  const { positions, offsets, speeds } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const offsets   = new Float32Array(PARTICLE_COUNT)
    const speeds    = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 48   // ±24 — couvre toutes les armes (max ±16)
      positions[i * 3 + 1] = (Math.random() - 0.5) * 32   // ±16 — couvre la hauteur totale (Kimahri à y=-11)
      positions[i * 3 + 2] = (Math.random() - 0.5) * 18 - 6  // -15 à +3 — derrière toutes les armes

      offsets[i] = Math.random()
      speeds[i]  = 0.24 + Math.random() * 0.55   // slightly slower than before (was 0.28 + 0.65)
    }
    return { positions, offsets, speeds }
  }, [])

  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <points ref={meshRef}>
      <bufferGeometry>
        <bufferAttribute args={[positions, 3]} attach="attributes-position" />
        <bufferAttribute args={[offsets,   1]} attach="attributes-aOffset"  />
        <bufferAttribute args={[speeds,    1]} attach="attributes-aSpeed"   />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={particleVertexShader}
        fragmentShader={particleFragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  )
}
