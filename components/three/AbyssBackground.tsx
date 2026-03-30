"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const vertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
varying vec2 vUv;

void main() {
  vec2 uv = vUv;

  // Deep tonal base — almost black at bottom, deep ocean blue at top
  vec3 colorAbyss  = vec3(0.006, 0.010, 0.028);
  vec3 colorDeep   = vec3(0.0,   0.055, 0.13);
  vec3 colorSurface = vec3(0.0,  0.13,  0.24);

  float t = uv.y;
  vec3 bg = mix(colorAbyss, colorDeep, smoothstep(0.0, 0.55, t));
  bg = mix(bg, colorSurface, smoothstep(0.45, 1.0, t) * 0.35);

  // Layer 1 — large slow fluid rolls
  float n1 = sin(uv.x * 2.8 + uTime * 0.07) * cos(uv.y * 3.6 - uTime * 0.05);
  // Layer 2 — medium crossing waves
  float n2 = sin(uv.x * 5.4 - uTime * 0.06 + 1.2) * sin(uv.y * 4.1 + uTime * 0.08);
  // Layer 3 — fine shimmer
  float n3 = cos(uv.x * 9.2 + uTime * 0.04) * cos(uv.y * 7.8 - uTime * 0.05 + 2.4);

  float noise = n1 * 0.5 + n2 * 0.32 + n3 * 0.18;
  // Remap to [0,1] softly
  float glow = smoothstep(-0.3, 0.85, noise);

  // Teal energy nappe — very subtle
  vec3 nappeColor = vec3(0.0, 0.35, 0.55);
  bg += nappeColor * glow * 0.07;

  // Soft central luminosity — depth illusion
  vec2 centered = uv - vec2(0.5, 0.42);
  float centerGlow = smoothstep(0.7, 0.0, length(centered));
  bg += vec3(0.0, 0.12, 0.25) * centerGlow * 0.10;

  // Subtle horizontal light band (surface reflection)
  float band = smoothstep(0.0, 0.06, 1.0 - abs(uv.y - 0.72)) * 0.04;
  bg += vec3(0.0, 0.4, 0.6) * band;

  gl_FragColor = vec4(bg, 1.0);
}
`

export default function AbyssBackground() {
  const meshRef = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    ;(meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value = state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -35]} renderOrder={-1}>
      <planeGeometry args={[400, 400]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
      />
    </mesh>
  )
}
