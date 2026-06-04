"use client"

import { useTranslation } from "@/hooks/use-translation"
import { Languages } from "lucide-react"
import { useState, useEffect, useRef } from "react"

export function LanguageSwitcher() {
  const { language, setLanguage, t } = useTranslation()
  const [showDropdown, setShowDropdown] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

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

  // Labels that change depending on the current language
  const languageLabels: Record<string, { en: string; es: string }> = {
    es: { en: "Spanish", es: "Español" },
    en: { en: "English", es: "Inglés" },
  }

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  const handleLanguageChange = (code: "en" | "es") => {
    setLanguage(code)
    setShowDropdown(false)
  }

  const getCurrentLanguageLabel = () => {
    return languageLabels[language][language] // e.g., if "es", returns "Español"
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        className="header-icon-button flex items-center gap-2"
        onClick={toggleDropdown}
      >
        <Languages className="h-5 w-5" />
        <span className="tooltip">{t("translate")}</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-background border border-border z-[100]">
          <div className="py-1">
            {Object.keys(languageLabels).map((code) => (
              <button
                key={code}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  language === code ? "bg-accent text-accent-foreground" : ""
                } hover:bg-accent hover:text-accent-foreground`}
                onClick={() => handleLanguageChange(code as "en" | "es")}
              >
                {languageLabels[code][language]} 
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
