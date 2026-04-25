"use client"

import { useRef, useMemo, useState, useEffect } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { Weapon } from "@/lib/three/weaponData"

// ─── Shape-aware diffuse glow ─────────────────────────────────────────────────
// Replicates the CSS drop-shadow technique used on character sprites, but with
// LARGE blur radii only (r ≥ 0.26) so the result reads as a "halo" and never
// as a copy of the weapon silhouette.
//
// Key difference from the ghosting version: the previous inner layer (r=0.07)
// was tight enough to look like a duplicate weapon. Using r=0.26+ the blur is
// too diffuse to ever resolve as a recognisable silhouette.
//
// The aura plane is AURA_MARGIN× the sprite size so the blur bleeds out
// naturally — exactly as CSS drop-shadow extends beyond the element bounding box.

const AURA_MARGIN = 2.0

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

const float MARGIN = 2.0;

// Returns weapon texture alpha, 0 outside [0,1] bounds
float spriteAlpha(vec2 uv) {
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) return 0.0;
  return texture2D(uTexture, uv).a;
}

// 9-tap Gaussian blur of weapon alpha at radius r (in sprite-UV space)
float blurAlpha(vec2 c, float r) {
  float a = 0.0;
  a += spriteAlpha(c + vec2(-r, -r)) * 0.0625;
  a += spriteAlpha(c + vec2( 0, -r)) * 0.125;
  a += spriteAlpha(c + vec2( r, -r)) * 0.0625;
  a += spriteAlpha(c + vec2(-r,  0)) * 0.125;
  a += spriteAlpha(c              )  * 0.25;
  a += spriteAlpha(c + vec2( r,  0)) * 0.125;
  a += spriteAlpha(c + vec2(-r,  r)) * 0.0625;
  a += spriteAlpha(c + vec2( 0,  r)) * 0.125;
  a += spriteAlpha(c + vec2( r,  r)) * 0.0625;
  return clamp(a, 0.0, 1.0);
}

void main() {
  if (uActive < 0.005) { gl_FragColor = vec4(0.0); return; }

  // Remap aura-plane UV → sprite-texture UV
  // At MARGIN=2 the sprite occupies the central 50% of the aura plane,
  // leaving 25% margin on each side for the glow to bleed into
  vec2 texUv = (vUv - 0.5) * MARGIN + 0.5;

  // Two large-radius passes — shape-aware halo, never a silhouette copy
  // r=0.26 → ~26% of weapon size per tap offset — clearly diffuse, not a ghost
  // r=0.44 → wide ambient bloom fills the space around the weapon
  float halo  = blurAlpha(texUv, 0.26);
  float bloom = blurAlpha(texUv, 0.44) * 0.52;
  float glow  = halo + bloom * (1.0 - halo);

  // Edge fade — prevents the rectangular plane boundary from ever being visible
  vec2 p = vUv;
  float edge =
    smoothstep(0.0, 0.10, p.x) * smoothstep(1.0, 0.90, p.x) *
    smoothstep(0.0, 0.10, p.y) * smoothstep(1.0, 0.90, p.y);

  float breath = sin(uTime * 0.30) * 0.09 + 0.91;
  float micro  = sin(uTime * 0.58 + 1.7) * 0.035 + 0.965;

  float alpha = glow * edge * breath * micro * uActive * 0.40;
  gl_FragColor = vec4(uTint, alpha);
}
`

interface WeaponAuraProps {
  weapon: Weapon
  isActive: boolean
  isSocialChapter: boolean
}

export default function WeaponAura({ weapon, isActive, isSocialChapter }: WeaponAuraProps) {
  const meshRef  = useRef<THREE.Mesh>(null)
  const [texture, setTexture] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    const loader = new THREE.TextureLoader()
    loader.load(weapon.texture, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace
      setTexture(tex)
    })
  }, [weapon.texture])

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

    const floatY  = Math.sin(t * weapon.floatSpeed + phase) * weapon.floatAmplitude
    const floatY2 = Math.cos(t * weapon.floatSpeed * 0.58 + phase + 1.3) * weapon.floatAmplitude * 0.38

    meshRef.current.position.set(
      weapon.position[0],
      weapon.position[1] + floatY + floatY2,
      weapon.position[2] - 0.5
    )

    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = t

    const cur = mat.uniforms.uActive.value
    if (Math.abs(cur - target) > 0.001)
      mat.uniforms.uActive.value = THREE.MathUtils.lerp(cur, target, 0.035)
  })

  // Aura plane: sprite size × AURA_MARGIN on each axis
  // Keeps the JS UV margin consistent with the GLSL MARGIN constant
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
