"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// Depth-aware vertex shader — computes fog factor in view space
const vertexShader = `
uniform float uTime;
uniform float uActive;
varying vec2 vUv;
varying float vFogFactor;

void main() {
  vUv = uv;
  vec3 pos = position;

  // Subtle heartbeat pulse — reduced amplitude
  float pulseMag = sin(uTime * 1.8) * 0.006 * uActive;
  pos *= 1.0 + pulseMag;

  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPosition;

  // Fog factor from view-space depth (matches scene fog: near=35, far=100)
  float depth = -mvPosition.z;
  vFogFactor = clamp((depth - 35.0) / (100.0 - 35.0), 0.0, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
uniform float uActive;
uniform float uVisibility;
uniform float uIntro;
uniform vec3 uTint;
uniform sampler2D uTexture;
varying vec2 vUv;
varying float vFogFactor;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  if (texColor.a < 0.05) discard;

  vec3 baseColor = texColor.rgb;
  vec2 centeredUv = vUv - 0.5;
  float edgeDist = length(centeredUv);

  // --- Base — minimal tint, preserve artwork ---
  vec3 tintedColor = mix(baseColor, uTint, 0.055 + uActive * 0.055);

  // --- Vertical depth gradient — bottom slightly darker (grounds the weapon) ---
  float groundShadow = 0.78 + vUv.y * 0.22;
  tintedColor *= groundShadow;

  // --- Caustic light shimmer (FFX ocean floor refraction) ---
  float cx = sin(vUv.x * 9.5 + uTime * 0.62) * 0.5 + 0.5;
  float cy = cos(vUv.y * 7.2 - uTime * 0.51 + 1.4) * 0.5 + 0.5;
  float causticCore = max(0.0, 1.0 - edgeDist * 2.6) * texColor.a;
  vec3 caustic = uTint * cx * cy * causticCore * uActive * 0.028;

  // --- Fresnel edge glow (integrates with environment) ---
  float fresnel = pow(smoothstep(0.05, 0.46, edgeDist), 1.6);
  vec3 fresnelGlow = uTint * fresnel * uActive * 0.16;

  // --- Energy shimmer lines (spirit energy, FFX-feel) ---
  float shimmerWave = sin(vUv.y * 14.0 - uTime * 1.55) * 0.5 + 0.5;
  float shimmerMask = max(0.0, 1.0 - edgeDist * 3.8) * texColor.a;
  vec3 shimmer = uTint * shimmerWave * shimmerMask * uActive * 0.018;

  // --- Ambient halo — slow breath, not a strobe ---
  float haloBreath = sin(uTime * 0.58) * 0.5 + 0.5;
  float haloDist = 1.0 - smoothstep(0.08, 0.48, edgeDist);
  vec3 halo = uTint * haloDist * haloBreath * uActive * 0.05;

  // --- Assemble ---
  vec3 finalColor = tintedColor + fresnelGlow + caustic + shimmer + halo;

  // Gentle active luminosity lift
  finalColor *= 1.0 + uActive * 0.04;

  // --- Intro emergence from the deep (materialise effect on load) ---
  float introFog = uIntro * 0.55;
  float totalFog = clamp(vFogFactor + introFog, 0.0, 1.0);

  vec3 fogColor = vec3(0.003, 0.028, 0.065);
  finalColor = mix(finalColor, fogColor, totalFog * 0.38);

  float finalAlpha = texColor.a * (0.88 + uActive * 0.12) * uVisibility;
  finalAlpha *= 1.0 - totalFog * 0.28;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`

interface WeaponSpriteProps {
  weapon: Weapon
  isActive: boolean
  fadeOut: boolean
  isSocialChapter: boolean
}

export default function WeaponSprite({ weapon, isActive, fadeOut, isSocialChapter }: WeaponSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  // Exponential intro decay ref — no re-render needed
  const introRef = useRef(1.0)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(weapon.texture, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      setTexture(tex)
    })
  }, [weapon.texture])

  // 1x1 fully-transparent fallback — avoids uninitialized texture on Intel WebGL drivers
  const fallbackTexture = useMemo(() => {
    const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
    tex.needsUpdate = true
    return tex
  }, [])

  const uniforms = useMemo(
    () => ({
      uTime:       { value: 0 },
      uActive:     { value: 0 },
      uVisibility: { value: 1 },
      uIntro:      { value: 1 },
      uTint:       { value: new THREE.Vector3(...weapon.tint) },
      uTexture:    { value: fallbackTexture },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weapon.tint]
  )

  const phase = useMemo(
    () => weapon.position[0] * 0.7 + weapon.position[2] * 0.4,
    [weapon.position]
  )

  useEffect(() => {
    if (!meshRef.current || !texture) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTexture.value = texture
    mat.needsUpdate = true
  }, [texture])

  useFrame((state, delta) => {
    if (!meshRef.current) return
    const t   = state.clock.elapsedTime
    const mat = meshRef.current.material as THREE.ShaderMaterial

    mat.uniforms.uTime.value = t

    // Intro decay — exponential, ~3s to reach ~0.05
    if (introRef.current > 0.002) {
      introRef.current *= Math.exp(-1.1 * delta)
      mat.uniforms.uIntro.value = introRef.current
    } else if (mat.uniforms.uIntro.value !== 0) {
      introRef.current = 0
      mat.uniforms.uIntro.value = 0
    }

    const targetActive = isActive ? 1.0 : 0.0
    const curActive    = mat.uniforms.uActive.value
    if (Math.abs(curActive - targetActive) > 0.001)
      mat.uniforms.uActive.value = THREE.MathUtils.lerp(curActive, targetActive, 0.04)

    const targetVis = isSocialChapter ? 0.0 : isActive ? 1.0 : fadeOut ? 0.04 : 0.72
    const curVis    = mat.uniforms.uVisibility.value
    if (Math.abs(curVis - targetVis) > 0.001)
      mat.uniforms.uVisibility.value = THREE.MathUtils.lerp(curVis, targetVis, 0.04)

    // Two-frequency float — removes mechanical periodicity
    const floatY  = Math.sin(t * weapon.floatSpeed + phase) * weapon.floatAmplitude
    const floatY2 = Math.cos(t * weapon.floatSpeed * 0.58 + phase + 1.3) * weapon.floatAmplitude * 0.38

    meshRef.current.position.set(
      weapon.position[0],
      weapon.position[1] + floatY + floatY2,
      weapon.position[2]
    )

    // Organic pendulum — unique per weapon
    const pendulumY = Math.sin(t * (0.26 + weapon.floatSpeed * 0.14) + phase) * 0.11
    const tiltX     = Math.sin(t * weapon.floatSpeed * 0.38 + phase)       * 0.018
    const tiltZ     = Math.cos(t * weapon.floatSpeed * 0.28 + phase + 2.0) * 0.014

    meshRef.current.rotation.set(
      weapon.rotation[0] + tiltX,
      weapon.rotation[1] + pendulumY,
      weapon.rotation[2] + tiltZ
    )
  })

  return (
    <mesh ref={meshRef} position={weapon.position} rotation={weapon.rotation}>
      <planeGeometry args={[weapon.scale, weapon.scale * 1.6]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
