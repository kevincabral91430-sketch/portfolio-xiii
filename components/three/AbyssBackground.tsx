"use client"

import { useRef, useMemo, useEffect } from "react"
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
uniform vec3  uTint;   // active weapon colour — lerped slowly in JS
varying vec2 vUv;

// ── Helpers ────────────────────────────────────────────────────────────────

// Isolated gaussian beam — no fract() repetition, no visible tiling
float ray(float x, float center, float width) {
  float d = x - center;
  return exp(-d * d * width);
}

void main() {
  vec2 uv = vUv;

  // ── Four-layer tonal depth — void to surface ───────────────────────────
  vec3 colorVoid    = vec3(0.003, 0.005, 0.018);
  vec3 colorAbyss   = vec3(0.005, 0.010, 0.034);
  vec3 colorDeep    = vec3(0.0,   0.055, 0.130);
  vec3 colorSurface = vec3(0.0,   0.130, 0.240);

  float t = uv.y;
  vec3 bg = mix(colorVoid,  colorAbyss,   smoothstep(0.0,  0.25, t));
  bg       = mix(bg,         colorDeep,    smoothstep(0.18, 0.62, t));
  bg       = mix(bg,         colorSurface, smoothstep(0.52, 1.0,  t) * 0.28);

  // ── Weapon atmosphere — the active relic colours the water around it ───
  // Very subtle global tint that shifts with each chapter (lerped in JS).
  // Top half brighter — the weapon presence bleeds up through the water.
  float atmFade = 0.40 + uv.y * 0.60;
  bg += uTint * 0.016 * atmFade;

  // ── Farplane warm glow — sacred golden light from above the water ──────
  float farplaneY = smoothstep(0.55, 1.0, uv.y);
  bg += vec3(0.55, 0.35, 0.08) * farplaneY * 0.032;

  // ── Light shafts — 3 water-blue + 1 Farplane-gold, organic positions ──
  // Using isolated gaussians (ray()) instead of fract() — no visible repeat.
  float fade = uv.y * smoothstep(1.0, 0.62, uv.y);

  // Each shaft sways at its own unique speed and amplitude
  float sway1 = sin(uv.x * 2.0  + uTime * 0.031) * 0.08;
  float sway2 = cos(uv.x * 1.7  - uTime * 0.027 + 0.8) * 0.10;
  float sway3 = sin(uv.x * 2.5  + uTime * 0.019 + 2.1) * 0.07;
  float sway4 = sin(uv.x * 1.3  + uTime * 0.023) * 0.12;

  // Shaft positions drift slowly (very slow oscillation)
  float pos1  = 0.22 + sin(uTime * 0.012) * 0.022;
  float pos2  = 0.55 + cos(uTime * 0.009 + 1.1) * 0.018;
  float pos3  = 0.79 + sin(uTime * 0.011 + 2.4) * 0.016;
  float pos4  = 0.43 + cos(uTime * 0.008 + 0.5) * 0.024;

  float r1 = ray(uv.x + sway1, pos1, 80.0);
  float r2 = ray(uv.x + sway2, pos2, 110.0);
  float r3 = ray(uv.x + sway3, pos3, 95.0);
  float r4 = ray(uv.x + sway4, pos4, 58.0);  // golden shaft — broader

  vec3 rayCol  = vec3(0.0, 0.30, 0.52);
  vec3 rayGold = vec3(0.65, 0.42, 0.08);
  bg += rayCol  * (r1 * 0.030 + r2 * 0.022 + r3 * 0.018) * fade;
  bg += rayGold * r4 * 0.018 * fade;

  // ── Fluid noise — 4 octaves ────────────────────────────────────────────
  float n1 = sin(uv.x * 2.8  + uTime * 0.070) * cos(uv.y * 3.6  - uTime * 0.050);
  float n2 = sin(uv.x * 5.4  - uTime * 0.060 + 1.2) * sin(uv.y * 4.1  + uTime * 0.080);
  float n3 = cos(uv.x * 9.2  + uTime * 0.040) * cos(uv.y * 7.8  - uTime * 0.050 + 2.4);
  float n4 = sin(uv.x * 14.0 - uTime * 0.030 + 4.1) * cos(uv.y * 11.5 + uTime * 0.025);

  float noise = n1 * 0.40 + n2 * 0.28 + n3 * 0.20 + n4 * 0.12;
  float glow  = smoothstep(-0.38, 0.92, noise);
  bg += vec3(0.0, 0.28, 0.48) * glow * 0.042;

  // ── Central luminosity — shifts toward weapon tint ─────────────────────
  // The weapon's spiritual presence concentrates at the centre of the water.
  vec2 center = uv - vec2(0.5, 0.42);
  float cGlow = smoothstep(0.78, 0.0, length(center) * 1.08);
  bg += mix(vec3(0.0, 0.10, 0.22), uTint * 0.55, 0.38) * cGlow * 0.120;

  // ── Moonflow caustics ──────────────────────────────────────────────────
  float cx = sin(uv.x * 18.0 + uTime * 0.12) * cos(uv.x * 11.0 - uTime * 0.08);
  float cy = cos(uv.y * 14.0 - uTime * 0.09) * sin(uv.y * 9.0  + uTime * 0.11);
  float caustic  = smoothstep(0.60, 1.0, (cx + cy) * 0.5 + 0.5);
  float caustBand = smoothstep(0.0, 0.12, 1.0 - abs(uv.y - 0.75)) * 0.018;
  bg += vec3(0.35, 0.72, 0.92) * caustic * caustBand;

  // Caustic surface band
  float band = smoothstep(0.0, 0.052, 1.0 - abs(uv.y - 0.73)) * 0.025;
  bg += vec3(0.0, 0.42, 0.62) * band;

  // ── Pyrefly motes — warm gold/amber ───────────────────────────────────
  vec2 m1 = vec2(0.27 + sin(uTime * 0.105) * 0.062, 0.61 + cos(uTime * 0.088) * 0.042);
  vec2 m2 = vec2(0.71 + cos(uTime * 0.138) * 0.051, 0.37 + sin(uTime * 0.097) * 0.053);
  vec2 m3 = vec2(0.51 + sin(uTime * 0.072) * 0.068, 0.77 + cos(uTime * 0.115) * 0.032);
  vec2 m4 = vec2(0.17 + cos(uTime * 0.123) * 0.044, 0.44 + sin(uTime * 0.083) * 0.058);
  vec2 m5 = vec2(0.84 + sin(uTime * 0.091) * 0.038, 0.55 + cos(uTime * 0.107) * 0.047);
  vec2 m6 = vec2(0.38 + cos(uTime * 0.094) * 0.055, 0.28 + sin(uTime * 0.076) * 0.048);
  vec2 m7 = vec2(0.63 + sin(uTime * 0.117) * 0.042, 0.68 + cos(uTime * 0.099) * 0.036);
  vec2 m8 = vec2(0.46 + cos(uTime * 0.081) * 0.059, 0.52 + sin(uTime * 0.113 + 1.9) * 0.038);

  float p1 = exp(-length((uv - m1) * vec2(72.0, 72.0)));
  float p2 = exp(-length((uv - m2) * vec2(88.0, 88.0)));
  float p3 = exp(-length((uv - m3) * vec2(78.0, 78.0)));
  float p4 = exp(-length((uv - m4) * vec2(66.0, 66.0)));
  float p5 = exp(-length((uv - m5) * vec2(95.0, 95.0)));
  float p6 = exp(-length((uv - m6) * vec2(82.0, 82.0)));
  float p7 = exp(-length((uv - m7) * vec2(70.0, 70.0)));
  float p8 = exp(-length((uv - m8) * vec2(85.0, 85.0)));

  float motePulse = sin(uTime * 0.38) * 0.5 + 0.5;

  vec3 pyreflyGold = vec3(1.00, 0.72, 0.18);
  float moteWarm = p1 + p3 + p5 * motePulse + p6 + p7 * (1.0 - motePulse * 0.4) + p8 * motePulse;
  bg += pyreflyGold * moteWarm * 0.072;

  vec3 pyreflyCool = vec3(0.70, 0.88, 1.00);
  float moteCool = p2 * motePulse + p4 * (1.0 - motePulse * 0.5);
  bg += pyreflyCool * moteCool * 0.038;

  // ── Vignette ───────────────────────────────────────────────────────────
  vec2 vigUv = uv * (1.0 - uv.yx);
  float vignette = pow(clamp(vigUv.x * vigUv.y * 14.0, 0.0, 1.0), 0.42);
  bg *= mix(0.80, 1.0, vignette);

  gl_FragColor = vec4(bg, 1.0);
}
`

interface AbyssBackgroundProps {
  tint?: [number, number, number]
}

export default function AbyssBackground({ tint = [0.404, 0.91, 0.976] }: AbyssBackgroundProps) {
  const meshRef  = useRef<THREE.Mesh>(null)
  const tintRef  = useRef<[number, number, number]>(tint)

  // Keep tintRef in sync with prop (no re-render, lerp happens in useFrame)
  useEffect(() => { tintRef.current = tint }, [tint])

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uTint: { value: new THREE.Vector3(0.404, 0.91, 0.976) },
  }), [])

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Slow atmospheric shift toward active weapon colour (~2s to reach 63%)
    const [tr, tg, tb] = tintRef.current
    const v = mat.uniforms.uTint.value as THREE.Vector3
    v.x = THREE.MathUtils.lerp(v.x, tr, 0.008)
    v.y = THREE.MathUtils.lerp(v.y, tg, 0.008)
    v.z = THREE.MathUtils.lerp(v.z, tb, 0.008)
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
