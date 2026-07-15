"use client"

import type React from "react"
import { createContext, useCallback, useEffect, useMemo, useState } from "react"

type Language = "en" | "es" | "de"

type LanguageContextType = {
  language: Language
  setLanguage: (language: Language) => void
}

export const LanguageContext = createContext<LanguageContextType>({
  language: "es", // default Spanish
  setLanguage: () => {},
})

export function LanguageProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const [language, setLanguage] = useState<Language>("es") // default Spanish

  useEffect(() => {
    const savedLanguage = localStorage.getItem("language") as Language
    if (savedLanguage) {
      setLanguage(savedLanguage)
    } else {
      localStorage.setItem("language", "es") // fallback to Spanish if not set
    }
  }, [])

  const handleSetLanguage = useCallback((newLanguage: Language) => {
    setLanguage(newLanguage)
    localStorage.setItem("language", newLanguage)
  }, [])

  // Memoized: this context is consumed by nearly every component via
  // useTranslation, so a new value object each render would re-render the
  // whole tree.
  const value = useMemo(
    () => ({ language, setLanguage: handleSetLanguage }),
    [language, handleSetLanguage],
  )

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}
