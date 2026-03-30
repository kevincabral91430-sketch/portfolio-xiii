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

  // Drift upward slowly, reset at top
  float yProgress = mod(pos.y + uTime * aSpeed * 0.3 + aOffset * 20.0, 20.0) - 10.0;
  pos.y = yProgress;

  // Gentle horizontal drift
  pos.x += sin(uTime * aSpeed * 0.2 + aOffset * 6.28) * 0.8;
  pos.z += cos(uTime * aSpeed * 0.15 + aOffset * 3.14) * 0.5;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Size based on depth
  gl_PointSize = (2.5 + aOffset * 1.5) * (400.0 / -mvPosition.z);
  gl_PointSize = clamp(gl_PointSize, 0.5, 4.0);

  // Fade in/out based on y position
  float fadeY = 1.0 - abs(yProgress / 10.0);
  vAlpha = fadeY * (0.3 + aOffset * 0.5);
}
`

const particleFragmentShader = `
varying float vAlpha;

void main() {
  // Circular soft particle
  vec2 center = gl_PointCoord - 0.5;
  float dist = length(center);
  if (dist > 0.5) discard;
  float alpha = (1.0 - dist * 2.0) * vAlpha;
  gl_FragColor = vec4(0.4, 0.8, 1.0, alpha);
}
`

export default function ParticleField() {
  const meshRef = useRef<THREE.Points>(null)

  const { positions, offsets, speeds } = useMemo(() => {
    const positions = new Float32Array(PARTICLE_COUNT * 3)
    const offsets = new Float32Array(PARTICLE_COUNT)
    const speeds = new Float32Array(PARTICLE_COUNT)

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 24
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20
      positions[i * 3 + 2] = (Math.random() - 0.5) * 16 - 4

      offsets[i] = Math.random()
      speeds[i] = 0.3 + Math.random() * 0.7
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
        <bufferAttribute args={[offsets, 1]} attach="attributes-aOffset" />
        <bufferAttribute args={[speeds, 1]} attach="attributes-aSpeed" />
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
