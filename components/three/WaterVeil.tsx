"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

// ─── WaterVeil — intermediate depth layer ─────────────────────────────────────
// A translucent aquatic plane at z=-10, between the background (z=-35) and the
// weapons (z=0 to -6). As the camera travels between weapon chapters, this plane
// shifts with a different parallax than the background — creating a sense of
// genuine 3D volume and the feeling of being submerged in sacred water.
//
// The shader replicates Moonflow-style caustics: light filtering through a moving
// water surface, casting shifting nets of brightness onto whatever is behind it.

const veilVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const veilFrag = `
uniform float uTime;
varying vec2 vUv;

void main() {
  // Tile the UV so caustics read at a human-scale water-surface frequency
  vec2 uv = vUv * 2.8;

  // Two-layer caustic interference — primary + reflected secondary
  float cx1 = sin(uv.x * 8.0  + uTime * 0.16) * cos(uv.y * 6.0  - uTime * 0.13);
  float cx2 = cos(uv.x * 5.5  - uTime * 0.11 + 1.4) * sin(uv.y * 9.0  + uTime * 0.14);
  float cx3 = sin(uv.x * 12.0 + uTime * 0.09 + 2.7) * cos(uv.y * 7.5  - uTime * 0.10);

  float caustic = smoothstep(0.35, 1.0, (cx1 * 0.50 + cx2 * 0.35 + cx3 * 0.15) * 0.5 + 0.5);

  // Soft edge fade — prevents hard rectangular cutoff at plane boundaries
  vec2 p = vUv;
  float edgeFade =
    smoothstep(0.0, 0.12, p.x) * smoothstep(1.0, 0.88, p.x) *
    smoothstep(0.0, 0.12, p.y) * smoothstep(1.0, 0.88, p.y);

  // Slow overall breath — the veil pulses gently like a living water surface
  float breath = 0.80 + sin(uTime * 0.28) * 0.20;

  float alpha = caustic * edgeFade * breath * 0.036;
  vec3  color = vec3(0.04, 0.34, 0.60);

  gl_FragColor = vec4(color, alpha);
}
`

export default function WaterVeil() {
  const meshRef  = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    ;(meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value =
      state.clock.elapsedTime
  })

  // Large plane — covers the full scene volume at all camera positions
  return (
    <mesh ref={meshRef} position={[0, 0, -10]} renderOrder={-1}>
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
