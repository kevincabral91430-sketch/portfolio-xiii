"use client"

import { useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { chapters } from "@/lib/three/chapters"
import { weapons } from "@/lib/three/weaponData"
import ChapterOverlay from "@/components/ui/ChapterOverlay"
import NavCharacters from "@/components/ui/NavCharacters"
import SocialHoverLabel from "@/components/ui/SocialHoverLabel"
import IntroVeil from "@/components/ui/IntroVeil"
import { INTRO_CAM_DURATION } from "@/components/three/CameraRig"
import type { Chapter } from "@/lib/three/chapters"

const ExperienceCanvas = dynamic(() => import("@/components/three/ExperienceCanvas"), {
  ssr: false,
})

// ─── Step scroll config ──────────────────────────────────────────────────────
const STEP_THRESHOLD    = 60
const TRANSITION_LOCK_MS = 1200

// ─── Intro timing ────────────────────────────────────────────────────────────
// Text appears 500ms after camera travel finishes (ChapterOverlay handles the +500ms internally)
const INTRO_COMPLETE_MS = INTRO_CAM_DURATION * 1000   // matches CameraRig travel

function getAccentColor(chapter: Chapter): string {
  if (!chapter.weaponId) return "#67e8f9"
  return weapons.find((w) => w.id === chapter.weaponId)?.color ?? "#67e8f9"
}

function normalizeDelta(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 40
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight
  return e.deltaY
}

export default function HeroExperience() {
  const [chapterIndex,      setChapterIndex]      = useState(0)
  const [hoveredSocialId,   setHoveredSocialId]   = useState<string | null>(null)
  const [introComplete,     setIntroComplete]     = useState(false)
  // Social carousel navigation — which link is displayed
  const [activeSocialIndex, setActiveSocialIndex] = useState(0)

  const chapterIndexRef    = useRef(0)
  const isLockedRef        = useRef(true)   // locked from the start — intro holds scroll
  const accDeltaRef        = useRef(0)
  const lockTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartYRef     = useRef(0)
  const hoveredSocialIdRef = useRef<string | null>(null)

  // ─── Intro lock — held for INTRO_COMPLETE_MS, then scroll becomes available ──
  useEffect(() => {
    const t = setTimeout(() => {
      isLockedRef.current = false
      accDeltaRef.current = 0
      setIntroComplete(true)
    }, INTRO_COMPLETE_MS)
    return () => clearTimeout(t)
  }, [])

  // ─── Core step function ──────────────────────────────────────────────────────
  useEffect(() => {
    const totalChapters = chapters.length

    const step = (direction: 1 | -1) => {
      if (isLockedRef.current) return

      const next = (chapterIndexRef.current + direction + totalChapters) % totalChapters
      chapterIndexRef.current = next
      setChapterIndex(next)

      isLockedRef.current = true
      accDeltaRef.current = 0

      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      lockTimerRef.current = setTimeout(() => {
        isLockedRef.current = false
        accDeltaRef.current = 0
      }, TRANSITION_LOCK_MS)
    }

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (isLockedRef.current) return
      if (hoveredSocialIdRef.current !== null) return

      const delta = normalizeDelta(e)
      accDeltaRef.current += delta

      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        accDeltaRef.current = 0
      }, 150)

      if (Math.abs(accDeltaRef.current) >= STEP_THRESHOLD) {
        step(accDeltaRef.current > 0 ? 1 : -1)
      }
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) { e.preventDefault(); step(1) }
      else if (["ArrowUp", "PageUp"].includes(e.key))     { e.preventDefault(); step(-1) }
    }

    const onTouchStart = (e: TouchEvent) => { touchStartYRef.current = e.touches[0].clientY }
    const onTouchEnd   = (e: TouchEvent) => {
      const delta = touchStartYRef.current - e.changedTouches[0].clientY
      if (Math.abs(delta) > 40) step(delta > 0 ? 1 : -1)
    }

    window.addEventListener("wheel",      onWheel,      { passive: false })
    window.addEventListener("keydown",    onKeyDown)
    window.addEventListener("touchstart", onTouchStart, { passive: true })
    window.addEventListener("touchend",   onTouchEnd,   { passive: true })

    return () => {
      window.removeEventListener("wheel",      onWheel)
      window.removeEventListener("keydown",    onKeyDown)
      window.removeEventListener("touchstart", onTouchStart)
      window.removeEventListener("touchend",   onTouchEnd)
      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
    }
  }, [])

  // ─── External navigation (NavDots) ──────────────────────────────────────────
  const goToChapterById = (id: string) => {
    if (isLockedRef.current) return
    const idx = chapters.findIndex((c) => c.id === id)
    if (idx === -1 || idx === chapterIndexRef.current) return

    chapterIndexRef.current = idx
    setChapterIndex(idx)

    isLockedRef.current = true
    accDeltaRef.current = 0
    if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
    lockTimerRef.current = setTimeout(() => {
      isLockedRef.current = false
      accDeltaRef.current = 0
    }, TRANSITION_LOCK_MS)
  }

  // ─── Social hover — keeps ref in sync ────────────────────────────────────────
  const handleSocialHover = (id: string | null) => {
    hoveredSocialIdRef.current = id
    setHoveredSocialId(id)
  }

  // ─── Social nav helpers ───────────────────────────────────────────────────────
  const SOCIAL_COUNT = 3   // must match socialLinks.length
  const prevSocial = () =>
    setActiveSocialIndex((i) => (i - 1 + SOCIAL_COUNT) % SOCIAL_COUNT)
  const nextSocial = () =>
    setActiveSocialIndex((i) => (i + 1) % SOCIAL_COUNT)

  // ─── Derived state ────────────────────────────────────────────────────────────
  const activeChapter   = chapters[chapterIndex]
  const isSocialChapter = activeChapter.id === "social"
  const accentColor     = getAccentColor(activeChapter)
  const weaponChapters  = chapters.filter((c) => c.weaponId !== null)
  const weaponIdx       = weaponChapters.findIndex((c) => c.id === activeChapter.id)
  const barProgress     = weaponIdx === -1 ? 1 : weaponIdx / (weaponChapters.length - 1)

  // UI elements fade in only once intro is complete
  const uiOpacity = introComplete ? 1 : 0
  const uiStyle   = {
    opacity:    uiOpacity,
    transition: "opacity 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
  }

  return (
    <div className="fixed inset-0 overflow-hidden">

      {/* 3D canvas — fullscreen, always mounted (loads during intro) */}
      <div className="absolute inset-0 z-0">
        <ExperienceCanvas
          activeChapter={activeChapter}
          chapterProgress={0.5}
          onSocialHover={handleSocialHover}
          activeSocialIndex={activeSocialIndex}
        />
      </div>

      {/* Scroll / step indicator — fades in after intro */}
      <div
        className="pointer-events-none fixed bottom-8 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-2"
        style={uiStyle}
      >
        <span
          className="font-mono text-[10px] tracking-[0.35em] uppercase"
          style={{ color: accentColor + "50" }}
        >
          scroll
        </span>
        <div className="h-10 w-px overflow-hidden" style={{ background: accentColor + "20" }}>
          <div
            className="h-full w-px transition-all duration-700 ease-out"
            style={{
              background: accentColor,
              transform: `translateY(${-100 + barProgress * 100}%)`,
            }}
          />
        </div>
      </div>

      {/* Chapter text — suppressed during intro and when social hover is active */}
      <ChapterOverlay
        chapter={activeChapter}
        chapterProgress={0.5}
        introComplete={introComplete}
        socialActive={isSocialChapter && hoveredSocialId !== null}
      />

      {/* Social hover label — only on social chapter */}
      <SocialHoverLabel hoveredId={isSocialChapter ? hoveredSocialId : null} />

      {/* Character sprite navigation — fades in after intro */}
      <div style={uiStyle}>
        <NavCharacters
          activeChapterId={activeChapter.id}
          accentColor={accentColor}
          onChapterSelect={goToChapterById}
        />
      </div>

      {/* Top progress bar — fades in after intro */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-px"
        style={{ ...uiStyle, background: accentColor + "12" }}
      >
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${barProgress * 100}%`, background: accentColor + "80" }}
        />
      </div>

      {/* Sacred veil — dissolves into the 3D scene, removed from DOM once transparent */}
      <IntroVeil />

      {/* Social carousel nav — shown only on social chapter after intro */}
      {isSocialChapter && introComplete && (
        <SocialNav
          onPrev={prevSocial}
          onNext={nextSocial}
          activeIndex={activeSocialIndex}
          total={SOCIAL_COUNT}
          accentColor={accentColor}
        />
      )}
    </div>
  )
}

// ─── Social nav component — FFX-style carousel arrows + index dots ────────────
const SOCIAL_LABELS = ["Instagram", "LinkedIn", "XIII Production"]

function SocialNav({
  onPrev, onNext, activeIndex, total, accentColor,
}: {
  onPrev: () => void
  onNext: () => void
  activeIndex: number
  total: number
  accentColor: string
}) {
  const hex = accentColor.replace("#", "")
  const r   = parseInt(hex.slice(0, 2), 16)
  const g   = parseInt(hex.slice(2, 4), 16)
  const b   = parseInt(hex.slice(4, 6), 16)
  const rgb = `${r},${g},${b}`

  const btnBase: React.CSSProperties = {
    position:        "relative",
    display:         "flex",
    alignItems:      "center",
    justifyContent:  "center",
    width:           "42px",
    height:          "42px",
    background:      `rgba(4,8,20,0.72)`,
    border:          `1px solid rgba(${rgb},0.30)`,
    borderTop:       `1px solid rgba(${rgb},0.60)`,
    borderRadius:    "2px",
    cursor:          "pointer",
    backdropFilter:  "blur(8px)",
    boxShadow:       `0 0 16px rgba(${rgb},0.08), 0 2px 0 rgba(${rgb},0.18) inset`,
    transition:      "border-color 200ms, box-shadow 200ms",
    flexShrink:      0,
  }

  return (
    <div
      style={{
        position:       "fixed",
        bottom:         "clamp(2.5rem, 5vh, 4rem)",
        left:           "50%",
        transform:      "translateX(-50%)",
        zIndex:         25,
        display:        "flex",
        alignItems:     "center",
        gap:            "1.2rem",
        animation:      "socialNavFadeIn 0.6s cubic-bezier(0.22,1,0.36,1) both",
      }}
    >
      {/* Left arrow */}
      <button onClick={onPrev} style={btnBase} aria-label="Média précédent">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M8 1L3 6L8 11" stroke={accentColor} strokeWidth="1.4" strokeLinecap="square"/>
        </svg>
      </button>

      {/* Centre: label + index dots */}
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.55rem" }}>
        <span style={{
          fontFamily:    "monospace",
          fontSize:      "9px",
          letterSpacing: "0.32em",
          textTransform: "uppercase",
          color:         `rgba(${rgb},0.70)`,
          whiteSpace:    "nowrap",
        }}>
          {SOCIAL_LABELS[activeIndex]}
        </span>
        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
          {Array.from({ length: total }).map((_, i) => (
            <div
              key={i}
              style={{
                width:      i === activeIndex ? "16px" : "5px",
                height:     "2px",
                background: i === activeIndex ? accentColor : `rgba(${rgb},0.30)`,
                borderRadius: "1px",
                transition: "width 300ms cubic-bezier(0.22,1,0.36,1), background 300ms",
              }}
            />
          ))}
        </div>
      </div>

      {/* Right arrow */}
      <button onClick={onNext} style={btnBase} aria-label="Média suivant">
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 1L9 6L4 11" stroke={accentColor} strokeWidth="1.4" strokeLinecap="square"/>
        </svg>
      </button>

      <style>{`
        @keyframes socialNavFadeIn {
          from { opacity: 0; transform: translateX(-50%) translateY(8px); }
          to   { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  )
}

