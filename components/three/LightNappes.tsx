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
uniform float uSpeed;
uniform float uAlphaScale;
uniform vec3 uColor;
varying vec2 vUv;

void main() {
  float dx = vUv.x - 0.5;

  // Organic width variation over time — speed-controlled
  float widthMod = 1.0 + sin(uTime * uSpeed + uPhase) * 0.18;
  float beam     = exp(-dx * dx * 20.0 * widthMod);

  // Brighter inner core — creates depth inside the nappe
  float core = exp(-dx * dx * 75.0 * widthMod);

  // Top & bottom fade — gentle, not harsh
  float fadeY = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.72, vUv.y);

  // Slow undulation along height — speed-controlled
  float ripple = sin(vUv.y * 5.5 - uTime * uSpeed * 3.27 + uPhase) * 0.5 + 0.5;
  float energy = (beam * 0.82 + core * 0.18) * fadeY * (0.48 + ripple * 0.52);

  float alpha = energy * 0.062 * uAlphaScale;
  gl_FragColor = vec4(uColor, alpha);
}
`

interface NappeData {
  position:   [number, number, number]
  rotation:   [number, number, number]
  scale:      [number, number, number]
  color:      THREE.Vector3
  phase:      number
  /** Animation speed multiplier — lower = more sacred/slow */
  speed:      number
  /** Alpha relative to base 0.062 — Farplane veils are more transparent */
  alphaScale: number
  /** Vertical drift amplitude in world units */
  driftAmp:   number
  /** Vertical drift oscillation speed */
  driftSpeed: number
}

const NAPPES: NappeData[] = [
  // ─── Water caustic nappes — cool blue-teal, subsurface ocean light ────────
  {
    position:   [-8,   4, -18],
    rotation:   [0,  0.3, 0],
    scale:      [6,  28,  1],
    color:      new THREE.Vector3(0.0, 0.52, 0.82),
    phase:      0.0,
    speed:      0.11,
    alphaScale: 1.0,
    driftAmp:   0.9,
    driftSpeed: 0.075,
  },
  {
    position:   [10,  2, -22],
    rotation:   [0, -0.2, 0],
    scale:      [5, 24,   1],
    color:      new THREE.Vector3(0.08, 0.38, 0.88),
    phase:      1.8,
    speed:      0.11,
    alphaScale: 1.0,
    driftAmp:   0.9,
    driftSpeed: 0.075,
  },
  {
    position:   [0,  -2, -20],
    rotation:   [0,   0, 0],
    scale:      [7,  30,  1],
    color:      new THREE.Vector3(0.0, 0.58, 0.72),
    phase:      3.2,
    speed:      0.11,
    alphaScale: 1.0,
    driftAmp:   0.9,
    driftSpeed: 0.075,
  },
  // ─── Farplane veils — warm gold, sacred light descending from above ────────
  // These sit high in the scene and drift very slowly — they evoke the membrane
  // between Spira and the Farplane: translucent, luminous, memorial.
  {
    position:   [-6,  10, -24],
    rotation:   [0, 0.15, 0],
    scale:      [8,  20,  1],
    color:      new THREE.Vector3(0.72, 0.48, 0.10),
    phase:      0.8,
    speed:      0.06,     // slow — sacred, not energetic
    alphaScale: 0.70,     // more transparent than water nappes
    driftAmp:   0.50,     // gentler drift
    driftSpeed: 0.042,
  },
  {
    position:   [8,  12, -26],
    rotation:   [0, -0.12, 0],
    scale:      [6,  18,  1],
    color:      new THREE.Vector3(0.68, 0.40, 0.08),
    phase:      2.5,
    speed:      0.06,
    alphaScale: 0.65,
    driftAmp:   0.50,
    driftSpeed: 0.038,
  },
]

export default function LightNappes() {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])

  const uniformsArray = useMemo(
    () =>
      NAPPES.map((n) => ({
        uTime:       { value: 0 },
        uPhase:      { value: n.phase },
        uSpeed:      { value: n.speed },
        uAlphaScale: { value: n.alphaScale },
        uColor:      { value: n.color },
      })),
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    for (let i = 0; i < NAPPES.length; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue
      const mat = mesh.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = t
      mesh.position.y =
        NAPPES[i].position[1] +
        Math.sin(t * NAPPES[i].driftSpeed + NAPPES[i].phase) * NAPPES[i].driftAmp
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
