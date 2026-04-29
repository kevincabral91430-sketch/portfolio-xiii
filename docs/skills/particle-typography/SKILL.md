---
name: particle-typography
description: |
  Render readable text from distinct WebGL particles, with subtle organic motion,
  3D depth and velocity-driven mouse interaction. Targets premium / Awwwards
  rendering (igloo.inc reference) adapted to a spiritual aesthetic (FFX pyreflies).
  Use this when building any "text made of particles" effect where the goal is
  legibility + sculptural feel + no neon / no blob / no white burnout.
---

# Particle Typography — premium, sculptural, never blob

## 1. Success criteria (what "good" looks like)

A run is acceptable only if **all five** are true. If any fails, the rendering
is not done.

1. **Legible at first glance** — the word reads in <300 ms. If you have to
   squint, the silhouette is too sparse or too noisy.
2. **Particles are distinct** — you can see individual dots with gaps between
   them. If letters look like solid bars, density is too high or sprites are
   too soft.
3. **No white burnout** — even where particles overlap densely, the colour
   stays saturated cyan / amber / etc. Pure white anywhere = failure.
4. **Quiet motion** — particles drift / breathe but never dance or flicker.
   Stroboscopic twinkle = failure.
5. **3D volume** — without rotating the camera, the eye reads depth: some
   dots are crisp & forward, some are slightly soft & receded.

Anti-criteria (immediate rejection):
- "logo glow" / neon look
- foam-like or blob-like fill
- white halo around the word
- visible flicker
- particles forming a circular ring around the cursor

---

## 2. Pipeline (the only correct order)

```
text spec ──▶ canvas raster ──▶ reject-sample ──▶ buffer build ──▶ shader
   (data)        (mask)            (positions)      (positions+seed+layer)
```

Each step has a non-obvious failure mode — see §10.

### 2a. Text spec
A single source of truth per word: `{ lines: [{text, scale}], worldWidth, count }`.
Multi-line stacks (e.g. "XIII" + "PRODUCTION") with per-line scale.

### 2b. Canvas raster
- Offscreen `<canvas>`, width 2048 px (resolution drives glyph quality).
- Font: project font (e.g. Geist via `--font-geist-sans` resolved through
  `getComputedStyle`), weight 800.
- **Wait for `document.fonts.ready` before rastering.** Otherwise the first
  raster uses the fallback font and the silhouette is wrong.
- Multi-line: stack lines vertically, line gap = 1.10× line height.

### 2c. Reject-sample
- Deterministic LCG (no `Math.random` — must be stable build-to-build).
- Test alpha threshold ≥ 128 → silhouette stays crisp at the edge.
- Continue until N points found OR 80×N attempts reached.

### 2d. Buffer build
Per particle:

| attribute  | size  | meaning                                                        |
|------------|-------|----------------------------------------------------------------|
| `position` | vec3  | XY = letter target (canvas → world). Z = layer offset.         |
| `aSeed`    | float | Unique [0,1) — drives noise phase, jitter, twinkle.            |
| `aLayer`   | float | 0 = back, 1 = mid, 2 = front. Discrete enum.                   |

Layer split: **25 % back / 50 % mid / 25 % front**.

### 2e. Shader
Stateless. Every frame the shader recomputes `pos = target + drift + impulse`.
No CPU state per particle. No texture (procedural sprite, see §4).

---

## 3. Density math (the single biggest reason it looks bad)

This is the formula that decides whether the rendering is "blob" or "igloo".

Given:
- `worldWidth` (wu) = width of the longest line
- `letters` = number of glyph chars
- `cameraDist` (wu) = distance camera ⟷ z=0 plane
- `viewportH` (px)

```
pxPerWu      = viewportH / (2 × cameraDist × tan(FOV_v / 2))
letterPxW    = (worldWidth / letters) × pxPerWu
strokeFill   ≈ 0.30                          // ~30 % of bbox is glyph mass
particleArea = pointSize² (px²)
```

Target overlap factor in glyph mass: **0.20 → 0.40**.

```
goalCoverage = strokeFill × bboxAreaPx × overlap     // px²
count        = goalCoverage / particleArea
```

Worked example (this project):
- viewport 1080 px, FOV 60°, camera z=16
- pxPerWu ≈ 58
- INSTAGRAM, worldWidth 16, 9 letters, letterPxW ≈ 103 px,
  letterArea ≈ 18 000 px²
- glyph mass ≈ 0.30 × 18 000 = 5 400 px²/letter, × 9 letters = 48 600 px²
- pointSize avg ≈ 4 px → particleArea ≈ 16 px²
- count = 0.30 × 48 600 / 16 ≈ **900 particles** for 30 % coverage

**If count is doubled, you get blob. If halved, you get noise.**

Reference values used:

| word              | count |
|-------------------|-------|
| INSTAGRAM         |  800  |
| LINKEDIN          |  680  |
| XIII PRODUCTION   |  950  |

Anything noticeably above these turns into a logo blob.

---

## 4. Sprite recipe (the second biggest reason it looks bad)

There are two sprite philosophies, and they look completely different even
with everything else equal.

### 4a. WRONG — gaussian falloff
```glsl
float glow = exp(-d2 * k);          // peak 1 at center, fades to 0
gl_FragColor = vec4(uColor, glow * vAlpha);
```
This produces a **bright dot in the middle of a soft halo**. With normal
blending across overlapping particles, the halos add → fills the
inter-particle gaps → blob. With additive blending, the centers add →
white burnout.

### 4b. RIGHT — flat disc with AA edge
```glsl
float r    = length(gl_PointCoord - 0.5);
float disc = smoothstep(0.50, 0.46, r);   // flat interior, 1-2 px AA at edge
gl_FragColor = vec4(uColor, disc * vAlpha);
```
This produces a **uniform colored disc**. Overlap is bounded — two particles
overlapping fully don't get brighter, they just stack at the same alpha.
This is what reads as a "particle" rather than a "spark".

For per-layer softness variation, modulate the falloff WIDTH, not the falloff
shape:
```glsl
float aaWidth = mix(0.06, 0.02, vLayer * 0.5);    // back softer, front crisper
float disc    = smoothstep(0.50, 0.50 - aaWidth, r);
```

---

## 5. Blending mode

| Mode               | When to use                                              | Trap                                                                |
|--------------------|----------------------------------------------------------|---------------------------------------------------------------------|
| `NormalBlending`   | Default. Crisp colored particles. Bounded saturation.    | Order matters; with depthTest=true z-fighting; use depthTest=false. |
| `AdditiveBlending` | Sparks / energy effects. Single layer, sparse.           | Compounds to white when density × alpha > 1. **Almost never the right choice for particle text.** |

For text: **NormalBlending, depthWrite=false, depthTest=false**.

---

## 6. Layer architecture (the volumetric trick)

Three layers, encoded in a per-particle attribute (no separate Points
instances — single draw call).

| Layer  | Z range (wu)   | size factor | alpha base | sprite AA |
|--------|----------------|-------------|------------|-----------|
| back   | −0.60 .. −0.25 | 0.55×       | 0.18       | softer    |
| mid    | −0.10 .. +0.20 | 1.00×       | 0.36       | medium    |
| front  | +0.30 .. +0.65 | 1.55×       | 0.62       | crisp     |

Z spread total ≈ 1.2 wu — enough for parallax via camera mouse-tilt
(`CameraRig` already amplifies mouse parallax 6× on social), too little to
disturb readability.

Critical: alpha base is **monotonically increasing** by layer. Do not invert.
Back layer with high alpha would destroy the depth cue.

---

## 7. Idle motion

Use **simplex 3D**, never `random()`, never linear motion.

```
nv     = vec3(target.xy * 0.55, time * 0.18 + aSeed * 9.42)
drift  = (snoise(nv), snoise(nv + 31), snoise(nv + 113)) * 0.045
drift.y *= 1.18                              // souls rise
drift  *= 1 + (2 - aLayer) * 0.20            // back drifts more
```

Add a slow Lissajous breathing on top:
```
drift.y += sin(time * 0.34 + cluster) * 0.012
drift.x += cos(time * 0.27 + cluster * 1.21) * 0.009
```

**Do not** twinkle the alpha at high amplitude. Maximum range
`0.94 + 0.06 × sin(...)` — anything wider reads as flicker / stroboscope.

---

## 8. Mouse impulse — directional, velocity-driven

**Wrong**: radial repulsion (creates a hole / circle around the cursor).
**Right**: directional impulse along mouse motion vector.

JS side:
```
prevMouseWorld → smooth direction (lerp 0.5, normalize)
                → smooth speed (lerp 0.4 when moving, 0.025 decay otherwise)
threshold ~0.006 wu/frame to call "moving"
```

Shader side:
```
falloff   = exp(-d2 × 0.34)                  // gaussian σ ≈ 1.7 wu
angJitter = (aSeed - 0.5) × 1.4              // ±0.7 rad turbulence
dispDir   = rotate(uMouseDir, angJitter)
displacement = dispDir × falloff × uMouseSpeed × layerImp
```

Layer impulse multiplier: back 0.78, mid 1.14, front 1.50 — front layer
reacts most → parallax depth on impact.

When mouse stops, `uMouseSpeed → 0` smoothly, displacement decays to 0,
particles return to target. **Stateless** — no spring, no integration, no
snap. Decay rate is the only knob.

---

## 9. Colour discipline (the cause of "néon")

Two laws:

1. **Never multiply colour above 1.0.** No `uColor * 1.4`, no
   `+ glow * 0.5`. The brightest particle equals `uColor`. Period.
2. **Saturate, don't brighten.** Cyan particles read as "spirit" if the
   colour is `(0.42, 0.72, 0.88)` (slightly desaturated, mist-like). They
   read as "neon" if it's `(0.20, 0.95, 1.00)` (pure cyan, max-out blue).

Validated FFX-friendly tints (linear, premultiplied into shader):

| word      | tint                       | name              |
|-----------|----------------------------|-------------------|
| Instagram | (0.42, 0.72, 0.88)         | Farplane mist     |
| LinkedIn  | (0.40, 0.80, 0.78)         | Aquamarine spirit |
| XIII      | (0.78, 0.66, 0.32)         | Sober amber       |

Per-layer luminance variation: `uColor × (0.78 + vLayer × 0.11)`. So back
layer is 78 %, front 100 %. **Never above 100 %**.

---

## 10. Pitfalls already encountered

These are the failure modes that produced the "blob" / "neon" results
in earlier passes. Verify each is avoided before declaring done.

| Symptom                          | Root cause                                                     | Fix                                                                  |
|----------------------------------|----------------------------------------------------------------|----------------------------------------------------------------------|
| Word reads as a white logo       | `uColor × (0.85 + glow × 0.55) × layerBoost` — luminance > 1    | Cap multiplier at 1.0; remove all `+ glow × N` brightness adds       |
| Soft blobby letters              | Gaussian sprite (`exp(-d²×k)`) — halo bleeds between particles  | Switch to `smoothstep` flat disc (§4b)                                |
| Letter cores fully white         | Additive blending compounding                                   | Switch to `NormalBlending`; depthTest false                           |
| Flicker / strobe                 | Twinkle amplitude > 0.2                                         | Reduce to ≤ 0.06 of full alpha                                        |
| "Foamy" texture                  | Density × pointSize too high                                    | Drop count ~50 %; recompute with §3 formula                           |
| Particles vanish on cursor       | Radial repulsion field                                          | Replace with directional impulse (§8)                                 |
| Edges feel jagged at small size  | sub-pixel sprite without AA edge                                | Keep `smoothstep` width 0.04 — anti-aliases at any size               |
| Slow / janky on entry            | Recomputing buffers every frame                                 | Buffer build runs once on mount, after `fonts.ready`                  |
| Wrong silhouette on first paint  | Rastered before fonts loaded                                    | Always `await document.fonts.ready` before raster                     |

---

## 11. Validation checklist (run before declaring a pass done)

Visual:
- [ ] Squint test — silhouette of word is recognisable at 50 % blur
- [ ] Macro test — at 200 % zoom, individual dots are distinct circles
- [ ] Saturation test — densest region of letter still shows tint, not white
- [ ] Motion test — record 5 seconds idle: motion is calm, no flicker
- [ ] Cursor traverse test — sweep mouse across word: particles displace in
      direction of motion, return smoothly when motion stops, no circular hole
- [ ] Cursor static test — hold cursor on word: particles don't react
      (uMouseSpeed → 0)

Code:
- [ ] No literal `> 1.0` luminance multiplier in fragment
- [ ] Blending = `NormalBlending`
- [ ] Sprite = `smoothstep` disc, not gaussian
- [ ] count consistent with §3 formula (within ±20 %)
- [ ] tint is desaturated cyan / amber, not max-saturation neon

---

## 12. Why visual iteration is hard from this side

This rendering work is fundamentally a visual feedback loop. Without screenshots
of the running site, blind parameter tuning converges slowly and risks
regression. The recipe in this skill is what to apply verbatim **once**;
further refinement needs:

- a screenshot of the current state, and
- a screenshot of the reference frame (igloo.inc, Awwwards example) the user
  considers the target.

Then the gap is measurable concretely (this dot too big / this density too
high / this colour too bright) instead of guessed.
