"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"

// ─── FFX-inspired panel — premium JRPG UI aesthetic ──────────────────────────
// Reference: FFX menu panels — semi-transparent dark blue-violet, glowing top
// border, angular corner ornaments, layered depth with subtle internal structure.
// Reinterpreted for web: no kitsch, no sharp pixel aesthetic — refined, mystical.

interface FFXPanelProps {
  visible: boolean
  accentColor: string          // hex — drives glow and decorative elements
  children: ReactNode
  className?: string
  variant?: "weapon" | "social" // weapon = wider, left-aligned; social = compact
}

export default function FFXPanel({
  visible,
  accentColor,
  children,
  className = "",
  variant = "weapon",
}: FFXPanelProps) {
  // Two-phase mount: panel enters, then content fades in
  const [panelPhase, setPanelPhase] = useState<"hidden" | "entering" | "content" | "leaving">("hidden")
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    if (visible) {
      setPanelPhase("entering")
      timerRef.current = setTimeout(() => setPanelPhase("content"), 260)
    } else {
      setPanelPhase("leaving")
      timerRef.current = setTimeout(() => setPanelPhase("hidden"), 320)
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [visible])

  const isVisible = panelPhase !== "hidden"
  const contentVisible = panelPhase === "content"

  // Parse accentColor hex → rgb for rgba usage
  const hex = accentColor.replace("#", "")
  const r   = parseInt(hex.slice(0, 2), 16)
  const g   = parseInt(hex.slice(2, 4), 16)
  const b   = parseInt(hex.slice(4, 6), 16)
  const rgb = `${r},${g},${b}`

  const w = variant === "weapon" ? "clamp(280px, 32vw, 440px)" : "clamp(240px, 26vw, 360px)"

  if (!isVisible) return null

  const panelVisible  = panelPhase === "entering" || panelPhase === "content"
  const panelOpacity  = panelVisible  ? 1 : 0
  const contentOpacity = contentVisible ? 1 : 0

  return (
    <div
      className={className}
      style={{
        width:     w,
        position:  "relative",
        // Panel enter: scale up from 0.96, slide up 6px
        opacity:   panelOpacity,
        transform: panelVisible
          ? "translateY(0px) scale(1)"
          : "translateY(8px) scale(0.97)",
        transition: [
          `opacity 280ms cubic-bezier(0.22, 1, 0.36, 1)`,
          `transform 320ms cubic-bezier(0.22, 1, 0.36, 1)`,
        ].join(", "),
        willChange: "opacity, transform",
      }}
    >
      {/* ── Panel body ───────────────────────────────────────────────────── */}
      <div
        style={{
          position:     "relative",
          borderRadius: "3px",
          overflow:     "visible",
          // Multi-layer background: base dark + tinted interior + subtle texture
          background: [
            `linear-gradient(170deg,
              rgba(${rgb},0.10) 0%,
              rgba(8,12,28,0.88) 30%,
              rgba(4,7,18,0.92) 100%
            )`,
          ].join(", "),
          // Border: top edge brighter (light refraction), sides and bottom muted
          border: `1px solid rgba(${rgb},0.18)`,
          borderTop: `1px solid rgba(${rgb},0.55)`,
          // Layered box-shadow: outer glow + inner depth + bottom shadow
          boxShadow: [
            `0 0 0 1px rgba(${rgb},0.06)`,           // outer ring
            `0 0 28px rgba(${rgb},0.10)`,             // diffuse glow
            `0 0 8px  rgba(${rgb},0.08) inset`,       // inner atmosphere
            `0 12px 40px rgba(0,0,0,0.55)`,           // depth shadow
            `0 2px 0 rgba(${rgb},0.22) inset`,        // top interior sheen
          ].join(", "),
          backdropFilter: "blur(12px) saturate(1.2)",
          WebkitBackdropFilter: "blur(12px) saturate(1.2)",
        }}
      >
        {/* ── Top edge — luminous trim line ──────────────────────────────── */}
        <div style={{
          position:   "absolute",
          top:        0, left: 0, right: 0,
          height:     "1px",
          background: `linear-gradient(90deg,
            transparent 0%,
            rgba(${rgb},0.7) 15%,
            rgba(255,255,255,0.55) 50%,
            rgba(${rgb},0.7) 85%,
            transparent 100%
          )`,
          borderRadius: "3px 3px 0 0",
          pointerEvents: "none",
        }} />

        {/* ── Top-left corner ornament ────────────────────────────────────── */}
        <CornerOrnament pos="tl" rgb={rgb} />
        {/* ── Top-right corner ornament ───────────────────────────────────── */}
        <CornerOrnament pos="tr" rgb={rgb} />

        {/* ── Interior vertical separator lines (FFX menu grid feeling) ───── */}
        <div style={{
          position:   "absolute",
          top:        0, bottom: 0,
          left:       "3px",
          width:      "1px",
          background: `linear-gradient(180deg, rgba(${rgb},0.22) 0%, transparent 100%)`,
          pointerEvents: "none",
        }} />
        <div style={{
          position:   "absolute",
          top:        0, bottom: 0,
          right:      "3px",
          width:      "1px",
          background: `linear-gradient(180deg, rgba(${rgb},0.22) 0%, transparent 100%)`,
          pointerEvents: "none",
        }} />

        {/* ── Bottom edge — subtle fade ───────────────────────────────────── */}
        <div style={{
          position:  "absolute",
          bottom:    0, left: 0, right: 0,
          height:    "1px",
          background: `linear-gradient(90deg,
            transparent 0%,
            rgba(${rgb},0.18) 40%,
            rgba(${rgb},0.18) 60%,
            transparent 100%
          )`,
          pointerEvents: "none",
        }} />

        {/* ── Content area ────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "clamp(1.1rem, 2vw, 1.5rem) clamp(1.25rem, 2.2vw, 1.75rem)",
            opacity:    contentOpacity,
            transform:  contentVisible ? "translateY(0)" : "translateY(6px)",
            transition: "opacity 280ms 40ms ease-out, transform 320ms 40ms cubic-bezier(0.22,1,0.36,1)",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  )
}

// ─── Corner ornament — angular FFX-style accent ───────────────────────────────
function CornerOrnament({ pos, rgb }: { pos: "tl" | "tr"; rgb: string }) {
  const isLeft = pos === "tl"
  const size   = 10  // px

  return (
    <svg
      width={size + 2}
      height={size + 2}
      viewBox="0 0 12 12"
      style={{
        position: "absolute",
        top:      -1,
        [isLeft ? "left" : "right"]: -1,
        pointerEvents: "none",
        transform: isLeft ? "none" : "scaleX(-1)",
        // Glow on the corner ornament itself
        filter: `drop-shadow(0 0 3px rgba(${rgb},0.6))`,
      }}
    >
      {/* Outer chevron bracket */}
      <path
        d="M1 10 L1 1 L10 1"
        fill="none"
        stroke={`rgba(${rgb},0.90)`}
        strokeWidth="1.2"
        strokeLinecap="square"
      />
      {/* Inner accent dot */}
      <circle cx="2.8" cy="2.8" r="1.1" fill={`rgba(${rgb},0.70)`} />
    </svg>
  )
}
