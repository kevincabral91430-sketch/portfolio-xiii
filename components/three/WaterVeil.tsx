"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// ─── WaterVeil — intermediate caustic depth layer ─────────────────────────────
// Rendered at a configurable Z depth (default -10).
// Two instances in the scene — z=-10 (primary) and z=-20 (secondary, lower alpha)
// — create a visible parallax as the camera translates between chapters, giving
// a genuine sense of volume and submersion.
//
// Shader: Moonflow caustics — light filtering through a moving water surface.

const veilVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const veilFrag = `
uniform float uTime;
uniform float uAlphaScale;
uniform float uTileScale;
varying vec2 vUv;

void main() {
  vec2 uv = vUv * uTileScale;

  // Two-layer caustic interference
  float cx1 = sin(uv.x * 8.0  + uTime * 0.16) * cos(uv.y * 6.0  - uTime * 0.13);
  float cx2 = cos(uv.x * 5.5  - uTime * 0.11 + 1.4) * sin(uv.y * 9.0  + uTime * 0.14);
  float cx3 = sin(uv.x * 12.0 + uTime * 0.09 + 2.7) * cos(uv.y * 7.5  - uTime * 0.10);

  float caustic = smoothstep(0.35, 1.0, (cx1 * 0.50 + cx2 * 0.35 + cx3 * 0.15) * 0.5 + 0.5);

  // Soft edge — no hard rectangle at plane boundaries
  vec2 p = vUv;
  float edgeFade =
    smoothstep(0.0, 0.10, p.x) * smoothstep(1.0, 0.90, p.x) *
    smoothstep(0.0, 0.10, p.y) * smoothstep(1.0, 0.90, p.y);

  float breath = 0.80 + sin(uTime * 0.26) * 0.20;

  float alpha = caustic * edgeFade * breath * 0.038 * uAlphaScale;
  vec3  color = vec3(0.04, 0.34, 0.60);

  gl_FragColor = vec4(color, alpha);
}
`

interface WaterVeilProps {
  zPos?:       number   // world Z position (default -10)
  alphaScale?: number   // multiplier on base alpha (default 1.0)
  tileScale?:  number   // UV tile frequency (default 2.8)
}

export default function WaterVeil({
  zPos       = -10,
  alphaScale = 1.0,
  tileScale  = 2.8,
}: WaterVeilProps) {
  const meshRef = useRef<THREE.Mesh>(null)

  const uniforms = useMemo(() => ({
    uTime:       { value: 0 },
    uAlphaScale: { value: alphaScale },
    uTileScale:  { value: tileScale },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    ;(meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value =
      state.clock.elapsedTime
  })

  return (
    <mesh ref={meshRef} position={[0, 0, zPos]} renderOrder={-1}>
      <planeGeometry args={[160, 160]} />
      <shaderMaterial
        vertexShader={veilVert}
        fragmentShader={veilFrag}
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
