// "use client"

// import { LanguageContext } from "@/components/language-provider"
// import { useContext } from "react"
// import translations from "@/lib/translations"

// export function useTranslation() {
//   const { language, setLanguage } = useContext(LanguageContext)

//   const t = (key: string) => {
//     return translations[language]?.[key] || key
//   }

//   return {
//     language,
//     setLanguage,
//     t,
//   }
// }


"use client"

import { LanguageContext } from "@/components/language-provider"
import { useContext } from "react"
import translations from "@/lib/translations"

export function useTranslation() {
  const { language, setLanguage } = useContext(LanguageContext)

  const t = (key: string, params?: Record<string, any>) => {
    let translation = translations[language]?.[key] || key

    // Handle interpolation for dynamic values
    if (params && typeof translation === "string") {
      Object.keys(params).forEach((param) => {
        translation = translation.replace(`{{${param}}}`, params[param])
      })
    }

    return translation
  }

  return {
    language,
    setLanguage,
    t,
  }
}
