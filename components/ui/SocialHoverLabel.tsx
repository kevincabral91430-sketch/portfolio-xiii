"use client"

import { socialLinks } from "@/lib/three/socialData"

interface SocialHoverLabelProps {
  hoveredId: string | null
}

export default function SocialHoverLabel({ hoveredId }: SocialHoverLabelProps) {
  const link = hoveredId ? socialLinks.find((l) => l.id === hoveredId) : null

  return (
    <div
      className="pointer-events-none fixed left-0 top-0 z-20 flex h-full w-full flex-col justify-center"
      style={{ paddingLeft: "clamp(2rem, 6vw, 6rem)" }}
    >
      <div
        className="max-w-xs transition-all duration-500 ease-out"
        style={{
          opacity: link ? 1 : 0,
          transform: link ? "translateY(0px)" : "translateY(14px)",
        }}
      >
        {link && (
          <>
            <p
              className="mb-4 font-mono text-[11px] tracking-[0.35em] uppercase"
              style={{ color: `${link.color}99` }}
            >
              {link.label}
            </p>

            <div className="flex flex-col gap-1 mb-5">
              {link.description.map((line, i) => (
                <p
                  key={i}
                  className="font-light leading-relaxed text-white/60"
                  style={{ fontSize: "clamp(0.9rem, 1.2vw, 1.1rem)" }}
                >
                  {line}
                </p>
              ))}
            </div>

            {link.url && (
              <p
                className="font-mono text-[10px] tracking-[0.3em] uppercase"
                style={{ color: `${link.color}55` }}
              >
                ↗ Ouvrir
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
