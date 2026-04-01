"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { SocialLink } from "@/lib/three/socialData"

// ─── Vertex shader — pyrefly / spiritual souls ─────────────────────────────
const vert = `
uniform float uTime;
uniform float uActive;
uniform float uHover;
uniform vec2  uMousePos;
uniform float uMouseRad;
attribute float aOffset;
attribute vec3  aTarget;
varying float vAlpha;
varying float vHover;
varying float vGlowSize;

void main() {
  vec3 pos = aTarget;

  // ── Per-particle identity ──────────────────────────────────────────────────
  // aOffset is hash-distributed in [0,1] — every letter has a full mix of roles.
  //   low  → core sparks: small, bright, anchored close to letter
  //   high → ambient souls: larger, dimmer, wander around the word cloud
  float role = aOffset;
  float ph   = role * 43.758 + 1.234;

  // ── Z-depth layer — real 3D soul cloud ────────────────────────────────────
  float zLayer = (role * 2.0 - 1.0) * 0.65;
  pos.z += zLayer;

  // ── Organic idle — two-frequency Lissajous, amplitude grows with role ──────
  float amp   = 0.04 + role * role * 0.24;   // 0.04 → 0.28 world units
  float speed = 0.16 + role * 0.28;          // 0.16 → 0.44 rad/s

  pos.x += sin(uTime * speed          + ph)          * amp
          + cos(uTime * speed * 0.61  + ph * 1.732) * amp * 0.52;
  pos.y += cos(uTime * speed * 0.83   + ph)          * amp
          + sin(uTime * speed * 0.41  + ph * 2.173) * amp * 0.52;
  pos.z += sin(uTime * speed * 0.53   + ph * 0.893) * amp * 0.70;

  // ── Ambient scatter — high-role souls float outward around the word ────────
  float ambient = max(0.0, (role - 0.65) / 0.35);
  if (ambient > 0.001) {
    float r1  = fract(sin(role * 127.1 + 311.7) * 43758.5);
    float r2  = fract(sin(role * 269.5 + 183.3) * 53748.1);
    float ang = r1 * 6.2832;
    float rad = (0.4 + r2 * 1.4) * ambient;
    pos.xy   += vec2(cos(ang), sin(ang)) * rad;
    pos.z    += (r1 * 2.0 - 1.0) * 0.9 * ambient;
  }

  // ── Cursor flee — living cloud disturbed by pointer ────────────────────────
  vec2  diff = pos.xy - uMousePos;
  float dist = length(diff);
  if (dist < uMouseRad && dist > 0.001) {
    float f  = pow(1.0 - dist / uMouseRad, 2.0) * 2.2 * uActive;
    pos.xy  += normalize(diff) * f;
    pos.z   += f * 0.30;
  }

  // ── Entry: scatter then converge ──────────────────────────────────────────
  float sc  = 1.0 - uActive;
  sc       *= sc;
  float mag = sc * (4.0 + role * 4.5);
  float dx  = sin(role * 127.1 + 311.7);
  float dy  = cos(role * 269.5 + 183.3);
  float dz  = sin(role * 419.2 +  75.8) * 0.45;
  float dl  = sqrt(dx*dx + dy*dy + dz*dz) + 0.001;
  pos      += vec3(dx, dy, dz) / dl * mag;

  // ── Hover: subtle cloud expansion ─────────────────────────────────────────
  pos *= (1.0 + uHover * 0.03);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // ── Point size — core=small spark, ambient=wider soft sphere ──────────────
  float pxScale  = 200.0 / -mvPos.z;
  float baseSize = mix(0.48, 1.6, role);
  float hBoost   = 1.0 + uHover * 0.35;
  gl_PointSize   = clamp(baseSize * hBoost * pxScale * uActive, 0.0, 20.0);

  // ── Twinkle — every soul pulses at its own frequency ──────────────────────
  float tFreq   = 1.4 + role * 2.6;
  float twinkle = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * tFreq + ph * 4.2));

  // ── Alpha — core visible, ambient ethereal; low enough to stay individual ──
  float baseAlpha = mix(0.50, 0.12, role);
  vAlpha     = uActive * baseAlpha * clamp(twinkle, 0.0, 1.0);
  vHover     = uHover;
  vGlowSize  = role;
}
`

// ─── Fragment shader — pure soft gaussian, zero neon ──────────────────────
const frag = `
uniform vec3  uColor;
varying float vAlpha;
varying float vHover;
varying float vGlowSize;

void main() {
  vec2  c  = gl_PointCoord - 0.5;
  float d2 = dot(c, c);
  if (d2 > 0.25) discard;

  // ── Single soft gaussian — width varies with role ─────────────────────────
  //   core  (role→0): k=10 → tight warm spark
  //   ambient (role→1): k=5  → wide diffuse soul glow
  float k    = 10.0 - vGlowSize * 5.0;
  float glow = exp(-d2 * k);

  // ── Color — max 1.35× tint, never white ──────────────────────────────────
  vec3 col = uColor * (0.85 + glow * 0.50);

  // Hover: slight brightness lift only
  col *= (1.0 + vHover * 0.20);

  float alpha = glow * vAlpha;
  gl_FragColor = vec4(col, alpha);
}
`

interface SocialFormationProps {
  link: SocialLink
  isActive: boolean
  isHovered: boolean
  onHoverEnter: () => void
  onHoverLeave: () => void
  onClick: () => void
}

// Pre-allocated vectors for mouse projection (zero GC in useFrame)
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
      // Hash-based offset: every letter gets a full mix of core + ambient roles
      // (sequential i/(n-1) would make last letters all-ambient → illegible)
      off[i] = Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1.0
    })
    return { positions: pos, offsets: off }
  }, [link.particles])

  const uniforms = useMemo(() => ({
    uTime:     { value: 0 },
    uActive:   { value: 0 },
    uHover:    { value: 0 },
    uMousePos: { value: new THREE.Vector2(9999, 9999) },
    uMouseRad: { value: 2.8 },
    uColor:    { value: new THREE.Vector3(...link.tint) },
  }), [link.tint])

  useFrame((state) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial

    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Smooth active fade (lerp each frame — no getDelta() double-consume issue)
    const activeTarget = isActive ? 1.0 : 0.0
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value, activeTarget, 0.065
    )

    // Hover lerp
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(
      mat.uniforms.uHover.value, isHovered ? 1.0 : 0.0, 0.08
    )

    // World-space mouse projection onto z=0 plane (no GC)
    if (isActive) {
      _vProj.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      _dProj.copy(_vProj).sub(state.camera.position).normalize()
      const camZ = state.camera.position.z
      if (Math.abs(_dProj.z) > 0.001) {
        const t = -camZ / _dProj.z
        _mProj.copy(state.camera.position).addScaledVector(_dProj, t)
        mat.uniforms.uMousePos.value.set(_mProj.x, _mProj.y)
      }
    } else {
      mat.uniforms.uMousePos.value.set(9999, 9999)
    }
  })

  return (
    <group position={[0, 0, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute args={[positions, 3]} attach="attributes-aTarget" />
          <bufferAttribute args={[positions, 3]} attach="attributes-position" />
          <bufferAttribute args={[offsets,   1]} attach="attributes-aOffset" />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>

      {/* Hit zone — only when active */}
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
          <boxGeometry args={[16, 6, 1.5]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}
