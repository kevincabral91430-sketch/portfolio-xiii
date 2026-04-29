"use client"

import { useRef, useMemo, useEffect } from "react"
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
uniform float uTintAmt;   // how much the nappe shifts toward weapon tint
uniform vec3  uColor;     // base nappe colour
uniform vec3  uTint;      // active weapon tint (lerped slowly)
varying vec2 vUv;

void main() {
  float dx = vUv.x - 0.5;

  float widthMod = 1.0 + sin(uTime * uSpeed + uPhase) * 0.18;
  float beam     = exp(-dx * dx * 20.0 * widthMod);
  float core     = exp(-dx * dx * 75.0 * widthMod);

  float fadeY = smoothstep(0.0, 0.16, vUv.y) * smoothstep(1.0, 0.72, vUv.y);

  float ripple = sin(vUv.y * 5.5 - uTime * uSpeed * 3.27 + uPhase) * 0.5 + 0.5;
  float energy = (beam * 0.82 + core * 0.18) * fadeY * (0.48 + ripple * 0.52);

  // Cool nappes shift toward the active weapon colour (20%).
  // Warm Farplane nappes stay mostly gold (8% shift only).
  vec3 finalColor = mix(uColor, uTint, uTintAmt);

  float alpha = energy * 0.082 * uAlphaScale;
  gl_FragColor = vec4(finalColor, alpha);
}
`

interface NappeData {
  position:   [number, number, number]
  rotation:   [number, number, number]
  scale:      [number, number, number]
  color:      THREE.Vector3
  phase:      number
  speed:      number
  alphaScale: number
  driftAmp:   number
  driftSpeed: number
  tintAmt:    number   // 0.20 for cool nappes, 0.08 for warm Farplane nappes
}

const NAPPES: NappeData[] = [
  // ─── Water caustic nappes — cool blue-teal ────────────────────────────────
  {
    position:   [-8,   4, -18],
    rotation:   [0,  0.3, 0],
    scale:      [6,  28,  1],
    color:      new THREE.Vector3(0.0, 0.52, 0.82),
    phase:      0.0,
    speed:      0.17,
    alphaScale: 1.0,
    driftAmp:   1.30,
    driftSpeed: 0.115,
    tintAmt:    0.20,
  },
  {
    position:   [10,  2, -22],
    rotation:   [0, -0.2, 0],
    scale:      [5, 24,   1],
    color:      new THREE.Vector3(0.08, 0.38, 0.88),
    phase:      1.8,
    speed:      0.17,
    alphaScale: 1.0,
    driftAmp:   1.30,
    driftSpeed: 0.115,
    tintAmt:    0.20,
  },
  {
    position:   [0,  -2, -20],
    rotation:   [0,   0, 0],
    scale:      [7,  30,  1],
    color:      new THREE.Vector3(0.0, 0.58, 0.72),
    phase:      3.2,
    speed:      0.17,
    alphaScale: 1.0,
    driftAmp:   1.30,
    driftSpeed: 0.115,
    tintAmt:    0.20,
  },
  // ─── Farplane veils — warm gold, sacred light descending from above ────────
  {
    position:   [-6,  10, -24],
    rotation:   [0, 0.15, 0],
    scale:      [8,  20,  1],
    color:      new THREE.Vector3(0.72, 0.48, 0.10),
    phase:      0.8,
    speed:      0.09,
    alphaScale: 0.80,
    driftAmp:   0.75,
    driftSpeed: 0.065,
    tintAmt:    0.08,
  },
  {
    position:   [8,  12, -26],
    rotation:   [0, -0.12, 0],
    scale:      [6,  18,  1],
    color:      new THREE.Vector3(0.68, 0.40, 0.08),
    phase:      2.5,
    speed:      0.09,
    alphaScale: 0.75,
    driftAmp:   0.75,
    driftSpeed: 0.060,
    tintAmt:    0.08,
  },
]

interface LightNappesProps {
  tint?: [number, number, number]
}

export default function LightNappes({ tint = [0.404, 0.91, 0.976] }: LightNappesProps) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>([])
  const tintRef  = useRef(tint)
  useEffect(() => { tintRef.current = tint }, [tint])

  const uniformsArray = useMemo(
    () =>
      NAPPES.map((n) => ({
        uTime:       { value: 0 },
        uPhase:      { value: n.phase },
        uSpeed:      { value: n.speed },
        uAlphaScale: { value: n.alphaScale },
        uTintAmt:    { value: n.tintAmt },
        uColor:      { value: n.color.clone() },
        uTint:       { value: new THREE.Vector3(...tint) },
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  )

  useFrame((state) => {
    const t = state.clock.elapsedTime
    const [tr, tg, tb] = tintRef.current

    for (let i = 0; i < NAPPES.length; i++) {
      const mesh = meshRefs.current[i]
      if (!mesh) continue
      const mat = mesh.material as THREE.ShaderMaterial
      mat.uniforms.uTime.value = t

      // Vertical drift
      mesh.position.y =
        NAPPES[i].position[1] +
        Math.sin(t * NAPPES[i].driftSpeed + NAPPES[i].phase) * NAPPES[i].driftAmp

      // Slow tint lerp — nappe colour breathes with active weapon
      const v = mat.uniforms.uTint.value as THREE.Vector3
      v.x = THREE.MathUtils.lerp(v.x, tr, 0.006)
      v.y = THREE.MathUtils.lerp(v.y, tg, 0.006)
      v.z = THREE.MathUtils.lerp(v.z, tb, 0.006)
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
