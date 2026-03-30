"use client"

import { chapters } from "@/lib/three/chapters"
import { weapons } from "@/lib/three/weaponData"

interface NavDotsProps {
  activeChapterId: string
  accentColor: string
  onChapterSelect?: (chapterId: string) => void
}

export default function NavDots({ activeChapterId, accentColor, onChapterSelect }: NavDotsProps) {
  const visibleChapters = chapters.filter((c) => c.weaponId !== null)

  return (
    <nav
      className="fixed right-6 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-3"
      aria-label="Navigation chapitres"
    >
      {visibleChapters.map((chapter) => {
        const isActive = chapter.id === activeChapterId
        const dotColor = isActive
          ? accentColor
          : weapons.find((w) => w.id === chapter.weaponId)?.color ?? "#67e8f9"

        return (
          <div
            key={chapter.id}
            className="relative flex cursor-pointer items-center justify-end gap-2 group"
            aria-current={isActive ? "true" : undefined}
            onClick={() => onChapterSelect?.(chapter.id)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") onChapterSelect?.(chapter.id)
            }}
            aria-label={`Aller au chapitre ${chapter.weaponId ?? chapter.id}`}
          >
            {/* Label — visible when active or on hover */}
            <span
              className="font-mono text-[10px] tracking-widest uppercase transition-all duration-300"
              style={{
                color: isActive ? `${accentColor}80` : `${dotColor}00`,
                opacity: isActive ? 1 : 0,
              }}
            >
              {chapter.weaponId ?? chapter.id}
            </span>

            {/* Dot */}
            <div
              className="rounded-full transition-all duration-500"
              style={{
                width: isActive ? "8px" : "4px",
                height: isActive ? "8px" : "4px",
                background: isActive ? accentColor : `${dotColor}40`,
                boxShadow: isActive ? `0 0 10px ${accentColor}` : "none",
                transform: "scale(1)",
              }}
            />
          </div>
        )
      })}
    </nav>
  )
}
