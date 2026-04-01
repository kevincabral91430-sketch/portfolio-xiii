"use client"

import { useState } from "react"
import SocialFormation from "./SocialFormation"
import { socialLinks } from "@/lib/three/socialData"

interface SocialSceneProps {
  onHoverChange:    (id: string | null) => void
  activeSocialIndex: number
}

export default function SocialScene({ onHoverChange, activeSocialIndex }: SocialSceneProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const handleEnter = (id: string) => {
    setHoveredId(id)
    onHoverChange(id)
  }
  const handleLeave = () => {
    setHoveredId(null)
    onHoverChange(null)
  }

  return (
    <>
      {socialLinks.map((link, idx) => (
        <SocialFormation
          key={link.id}
          link={link}
          isActive={idx === activeSocialIndex}
          isHovered={hoveredId === link.id}
          onHoverEnter={() => handleEnter(link.id)}
          onHoverLeave={handleLeave}
          onClick={() => {}}
        />
      ))}
    </>
  )
}
