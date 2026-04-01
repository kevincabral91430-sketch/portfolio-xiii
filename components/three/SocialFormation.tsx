"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { SocialLink } from "@/lib/three/socialData"

// ─── Vertex shader ────────────────────────────────────────────────────────────
const vert = `
uniform float uTime;
uniform float uActive;      // 0→1: formation visible / transitioning
uniform float uHover;       // 0→1: pointer is over this formation
uniform vec2  uMousePos;    // cursor in world-space XY (z=0 plane)
uniform float uMouseRad;    // flee radius in world units
attribute float aOffset;    // per-particle random [0,1]
attribute vec3  aTarget;    // resting position (formation shape)
varying float vAlpha;
varying float vHover;       // passed to fragment to avoid shared-uniform precision mismatch

void main() {
  // ── Resting position = formation shape ───────────────────────────────────
  vec3 pos = aTarget;

  // ── Organic idle — two frequencies per axis ───────────────────────────────
  float t   = uTime;
  float ph  = aOffset * 6.2832;
  pos.x += sin(t * 0.48 + ph)        * 0.038
          + cos(t * 0.23 + ph * 1.7) * 0.018;
  pos.y += cos(t * 0.41 + ph)        * 0.042
          + sin(t * 0.19 + ph * 2.1) * 0.024;
  pos.z += sin(t * 0.29 + ph * 0.8) * 0.020;

  // ── Local cursor flee ─────────────────────────────────────────────────────
  vec2  diff    = pos.xy - uMousePos;
  float dist    = length(diff);
  if (dist < uMouseRad && dist > 0.001) {
    float f   = pow(1.0 - dist / uMouseRad, 2.2) * 2.4 * uActive;
    pos.xy   += normalize(diff) * f;
    pos.z    += f * 0.25;            // lift toward camera for depth
  }

  // ── Active transition: scatter to pseudo-random direction when uActive=0 ──
  float scatter = (1.0 - uActive);
  scatter       = scatter * scatter;   // ease²
  float magnitude = scatter * (3.5 + aOffset * 3.0);
  float dx = sin(aOffset * 127.1 + 311.7);
  float dy = cos(aOffset * 269.5 + 183.3);
  float dz = sin(aOffset * 419.2 +  75.8) * 0.4;
  float dlen = sqrt(dx*dx + dy*dy + dz*dz) + 0.001;
  pos += vec3(dx, dy, dz) / dlen * magnitude;

  // ── Hover: slight scale expansion + brightness signal ────────────────────
  pos *= (1.0 + uHover * 0.04);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  float baseSize = 2.4 + aOffset * 2.8;
  float hoverBoost = 1.0 + uHover * 0.60;
  float sz = baseSize * hoverBoost * (220.0 / -mvPos.z);
  gl_PointSize = clamp(sz * uActive, 0.5, 18.0);

  vAlpha = uActive * (0.82 + aOffset * 0.18);
  vHover = uHover;
}
`

// ─── Fragment shader ──────────────────────────────────────────────────────────
const frag = `
uniform vec3  uColor;
varying float vAlpha;
varying float vHover;

void main() {
  vec2  c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  // Bright core, wide diffuse halo
  float core  = smoothstep(0.5, 0.0, d);
  float halo  = exp(-d * 3.0) * (0.6 + vHover * 0.6);
  float alpha = (core + halo) * vAlpha;

  // Boost color: saturate toward white at core
  vec3 brightColor = uColor * 2.2;
  vec3 col = mix(brightColor, vec3(1.0), core * 0.5 * (1.0 - d * 2.0));
  col += brightColor * halo * 0.4;

  gl_FragColor = vec4(col, alpha);
}
`

interface SocialFormationProps {
  link: SocialLink
  isActive: boolean         // this formation is the displayed one
  isHovered: boolean
  onHoverEnter: () => void
  onHoverLeave: () => void
  onClick: () => void
}

// Pre-allocated vectors for mouse projection (no GC in useFrame)
const _vProj = new THREE.Vector3()
const _dProj = new THREE.Vector3()
const _mProj = new THREE.Vector3()

export default function SocialFormation({
  link,
  isActive,
  isHovered,
  onHoverEnter,
  onHoverLeave,
  onClick,
}: SocialFormationProps) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, offsets } = useMemo(() => {
    const n   = link.particles.length
    const pos = new Float32Array(n * 3)
    const off = new Float32Array(n)
    link.particles.forEach(([x, y, z], i) => {
      pos[i * 3]     = x
      pos[i * 3 + 1] = y
      pos[i * 3 + 2] = z
      off[i] = i / Math.max(n - 1, 1)
    })
    return { positions: pos, offsets: off }
  }, [link.particles])

  const uniforms = useMemo(() => ({
    uTime:     { value: 0 },
    uActive:   { value: isActive ? 0 : 0 },   // starts at 0, lerps to target
    uHover:    { value: 0 },
    uMousePos: { value: new THREE.Vector2(9999, 9999) },  // off-screen by default
    uMouseRad: { value: 2.6 },
    uColor:    { value: new THREE.Vector3(...link.tint) },
  }), [link.tint])

  useFrame((state) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial

    // Clock
    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Active lerp: smooth fade in/out (lambda 3.5 ≈ 45% per 0.167s frame → ~0.6s transition)
    const activeTarget = isActive ? 1.0 : 0.0
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value, activeTarget, 1 - Math.exp(-3.5 * state.clock.getDelta())
    )
    // getDelta() consumes the delta — re-add
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value, activeTarget, 0.055
    )

    // Hover lerp
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(
      mat.uniforms.uHover.value, isHovered ? 1.0 : 0.0, 0.08
    )

    // Project mouse to world z=0 plane (no allocations)
    if (isActive) {
      _vProj.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      _dProj.copy(_vProj).sub(state.camera.position).normalize()
      const camZ = state.camera.position.z
      if (Math.abs(_dProj.z) > 0.001) {
        const dist = -camZ / _dProj.z
        _mProj.copy(state.camera.position).addScaledVector(_dProj, dist)
        mat.uniforms.uMousePos.value.set(_mProj.x, _mProj.y)
      }
    } else {
      // Move mouse off-screen so flee doesn't fire when inactive
      mat.uniforms.uMousePos.value.set(9999, 9999)
    }
  })

  // Don't render at all if fully invisible and inactive (perf)
  const activeVal = (uniforms.uActive.value ?? 0)
  const shouldRender = isActive || activeVal > 0.01

  if (!shouldRender && !isActive) return null

  return (
    // Formation always centered at origin — nav controls switch which one is active
    <group position={[0, 0, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          {/* aTarget carries the formation shape — immutable */}
          <bufferAttribute args={[positions, 3]} attach="attributes-aTarget" />
          {/* position = same as target initially; shader reads aTarget, ignores position */}
          <bufferAttribute args={[positions, 3]} attach="attributes-position" />
          <bufferAttribute args={[offsets,   1]} attach="attributes-aOffset" />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          precision="highp"
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Interaction hit zone — only active when isActive */}
      {isActive && (
        <mesh
          onPointerEnter={(e) => {
            e.stopPropagation()
            document.body.style.cursor = link.url ? "pointer" : "default"
            onHoverEnter()
          }}
          onPointerLeave={() => {
            document.body.style.cursor = "default"
            onHoverLeave()
          }}
          onClick={(e) => {
            e.stopPropagation()
            if (link.url) window.open(link.url, "_blank", "noopener noreferrer")
            onClick()
          }}
        >
          <boxGeometry args={[14, 5, 1.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}
