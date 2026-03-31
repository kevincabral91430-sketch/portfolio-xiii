"use client"

import { useEffect, useRef, useState } from "react"
import type { Chapter } from "@/lib/three/chapters"
import FFXPanel from "@/components/ui/FFXPanel"

interface ChapterOverlayProps {
  chapter: Chapter
  chapterProgress: number
  introComplete: boolean
  // When true, social hover is active — hide weapon text to avoid overlap
  socialActive: boolean
}

const WEAPON_ACCENTS: Record<string, string> = {
  tidus:   "#67e8f9",
  yuna:    "#c4b5fd",
  auron:   "#f87171",
  wakka:   "#fb923c",
  lulu:    "#a78bfa",
  rikku:   "#34d399",
  kimahri: "#60a5fa",
}

export default function ChapterOverlay({
  chapter,
  chapterProgress: _cp,
  introComplete,
  socialActive,
}: ChapterOverlayProps) {
  const [displayedChapter, setDisplayedChapter] = useState<Chapter>(chapter)
  const [visible, setVisible]                   = useState(false)

  const latestChapterRef  = useRef<Chapter>(chapter)
  latestChapterRef.current = chapter

  const visibleRef = useRef(false)
  visibleRef.current = visible

  const displayedIdRef = useRef<string>(chapter.id)
  displayedIdRef.current = displayedChapter.id

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial show — deferred until camera travel completes
  useEffect(() => {
    if (!introComplete) return
    const t = setTimeout(() => {
      const c = latestChapterRef.current
      if (c.title) {
        setDisplayedChapter(c)
        setVisible(true)
      }
    }, 500)
    return () => clearTimeout(t)
  }, [introComplete])

  // Chapter change handler
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!introComplete) return

    if (!chapter.title) {
      setVisible(false)
      return
    }

    const isSameChapter = chapter.id === displayedIdRef.current

    if (isSameChapter) {
      if (!visibleRef.current) {
        timerRef.current = setTimeout(() => setVisible(true), 150)
      }
      return
    }

    // New chapter: hide → swap → show
    setVisible(false)
    timerRef.current = setTimeout(() => {
      setDisplayedChapter(latestChapterRef.current)
      setVisible(true)
    }, 340)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [chapter.id, chapter.title, introComplete])

  if (!displayedChapter.title) return null

  const accentColor = displayedChapter.weaponId
    ? (WEAPON_ACCENTS[displayedChapter.weaponId] ?? "#67e8f9")
    : "#67e8f9"

  // Social active = weapon panel invisible (no opacity hack — fully hidden)
  const panelVisible = visible && !socialActive

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-20 flex h-full w-full flex-col justify-center"
      style={{ paddingLeft: "clamp(2rem, 6vw, 6rem)" }}
      aria-live="polite"
    >
      <FFXPanel
        visible={panelVisible}
        accentColor={accentColor}
        variant="weapon"
      >
        {/* ── Kicker ──────────────────────────────────────────────────────── */}
        <AnimLine delay={0} visible={panelVisible}>
          <p
            style={{
              marginBottom:    "0.75rem",
              fontFamily:      "monospace",
              fontSize:        "10px",
              letterSpacing:   "0.32em",
              textTransform:   "uppercase",
              color:           `${accentColor}99`,
            }}
          >
            {displayedChapter.kicker}
          </p>
        </AnimLine>

        {/* ── Title ───────────────────────────────────────────────────────── */}
        <AnimLine delay={60} visible={panelVisible}>
          {displayedChapter.id === "tidus" ? (
            <h1
              style={{
                marginBottom:  "0.5rem",
                fontWeight:    300,
                lineHeight:    1.0,
                letterSpacing: "-0.02em",
                color:         "#fff",
                fontSize:      "clamp(2.8rem, 5.5vw, 5.5rem)",
              }}
            >
              {displayedChapter.title}
            </h1>
          ) : (
            <h2
              style={{
                marginBottom:  "0.5rem",
                fontWeight:    300,
                lineHeight:    1.05,
                letterSpacing: "-0.01em",
                color:         "#fff",
                fontSize:      "clamp(2rem, 4vw, 4rem)",
              }}
            >
              {displayedChapter.title}
            </h2>
          )}
        </AnimLine>

        {/* ── Accent rule ─────────────────────────────────────────────────── */}
        <AnimLine delay={100} visible={panelVisible}>
          <div
            style={{
              marginBottom:    "0.85rem",
              height:          "1px",
              width:           panelVisible ? "2.5rem" : "0px",
              background:      accentColor,
              opacity:         0.55,
              transition:      "width 500ms 380ms cubic-bezier(0.22,1,0.36,1)",
            }}
          />
        </AnimLine>

        {/* ── Subtitle ────────────────────────────────────────────────────── */}
        <AnimLine delay={140} visible={panelVisible}>
          <p
            style={{
              marginBottom: "0.35rem",
              fontWeight:   300,
              lineHeight:   1.5,
              color:        "rgba(255,255,255,0.65)",
              fontSize:     "clamp(0.88rem, 1.2vw, 1.1rem)",
            }}
          >
            {displayedChapter.subtitle}
          </p>
        </AnimLine>

        {/* ── Caption ─────────────────────────────────────────────────────── */}
        <AnimLine delay={185} visible={panelVisible}>
          <p
            style={{
              marginBottom: "1rem",
              fontSize:     "0.82rem",
              color:        "rgba(255,255,255,0.35)",
            }}
          >
            {displayedChapter.caption}
          </p>
        </AnimLine>

        {/* ── Tags ────────────────────────────────────────────────────────── */}
        {displayedChapter.tags.length > 0 && (
          <AnimLine delay={230} visible={panelVisible}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {displayedChapter.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    borderRadius:    "2px",
                    padding:         "3px 10px",
                    fontFamily:      "monospace",
                    fontSize:        "10px",
                    letterSpacing:   "0.2em",
                    textTransform:   "uppercase",
                    border:          `1px solid ${accentColor}28`,
                    color:           `${accentColor}88`,
                    background:      `rgba(${accentColor.replace("#","").match(/.{2}/g)?.map(h=>parseInt(h,16)).join(",")},0.05)`,
                    backdropFilter:  "blur(4px)",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
          </AnimLine>
        )}
      </FFXPanel>
    </div>
  )
}

// ─── Sequential line animator ────────────────────────────────────────────────
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
        opacity:    visible ? 1 : 0,
        transform:  visible ? "translateY(0)" : "translateY(8px)",
        transition: `opacity 340ms ${delay}ms cubic-bezier(0.22,1,0.36,1),
                     transform 380ms ${delay}ms cubic-bezier(0.22,1,0.36,1)`,
      }}
    >
      {children}
    </div>
  )
}
