"use client"

import { useEffect, useRef, useState } from "react"

// ─── Timings (ms) ─────────────────────────────────────────────────────────────
// Phase 1: darkness lingers — camera is far away, scene barely a glimmer
// Phase 2: gradual sacred reveal — scene brightens as camera approaches
const FADE_START_MS    = 800   // scene starts dark for this long (no fade yet)
const FADE_DURATION_MS = 5200  // full fade duration — slow, solemnelle
const REMOVE_MS        = FADE_START_MS + FADE_DURATION_MS + 200

// Two-phase easing:
// 0 → 0.38: darkness lingers (opacity 1.0 → 0.90) — "quelque chose dans l'ombre"
// 0.38 → 1: graceful revelation — pow curve, long tail
function veilEase(progress: number): number {
  if (progress < 0.38) {
    // Barely moves — the darkness is "alive" with the atmosphere under it
    return 1.0 - progress * 0.26
  }
  const p2 = (progress - 0.38) / 0.62
  return 0.901 * (1 - Math.pow(p2, 0.52))
}

export default function IntroVeil() {
  const [opacity, setOpacity]   = useState(1)
  const [mounted, setMounted]   = useState(true)
  const rafRef                  = useRef<number | null>(null)

  useEffect(() => {
    let startTime = 0
    let fading    = false

    const tick = (now: number) => {
      if (!fading) {
        if (now - startTime < FADE_START_MS) {
          rafRef.current = requestAnimationFrame(tick)
          return
        }
        fading = true
      }

      const elapsed  = now - startTime - FADE_START_MS
      const progress = Math.min(elapsed / FADE_DURATION_MS, 1)
      setOpacity(veilEase(progress))

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick)
      }
    }

    rafRef.current = requestAnimationFrame((now) => {
      startTime = now
      rafRef.current = requestAnimationFrame(tick)
    })

    const removeTimer = setTimeout(() => setMounted(false), REMOVE_MS)

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current)
      clearTimeout(removeTimer)
    }
  }, [])

  if (!mounted) return null

  return (
    <div
      aria-hidden="true"
      style={{
        position:      "fixed",
        inset:         0,
        zIndex:        40,
        pointerEvents: "none",
        opacity,
      }}
    >
      {/* ── Base — deep abyss darkness, not flat black ─────────────────── */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background: "radial-gradient(ellipse 110% 90% at 58% 52%, #031420 0%, #010c18 38%, #000407 100%)",
      }} />

      {/* ── Inhabited darkness — subtle deep-water teal presence ───────── */}
      <div style={{
        position:  "absolute",
        inset:     0,
        background:
          "radial-gradient(ellipse 60% 50% at 60% 50%, rgba(0,55,90,0.22) 0%, transparent 70%)",
        animation: "veilPresencePulse 5.0s ease-in-out infinite",
      }} />

      {/* ── Sacred halo — weapon position — grows with time ────────────── */}
      <div style={{
        position:   "absolute",
        inset:      0,
        background:
          "radial-gradient(ellipse 42% 36% at 62% 50%, rgba(0,100,160,0.32) 0%, rgba(0,60,110,0.12) 45%, transparent 70%)",
        animation: "veilHaloReveal 6.5s ease-out forwards, veilHaloPulse 4.8s ease-in-out 1s infinite",
      }} />

      {/* ── Ceremonial light nappe — left ───────────────────────────────── */}
      <div style={{
        position:  "absolute",
        inset:     0,
        background:
          "linear-gradient(166deg, transparent 36%, rgba(0,68,120,0.07) 50%, transparent 64%)",
        animation: "veilRayDrift1 7.2s ease-in-out infinite",
      }} />

      {/* ── Ceremonial light nappe — centre ────────────────────────────── */}
      <div style={{
        position:  "absolute",
        inset:     0,
        background:
          "linear-gradient(178deg, transparent 28%, rgba(0,95,148,0.06) 50%, transparent 72%)",
        animation: "veilRayDrift2 9.0s ease-in-out infinite",
      }} />

      {/* ── Ceremonial light nappe — right ──────────────────────────────── */}
      <div style={{
        position:  "absolute",
        inset:     0,
        background:
          "linear-gradient(190deg, transparent 38%, rgba(0,52,100,0.08) 52%, transparent 66%)",
        animation: "veilRayDrift3 7.8s ease-in-out 1.1s infinite",
      }} />

      {/* ── Vignette ring ────────────────────────────────────────────────── */}
      <div style={{
        position:  "absolute",
        inset:     0,
        background:
          "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 40%, rgba(0,3,10,0.85) 100%)",
      }} />

      {/* ── CSS keyframes ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes veilPresencePulse {
          0%,100% { opacity: 0.55; }
          50%      { opacity: 1.00; }
        }
        @keyframes veilHaloReveal {
          0%   { opacity: 0.0; transform: scale(0.80); }
          40%  { opacity: 0.5; transform: scale(0.95); }
          100% { opacity: 1.0; transform: scale(1.00); }
        }
        @keyframes veilHaloPulse {
          0%,100% { opacity: 0.80; transform: scaleX(1.00) scaleY(1.00); }
          50%      { opacity: 1.00; transform: scaleX(1.05) scaleY(1.08); }
        }
        @keyframes veilRayDrift1 {
          0%,100% { transform: translateX(0px)  rotate(0deg);   opacity: 0.85; }
          50%      { transform: translateX(14px) rotate(0.5deg); opacity: 0.60; }
        }
        @keyframes veilRayDrift2 {
          0%,100% { transform: translateY(0px)   rotate(0deg);    opacity: 0.75; }
          50%      { transform: translateY(-10px) rotate(-0.2deg); opacity: 1.00; }
        }
        @keyframes veilRayDrift3 {
          0%,100% { transform: translateX(0px)   rotate(0deg);   opacity: 0.90; }
          50%      { transform: translateX(-12px) rotate(0.4deg); opacity: 0.55; }
        }
      `}</style>
    </div>
  )
}
