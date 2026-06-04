"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState, useEffect, useRef } from "react"
import { useTranslation } from "@/hooks/use-translation"

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { setTheme, theme } = useTheme()
  const [showDropdown, setShowDropdown] = useState(false)
  const [mounted, setMounted] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!showDropdown) return
    const handlePointerDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handlePointerDown)
    return () => document.removeEventListener("mousedown", handlePointerDown)
  }, [showDropdown])

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    setShowDropdown(false)
  }

  // Prevent hydration mismatch by rendering a default icon until mounted
  const isDark = mounted && theme === "dark"

  return (
    <div className="relative" ref={containerRef}>
      <button className="header-icon-button" onClick={toggleDropdown}>
        {isDark ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        <span className="tooltip">{t("theme")}</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-background border border-border z-[100]">
          <div className="py-1">
            <button
              className={`block w-full text-left px-4 py-2 text-sm ${
                theme === "light" ? "bg-accent text-accent-foreground" : ""
              } hover:bg-accent hover:text-accent-foreground`}
              onClick={() => handleThemeChange("light")}
            >
              {t("light")}
            </button>
            <button
              className={`block w-full text-left px-4 py-2 text-sm ${
                theme === "dark" ? "bg-accent text-accent-foreground" : ""
              } hover:bg-accent hover:text-accent-foreground`}
              onClick={() => handleThemeChange("dark")}
            >
              {t("dark")}
            </button>
            <button
              className={`block w-full text-left px-4 py-2 text-sm ${
                theme === "system" ? "bg-accent text-accent-foreground" : ""
              } hover:bg-accent hover:text-accent-foreground`}
              onClick={() => handleThemeChange("system")}
            >
              {t("system")}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
