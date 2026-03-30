"use client"

import { useRef, useMemo } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { SocialLink } from "@/lib/three/socialData"

const vert = `
uniform float uTime;
uniform float uHover;
attribute float aOffset;
varying float vBrightness;

void main() {
  vec3 pos = position;

  // Idle micro-vibration — unique per particle
  pos.x += sin(uTime * 0.55 + aOffset * 6.28) * 0.055;
  pos.y += cos(uTime * 0.47 + aOffset * 5.03) * 0.05
         + sin(uTime * 0.19 + aOffset * 4.20) * 0.09;
  pos.z += sin(uTime * 0.33 + aOffset * 3.77) * 0.03;

  // Dispersion — each particle escapes in its unique pseudo-random direction
  float disp = uHover * uHover * (2.6 + aOffset * 2.4);
  float dx = sin(aOffset * 127.1 + 311.7);
  float dy = sin(aOffset * 269.5 + 183.3);
  float dz = sin(aOffset * 419.2 + 75.8) * 0.5;
  float len = sqrt(dx*dx + dy*dy + dz*dz);
  pos += vec3(dx, dy, dz) / len * disp;

  vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  float sz = (1.8 + aOffset * 1.2) * (220.0 / -mvPos.z);
  gl_PointSize = clamp(sz, 1.0, 6.0);

  vBrightness = 1.0 - uHover * 0.30;
}
`

const frag = `
uniform vec3 uColor;
uniform float uHover;
varying float vBrightness;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float d = length(c);
  if (d > 0.5) discard;

  float core = smoothstep(0.5, 0.04, d);
  float glow  = exp(-d * 4.5) * (0.22 + uHover * 0.42);
  float alpha = (core * 0.78 + glow) * vBrightness;

  // Slight brightness lift on hover without going white
  vec3 col = uColor * (1.0 + uHover * 0.25);
  gl_FragColor = vec4(col, alpha);
}
`

interface SocialFormationProps {
  link: SocialLink
  isHovered: boolean
  onHoverEnter: () => void
  onHoverLeave: () => void
  onClick: () => void
}

export default function SocialFormation({
  link,
  isHovered,
  onHoverEnter,
  onHoverLeave,
  onClick,
}: SocialFormationProps) {
  const pointsRef = useRef<THREE.Points>(null)

  const { positions, offsets } = useMemo(() => {
    const n = link.particles.length
    const positions = new Float32Array(n * 3)
    const offsets = new Float32Array(n)
    link.particles.forEach(([x, y, z], i) => {
      positions[i * 3]     = x
      positions[i * 3 + 1] = y
      positions[i * 3 + 2] = z
      offsets[i] = i / (n - 1)
    })
    return { positions, offsets }
  }, [link.particles])

  const uniforms = useMemo(() => ({
    uTime:  { value: 0 },
    uHover: { value: 0 },
    uColor: { value: new THREE.Vector3(...link.tint) },
  }), [link.tint])

  useFrame((state) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value  = state.clock.elapsedTime
    const target = isHovered ? 1.0 : 0.0
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(mat.uniforms.uHover.value, target, 0.07)
  })

  return (
    <group position={link.worldPosition}>
      {/* Particle letter formation */}
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute args={[positions, 3]} attach="attributes-position" />
          <bufferAttribute args={[offsets, 1]}   attach="attributes-aOffset" />
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

      {/* Invisible interaction zone — captures pointer events */}
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
          onClick()
        }}
      >
        <boxGeometry args={[link.interactW, link.interactH, 1.5]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
      </mesh>
    </group>
  )
}
