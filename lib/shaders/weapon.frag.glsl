uniform float uTime;
uniform float uActive;
uniform vec3 uTint;
uniform sampler2D uTexture;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

void main() {
  vec4 texColor = texture2D(uTexture, vUv);

  // Discard fully transparent pixels
  if (texColor.a < 0.05) discard;

  // Base color with tint blend
  vec3 baseColor = texColor.rgb;
  vec3 tintedColor = mix(baseColor, uTint, 0.18 + uActive * 0.12);

  // Fresnel-like edge glow
  vec2 centeredUv = vUv - 0.5;
  float edgeDist = length(centeredUv);
  float fresnel = smoothstep(0.25, 0.5, edgeDist);
  vec3 fresnelColor = uTint * fresnel * (0.4 + uActive * 0.6);

  // Shimmer wave
  float shimmerWave = sin(vUv.y * 12.0 - uTime * 3.0) * 0.5 + 0.5;
  float shimmer = shimmerWave * 0.06 * (1.0 - edgeDist * 2.0);
  shimmer = max(0.0, shimmer);

  // Pulse glow on active
  float pulse = sin(uTime * 2.5) * 0.5 + 0.5;
  float glowStrength = uActive * pulse * 0.3;
  vec3 glowColor = uTint * glowStrength;

  // Combine
  vec3 finalColor = tintedColor + fresnelColor + shimmer + glowColor;

  // Brightness boost on active
  finalColor = mix(finalColor, finalColor * 1.3, uActive * 0.5);

  // Alpha with soft edge fade
  float alphaMask = texColor.a;
  float edgeFade = 1.0 - smoothstep(0.42, 0.5, edgeDist);
  float finalAlpha = alphaMask * (0.85 + uActive * 0.15);

  gl_FragColor = vec4(finalColor, finalAlpha);
}
