"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const PARTICLE_COUNT = 600

const particleVertexShader = `
uniform float uTime;
attribute float aOffset;
attribute float aSpeed;
varying float vAlpha;

void main() {
  vec3 pos = position;

  // Two-frequency drift — removes mechanical regularity
  float yProgress = mod(pos.y + uTime * aSpeed * 0.28 + aOffset * 20.0, 20.0) - 10.0;
  pos.y = yProgress;

  pos.x += sin(uTime * aSpeed * 0.18 + aOffset * 6.28) * 0.88
         + sin(uTime * aSpeed * 0.09 + aOffset * 3.14 + 1.7) * 0.32;
  pos.z += cos(uTime * aSpeed * 0.13 + aOffset * 3.14) * 0.55
         + cos(uTime * aSpeed * 0.07 + aOffset * 4.71 + 0.9) * 0.22;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size with organic breath per particle
  float sizePulse = 1.0 + sin(uTime * aSpeed * 0.72 + aOffset * 4.3) * 0.22;
  gl_PointSize = (1.6 + aOffset * 1.7) * (370.0 / -mvPosition.z) * sizePulse;
  gl_PointSize = clamp(gl_PointSize, 0.3, 3.2);

  // Twinkle — each particle has its own frequency
  float fadeY   = 1.0 - abs(yProgress / 10.0);
  float twinkle = sin(uTime * (1.4 + aOffset * 2.8) + aOffset * 7.5) * 0.32 + 0.68;
  vAlpha = fadeY * (0.18 + aOffset * 0.42) * twinkle;
}
`

const particleFragmentShader = `
varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;

  // Soft power falloff — warmer glow at center
  float alpha = pow(1.0 - dist * 2.0, 2.0) * vAlpha;

  // Color gradient: cyan core → pale blue edge
  vec3 color = mix(vec3(0.40, 0.90, 1.00), vec3(0.65, 0.92, 1.0), dist * 2.0);

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
      positions[i * 3]     = (Math.random() - 0.5) * 24
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16 - 4

      offsets[i] = Math.random()
      speeds[i]  = 0.28 + Math.random() * 0.65
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
