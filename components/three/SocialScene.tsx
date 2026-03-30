"use client"

import { useState } from "react"
import SocialFormation from "./SocialFormation"
import { socialLinks } from "@/lib/three/socialData"

interface SocialSceneProps {
  onHoverChange: (id: string | null) => void
}

export default function SocialScene({ onHoverChange }: SocialSceneProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleEnter = (id: string) => {
    setHoveredId(id)
    onHoverChange(id)
  }

  const handleLeave = () => {
    setHoveredId(null)
    onHoverChange(null)
  }

  const handleClick = (url: string) => {
    if (url) window.open(url, "_blank", "noopener noreferrer")
  }

  return (
    <>
      {socialLinks.map((link) => (
        <SocialFormation
          key={link.id}
          link={link}
          isHovered={hoveredId === link.id}
          onHoverEnter={() => handleEnter(link.id)}
          onHoverLeave={handleLeave}
          onClick={() => handleClick(link.url)}
        />
      ))}
    </>
  )
}
