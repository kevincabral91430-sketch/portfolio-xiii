"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// ─── MistLayer — deep volumetric fog at z=-22 ────────────────────────────────
//
// 6 large organic gaussian blobs drifting very slowly.
// Evokes the sacred underwater mist of the Moonflow / Farplane threshold —
// the space between the living world and the afterlife, filled with slow,
// luminous vapour.
//
// Each blob: ~14-20 world units radius, alpha 0.015-0.022.
// No texture, no rectangle artifact — pure gaussian falloff in UV space.

const mistVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const mistFrag = `
uniform float uTime;
varying vec2 vUv;

float blob(vec2 uv, vec2 center, float radius, float wobbleSpeed) {
  vec2 d = uv - center;
  float angle = atan(d.y, d.x);
  float r = length(d);
  // Organic edge: radius wobbles gently with angle and time
  float w = radius * (
    1.0
    + sin(angle * 2.0 + uTime * wobbleSpeed) * 0.10
    + cos(angle * 3.0 - uTime * wobbleSpeed * 0.65) * 0.06
  );
  return exp(-r * r / (w * w) * 5.5);
}

void main() {
  vec2 uv = vUv;

  // 6 blobs — positions drift along slow Lissajous paths
  vec2 b1 = vec2(0.18 + sin(uTime * 0.0065) * 0.09, 0.58 + cos(uTime * 0.0050) * 0.07);
  vec2 b2 = vec2(0.67 + cos(uTime * 0.0088) * 0.07, 0.32 + sin(uTime * 0.0062 + 1.2) * 0.06);
  vec2 b3 = vec2(0.44 + sin(uTime * 0.0058 + 2.1) * 0.10, 0.74 + cos(uTime * 0.0078) * 0.05);
  vec2 b4 = vec2(0.83 + cos(uTime * 0.0075 + 0.7) * 0.05, 0.45 + sin(uTime * 0.0068 + 3.0) * 0.08);
  vec2 b5 = vec2(0.30 + sin(uTime * 0.0095 + 1.8) * 0.07, 0.18 + cos(uTime * 0.0055 + 0.4) * 0.05);
  vec2 b6 = vec2(0.71 + cos(uTime * 0.0070 + 2.6) * 0.08, 0.80 + sin(uTime * 0.0082 + 1.5) * 0.05);

  float m = blob(uv, b1, 0.17, 0.042)
          + blob(uv, b2, 0.15, 0.037)
          + blob(uv, b3, 0.19, 0.031)
          + blob(uv, b4, 0.13, 0.045)
          + blob(uv, b5, 0.14, 0.038)
          + blob(uv, b6, 0.16, 0.041);

  // Very slow overall breath — the mist is alive
  float breath = 0.80 + sin(uTime * 0.18) * 0.20;

  // Deep sacred blue — cold, spiritual, aquatic
  vec3 color = vec3(0.025, 0.18, 0.40);

  float alpha = clamp(m * breath * 0.024, 0.0, 0.045);
  gl_FragColor = vec4(color, alpha);
}
`

export default function MistLayer() {
  const meshRef  = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    ;(meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value =
      state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} position={[0, 0, -22]} renderOrder={-1}>
      <planeGeometry args={[160, 120]} />
      <shaderMaterial
        vertexShader={mistVert}
        fragmentShader={mistFrag}
        uniforms={uniforms}
        transparent
        depthTest={false}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
