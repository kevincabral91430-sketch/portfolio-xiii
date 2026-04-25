"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// ─── Drop-shadow glow — exact replication of the NavCharacters CSS technique ──
//
// NavCharacters uses:
//   filter: drop-shadow(0 0 6px  color)
//           drop-shadow(0 0 18px color88)
//
// CSS drop-shadow works by:
//  1. Reading the element's alpha channel (its silhouette)
//  2. Blurring it with a Gaussian of the given radius
//  3. Colorising the result and compositing it BEHIND the element
//
// This shader does exactly that in GLSL:
//  1. Loads the weapon's own texture (same silhouette as WeaponSprite)
//  2. Blurs the alpha with a 9-tap Gaussian (two radii = two CSS layers)
//  3. Renders the result on a plane sitting BEHIND the sprite
//  4. Tints with weapon.tint — same principle as accentColor per character
//
// The aura plane is AURA_MARGIN× bigger than the sprite plane on each axis
// so the blur can spread naturally outside the weapon silhouette, exactly as
// CSS drop-shadow bleeds outside the element's bounding box.

// Must match the GLSL constant below (1.4 = 40% larger than sprite on each axis)
const AURA_MARGIN = 1.4

const auraVert = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const auraFrag = `
uniform float uTime;
uniform float uActive;
uniform vec3  uTint;
uniform sampler2D uTexture;
varying vec2 vUv;

// Aura plane is this many times larger than the sprite plane (each axis).
// Must match the JS constant AURA_MARGIN.
const float MARGIN = 1.4;

// Sample sprite alpha — returns 0.0 outside [0, 1] (no sprite there)
float spriteAlpha(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(uTexture, uv).a;
}

// 9-tap Gaussian blur of the sprite alpha channel.
// Weights are the standard 3×3 Gaussian (sum = 1.0).
// r is in sprite-UV space:
//   r = 0.07  ≈  CSS blur-radius 6px  on a 70px sprite  (inner, tight)
//   r = 0.22  ≈  CSS blur-radius 18px on a 70px sprite  (outer, diffuse)
float blurAlpha(vec2 c, float r) {
  float a = 0.0;
  a += spriteAlpha(c + vec2(-r, -r)) * 0.0625;
  a += spriteAlpha(c + vec2(0.0, -r)) * 0.125;
  a += spriteAlpha(c + vec2( r, -r)) * 0.0625;
  a += spriteAlpha(c + vec2(-r, 0.0)) * 0.125;
  a += spriteAlpha(c               ) * 0.25;
  a += spriteAlpha(c + vec2( r, 0.0)) * 0.125;
  a += spriteAlpha(c + vec2(-r,  r)) * 0.0625;
  a += spriteAlpha(c + vec2(0.0,  r)) * 0.125;
  a += spriteAlpha(c + vec2( r,  r)) * 0.0625;
  return clamp(a, 0.0, 1.0);
}

void main() {
  if (uActive < 0.005) { gl_FragColor = vec4(0.0); return; }

  // Remap aura-plane UVs → sprite-texture UVs.
  // The aura is MARGIN× larger, so its edges map to coords outside [0,1]
  // in sprite UV space — which the sampler returns as 0 alpha (no sprite).
  vec2 texUv = (vUv - 0.5) * MARGIN + 0.5;

  // Layer 1 — drop-shadow(0 0 6px  color)    : tight silhouette glow
  float inner = blurAlpha(texUv, 0.07);

  // Layer 2 — drop-shadow(0 0 18px color88)  : wide diffuse halo
  //   0x88 hex = 136/255 ≈ 0.53 opacity, matching CSS notation
  float outer = blurAlpha(texUv, 0.22) * 0.53;

  // CSS compositing: layers stack — outer fills where inner is weaker
  float glow = inner + outer * (1.0 - inner);

  // Slow organic breath — the weapon feels inhabited, not frozen
  // (same cadence as the WeaponAura breath used in NavCharacters hover)
  float breath = sin(uTime * 0.30) * 0.10 + 0.90;
  float micro  = sin(uTime * 0.61 + 1.7) * 0.04 + 0.96;

  float alpha = glow * breath * micro * uActive * 0.40;
  gl_FragColor = vec4(uTint, alpha);
}
`

interface WeaponAuraProps {
  weapon: Weapon
  isActive: boolean
  isSocialChapter: boolean
}

export default function WeaponAura({ weapon, isActive, isSocialChapter }: WeaponAuraProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  // Load the weapon's own texture — we need the alpha silhouette
  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(weapon.texture, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      setTexture(tex)
    })
  }, [weapon.texture])

  // 1×1 fully-transparent fallback — avoids WebGL errors before texture loads
  const fallbackTexture = useMemo(() => {
    const tex = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1)
    tex.needsUpdate = true
    return tex
  }, [])

  const uniforms = useMemo(() => ({
    uTime:    { value: 0 },
    uActive:  { value: 0 },
    uTint:    { value: new THREE.Vector3(...weapon.tint) },
    uTexture: { value: fallbackTexture },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }), [weapon.tint])

  // Swap in the real texture once loaded
  useEffect(() => {
    if (!meshRef.current || !texture) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTexture.value = texture
    mat.needsUpdate = true
  }, [texture])

  const phase = useMemo(
    () => weapon.position[0] * 0.7 + weapon.position[2] * 0.4,
    [weapon.position]
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const t      = state.clock.elapsedTime
    const target = (isActive && !isSocialChapter) ? 1.0 : 0.0

    // Mirror the sprite float exactly so aura and weapon move together
    const floatY  = Math.sin(t * weapon.floatSpeed + phase) * weapon.floatAmplitude
    const floatY2 = Math.cos(t * weapon.floatSpeed * 0.58 + phase + 1.3) * weapon.floatAmplitude * 0.38

    meshRef.current.position.set(
      weapon.position[0],
      weapon.position[1] + floatY + floatY2,
      weapon.position[2] - 0.5  // behind the sprite
    )

    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = t

    const cur = mat.uniforms.uActive.value
    if (Math.abs(cur - target) > 0.001)
      mat.uniforms.uActive.value = THREE.MathUtils.lerp(cur, target, 0.035)
  })

  // Aura plane: same aspect ratio as the sprite (scale × scale*1.6),
  // scaled up by AURA_MARGIN so the glow can bleed beyond the silhouette —
  // exactly as CSS drop-shadow extends outside an element's bounding box.
  const w = weapon.scale * AURA_MARGIN
  const h = weapon.scale * 1.6 * AURA_MARGIN

  return (
    <mesh
      ref={meshRef}
      position={[weapon.position[0], weapon.position[1], weapon.position[2] - 0.5]}
    >
      <planeGeometry args={[w, h]} />
      <shaderMaterial
        vertexShader={auraVert}
        fragmentShader={auraFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        depthTest={false}
        blending={THREE.AdditiveBlending}
        side={THREE.DoubleSide}
      />
    </mesh>
  )
}
