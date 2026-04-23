"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// ─── Weapon sprite vertex shader ───────────────────────────────────────────
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

// ─── Weapon sprite fragment shader ────────────────────────────────────────
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

  // --- Fresnel edge glow (boosted for divine weapons) ---
  float fresnel = pow(smoothstep(0.05, 0.46, edgeDist), 1.6);
  vec3 fresnelGlow = uTint * fresnel * uActive * 0.22;

  // --- Energy shimmer lines (spirit energy, FFX-feel) ---
  float shimmerWave = sin(vUv.y * 14.0 - uTime * 1.55) * 0.5 + 0.5;
  float shimmerMask = max(0.0, 1.0 - edgeDist * 3.8) * texColor.a;
  vec3 shimmer = uTint * shimmerWave * shimmerMask * uActive * 0.022;

  // --- Ambient halo — slow breath (boosted for divine weapons) ---
  float haloBreath = sin(uTime * 0.58) * 0.5 + 0.5;
  float haloDist = 1.0 - smoothstep(0.08, 0.48, edgeDist);
  vec3 halo = uTint * haloDist * haloBreath * uActive * 0.10;

  // --- Divine surge — ancient power resonating through the weapon ---
  // Two overlapping slow frequencies → organic, unpredictable peaks (~every 8s).
  // Synchronised with the aura shader so inner and outer glow peak together.
  float surgeA    = sin(uTime * 0.29) * 0.5 + 0.5;
  float surgeB    = sin(uTime * 0.37 + 1.8) * 0.5 + 0.5;
  float surgePower = pow(surgeA * surgeB, 3.0);
  // White-gold tint at peak: weapon reveals its true divine nature momentarily
  vec3 surgeColor = mix(uTint, vec3(1.00, 0.96, 0.82), 0.55);
  vec3 surgeBurst = surgeColor * surgePower * texColor.a * uActive * 0.18;

  // --- Assemble ---
  vec3 finalColor = tintedColor + fresnelGlow + caustic + shimmer + halo + surgeBurst;
  finalColor *= 1.0 + uActive * 0.04;

  // --- Intro emergence from the deep ---
  float introFog = uIntro * 0.55;
  float totalFog = clamp(vFogFactor + introFog, 0.0, 1.0);
  vec3 fogColor = vec3(0.003, 0.028, 0.065);
  finalColor = mix(finalColor, fogColor, totalFog * 0.38);

  float finalAlpha = texColor.a * (0.88 + uActive * 0.12) * uVisibility;
  finalAlpha *= 1.0 - totalFog * 0.28;

  gl_FragColor = vec4(finalColor, finalAlpha);
}
`

// ─── Divine aura shaders ───────────────────────────────────────────────────
// A separate additive plane behind each weapon that creates the outer sacred
// corona — extends beyond the sprite silhouette, giving weapons their
// god-rivalling presence. Invisible on inactive weapons (uActive → 0).
const auraVertexShader = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const auraFragmentShader = `
uniform float uTime;
uniform float uActive;
uniform vec3  uTint;
varying vec2 vUv;

void main() {
  vec2  center = vUv - 0.5;
  // Aspect correction: aura plane matches weapon 1:1.6 ratio so halo is
  // circular around the weapon rather than oval
  float dist   = length(center * vec2(1.0, 0.625));

  // --- Soft gaussian corona — bleeds beyond weapon edge ---
  float corona = exp(-dist * dist * 9.0);

  // --- Outer sacred ring — faint circle of divine resonance ---
  float ringDist = abs(dist - 0.30);
  float ring     = exp(-ringDist * ringDist * 120.0);

  // --- Slow divine breath (inevitable, not frantic) ---
  float breath = sin(uTime * 0.38) * 0.30 + 0.70;

  // --- Divine surge — same frequencies as weapon shader: they peak together ---
  float surgeA = sin(uTime * 0.29) * 0.5 + 0.5;
  float surgeB = sin(uTime * 0.37 + 1.8) * 0.5 + 0.5;
  float surge  = pow(surgeA * surgeB, 3.0);

  // White-gold during surge: corona brightens as weapon resonates
  vec3 divineColor = mix(uTint, vec3(1.0, 0.95, 0.75), 0.22 + surge * 0.40);

  float intensity  = (corona * 0.20 + ring * 0.10) * breath * uActive;
  intensity       += corona * surge * 0.14 * uActive;

  gl_FragColor = vec4(divineColor, clamp(intensity, 0.0, 1.0));
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
  const auraRef = useRef<THREE.Mesh>(null)
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

  // 1×1 fully-transparent fallback — avoids uninitialized texture on Intel WebGL drivers
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

  const auraUniforms = useMemo(
    () => ({
      uTime:   { value: 0 },
      uActive: { value: 0 },
      uTint:   { value: new THREE.Vector3(...weapon.tint) },
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

    // Weapon active lerp
    const curActive = mat.uniforms.uActive.value
    if (Math.abs(curActive - targetActive) > 0.001)
      mat.uniforms.uActive.value = THREE.MathUtils.lerp(curActive, targetActive, 0.04)

    // Visibility lerp
    const targetVis = isSocialChapter ? 0.0 : isActive ? 1.0 : fadeOut ? 0.04 : 0.72
    const curVis    = mat.uniforms.uVisibility.value
    if (Math.abs(curVis - targetVis) > 0.001)
      mat.uniforms.uVisibility.value = THREE.MathUtils.lerp(curVis, targetVis, 0.04)

    // Two-frequency float — removes mechanical periodicity
    const floatY  = Math.sin(t * weapon.floatSpeed + phase) * weapon.floatAmplitude
    const floatY2 = Math.cos(t * weapon.floatSpeed * 0.58 + phase + 1.3) * weapon.floatAmplitude * 0.38
    const posX = weapon.position[0]
    const posY = weapon.position[1] + floatY + floatY2
    const posZ = weapon.position[2]

    meshRef.current.position.set(posX, posY, posZ)

    // Organic pendulum — unique per weapon
    const pendulumY = Math.sin(t * (0.26 + weapon.floatSpeed * 0.14) + phase) * 0.11
    const tiltX     = Math.sin(t * weapon.floatSpeed * 0.38 + phase)       * 0.018
    const tiltZ     = Math.cos(t * weapon.floatSpeed * 0.28 + phase + 2.0) * 0.014

    meshRef.current.rotation.set(
      weapon.rotation[0] + tiltX,
      weapon.rotation[1] + pendulumY,
      weapon.rotation[2] + tiltZ
    )

    // Aura — follows weapon Y-float, stays upright (no rotation), slightly behind
    if (auraRef.current) {
      auraRef.current.position.set(posX, posY, posZ - 0.3)
      const auraMat = auraRef.current.material as THREE.ShaderMaterial
      auraMat.uniforms.uTime.value = t
      const curAuraActive = auraMat.uniforms.uActive.value
      if (Math.abs(curAuraActive - targetActive) > 0.001)
        auraMat.uniforms.uActive.value = THREE.MathUtils.lerp(curAuraActive, targetActive, 0.04)
    }
  })

  // Aura plane: weapon + 2 world units per axis so the corona bleeds outside the silhouette
  const auraW = weapon.scale + 2.0
  const auraH = weapon.scale * 1.6 + 2.0

  return (
    <>
      {/* Divine aura — additive glow plane rendered behind the weapon sprite */}
      <mesh
        ref={auraRef}
        position={[weapon.position[0], weapon.position[1], weapon.position[2] - 0.3]}
      >
        <planeGeometry args={[auraW, auraH]} />
        <shaderMaterial
          vertexShader={auraVertexShader}
          fragmentShader={auraFragmentShader}
          uniforms={auraUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Weapon sprite */}
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
    </>
  )
}
