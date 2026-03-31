"use client"

import { useEffect, useRef, useState } from "react"
import type { Chapter } from "@/lib/three/chapters"

interface ChapterOverlayProps {
  chapter: Chapter
  chapterProgress: number
  // When false (during intro), all text is suppressed — no early reveal
  introComplete: boolean
}

export default function ChapterOverlay({ chapter, chapterProgress, introComplete }: ChapterOverlayProps) {
  const [displayedChapter, setDisplayedChapter] = useState<Chapter>(chapter)
  const [visible, setVisible] = useState(false)

  const latestChapterRef = useRef<Chapter>(chapter)
  latestChapterRef.current = chapter

  const visibleRef = useRef(false)
  visibleRef.current = visible

  const displayedIdRef = useRef<string>(chapter.id)
  displayedIdRef.current = displayedChapter.id

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Initial show — deferred until introComplete to avoid text appearing during camera travel
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

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current)

    // Suppress during intro — camera is still travelling
    if (!introComplete) return

    // No title → hide
    if (!chapter.title) {
      setVisible(false)
      return
    }

    const isSameChapter = chapter.id === displayedIdRef.current

    if (isSameChapter) {
      // Re-entering same chapter after passing through intro (visible was false)
      if (!visibleRef.current) {
        timerRef.current = setTimeout(() => {
          setVisible(true)
        }, 150)
      }
      return
    }

    // New chapter → fade out → swap → fade in
    setVisible(false)
    timerRef.current = setTimeout(() => {
      setDisplayedChapter(latestChapterRef.current)
      setVisible(true)
    }, 320)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [chapter.id, chapter.title, introComplete])

  if (!displayedChapter.title) return null

  const accentColor = displayedChapter.weaponId
    ? WEAPON_ACCENTS[displayedChapter.weaponId] ?? "#67e8f9"
    : "#67e8f9"

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-20 flex h-full w-full flex-col justify-center"
      style={{ paddingLeft: "clamp(2rem, 6vw, 6rem)" }}
      aria-live="polite"
    >
      <div
        className="max-w-lg transition-all duration-500 ease-out"
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0px)" : "translateY(18px)",
        }}
      >
        {displayedChapter.kicker && (
          <p
            className="mb-4 font-mono text-[11px] tracking-[0.35em] uppercase"
            style={{ color: `${accentColor}99` }}
          >
            {displayedChapter.kicker}
          </p>
        )}

        {displayedChapter.id === "tidus" ? (
          <h1
            className="mb-3 font-light leading-[1.0] tracking-tight text-white"
            style={{ fontSize: "clamp(3rem, 6vw, 6rem)" }}
          >
            {displayedChapter.title}
          </h1>
        ) : (
          <h2
            className="mb-3 font-light leading-[1.05] tracking-tight text-white"
            style={{ fontSize: "clamp(2.2rem, 4.5vw, 4.5rem)" }}
          >
            {displayedChapter.title}
          </h2>
        )}

        <div
          className="mb-4 h-px transition-all duration-700"
          style={{
            background: accentColor,
            width: visible ? "3rem" : "0px",
            opacity: 0.6,
          }}
        />

        <p
          className="mb-2 font-light leading-relaxed text-white/65"
          style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.2rem)" }}
        >
          {displayedChapter.subtitle}
        </p>

        <p className="mb-6 text-sm text-white/35">{displayedChapter.caption}</p>

        {displayedChapter.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {displayedChapter.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full px-3 py-1 font-mono text-[11px] backdrop-blur-sm"
                style={{
                  border: `1px solid ${accentColor}30`,
                  color: `${accentColor}90`,
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

const WEAPON_ACCENTS: Record<string, string> = {
  tidus: "#67e8f9",
  yuna: "#c4b5fd",
  auron: "#f87171",
  wakka: "#fb923c",
  lulu: "#a78bfa",
  rikku: "#34d399",
  kimahri: "#60a5fa",
}
