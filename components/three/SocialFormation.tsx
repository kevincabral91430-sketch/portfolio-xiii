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
varying float vGlowSize;   // 0=tiny core spark, 1=wide ambient glow

void main() {
  vec3 pos = aTarget;

  // ── Per-particle identity ──────────────────────────────────────────────────
  // aOffset is uniform in [0,1]. We use it as a deterministic "soul type":
  //   low  → dense core particles — small, bright, anchored close to target
  //   high → ambient halo particles — larger, dimmer, wander more freely
  float role = aOffset;
  float ph   = role * 43.758 + 1.234;   // large spread → good pseudo-random phases

  // ── Z-depth layer — creates real 3D cloud (no longer a flat plane) ─────────
  float zLayer = (role * 2.0 - 1.0) * 0.65;  // ±0.65 world units of depth
  pos.z += zLayer;

  // ── Organic idle — two-frequency per axis, amplitude scales with role ──────
  // core: barely moves (anchor the shape)
  // ambient: drifts freely (alive, breathing)
  float amp   = 0.030 + role * role * 0.170;  // 0.030 → 0.200 world units
  float speed = 0.18  + role * 0.30;          // 0.18 → 0.48 rad/s

  pos.x += sin(uTime * speed          + ph)           * amp
          + cos(uTime * speed * 0.61  + ph * 1.732)  * amp * 0.52;
  pos.y += cos(uTime * speed * 0.83   + ph)           * amp
          + sin(uTime * speed * 0.41  + ph * 2.173)  * amp * 0.52;
  pos.z += sin(uTime * speed * 0.53   + ph * 0.893)  * amp * 0.70;

  // ── Cursor flee — perturb living cloud ────────────────────────────────────
  vec2  diff = pos.xy - uMousePos;
  float dist = length(diff);
  if (dist < uMouseRad && dist > 0.001) {
    float f  = pow(1.0 - dist / uMouseRad, 2.0) * 2.2 * uActive;
    pos.xy  += normalize(diff) * f;
    pos.z   += f * 0.30;
  }

  // ── Active transition: scatter then converge ───────────────────────────────
  float sc  = 1.0 - uActive;
  sc       *= sc;                              // ease²
  float mag = sc * (4.0 + role * 4.5);        // ambient scatters further
  float dx  = sin(role * 127.1 + 311.7);
  float dy  = cos(role * 269.5 + 183.3);
  float dz  = sin(role * 419.2 +  75.8) * 0.45;
  float dl  = sqrt(dx*dx + dy*dy + dz*dz) + 0.001;
  pos      += vec3(dx, dy, dz) / dl * mag;

  // ── Hover: subtle cloud expansion ─────────────────────────────────────────
  pos *= (1.0 + uHover * 0.025);

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // ── Point size — small for core, larger for ambient ────────────────────────
  // pyrefly feel: sizes range from tiny sparks to soft spherical glows
  float pxScale  = 200.0 / -mvPos.z;
  float baseSize = mix(1.2, 4.5, role);
  float hBoost   = 1.0 + uHover * 0.40;
  gl_PointSize   = clamp(baseSize * hBoost * pxScale * uActive, 0.3, 18.0);

  // ── Twinkle — each soul pulses independently ───────────────────────────────
  float twinkle = 0.68 + 0.32 * sin(uTime * (1.4 + role * 2.6) + ph * 3.7);

  // ── Alpha — core bright, ambient soft ─────────────────────────────────────
  float baseAlpha = mix(0.92, 0.42, role * role);
  vAlpha     = uActive * baseAlpha * twinkle;
  vHover     = uHover;
  vGlowSize  = role;
}
`

// ─── Fragment shader — soft pyrefly glow, zero neon ───────────────────────
const frag = `
uniform vec3  uColor;
varying float vAlpha;
varying float vHover;
varying float vGlowSize;

void main() {
  vec2  c  = gl_PointCoord - 0.5;
  float d2 = dot(c, c);
  if (d2 > 0.25) discard;

  // ── Two-component glow: tiny sparkle core + wide soft halo ────────────────
  //   core  → the visible individual spark (sharp gaussian, small radius)
  //   halo  → the diffuse aura around it (wide gaussian, soft)
  // Neither component goes to pure white — stays in the tint family.
  float core = exp(-d2 * 180.0);              // ~1px bright center
  float halo = exp(-d2 * (8.0 + vGlowSize * 6.0));  // varies: core=tight, ambient=wide

  // ── Color — max brightness is 1.8× tint, never white ─────────────────────
  //   halo: base tint color — the soul's inherent color
  //   core: slightly elevated brightness in same hue family
  vec3 tint    = uColor;
  vec3 haloCol = tint * (0.85 + halo * 0.55);           // 0.85–1.40× tint
  vec3 coreCol = tint * (1.00 + core * 0.80);           // up to 1.80× tint (rich, not white)

  // Blend: mostly halo feel, accented by core spark
  vec3 col = haloCol + coreCol * core * 0.35;

  // Hover: slight color lift (no hue shift, just brightness)
  col *= (1.0 + vHover * 0.25);

  // ── Alpha from shape ──────────────────────────────────────────────────────
  float alpha = (halo * 0.80 + core * 0.20) * vAlpha;

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
      off[i] = i / Math.max(n - 1, 1)
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
      mat.uniforms.uActive.value, activeTarget, 0.045
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

  // Only mount when active or still fading out (perf guard)
  if (!isActive && (uniforms.uActive?.value ?? 0) < 0.01) return null

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
