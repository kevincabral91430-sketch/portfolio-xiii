"use client"

import { useEffect, useRef } from "react"

interface LoadingScreenProps {
  onComplete: () => void
}

// ─── Vertex shader — full-screen quad ────────────────────────────────────────
const VERT = `
attribute vec2 aPos;
varying   vec2 vUv;
void main() {
  vUv         = aPos * 0.5 + 0.5;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`

// ─── Fragment shader — "Eau Mémoire" ─────────────────────────────────────────
const FRAG = `
precision highp float;
uniform float      uTime;
uniform sampler2D  uWeapon;
uniform vec2       uRes;
varying vec2       vUv;

// ── 3-octave organic water noise ──────────────────────────────────────────────
float wNoise(vec2 p, float t) {
  float n1 = sin(p.x * 2.8  + t * 0.55) * cos(p.y * 3.1  - t * 0.42);
  float n2 = sin(p.x * 5.6  - t * 0.88 + 1.3) * sin(p.y * 4.9 + t * 0.71);
  float n3 = cos(p.x * 10.2 + t * 0.32) * sin(p.y * 8.6  - t * 0.47);
  return n1 * 0.50 + n2 * 0.32 + n3 * 0.18;
}

// ── Radial ripple from centre ─────────────────────────────────────────────────
float ripple(vec2 uv, float ar, float t) {
  vec2  d    = (uv - vec2(0.5)) * vec2(ar, 1.0);
  float dist = length(d);
  float gate = smoothstep(0.25, 0.60, t) * smoothstep(1.60, 0.80, t);
  return sin(dist * 22.0 - t * 5.5) * exp(-dist * 5.5) * gate;
}

void main() {
  float t  = uTime;
  float ar = uRes.x / uRes.y;
  vec2  uv = vUv;

  // ── Water displacement field ───────────────────────────────────────────────
  float n   = wNoise(uv, t);
  float rip = ripple(uv, ar, t);

  vec2 disp = vec2(
    sin(uv.y * 4.5 + t * 0.45) * 0.007 + n * 0.004,
    cos(uv.x * 3.8 - t * 0.38) * 0.006 + rip * 0.016
  );

  // ── Background — four tonal layers ────────────────────────────────────────
  vec3 cVoid = vec3(0.002, 0.007, 0.020);
  vec3 cDeep = vec3(0.004, 0.018, 0.050);
  vec3 cSurf = vec3(0.000, 0.058, 0.128);
  vec3 cCyan = vec3(0.000, 0.275, 0.470);

  vec2  bgUv = uv + disp * 0.40;
  float grad = bgUv.y + n * 0.11;
  vec3  bg   = mix(cVoid, cDeep, smoothstep(0.00, 0.45, grad));
  bg         = mix(bg,   cSurf, smoothstep(0.35, 0.80, grad));

  // Caustic shimmer on surface
  float cx = sin(uv.x * 8.4 + t * 0.52)        * 0.5 + 0.5;
  float cy = cos(uv.y * 6.1 - t * 0.41 + 1.1)  * 0.5 + 0.5;
  bg += cCyan * cx * cy * smoothstep(-0.1, 0.6, n) * 0.032;

  // Horizontal water-line
  float wLine = smoothstep(0.486, 0.500, uv.y) * smoothstep(0.528, 0.500, uv.y);
  bg += vec3(0.0, 0.32, 0.52) * wLine * (abs(rip) * 0.5 + 0.05);

  // ── Aspect-correct UV space (isotropic) ───────────────────────────────────
  vec2 uvAC = (uv - 0.5) * vec2(ar, 1.0);   // x ∈ [-ar/2, ar/2], y ∈ [-0.5, 0.5]

  // Weapon centre — slightly right / slightly above centre (matches scene)
  vec2  wCenAC = vec2(0.22, -0.02);
  float wH     = 0.72;           // fraction of screen height
  float wW     = wH / 1.6;      // aspect from planeGeometry args=[scale, scale*1.6]

  // ── Emergence animation params ─────────────────────────────────────────────
  float emerge  = smoothstep(0.85, 1.95, t);   // 0→1  weapon materialises
  float clarity = smoothstep(1.65, 2.35, t);   // 0→1  distortion clears
  float glowPk  = smoothstep(2.00, 2.55, t);   // 0→1  glow peak

  float distMag = (1.0 - clarity * 0.88) * 0.055;   // distortion magnitude

  // ── Reflection (weapon flipped vertically, max distortion) ────────────────
  vec2 reflAC  = uvAC - wCenAC;
  reflAC.y    *= -1.0;   // mirror Y
  vec2 reflUv  = reflAC / vec2(wW, wH) + 0.5;
  reflUv      += disp * distMag * 18.0;
  reflUv      += vec2(rip * 0.022, rip * 0.014);

  vec4 reflection = texture2D(uWeapon, reflUv);
  float reflVis   = smoothstep(0.38, 1.05, t) * (1.0 - clarity * 0.80);
  float reflAlpha = reflection.a * reflVis * 0.40;

  // ── Weapon (direct, distortion shrinks with clarity) ──────────────────────
  vec2 wAC  = uvAC - wCenAC;
  vec2 wUv  = wAC / vec2(wW, wH) + 0.5;
  wUv      += disp * distMag * 12.0;
  wUv      += vec2(rip * 0.012, rip * 0.009) * (1.0 - clarity * 0.85);

  vec4 weapon     = texture2D(uWeapon, wUv);
  float weapAlpha = weapon.a * emerge;

  // ── Assemble ───────────────────────────────────────────────────────────────
  vec3 col = bg;

  // Reflection — cooler, desaturated
  vec3 reflCol = reflection.rgb * vec3(0.32, 0.70, 0.90);
  col = mix(col, reflCol, reflAlpha);

  // Weapon — transitions from underwater cyan tint to natural colour
  vec3 weapCol = mix(
    weapon.rgb * vec3(0.50, 0.80, 1.00),   // submerged tint
    weapon.rgb,                              // natural
    clarity
  );
  col = mix(col, weapCol, weapAlpha);

  // ── Glow halo (screen-space, around weapon centre) ────────────────────────
  float glowDist = length((uv - (wCenAC / vec2(ar, 1.0) + 0.5)) * vec2(ar, 1.0));
  col += vec3(0.04, 0.40, 0.70) * exp(-glowDist * 4.8) * glowPk * 0.13;

  // Fresnel edge on emerging weapon
  float edgeDist = length(wAC / vec2(wW, wH));
  float fresnel  = pow(smoothstep(0.05, 0.50, edgeDist), 1.5);
  col += vec3(0.08, 0.52, 0.82) * fresnel * weapAlpha * 0.09;

  // ── Pyrefly mote — drifts near weapon tip ─────────────────────────────────
  vec2  motePos = vec2(0.58 + sin(t * 0.38) * 0.018, 0.30 + cos(t * 0.44) * 0.014);
  float moteDst = length((uv - motePos) * vec2(ar, 1.0));
  float mote    = exp(-moteDst * moteDst * 180.0) * smoothstep(1.2, 2.0, t);
  col += vec3(0.30, 0.85, 1.00) * mote * 0.55;

  // ── Vignette ───────────────────────────────────────────────────────────────
  vec2  vigUv   = uv * (1.0 - uv.yx);
  float vignette = pow(clamp(vigUv.x * vigUv.y * 13.0, 0.0, 1.0), 0.45);
  col *= mix(0.70, 1.0, vignette);

  // ── Fade-out → scene background colour ────────────────────────────────────
  float fadeOut = smoothstep(2.20, 2.80, t);
  col = mix(col, vec3(0.012, 0.031, 0.066), fadeOut);

  // Full canvas alpha (WebGL compositing with page)
  float alpha = 1.0 - smoothstep(2.55, 2.90, t);

  gl_FragColor = vec4(col, alpha);
}
`

// ─── Total animation duration (seconds) — onComplete fires at this point ─────
const DURATION = 2.9

export default function LoadingScreen({ onComplete }: LoadingScreenProps) {
  const canvasRef    = useRef<HTMLCanvasElement>(null)
  const calledRef    = useRef(false)
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // ── WebGL context ────────────────────────────────────────────────────────
    const gl = canvas.getContext("webgl", {
      alpha: true,
      premultipliedAlpha: false,
      antialias: false,
    }) as WebGLRenderingContext | null

    if (!gl) {
      onCompleteRef.current()
      return
    }

    // ── Resize handler ───────────────────────────────────────────────────────
    const resize = () => {
      canvas.width  = window.innerWidth
      canvas.height = window.innerHeight
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    resize()
    window.addEventListener("resize", resize)

    // ── Shader compilation ───────────────────────────────────────────────────
    const compileShader = (type: number, src: string): WebGLShader => {
      const shader = gl.createShader(type)!
      gl.shaderSource(shader, src)
      gl.compileShader(shader)
      return shader
    }

    const prog = gl.createProgram()!
    gl.attachShader(prog, compileShader(gl.VERTEX_SHADER,   VERT))
    gl.attachShader(prog, compileShader(gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    // ── Full-screen quad (2 triangles) ───────────────────────────────────────
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
      -1, -1,  1, -1, -1,  1,
      -1,  1,  1, -1,  1,  1,
    ]), gl.STATIC_DRAW)
    const aPosLoc = gl.getAttribLocation(prog, "aPos")
    gl.enableVertexAttribArray(aPosLoc)
    gl.vertexAttribPointer(aPosLoc, 2, gl.FLOAT, false, 0, 0)

    // ── Uniform locations ────────────────────────────────────────────────────
    const uTimeLoc   = gl.getUniformLocation(prog, "uTime")
    const uResLoc    = gl.getUniformLocation(prog, "uRes")
    const uWeaponLoc = gl.getUniformLocation(prog, "uWeapon")

    // ── Weapon texture — 1×1 transparent fallback while loading ──────────────
    const tex = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, tex)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE,
      new Uint8Array([0, 0, 0, 0]))

    const img = new Image()
    img.src = "/assets/weapons/final-fantasy-10-weapon-ultima_0.png"
    img.onload = () => {
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img)
      gl.generateMipmap(gl.TEXTURE_2D)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR)
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    }

    // ── Render loop ──────────────────────────────────────────────────────────
    let rafId: number
    const startMs = performance.now()

    const render = () => {
      const elapsed = (performance.now() - startMs) / 1000

      gl.enable(gl.BLEND)
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)

      gl.activeTexture(gl.TEXTURE0)
      gl.bindTexture(gl.TEXTURE_2D, tex)
      gl.uniform1i(uWeaponLoc, 0)
      gl.uniform1f(uTimeLoc, elapsed)
      gl.uniform2f(uResLoc, canvas.width, canvas.height)

      gl.drawArrays(gl.TRIANGLES, 0, 6)

      if (elapsed < DURATION + 0.15) {
        rafId = requestAnimationFrame(render)
      }

      if (elapsed >= DURATION && !calledRef.current) {
        calledRef.current = true
        onCompleteRef.current()
      }
    }

    rafId = requestAnimationFrame(render)

    return () => {
      cancelAnimationFrame(rafId)
      window.removeEventListener("resize", resize)
      gl.deleteBuffer(buf)
      gl.deleteTexture(tex)
      gl.deleteProgram(prog)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "fixed",
        inset:    0,
        width:    "100%",
        height:   "100%",
        display:  "block",
        background: "#020810",   // matches scene bg — no flash before first frame
      }}
    />
  )
}
