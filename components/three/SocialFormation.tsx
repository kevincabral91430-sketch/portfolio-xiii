"use client"
// ─── SocialFormation.tsx ─────────────────────────────────────────────────────
// Système de particules "pyreflies" pour les libellés Instagram / LinkedIn /
// XIII Production. Le texte n'est jamais rendu : il sert de moule invisible
// (rasterisation canvas → reject-sampling) qui devient les positions cibles.
//
// Architecture
//   • textToParticles.sampleTextToParticles  →  cibles XY (positions cibles)
//   • Trois couches de profondeur encodées dans aLayer (0=back, 1=mid, 2=front)
//   • Vertex shader : simplex 3D (dérive organique) + impulsion souris
//                     directionnelle (jamais radiale) + scatter d'entrée
//   • Fragment shader : softness/glow/teinte par couche
//   • useFrame : suivi souris, vitesse lissée, décroissance → retour fluide
//
// Aucun état n'est stocké côté GPU : chaque frame se calcule analytiquement
// depuis (position cible, seed, layer, time, mousePos, mouseDir, mouseSpeed).

import { useEffect, useMemo, useRef, useState } from "react"
import { useFrame } from "@react-three/fiber"
import * as THREE from "three"
import type { SocialLink } from "@/lib/three/socialData"
import { sampleTextToParticles } from "@/lib/three/textToParticles"

// ─── Vertex shader ────────────────────────────────────────────────────────────
const vert = /* glsl */ `
uniform float uTime;
uniform float uActive;        // 0..1 — fade in / scatter d'entrée
uniform float uHover;         // 0..1
uniform vec2  uMousePos;      // position souris en unités-monde (z=0)
uniform vec2  uMouseDir;      // unitaire — direction du dernier mouvement
uniform float uImpact;        // 0..1 — intensité du sillage (AUCUNE dépendance vitesse)
uniform float uPresence;      // 0..1 — souris présente dans la zone (≠ uImpact, persiste à l'arrêt)

attribute float aSeed;        // 0..1 unique par particule
attribute float aLayer;       // 0 = back, 1 = mid, 2 = front

varying float vAlpha;
varying float vLayer;

// ── Simplex 3D (Stefan Gustavson, compact) ──────────────────────────────────
vec3 mod289(vec3 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 mod289(vec4 x){return x-floor(x*(1.0/289.0))*289.0;}
vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
vec4 taylorInvSqrt(vec4 r){return 1.79284291400159-0.85373472095314*r;}

float snoise(vec3 v){
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g  = step(x0.yzx, x0.xyz);
  vec3 l  = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  // ── La position cible (le moule lettre) — jamais mutée côté JS
  vec3 target = position;
  vec3 pos    = target;

  // Phase per-cluster : particules d'une même région respirent en cohérence
  float cluster = target.x * 0.6180 + target.y * 1.6180;

  // ── 1. Dérive simplex 3D — base ample, énergique ────────────────────────
  float t  = uTime * 1.05;                                  // tempo +54 %
  vec3 nv  = vec3(target.x * 0.55, target.y * 0.55, t + aSeed * 9.42);

  vec3 drift;
  drift.x = snoise(nv);
  drift.y = snoise(nv + vec3( 31.7,  17.3,  4.1)) * 1.18;  // biais Y → âmes qui s'élèvent
  drift.z = snoise(nv + vec3(113.7, 211.1,  7.7));

  // Back drifte plus large (haze), front quasi figé pour la lisibilité du contour
  float layerDriftMul = 1.0 + (2.0 - aLayer) * 0.30;       // back ×1.60, mid ×1.30, front ×1.00
  drift *= 0.065 * layerDriftMul;                          // amplitude +44 % — particules "dansent"

  // ── 2. Micro-jitter haute fréquence — fourmillement par-particule ──────
  // Tempo encore plus rapide → l'œil capte une vraie agitation organique
  vec3 nv2 = vec3(target.xy * 1.4, uTime * 3.0 + aSeed * 23.0);  // +25 % tempo
  vec3 microJitter = vec3(
    snoise(nv2),
    snoise(nv2 + vec3( 7.3, 17.1,  3.5)) * 0.9,
    snoise(nv2 + vec3(91.7, 41.3, 13.0))
  );
  drift += microJitter * 0.026 * layerDriftMul;  // +44 % fourmillement

  // Respiration cluster — double rythme → sensation de "danse" (Lissajous)
  drift.y += sin(uTime * 1.05 + cluster)             * 0.018;  // pulsation principale
  drift.y += sin(uTime * 0.38 + cluster * 1.80)      * 0.013;  // houle lente (battement)
  drift.x += cos(uTime * 0.92 + cluster * 1.21)      * 0.013;  // oscillation X marquée

  // ── 2.5 Présence statique — souris immobile mais influente ──────────────
  // Active dès que la souris est dans la zone (uPresence ≈ 1), indépendamment
  // de uImpact. Le piège du motif radial est évité par deux mesures :
  //   (a) boost local du drift idle → les particules sous le curseur s'agitent
  //       plus, sans direction propre. C'est de l'agitation amplifiée, pas
  //       un push directionnel — invisible comme champ.
  //   (b) léger push avec composante 75 % noise per-particule + 25 % outward.
  //       L'outward seul créerait un trou ; le noise dominant le casse →
  //       on sent une "tension" locale sans jamais voir un cercle.
  vec2  fromCursor   = target.xy - uMousePos;
  float dCursor2     = dot(fromCursor, fromCursor);
  float proxFalloff  = exp(-dCursor2 * 0.85);                // σ ≈ 1.08 wu — zone tight
  float prox         = proxFalloff * uPresence;

  // (a) Boost de l'agitation idle locale (×1.0 → ×2.1 sous le curseur)
  drift *= 1.0 + prox * 1.10;

  pos += drift;

  // (b) Push proximité — noise dominant pour casser tout motif radial
  if (prox > 0.001) {
    float dCursor = sqrt(max(dCursor2, 1e-6));
    vec2 outwardDir = fromCursor / dCursor;
    vec2 proxNoise = vec2(
      snoise(vec3(target.xy * 0.65, uTime * 0.70 + aSeed * 17.3)),
      snoise(vec3(target.xy * 0.65, uTime * 0.70 + aSeed * 17.3 + 91.7))
    );
    // Mix très favorable au noise → pas de cercle visible, juste de la tension
    vec2 proxDir = outwardDir * 0.25 + proxNoise * 0.85;
    float proxAmp = prox * 0.16 * (0.78 + aLayer * 0.36);    // parallaxe par couche
    pos.xy += proxDir * proxAmp;
    pos.z  += proxNoise.x * prox * 0.045;
  }

  // ── 3. Sillage souris — micro-explosion contrôlée + zigzag persistant ───
  // Architecture en trois étages :
  //   a) Direction de base par-particule : uMouseDir tournée d'un angle unique
  //      (±0.7 rad) → particules s'éjectent dans des directions légèrement
  //      différentes → sensation de "balayage explosif", pas de push uniforme.
  //   b) forwardWave + lateralWave (multi-fréquence) → trajectoire en zigzag
  //      ample, JAMAIS linéaire.
  //   c) Amplitude pilotée par uImpact (decay lent) × baseForce élevé →
  //      particules projetées loin du moule (jusqu'à ~4 wu pour la couche
  //      avant). Le zigzag persiste pendant tout le voyage retour.
  vec2  toMouse = target.xy - uMousePos;
  float d2      = dot(toMouse, toMouse);
  float falloff = exp(-d2 * 0.55);                          // σ ≈ 1.35 wu

  // (a) Direction de base par-particule — dispersion latérale d'explosion
  float dirJitter = (aSeed - 0.5) * 1.4;                    // ±0.7 rad
  float caJ = cos(dirJitter), saJ = sin(dirJitter);
  vec2 baseDir = vec2(
    uMouseDir.x * caJ - uMouseDir.y * saJ,
    uMouseDir.x * saJ + uMouseDir.y * caJ
  );
  vec2 perpDir = vec2(-baseDir.y, baseDir.x);

  // (b) Onde latérale ample : sin rapide + simplex moyen → zigzag franc
  float lateralWave =
        sin(uTime * 2.4 + aSeed * 31.0)                                       * 0.78
      + snoise(vec3(target.xy * 0.5, uTime * 1.7 + aSeed * 12.0))             * 1.10;

  // Variation longitudinale plus marquée → certaines particules ralentissent,
  // d'autres accélèrent → la "trajectoire" elle-même varie particule par particule.
  float forwardWave = 0.85
      + snoise(vec3(target.xy * 0.4, uTime * 0.9 + aSeed * 9.7))              * 0.35;

  vec2 dispDir = baseDir * forwardWave + perpDir * lateralWave;

  // (c) Amplitude — parallaxe par couche × force élevée
  float layerImp  = 0.78 + aLayer * 0.36;                   // 0.78 / 1.14 / 1.50
  float baseForce = 1.60;                                   // +14 % → projection plus franche
  float amp       = falloff * uImpact * baseForce * layerImp;
  pos.xy += dispDir * amp;
  // Z modulé : projection 3D pendant l'éjection (lift / push back)
  pos.z  += (aSeed - 0.5) * amp * 0.95;

  // ── 4. Scatter d'entrée — convergence depuis un nuage dispersé ──────────
  float sc = 1.0 - uActive;
  sc = sc * sc;                                             // ease-out quadratique
  float scatterMag = sc * 4.6;
  vec3 scatterDir = normalize(vec3(
    sin(aSeed * 127.1 + 311.7),
    cos(aSeed * 269.5 + 183.3),
    sin(aSeed * 419.2 +  75.8)
  ) + vec3(0.0001));
  pos += scatterDir * scatterMag;

  // ── 5. Hover — expansion collective douce ───────────────────────────────
  pos.xy *= 1.0 + uHover * 0.025;

  // ── Projection ──────────────────────────────────────────────────────────
  vec4 mvPos  = modelViewMatrix * vec4(pos, 1.0);
  gl_Position = projectionMatrix * mvPos;

  // ── Taille du point — sculpturale, fine, lisible (skill §6) ─────────────
  // Cible @ z=16 : back 1.5 / mid 2.7 / front 4.2 px → vrais points distincts
  float baseSize = 0.13 + aLayer * 0.13;                    // 0.13 / 0.26 / 0.39
  float pxScale  = 220.0 / -mvPos.z;
  float hBoost   = 1.0 + uHover * 0.18;
  gl_PointSize   = clamp(baseSize * pxScale * hBoost * uActive, 0.0, 8.0);

  // ── Alpha — pas de twinkle, juste une variation très subtile ────────────
  // Skill §7 : amplitude max 0.06 — au-delà ça scintille / strobe.
  float tFreq    = 0.62 + aSeed * 1.20;
  float breathe  = 0.94 + 0.06 * sin(uTime * tFreq + aSeed * 17.3);
  // Couches en alpha croissante (skill §6) : back haze, front net
  float layerAlpha = 0.22 + aLayer * 0.24;                  // back 0.22 / mid 0.46 / front 0.70
  vAlpha = uActive * layerAlpha * breathe;
  vLayer = aLayer;
}
`

// ─── Fragment shader ──────────────────────────────────────────────────────────
// Recette igloo / Awwwards (voir docs/skills/particle-typography/SKILL.md §4) :
//   • disque PLAT à bord anti-aliasé (smoothstep), pas de gaussienne
//   • pigment pur, jamais multiplié au-dessus de 1.0 (§9, loi 1)
//   • aucune teinte chromatique chaud/froid (cause du "néon")
//   • aucun spark de luminance — l'impact souris est porté par le déplacement
const frag = /* glsl */ `
uniform vec3  uColor;
varying float vAlpha;
varying float vLayer;

void main() {
  vec2 c = gl_PointCoord - 0.5;
  float r = length(c);
  if (r > 0.5) discard;

  // ── Disque plat avec bord anti-aliasé ──────────────────────────────
  // L'intérieur du disque a un alpha uniforme → deux particules qui se
  // recouvrent ne deviennent pas plus brillantes, elles se superposent
  // simplement. C'est la définition d'une "particule" et non d'un "spark".
  // Largeur d'AA modulée par couche : back légèrement plus douce, front nette.
  float aaWidth = mix(0.06, 0.020, vLayer * 0.5);          // back 0.060 / mid 0.040 / front 0.020
  float disc    = smoothstep(0.50, 0.50 - aaWidth, r);

  // ── Pigment pur, jamais > 100 % ────────────────────────────────────
  // Couche back assourdie pour reculer dans la profondeur.
  float layerLum = 0.78 + vLayer * 0.11;                   // 0.78 / 0.89 / 1.00
  vec3  col      = uColor * layerLum;

  gl_FragColor = vec4(col, disc * vAlpha);
}
`

// ─── Buffers structurés ──────────────────────────────────────────────────────
interface ParticleBuffers {
  positions: Float32Array  // xyz × N — XY = cible lettre, Z = offset de couche
  seeds:     Float32Array  // N — [0,1) unique
  layers:    Float32Array  // N — 0 (back) / 1 (mid) / 2 (front)
  count:     number
}

/**
 * Construit les attributs depuis les positions cibles 2D.
 * Distribution des couches : 25 % back / 50 % mid / 25 % front.
 * Le Z est jitté à l'intérieur de chaque tranche → relief continu.
 */
function buildParticleBuffers(targets: [number, number, number][]): ParticleBuffers {
  const n = targets.length
  const positions = new Float32Array(n * 3)
  const seeds     = new Float32Array(n)
  const layers    = new Float32Array(n)

  // LCG déterministe
  let s = 0x6a09e667
  const rand = (): number => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0
    return s / 0x100000000
  }

  // Plages Z par couche (unités-monde) — voir SKILL §6
  // Volume total ~1.2 wu : sculptural, parallaxe lisible, sans nuire à la lecture
  const Z_BACK_LO  = -0.60, Z_BACK_HI  = -0.25
  const Z_MID_LO   = -0.10, Z_MID_HI   = +0.20
  const Z_FRONT_LO = +0.30, Z_FRONT_HI = +0.65

  for (let i = 0; i < n; i++) {
    const [x, y] = targets[i]
    const seed = rand()
    seeds[i] = seed

    // Tirage de couche
    const r = rand()
    let layer: number, zLo: number, zHi: number
    // 18 % back / 57 % mid / 25 % front — plus de corps sur la couche lisible
    if (r < 0.18)      { layer = 0; zLo = Z_BACK_LO;  zHi = Z_BACK_HI  }
    else if (r < 0.75) { layer = 1; zLo = Z_MID_LO;   zHi = Z_MID_HI   }
    else               { layer = 2; zLo = Z_FRONT_LO; zHi = Z_FRONT_HI }

    layers[i] = layer
    positions[i * 3]     = x
    positions[i * 3 + 1] = y
    positions[i * 3 + 2] = zLo + rand() * (zHi - zLo)
  }

  return { positions, seeds, layers, count: n }
}

// ─── Réutilisables au niveau module ──────────────────────────────────────────
const _vRay = new THREE.Vector3()
const _dRay = new THREE.Vector3()
const _hRay = new THREE.Vector3()

interface SocialFormationProps {
  link:         SocialLink
  isActive:     boolean
  isHovered:    boolean
  onHoverEnter: () => void
  onHoverLeave: () => void
  onClick:      () => void
}

export default function SocialFormation({
  link,
  isActive,
  isHovered,
  onHoverEnter,
  onHoverLeave,
  onClick,
}: SocialFormationProps) {
  const pointsRef = useRef<THREE.Points>(null)
  const [buffers, setBuffers] = useState<ParticleBuffers | null>(null)
  const wasActive = useRef(false)

  // ── État du suivi souris ──────────────────────────────────────────────
  // Deux intensités distinctes :
  //   • wakeIntensity (uImpact) — pulse au mouvement, ne dépend PAS de la vitesse
  //   • presence     (uPresence) — souris simplement présente dans la zone
  //                                (active même si elle est immobile)
  const prevWorld     = useRef(new THREE.Vector2(9999, 9999))
  const frozenPos     = useRef(new THREE.Vector2(9999, 9999))
  const smoothDir     = useRef(new THREE.Vector2(1, 0))
  const wakeIntensity = useRef(0)
  const presence      = useRef(0)

  // ── Construction du moule : on attend que la fonte soit chargée ──────
  useEffect(() => {
    let cancelled = false
    const build = async () => {
      try {
        // S'assure que Geist (chargée par Next) est dispo dans le canvas
        await (document as { fonts?: { ready: Promise<unknown> } }).fonts?.ready
      } catch {
        /* ignore */
      }
      if (cancelled) return

      const targets = sampleTextToParticles({
        lines:       link.text.lines,
        count:       link.text.count,
        worldWidth:  link.text.worldWidth,
        fontWeight:  800,
      })
      if (cancelled || targets.length === 0) return
      setBuffers(buildParticleBuffers(targets))
    }
    void build()
    return () => {
      cancelled = true
    }
  }, [link.text])

  // ── Uniforms — alloués une fois ───────────────────────────────────────
  const uniforms = useMemo(
    () => ({
      uTime:      { value: 0 },
      uActive:    { value: 0 },
      uHover:     { value: 0 },
      uColor:     { value: new THREE.Vector3(...link.tint) },
      uMousePos:  { value: new THREE.Vector2(9999, 9999) },
      uMouseDir:  { value: new THREE.Vector2(1, 0) },
      uImpact:    { value: 0 },                           // 0-1 — pulse de mouvement
      uPresence:  { value: 0 },                           // 0-1 — souris simplement présente
    }),
    [link.tint]
  )

  // ── Boucle d'animation ────────────────────────────────────────────────
  useFrame((state) => {
    if (!pointsRef.current) return
    const mat = pointsRef.current.material as THREE.ShaderMaterial
    const t = state.clock.elapsedTime

    mat.uniforms.uTime.value = t
    mat.uniforms.uActive.value = THREE.MathUtils.lerp(
      mat.uniforms.uActive.value, isActive ? 1 : 0, 0.065
    )
    mat.uniforms.uHover.value = THREE.MathUtils.lerp(
      mat.uniforms.uHover.value, isHovered ? 1 : 0, 0.085
    )

    // Skip complet quand invisible (économie GPU + pas de pollution d'état)
    if (!isActive && mat.uniforms.uActive.value < 0.008) {
      wasActive.current = false
      return
    }

    // Reset propre à l'activation
    if (isActive && !wasActive.current) {
      prevWorld.current.set(9999, 9999)
      frozenPos.current.set(9999, 9999)
      wakeIntensity.current = 0
      presence.current      = 0
      mat.uniforms.uMousePos.value.set(9999, 9999)
      mat.uniforms.uImpact.value   = 0
      mat.uniforms.uPresence.value = 0
    }
    wasActive.current = isActive

    // ── Projection de la souris (NDC → plan z=0) ──────────────────────
    // Le seuil détecte UN mouvement (oui/non) — il n'amplifie pas l'impulsion.
    const MOTION_THRESHOLD = 0.006   // wu/frame — sous ce seuil = "statique"
    let mX = 9999, mY = 9999

    if (isActive) {
      _vRay.set(state.pointer.x, state.pointer.y, 0.5).unproject(state.camera)
      _dRay.copy(_vRay).sub(state.camera.position).normalize()
      const camZ = state.camera.position.z
      if (Math.abs(_dRay.z) > 0.001) {
        const tRay = -camZ / _dRay.z
        _hRay.copy(state.camera.position).addScaledVector(_dRay, tRay)
        if (Math.abs(_hRay.x) < 12 && Math.abs(_hRay.y) < 5) {
          mX = _hRay.x
          mY = _hRay.y
        }
      }
    }

    const nearWord = mX < 9000

    // Présence : 1 quand la souris est dans la zone, 0 sinon. Indépendant
    // du mouvement → l'influence statique reste active sur curseur immobile.
    presence.current = THREE.MathUtils.lerp(
      presence.current, nearWord ? 1.0 : 0.0, nearWord ? 0.18 : 0.06
    )

    if (nearWord) {
      frozenPos.current.set(mX, mY)

      const prevX = prevWorld.current.x
      const prevY = prevWorld.current.y
      const rawDX = prevX > 9000 ? 0 : mX - prevX
      const rawDY = prevY > 9000 ? 0 : mY - prevY
      const rawMotion = Math.sqrt(rawDX * rawDX + rawDY * rawDY)

      if (rawMotion > MOTION_THRESHOLD) {
        // Mouvement détecté → direction = vecteur normalisé du déplacement
        // (la magnitude est jetée — on ne garde QUE la direction).
        const inv = 1 / rawMotion
        smoothDir.current.x = THREE.MathUtils.lerp(smoothDir.current.x, rawDX * inv, 0.5)
        smoothDir.current.y = THREE.MathUtils.lerp(smoothDir.current.y, rawDY * inv, 0.5)
        const sLen = Math.hypot(smoothDir.current.x, smoothDir.current.y)
        if (sLen > 0.001) {
          smoothDir.current.x /= sLen
          smoothDir.current.y /= sLen
        }
        // Ramp-up très rapide → "explosion" presque instantanée à l'impact
        wakeIntensity.current = THREE.MathUtils.lerp(wakeIntensity.current, 1.0, 0.45)
      } else {
        // Statique sur le mot → désamorçage progressif (~1 s).
        // Le zigzag continue d'osciller pendant la décroissance car les ondes
        // latérales du shader sont indépendantes de uImpact.
        wakeIntensity.current = THREE.MathUtils.lerp(wakeIntensity.current, 0, 0.025)
      }

      prevWorld.current.set(mX, mY)
    } else {
      // Souris hors-zone — décroissance ~0.85 s. La direction reste figée à
      // sa dernière valeur → sillage continue dans la dernière direction.
      prevWorld.current.set(9999, 9999)
      wakeIntensity.current = THREE.MathUtils.lerp(wakeIntensity.current, 0, 0.030)
    }

    mat.uniforms.uMousePos.value.set(frozenPos.current.x, frozenPos.current.y)
    mat.uniforms.uMouseDir.value.set(smoothDir.current.x, smoothDir.current.y)
    mat.uniforms.uImpact.value   = wakeIntensity.current
    mat.uniforms.uPresence.value = presence.current
  })

  // ── Rendu ─────────────────────────────────────────────────────────────
  // Avant que les buffers soient prêts (fonts.ready), on ne rend rien.
  if (!buffers) return null

  return (
    <group position={[0, 0, 0]}>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute args={[buffers.positions, 3]} attach="attributes-position" />
          <bufferAttribute args={[buffers.seeds,     1]} attach="attributes-aSeed"    />
          <bufferAttribute args={[buffers.layers,    1]} attach="attributes-aLayer"   />
        </bufferGeometry>
        <shaderMaterial
          vertexShader={vert}
          fragmentShader={frag}
          uniforms={uniforms}
          transparent
          depthWrite={false}
          depthTest={false}
          // Normal blending — voir SKILL §5. Additif compoundait en blanc.
          blending={THREE.NormalBlending}
        />
      </points>

      {/* Zone de hit invisible — détection hover/click */}
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
          <boxGeometry args={[18, 7, 4]} />
          <meshBasicMaterial transparent opacity={0} depthWrite={false} depthTest={false} />
        </mesh>
      )}
    </group>
  )
}
