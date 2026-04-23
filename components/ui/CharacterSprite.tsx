"use client"

import { useEffect, useRef } from "react"
import type { SpriteConfig } from "@/lib/characterSprites"

interface CharacterSpriteProps {
  config: SpriteConfig
  /** Frame to start on — stagger across characters so they're not in sync */
  startFrame?: number
  /**
   * When false the animation loop is stopped entirely and a fixed frame is shown.
   * Saves CPU/GC for all non-active characters. Defaults to true.
   */
  animated?: boolean
}

/**
 * Pixel-art sprite animator using direct DOM updates (zero React re-renders per frame).
 * Clips the sprite sheet to show one frame at a time by shifting an <img> inside
 * an overflow:hidden container. Image-rendering: pixelated keeps the art crisp.
 */
export default function CharacterSprite({ config, startFrame = 0, animated = true }: CharacterSpriteProps) {
  const imgRef = useRef<HTMLImageElement>(null)

  // ── Derived display geometry ─────────────────────────────────────────────
  const nativeFrameW = config.sheetW / config.cols
  const nativeFrameH = config.sheetH / config.rows
  const scale        = config.displayH / nativeFrameH

  // All pixel values for the scaled display
  const displayFrameW = Math.round(nativeFrameW * scale)
  const displayFrameH = Math.round(config.displayH)
  const displaySheetW = Math.round(config.sheetW * scale)
  const displaySheetH = Math.round(config.sheetH * scale)

  // ── Animation loop — direct DOM, no useState ─────────────────────────────
  useEffect(() => {
    const img = imgRef.current
    if (!img) return

    const positionFrame = (f: number) => {
      const col = f % config.cols
      const row = Math.floor(f / config.cols)
      img.style.left = `${-(col * displayFrameW)}px`
      img.style.top  = `${-(row * displayFrameH)}px`
    }

    // Inactive: pin to frame 0, no interval
    if (!animated) {
      positionFrame(0)
      return
    }

    let frame = ((startFrame % config.frameCount) + config.frameCount) % config.frameCount
    positionFrame(frame)

    const id = setInterval(() => {
      frame = (frame + 1) % config.frameCount
      positionFrame(frame)
    }, 1000 / config.fps)

    return () => clearInterval(id)
  }, [config, startFrame, animated, displayFrameW, displayFrameH])

  return (
    <div
      style={{
        width:    displayFrameW,
        height:   displayFrameH,
        overflow: "hidden",
        position: "relative",
        flexShrink: 0,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        ref={imgRef}
        src={config.src}
        width={displaySheetW}
        height={displaySheetH}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{
          position:        "absolute",
          width:           displaySheetW,
          height:          displaySheetH,
          // Override Tailwind Preflight: `img { max-width: 100%; height: auto }`
          // Without this, the sheet is constrained to the container width
          // and the frame-clipping mechanism breaks entirely.
          maxWidth:        "none",
          imageRendering:  "pixelated",
          userSelect:      "none",
          pointerEvents:   "none",
          // left/top are updated by the animation loop
        }}
      />
    </div>
  )
}
