"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"

const nappeVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const nappeFrag = `
uniform float uTime;
uniform float uPhase;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  // Vertical beam shape — soft gaussian column
  float dx = vUv.x - 0.5;
  float beam = exp(-dx * dx * 22.0);

  // Fade top and bottom
  float fadeY = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

  // Slow undulation along the beam
  float ripple = sin(vUv.y * 6.0 - uTime * 0.4 + uPhase) * 0.5 + 0.5;
  float energy = beam * fadeY * (0.55 + ripple * 0.45);

  // Very low opacity — purely atmospheric
  float alpha = energy * 0.07;
  gl_FragColor = vec4(uColor, alpha);
}
`

interface NappeData {
  position: [number, number, number]
  rotation: [number, number, number]
  scale: [number, number, number]
  color: THREE.Vector3
  phase: number
}

// 5 nappes spread around the scene — never clustered, always subtle
const NAPPES: NappeData[] = [
  {
    position: [-8, 4, -18],
    rotation: [0, 0.3, 0],
    scale: [6, 28, 1],
    color: new THREE.Vector3(0.0, 0.55, 0.85),
    phase: 0.0,
  },
  {
    position: [10, 2, -22],
    rotation: [0, -0.2, 0],
    scale: [5, 24, 1],
    color: new THREE.Vector3(0.1, 0.4, 0.9),
    phase: 1.8,
  },
  {
    position: [0, -2, -20],
    rotation: [0, 0, 0],
    scale: [7, 30, 1],
    color: new THREE.Vector3(0.0, 0.6, 0.75),
    phase: 3.2,
  },
  {
    position: [-14, 0, -16],
    rotation: [0, 0.5, 0],
    scale: [4, 20, 1],
    color: new THREE.Vector3(0.05, 0.35, 0.7),
    phase: 4.7,
  },
  {
    position: [16, -4, -19],
    rotation: [0, -0.4, 0],
    scale: [5, 22, 1],
    color: new THREE.Vector3(0.0, 0.5, 0.8),
    phase: 2.1,
  },
]

export default function LightNappes() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])

  const uniformsArray = useMemo(
    () =>
      NAPPES.map((n) => ({
        uTime: { value: 0 },
        uPhase: { value: n.phase },
        uColor: { value: n.color },
      })),
    []
  )

  // Single useFrame for all nappes — avoids 5 separate frame callbacks
  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < NAPPES.length; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue
      const mat = mesh.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = t
      mesh.position.y = NAPPES[i].position[1] + Math.sin(t * 0.08 + NAPPES[i].phase) * 1.2
    }
  })

  return (
    <>
      {NAPPES.map((nappe, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el }}
          position={nappe.position}
          rotation={nappe.rotation}
          scale={nappe.scale}
        >
          <planeGeometry args={[1, 1]} />
          <shaderMaterial
            vertexShader={nappeVert}
            fragmentShader={nappeFrag}
            uniforms={uniformsArray[i]}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
            side={THREE.DoubleSide}
          />
        </mesh>
      ))}
    </>
  )
}
