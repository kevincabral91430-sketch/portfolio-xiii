"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import dynamic from "next/dynamic"
import { chapters } from "@/lib/three/chapters"
import { weapons } from "@/lib/three/weaponData"
import ChapterOverlay from "@/components/ui/ChapterOverlay"
import NavDots from "@/components/ui/NavDots"
import SocialHoverLabel from "@/components/ui/SocialHoverLabel"
import LoadingScreen from "@/components/ui/LoadingScreen"
import type { Chapter } from "@/lib/three/chapters"

const ExperienceCanvas = dynamic(() => import("@/components/three/ExperienceCanvas"), {
  ssr: false,
})

// ─── Step scroll config ─────────────────────────────────────────────────────
// Pixels accumulated before a step fires (handles both trackpad & mouse wheel)
const STEP_THRESHOLD = 60
// ms locked after each step — covers camera lerp travel + trackpad momentum decay
const TRANSITION_LOCK_MS = 1200

function getAccentColor(chapter: Chapter): string {
  if (!chapter.weaponId) return "#67e8f9"
  return weapons.find((w) => w.id === chapter.weaponId)?.color ?? "#67e8f9"
}

// Normalize wheel deltaY across devices & deltaMode
function normalizeDelta(e: WheelEvent): number {
  if (e.deltaMode === 1) return e.deltaY * 40   // lines → px
  if (e.deltaMode === 2) return e.deltaY * window.innerHeight  // pages → px
  return e.deltaY  // pixels (default)
}

export default function HeroExperience() {
  const [chapterIndex, setChapterIndex] = useState(0)
  const [hoveredSocialId, setHoveredSocialId] = useState<string | null>(null)
  // Loader state — shown on top until animation completes (~2.9s)
  const [loaderDone, setLoaderDone] = useState(false)

  // Refs used inside event handlers — avoid recreating handlers on each render
  const chapterIndexRef    = useRef(0)
  const isLockedRef        = useRef(false)
  const accDeltaRef        = useRef(0)
  const lockTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const idleTimerRef       = useRef<ReturnType<typeof setTimeout> | null>(null)
  const touchStartYRef     = useRef(0)
  // Mirror of hoveredSocialId accessible in event handlers without closure issues
  const hoveredSocialIdRef = useRef<string | null>(null)

  // ─── Core step function ────────────────────────────────────────────────────
  useEffect(() => {
    const totalChapters = chapters.length

    const step = (direction: 1 | -1) => {
      if (isLockedRef.current) return

      const next = (chapterIndexRef.current + direction + totalChapters) % totalChapters
      chapterIndexRef.current = next
      setChapterIndex(next)

      // Lock immediately — reset after transition window
      isLockedRef.current = true
      accDeltaRef.current = 0

      if (lockTimerRef.current) clearTimeout(lockTimerRef.current)
      lockTimerRef.current = setTimeout(() => {
        isLockedRef.current = false
        accDeltaRef.current = 0   // drain tout momentum résiduel à l'expiration
      }, TRANSITION_LOCK_MS)
    }

    // ─── Mouse wheel & trackpad ──────────────────────────────────────────────
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      if (isLockedRef.current) return
      // Priority: social hover interaction locks scroll narrative
      if (hoveredSocialIdRef.current !== null) return

      const delta = normalizeDelta(e)
      accDeltaRef.current += delta

      // Reset accumulator when user pauses scrolling (no event for 150ms)
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current)
      idleTimerRef.current = setTimeout(() => {
        accDeltaRef.current = 0
      }, 150)

      if (Math.abs(accDeltaRef.current) >= STEP_THRESHOLD) {
        step(accDeltaRef.current > 0 ? 1 : -1)
      }
    }

    // ─── Keyboard ────────────────────────────────────────────────────────────
    const onKeyDown = (e: KeyboardEvent) => {
      if (["ArrowDown", "PageDown", " "].includes(e.key)) {
        e.preventDefault()
        step(1)
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault()
        step(-1)
      }
    }

    // ─── Touch (mobile) ──────────────────────────────────────────────────────
    const onTouchStart = (e: TouchEvent) => {
      touchStartYRef.current = e.touches[0].clientY
    }
    const onTouchEnd = (e: TouchEvent) => {
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

  // ─── External navigation (NavDots click) ──────────────────────────────────
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

  // ─── Loader completion ────────────────────────────────────────────────────
  const handleLoaderComplete = useCallback(() => {
    setLoaderDone(true)
  }, [])

  // ─── Stable social hover handler — keeps ref in sync ─────────────────────
  const handleSocialHover = (id: string | null) => {
    hoveredSocialIdRef.current = id
    setHoveredSocialId(id)
  }

  // ─── Derived state ─────────────────────────────────────────────────────────
  const activeChapter   = chapters[chapterIndex]
  const isSocialChapter = activeChapter.id === "social"
  const accentColor     = getAccentColor(activeChapter)
  // Progress bar: position within weapon chapters only (excludes social)
  const weaponChapters = chapters.filter((c) => c.weaponId !== null)
  const weaponIdx      = weaponChapters.findIndex((c) => c.id === activeChapter.id)
  const barProgress    = weaponIdx === -1
    ? 1
    : weaponIdx / (weaponChapters.length - 1)

  return (
    // Fixed container — no scrollable height needed anymore
    <div className="fixed inset-0 overflow-hidden">

      {/* 3D canvas — fullscreen */}
      <div className="absolute inset-0 z-0">
        <ExperienceCanvas
          activeChapter={activeChapter}
          chapterProgress={0.5}
          onSocialHover={handleSocialHover}
        />
      </div>

      {/* Scroll / step indicator */}
      <div className="pointer-events-none fixed bottom-8 left-1/2 z-20 -translate-x-1/2 flex flex-col items-center gap-2">
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

      {/* Chapter text overlay */}
      <ChapterOverlay chapter={activeChapter} chapterProgress={0.5} />

      {/* Social hover label — only rendered on social chapter to avoid text overlap */}
      <SocialHoverLabel hoveredId={isSocialChapter ? hoveredSocialId : null} />

      {/* Navigation dots — now clickable */}
      <NavDots
        activeChapterId={activeChapter.id}
        accentColor={accentColor}
        onChapterSelect={goToChapterById}
      />

      {/* Top progress bar */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 z-30 h-px"
        style={{ background: accentColor + "12" }}
      >
        <div
          className="h-full transition-all duration-700 ease-out"
          style={{ width: `${barProgress * 100}%`, background: accentColor + "80" }}
        />
      </div>

      {/* Loading screen — covers everything until water animation completes */}
      {!loaderDone && (
        <div className="pointer-events-none fixed inset-0 z-50">
          <LoadingScreen onComplete={handleLoaderComplete} />
        </div>
      )}
    </div>
  )
}
