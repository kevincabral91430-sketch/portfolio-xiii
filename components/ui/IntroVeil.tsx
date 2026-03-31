"use client"

import { useEffect, useRef, useState } from "react"

// ─── Timings (ms) ─────────────────────────────────────────────────────────────
// Veil starts fading at 400ms — camera is already moving, scene is ready
const FADE_START_MS   = 400
// Fade duration — long, graceful, no cut sensation
const FADE_DURATION_MS = 3800
// Remove from DOM — after fade completes
const REMOVE_MS        = FADE_START_MS + FADE_DURATION_MS + 200

export default function IntroVeil() {
  const [opacity, setOpacity] = useState(1)
  const [mounted, setMounted] = useState(true)
  const rafRef = useRef<number | null>(null)

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
      // Ease: stay opaque longer, then fall away gently
      const eased    = 1 - Math.pow(progress, 0.6)
      setOpacity(eased)

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
        position:        "fixed",
        inset:           0,
        zIndex:          40,
        pointerEvents:   "none",
        opacity,
        // No CSS transition — RAF handles the curve exactly
      }}
    >
      {/* ── Base atmosphere — deep underwater dark ────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset:    0,
          background: [
            "radial-gradient(ellipse 90% 70% at 62% 52%, #041c30 0%, #020c1e 42%, #010609 100%)",
          ].join(", "),
        }}
      />

      {/* ── Sacred halo — diffuse glow where Tidus will emerge ──────────── */}
      <div
        style={{
          position: "absolute",
          inset:    0,
          background:
            "radial-gradient(ellipse 55% 48% at 63% 50%, rgba(0,88,140,0.28) 0%, transparent 70%)",
          animation: "veilHaloPulse 4.2s ease-in-out infinite",
        }}
      />

      {/* ── Light nappe 1 — left diagonal ───────────────────────────────── */}
      <div
        style={{
          position:  "absolute",
          inset:     0,
          background:
            "linear-gradient(168deg, transparent 38%, rgba(0,72,128,0.06) 50%, transparent 62%)",
          animation: "veilRayDrift1 6.8s ease-in-out infinite",
        }}
      />

      {/* ── Light nappe 2 — centre ──────────────────────────────────────── */}
      <div
        style={{
          position:  "absolute",
          inset:     0,
          background:
            "linear-gradient(178deg, transparent 30%, rgba(0,110,160,0.05) 50%, transparent 70%)",
          animation: "veilRayDrift2 8.4s ease-in-out infinite",
        }}
      />

      {/* ── Light nappe 3 — right diagonal ──────────────────────────────── */}
      <div
        style={{
          position:  "absolute",
          inset:     0,
          background:
            "linear-gradient(188deg, transparent 40%, rgba(0,58,110,0.07) 52%, transparent 64%)",
          animation: "veilRayDrift3 7.2s ease-in-out 0.9s infinite",
        }}
      />

      {/* ── Fine vignette ring ───────────────────────────────────────────── */}
      <div
        style={{
          position: "absolute",
          inset:    0,
          background:
            "radial-gradient(ellipse 100% 100% at 50% 50%, transparent 45%, rgba(0,4,12,0.72) 100%)",
        }}
      />

      {/* ── CSS keyframes injected once ─────────────────────────────────── */}
      <style>{`
        @keyframes veilHaloPulse {
          0%,100% { opacity: 0.70; transform: scaleX(1.00) scaleY(1.00); }
          50%      { opacity: 1.00; transform: scaleX(1.04) scaleY(1.06); }
        }
        @keyframes veilRayDrift1 {
          0%,100% { transform: translateX(0px)  rotate(0deg);   opacity: 1; }
          50%      { transform: translateX(12px) rotate(0.4deg); opacity: 0.7; }
        }
        @keyframes veilRayDrift2 {
          0%,100% { transform: translateY(0px)  rotate(0deg);    opacity: 0.8; }
          50%      { transform: translateY(-8px) rotate(-0.2deg); opacity: 1;   }
        }
        @keyframes veilRayDrift3 {
          0%,100% { transform: translateX(0px)   rotate(0deg);   opacity: 0.9; }
          50%      { transform: translateX(-10px) rotate(0.3deg); opacity: 0.6; }
        }
      `}</style>
    </div>
  )
}
