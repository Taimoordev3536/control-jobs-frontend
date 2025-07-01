"use client"

import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useState } from "react"
import { useTranslation } from "@/hooks/use-translation"

export function ThemeSwitcher() {
  const { t } = useTranslation()
  const { setTheme, theme } = useTheme()
  const [showDropdown, setShowDropdown] = useState(false)

  const toggleDropdown = () => {
    setShowDropdown(!showDropdown)
  }

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme)
    setShowDropdown(false)
  }

  return (
    <div className="relative">
      <button className="header-icon-button" onClick={toggleDropdown}>
        {theme === "dark" ? <Moon className="h-5 w-5" /> : <Sun className="h-5 w-5" />}
        <span className="tooltip">Theme</span>
      </button>

      {showDropdown && (
        <div className="absolute right-0 mt-2 w-40 rounded-md shadow-lg bg-background border border-border z-50">
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
