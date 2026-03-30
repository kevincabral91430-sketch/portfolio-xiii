"use client"

import { useRef, useMemo } from "react"
import { useFrame, useLoader } from "@react-three/fiber"
import * as THREE from "three"
import { TextureLoader } from "three"

const vertexShader = `
uniform float uTime;
varying vec2 vUv;

void main() {
  vUv = uv;
  vec3 pos = position;
  // Gentle breathe
  float breathe = sin(uTime * 0.5) * 0.012;
  pos *= 1.0 + breathe;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`

const fragmentShader = `
uniform float uTime;
uniform float uOpacity;
uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);

  // PNG has no alpha — derive mask from luminance (black bg → transparent)
  float luma = dot(texColor.rgb, vec3(0.299, 0.587, 0.114));

  // Inner prismatic shimmer
  float shimmer = sin(vUv.y * 8.0 - uTime * 1.5) * 0.5 + 0.5;
  float shimmer2 = cos(vUv.x * 6.0 + uTime * 1.0) * 0.5 + 0.5;
  float shimmerMix = shimmer * shimmer2 * 0.08;

  // Teal/blue tint matching FFX palette
  vec3 tint = vec3(0.4, 0.85, 1.0);
  vec3 color = texColor.rgb + tint * shimmerMix;

  // Use luma as alpha — dark bg becomes transparent, bright crystal stays opaque
  float lumaAlpha = smoothstep(0.0, 0.25, luma);
  float alpha = lumaAlpha * uOpacity;
  gl_FragColor = vec4(color, alpha);
}
`

interface CrystalSpriteProps {
  opacity: number  // 0→1 (1 = fully visible)
}

export default function CrystalSprite({ opacity }: CrystalSpriteProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const texture = useLoader(TextureLoader, "/assets/weapons/cristal.png")

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uOpacity: { value: 1 },
      uTexture: { value: texture },
    }),
    [texture]
  )

  useFrame((state) => {
    if (!meshRef.current) return
    const mat = meshRef.current.material as THREE.ShaderMaterial
    mat.uniforms.uTime.value = state.clock.elapsedTime
    mat.uniforms.uOpacity.value = THREE.MathUtils.lerp(mat.uniforms.uOpacity.value, opacity, 0.06)

    // Very slow idle rotation
    meshRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.12) * 0.06
    meshRef.current.rotation.z = Math.cos(state.clock.elapsedTime * 0.08) * 0.02
  })

  return (
    <mesh ref={meshRef} position={[0, 0, 0]}>
      <planeGeometry args={[5, 5 * 1.4]} />
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
