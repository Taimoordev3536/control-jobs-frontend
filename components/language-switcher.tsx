"use client"

import { useTranslation } from "@/hooks/use-translation"
import {Languages } from "lucide-react"
import { useState } from "react"

export function LanguageSwitcher() {
  const { language, setLanguage } = useTranslation()
  const [showDropdown, setShowDropdown] = useState(false)

  const languages = [
    { code: "en", label: "English" },
    { code: "es", label: "Spanish" },
    // { code: "de", label: "German" },
  ]

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  const handleLanguageChange = (code: string) => {
    setLanguage(code as "en" | "es")
    setShowDropdown(false)
  }

  const getCurrentLanguageLabel = () => {
    const currentLang = languages.find((lang) => lang.code === language)
    return currentLang ? currentLang.label : "English"
  }

  return (
    <div className="relative">
      <button className="header-icon-button flex items-center gap-2" onClick={toggleDropdown}>
        <Languages className="h-5 w-5" />
        <span className="tooltip">Translate</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-background border border-border z-50">
          <div className="py-1">
            {languages.map((lang) => (
              <button
                key={lang.code}
                className={`block w-full text-left px-4 py-2 text-sm ${
                  language === lang.code ? "bg-accent text-accent-foreground" : ""
                } hover:bg-accent hover:text-accent-foreground`}
                onClick={() => handleLanguageChange(lang.code)}
              >
                {lang.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
