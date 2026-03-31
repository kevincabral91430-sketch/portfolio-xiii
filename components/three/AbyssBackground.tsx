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

  // Four-layer tonal depth — void to surface
  vec3 colorVoid    = vec3(0.003, 0.005, 0.018);
  vec3 colorAbyss   = vec3(0.005, 0.010, 0.034);
  vec3 colorDeep    = vec3(0.0,   0.055, 0.130);
  vec3 colorSurface = vec3(0.0,   0.130, 0.240);

  float t = uv.y;
  vec3 bg = mix(colorVoid,  colorAbyss,   smoothstep(0.0,  0.25, t));
  bg       = mix(bg,         colorDeep,    smoothstep(0.18, 0.62, t));
  bg       = mix(bg,         colorSurface, smoothstep(0.52, 1.0,  t) * 0.28);

  // --- Light shafts from above (subsurface scatter effect) ---
  float fade = uv.y * smoothstep(1.0, 0.62, uv.y);

  float r1 = exp(-pow(fract(uv.x * 4.3 + sin(uv.x * 2.0 + uTime * 0.022) * 0.22) - 0.5, 2.0) * 62.0);
  float r2 = exp(-pow(fract(uv.x * 3.6 + cos(uv.x * 1.7 - uTime * 0.018) * 0.28 + 0.18) - 0.5, 2.0) * 88.0);
  float r3 = exp(-pow(fract(uv.x * 5.2 - sin(uv.x * 2.5 + uTime * 0.015) * 0.18 + 0.42) - 0.5, 2.0) * 72.0);

  vec3 rayCol = vec3(0.0, 0.30, 0.52);
  bg += rayCol * (r1 * 0.030 + r2 * 0.022 + r3 * 0.018) * fade;

  // --- Fluid noise — 4 octaves, each at different scale/speed ---
  float n1 = sin(uv.x * 2.8  + uTime * 0.070) * cos(uv.y * 3.6  - uTime * 0.050);
  float n2 = sin(uv.x * 5.4  - uTime * 0.060 + 1.2) * sin(uv.y * 4.1  + uTime * 0.080);
  float n3 = cos(uv.x * 9.2  + uTime * 0.040) * cos(uv.y * 7.8  - uTime * 0.050 + 2.4);
  float n4 = sin(uv.x * 14.0 - uTime * 0.030 + 4.1) * cos(uv.y * 11.5 + uTime * 0.025);

  float noise = n1 * 0.40 + n2 * 0.28 + n3 * 0.20 + n4 * 0.12;
  float glow  = smoothstep(-0.38, 0.92, noise);
  bg += vec3(0.0, 0.28, 0.48) * glow * 0.042;

  // --- Central luminosity — depth illusion ---
  vec2 center = uv - vec2(0.5, 0.42);
  float cGlow = smoothstep(0.78, 0.0, length(center) * 1.08);
  bg += vec3(0.0, 0.10, 0.22) * cGlow * 0.095;

  // --- Caustic surface band ---
  float band = smoothstep(0.0, 0.052, 1.0 - abs(uv.y - 0.73)) * 0.025;
  bg += vec3(0.0, 0.42, 0.62) * band;

  // --- Pyrefly motes (FFX spirit energy — slow, organic drift) ---
  vec2 m1 = vec2(0.27 + sin(uTime * 0.105) * 0.062, 0.61 + cos(uTime * 0.088) * 0.042);
  vec2 m2 = vec2(0.71 + cos(uTime * 0.138) * 0.051, 0.37 + sin(uTime * 0.097) * 0.053);
  vec2 m3 = vec2(0.51 + sin(uTime * 0.072) * 0.068, 0.77 + cos(uTime * 0.115) * 0.032);
  vec2 m4 = vec2(0.17 + cos(uTime * 0.123) * 0.044, 0.44 + sin(uTime * 0.083) * 0.058);
  vec2 m5 = vec2(0.84 + sin(uTime * 0.091) * 0.038, 0.55 + cos(uTime * 0.107) * 0.047);

  float p1 = exp(-length((uv - m1) * vec2(72.0, 72.0)));
  float p2 = exp(-length((uv - m2) * vec2(88.0, 88.0)));
  float p3 = exp(-length((uv - m3) * vec2(78.0, 78.0)));
  float p4 = exp(-length((uv - m4) * vec2(66.0, 66.0)));
  float p5 = exp(-length((uv - m5) * vec2(95.0, 95.0)));

  float motePulse = sin(uTime * 0.38) * 0.5 + 0.5;
  float motes = p1 + p2 * motePulse + p3 + p4 * (1.0 - motePulse * 0.5) + p5 * motePulse;
  bg += vec3(0.32, 0.88, 1.0) * motes * 0.052;

  // --- Vignette (focus center, darken edges) ---
  vec2 vigUv = uv * (1.0 - uv.yx);
  float vignette = pow(clamp(vigUv.x * vigUv.y * 14.0, 0.0, 1.0), 0.42);
  bg *= mix(0.80, 1.0, vignette);

  gl_FragColor = vec4(bg, 1.0);
}
`

export default function AbyssBackground() {
  const meshRef  = useRef<THREE.Mesh>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 } }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    ;(meshRef.current.material as THREE.ShaderMaterial).uniforms.uTime.value =
      state.clock.elapsedTime
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
