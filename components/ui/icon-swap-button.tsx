"use client"

import type React from "react"
import { useState } from "react"

type IconSwapButtonProps = {
  Icon1: React.ComponentType<React.SVGProps<SVGSVGElement>>
  Icon2: React.ComponentType<React.SVGProps<SVGSVGElement>>
  className?: string
  onClick?: () => void
  title?: string
  [key: string]: any // for other button props
}

export function IconSwapButton({ Icon1, Icon2, className = "", onClick, title, ...props }: IconSwapButtonProps) {
  const [hovered, setHovered] = useState(false)

  return (
    <button
      {...props}
      className={`p-2 rounded-md border border-gray-300 hover:border-purple-400 transition-colors ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      title={title}
    >
      {hovered ? <Icon2 className="w-5 h-5" /> : <Icon1 className="w-5 h-5" />}
    </button>
  )
}
