uniform float uTime;
uniform float uActive;

varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPos;

// Simple hash noise
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vUv = uv;
  vNormal = normal;

  vec3 pos = position;

  // Vertical float
  float floatY = sin(uTime * 0.8 + pos.x * 0.5) * 0.08;
  float floatY2 = cos(uTime * 0.5 + pos.y * 0.3) * 0.04;
  pos.y += floatY + floatY2;

  // Micro lateral drift
  float driftX = sin(uTime * 0.3 + 1.0) * 0.02;
  pos.x += driftX;

  // Slight scale pulse on active
  float pulseMag = sin(uTime * 2.0) * 0.015 * uActive;
  pos *= 1.0 + pulseMag;

  vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
  vWorldPos = worldPosition.xyz;

  gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
