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
uniform vec2  uMousePosLast;   // last active mouse position (frozen on leave)
uniform float uMouseRad;
uniform float uMouseInfluence; // 0→1 energy; ramps fast, decays slow (gradual return)
attribute float aOffset;
attribute vec3  aTarget;
varying float vAlpha;
varying float vHover;
varying float vGlowSize;

void main() {
  vec3 pos = aTarget;

  // ── Per-particle identity ──────────────────────────────────────────────────
  // aOffset is hash-distributed → every letter has a full mix of core+ambient.
  //   low  → core sparks: small, bright, anchored close to letterform
  //   high → ambient souls: larger, dimmer, free to wander
  float role = aOffset;
  float ph   = role * 43.758 + 1.234;

  // ── Z-depth — deep 3D soul cloud (±1.4 world units) ──────────────────────
  float zLayer = (role * 2.0 - 1.0) * 1.4;
  pos.z += zLayer;

  // ── Organic idle — two-frequency Lissajous, amplitude grows with role ──────
  float amp   = 0.04 + role * role * 0.26;   // 0.04 → 0.30 world units
  float speed = 0.15 + role * 0.30;          // 0.15 → 0.45 rad/s

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

  // ── Cursor explosion — chaotic, multi-directional, with gradual return ─────
  // Per-particle deterministic chaos seeds (unique per particle, time-modulated)
  float s1 = fract(sin(role * 843.1 + 427.7) * 39758.5);
  float s2 = fract(sin(role * 569.3 + 211.4) * 71234.9);
  float s3 = fract(sin(role * 193.7 + 653.2) * 28475.3);

  // Proximity to LAST active mouse pos — persists after mouse leaves → gradual return
  vec2  diff    = pos.xy - uMousePosLast;
  float dist    = length(diff);
  float proxFac = clamp(1.0 - dist / uMouseRad, 0.0, 1.0);
  proxFac       = proxFac * proxFac * proxFac;   // cubic: strong at center, gentle at edge

  if (uMouseInfluence * proxFac > 0.001) {
    // Radial component (away from mouse)
    vec2 radial = dist > 0.001 ? normalize(diff) : normalize(vec2(s1 - 0.5, s2 - 0.5));
    // Tangential (perpendicular swirl), sign from particle seed
    vec2 tang   = vec2(-radial.y, radial.x) * (s1 > 0.5 ? 1.0 : -1.0);
    // Per-particle random direction, slowly rotating over time (living feel)
    float ang2  = s1 * 6.2832 + uTime * 0.20 * (s2 - 0.5);
    vec2 chaos  = vec2(cos(ang2), sin(ang2));

    // Mix: 20% radial + 40% tangential swirl + 40% chaos → breaks perfect circle
    vec2 explDir = normalize(radial * 0.20 + tang * 0.40 + chaos * 0.40);
    float explZ  = (s3 * 2.0 - 1.0);

    // Force: proximity × influence decay × role-weighted (ambient travels further)
    float force = uMouseInfluence * proxFac * (1.8 + role * 4.2);

    pos.xy += explDir * force;
    pos.z  += explZ * force * 0.85;
  }

  // ── Entry: scatter → converge ─────────────────────────────────────────────
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

  // ── Point size — perspective correct ──────────────────────────────────────
  float pxScale  = 200.0 / -mvPos.z;
  float baseSize = mix(0.52, 1.70, role);
  float hBoost   = 1.0 + uHover * 0.35;
  gl_PointSize   = clamp(baseSize * hBoost * pxScale * uActive, 0.0, 20.0);

  // ── Z depth fade — far particles dimmer (reinforces 3D volume) ────────────
  float depthFade = 0.55 + 0.45 * clamp((zLayer + 1.4) / 2.8, 0.0, 1.0);

  // ── Twinkle — every soul pulses at its own frequency ──────────────────────
  float tFreq   = 1.4 + role * 2.6;
  float twinkle = 0.45 + 0.55 * (0.5 + 0.5 * sin(uTime * tFreq + ph * 4.2));

  // ── Alpha — kept low to prevent AdditiveBlending saturation at D=10 ───────
  float baseAlpha = mix(0.35, 0.09, role);
  vAlpha     = uActive * baseAlpha * clamp(twinkle, 0.0, 1.0) * depthFade;
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

  // ── Soft gaussian — width varies with role ────────────────────────────────
  //   core  (role→0): k=10 → tight warm spark
  //   ambient (role→1): k=5  → wide diffuse soul glow
  float k    = 10.0 - vGlowSize * 5.0;
  float glow = exp(-d2 * k);

  // ── Color — max 1.35× tint, never white ──────────────────────────────────
  vec3 col = uColor * (0.85 + glow * 0.50);
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
      off[i] = Math.abs(Math.sin(i * 127.1 + 311.7) * 43758.5453) % 1.0
    })
    return { positions: pos, offsets: off }
  }, [link.particles])

  const uniforms = useMemo(() => ({
    uTime:           { value: 0 },
    uActive:         { value: 0 },
    uHover:          { value: 0 },
    uMousePosLast:   { value: new THREE.Vector2(9999, 9999) },
    uMouseRad:       { value: 3.2 },
    uMouseInfluence: { value: 0 },
    uColor:          { value: new THREE.Vector3(...link.tint) },
  }), [link.tint])

  useFrame((state) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial

    mat.uniforms.uTime.value = state.clock.elapsedTime

    // Smooth active fade
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value, isActive ? 1.0 : 0.0, 0.065
    )

    // Hover lerp
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(
      mat.uniforms.uHover.value, isHovered ? 1.0 : 0.0, 0.08
    )

    if (isActive) {
      // World-space mouse projection onto z=0 plane (no GC allocs)
      _vProj.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      _dProj.copy(_vProj).sub(state.camera.position).normalize()
      const camZ = state.camera.position.z
      if (Math.abs(_dProj.z) > 0.001) {
        const t = -camZ / _dProj.z
        _mProj.copy(state.camera.position).addScaledVector(_dProj, t)

        // Is mouse within the word's influence zone?
        const nearWord = Math.abs(_mProj.x) < 10.5 && Math.abs(_mProj.y) < 3.5

        if (nearWord) {
          // Update sticky position + ramp influence fast
          mat.uniforms.uMousePosLast.value.set(_mProj.x, _mProj.y)
          mat.uniforms.uMouseInfluence.value = THREE.MathUtils.lerp(
            mat.uniforms.uMouseInfluence.value, 1.0, 0.12
          )
        } else {
          // Freeze sticky position; influence decays slowly → gradual return
          mat.uniforms.uMouseInfluence.value = THREE.MathUtils.lerp(
            mat.uniforms.uMouseInfluence.value, 0.0, 0.022
          )
        }
      }
    } else {
      // Not active — decay influence
      mat.uniforms.uMouseInfluence.value = THREE.MathUtils.lerp(
        mat.uniforms.uMouseInfluence.value, 0.0, 0.022
      )
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
