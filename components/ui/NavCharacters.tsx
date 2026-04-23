"use client"

import { useState } from "react"
import { chapters } from "@/lib/three/chapters"
import { characterSprites } from "@/lib/characterSprites"
import CharacterSprite from "./CharacterSprite"

interface NavCharactersProps {
  activeChapterId: string
  accentColor: string
  onChapterSelect?: (chapterId: string) => void
}

// ── Slot dimensions — every character occupies the same bounding box ─────────
// SLOT_W is wide enough to accommodate the widest sprite (Tidus: 97px).
// SLOT_H matches the uniform displayH used in characterSprites.ts (60px).
// Centering within the slot means the column is perfectly stable regardless
// of how wide each individual character's frame happens to be.
const SLOT_W = 100  // px — fits all sprites (Tidus 97px, Kimahri 48px, …)
const SLOT_H = 60   // px — matches displayH; all sprites are this tall

/**
 * Replaces NavDots — each chapter's navigation "dot" is now the character's
 * animated idle sprite. Active character scales up with a colored glow.
 * Inactive characters are dimmed and smaller. Hover adds a neutral lift.
 *
 * Positioning: right-aligned fixed column, vertically centered.
 * Each sprite lives inside a fixed SLOT_W × SLOT_H box so the column
 * never shifts regardless of individual frame widths.
 */
export default function NavCharacters({
  activeChapterId,
  accentColor,
  onChapterSelect,
}: NavCharactersProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const visibleChapters = chapters.filter((c) => c.weaponId !== null)

  return (
    <nav
      className="fixed right-4 top-1/2 z-30 flex -translate-y-1/2 flex-col items-end gap-2"
      aria-label="Navigation chapitres"
    >
      {visibleChapters.map((chapter, i) => {
        const sprite    = characterSprites[chapter.id]
        const isActive  = chapter.id === activeChapterId
        const isHovered = hoveredId === chapter.id

        if (!sprite) return null

        // ── Visual state ─────────────────────────────────────────────────
        // Active  : full opacity, 1.20× scale, accent glow
        // Hovered : 70% opacity, 1.08× scale, soft white lift
        // Idle    : 38% opacity, 1× scale, no glow
        const opacity   = isActive ? 1 : isHovered ? 0.70 : 0.38
        const scaleVal  = isActive ? 1.20 : isHovered ? 1.08 : 1.0
        const filterVal = isActive
          ? `drop-shadow(0 0 6px ${accentColor}) drop-shadow(0 0 18px ${accentColor}88)`
          : isHovered
          ? "drop-shadow(0 0 4px rgba(255,255,255,0.55))"
          : "none"

        return (
          <div
            key={chapter.id}
            role="button"
            tabIndex={0}
            aria-label={`Aller au chapitre ${chapter.weaponId ?? chapter.id}`}
            aria-current={isActive ? "true" : undefined}
            className="cursor-pointer select-none"
            style={{
              // Scale from bottom-right so the character "grows" left+up
              transformOrigin: "right bottom",
              transform:       `scale(${scaleVal})`,
              opacity,
              filter:          filterVal,
              transition:      "transform 350ms cubic-bezier(0.34,1.56,0.64,1), opacity 300ms ease, filter 300ms ease",
              marginBottom:    isActive ? 4 : 0,
              marginTop:       isActive ? 4 : 0,
            }}
            onClick={() => onChapterSelect?.(chapter.id)}
            onPointerEnter={() => setHoveredId(chapter.id)}
            onPointerLeave={() => setHoveredId(null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onChapterSelect?.(chapter.id)
            }}
          >
            {/* Fixed-size slot: every sprite is centered in the same box.
                overflow:hidden clips the rare 1-2px overshoot (Tidus sword tip). */}
            <div
              style={{
                width:          SLOT_W,
                height:         SLOT_H,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                overflow:       "hidden",
              }}
            >
              <CharacterSprite
                config={sprite}
                startFrame={i * 3}   // stagger so characters aren't synced
                animated={isActive}  // only the selected character animates
              />
            </div>
          </div>
        )
      })}
    </nav>
  )
}
