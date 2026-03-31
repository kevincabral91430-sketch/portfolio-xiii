"use client"

import { socialLinks } from "@/lib/three/socialData"
import FFXPanel from "@/components/ui/FFXPanel"

interface SocialHoverLabelProps {
  hoveredId: string | null
}

export default function SocialHoverLabel({ hoveredId }: SocialHoverLabelProps) {
  const link = hoveredId ? socialLinks.find((l) => l.id === hoveredId) : null

  // Keep last known link in DOM during exit animation
  const displayLink = link

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-20 flex h-full w-full flex-col justify-center"
      style={{ paddingLeft: "clamp(2rem, 6vw, 6rem)" }}
    >
      {socialLinks.map((sl) => {
        const isActive = hoveredId === sl.id
        const hex = sl.color.replace("#", "")
        const r   = parseInt(hex.slice(0, 2), 16)
        const g   = parseInt(hex.slice(2, 4), 16)
        const b   = parseInt(hex.slice(4, 6), 16)
        const rgb = `${r},${g},${b}`

        return (
          <div
            key={sl.id}
            style={{
              position: "absolute",
              left:     "clamp(2rem, 6vw, 6rem)",
              top:      "50%",
              transform: "translateY(-50%)",
            }}
          >
            <FFXPanel
              visible={isActive}
              accentColor={sl.color}
              variant="social"
            >
              {/* ── Label / kicker ─────────────────────────────────────── */}
              <AnimLine delay={0} visible={isActive}>
                <p style={{
                  marginBottom:  "0.65rem",
                  fontFamily:    "monospace",
                  fontSize:      "10px",
                  letterSpacing: "0.36em",
                  textTransform: "uppercase",
                  color:         `rgba(${rgb},0.75)`,
                }}>
                  {sl.label}
                </p>
              </AnimLine>

              {/* ── Description lines ──────────────────────────────────── */}
              {sl.description.map((line, i) => (
                <AnimLine key={i} delay={55 + i * 55} visible={isActive}>
                  <p style={{
                    marginBottom: i < sl.description.length - 1 ? "0.22rem" : "0.9rem",
                    fontWeight:   300,
                    lineHeight:   1.55,
                    color:        "rgba(255,255,255,0.62)",
                    fontSize:     "clamp(0.85rem, 1.1vw, 1.05rem)",
                  }}>
                    {line}
                  </p>
                </AnimLine>
              ))}

              {/* ── Separator ──────────────────────────────────────────── */}
              <AnimLine delay={220} visible={isActive}>
                <div style={{
                  marginBottom: "0.75rem",
                  height:       "1px",
                  width:        isActive ? "2rem" : "0px",
                  background:   sl.color,
                  opacity:      0.45,
                  transition:   "width 480ms 380ms cubic-bezier(0.22,1,0.36,1)",
                }} />
              </AnimLine>

              {/* ── CTA ────────────────────────────────────────────────── */}
              <AnimLine delay={280} visible={isActive}>
                <p style={{
                  fontFamily:    "monospace",
                  fontSize:      "9px",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color:         `rgba(${rgb},0.50)`,
                  display:       "flex",
                  alignItems:    "center",
                  gap:           "0.4rem",
                }}>
                  <span style={{
                    display:        "inline-block",
                    width:          "14px",
                    height:         "1px",
                    background:     sl.color,
                    opacity:        0.4,
                    verticalAlign:  "middle",
                  }} />
                  Ouvrir
                </p>
              </AnimLine>
            </FFXPanel>
          </div>
        )
      })}
    </div>
  )
}

// ─── Sequential line animator ─────────────────────────────────────────────────
function AnimLine({
  children,
  delay,
  visible,
}: {
  children: React.ReactNode
  delay: number
  visible: boolean
}) {
  return (
    <div
      style={{
        opacity:   visible ? 1 : 0,
        transform: visible ? "translateY(0)" : "translateY(7px)",
        transition: `opacity 300ms ${delay}ms cubic-bezier(0.22,1,0.36,1),
                     transform 340ms ${delay}ms cubic-bezier(0.22,1,0.36,1)`,
      }}
    >
      {children}
    </div>
  )
}
