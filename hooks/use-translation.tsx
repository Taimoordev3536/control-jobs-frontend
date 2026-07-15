

// "use client"

// import { LanguageContext } from "@/components/language-provider"
// import { useContext } from "react"
// import translations from "@/lib/translations/translations"
// import dashboardTranslations from "@/lib/translations/dashboard"
// import workerDashboardTranslations from "@/lib/translations/worker-dashboard"
// import employerDashboardTranslations from "@/lib/translations/employer-dashboard"
// import jobAttendanceDetailTranslations from "@/lib/translations/job-attendance-detail"
// import loginTranslations from "@/lib/translations/login"

// type TranslationNamespace =
//   | "default"
//   | "dashboard"
//   | "worker-dashboard"
//   | "employer-dashboard"
//   | "job-attendance-detail"
//   | "login"

// export function useTranslation(namespace: TranslationNamespace = "default") {
//   const { language, setLanguage } = useContext(LanguageContext)

//   const getTranslationSource = (ns: TranslationNamespace) => {
//     switch (ns) {
//       case "dashboard":
//         return dashboardTranslations
//       case "worker-dashboard":
//         return workerDashboardTranslations
//       case "employer-dashboard":
//         return employerDashboardTranslations
//       case "job-attendance-detail":
//         return jobAttendanceDetailTranslations
//       case "login":
//         return loginTranslations
//       case "default":
//       default:
//         return translations
//     }
//   }

//   const t = (key: string, params?: Record<string, any>) => {
//     const translationSource = getTranslationSource(namespace)
//     let translation = translationSource[language]?.[key] || key

//     // Handle interpolation for dynamic values
//     if (params && typeof translation === "string") {
//       Object.keys(params).forEach((param) => {
//         translation = translation.replace(`{{${param}}}`, params[param])
//       })
//     }

//     return translation
//   }

//   return {
//     language,
//     setLanguage,
//     t,
//   }
// }

"use client"

import { LanguageContext } from "@/components/language-provider"
import { useCallback, useContext, useMemo } from "react"
import translations from "@/lib/translations/translations"
import dashboardTranslations from "@/lib/translations/dashboard"
import workerDashboardTranslations from "@/lib/translations/worker-dashboard"
import employerDashboardTranslations from "@/lib/translations/employer-dashboard"
import jobAttendanceDetailTranslations from "@/lib/translations/job-attendance-detail"
import loginTranslations from "@/lib/translations/login"
import jobDetailTranslations from "@/lib/translations/job-detail"
import subUserTranslations from "@/lib/translations/sub-user"
import impersonationTranslations from "@/lib/translations/impersonation"
import manualAttendanceTranslations from "@/lib/translations/manual-attendance"
import announcementsTranslations from "@/lib/translations/announcements"
import fichajeDialogsTranslations from "@/lib/translations/fichaje-dialogs"
import fichajeCardsTranslations from "@/lib/translations/fichaje-cards"
import recordDetailTranslations from "@/lib/translations/record-detail"

type TranslationNamespace =
  | "default"
  | "dashboard"
  | "worker-dashboard"
  | "employer-dashboard"
  | "job-attendance-detail"
  | "login"
  | "job-detail"
  | "sub-user"
  | "impersonation"
  | "manual-attendance"
  | "announcements"
  | "fichaje-dialogs"
  | "fichaje-cards"
  | "record-detail"

export function useTranslation(namespace: TranslationNamespace = "default") {
  const { language, setLanguage } = useContext(LanguageContext)

  const getTranslationSource = (ns: TranslationNamespace): any => {
    switch (ns) {
      case "dashboard":
        return dashboardTranslations
      case "worker-dashboard":
        return workerDashboardTranslations
      case "employer-dashboard":
        return employerDashboardTranslations
      case "job-attendance-detail":
        return jobAttendanceDetailTranslations
      case "login":
        return loginTranslations
      case "job-detail":
        return jobDetailTranslations
      case "sub-user":
        return subUserTranslations
      case "impersonation":
        return impersonationTranslations
      case "manual-attendance":
        return manualAttendanceTranslations
      case "announcements":
        return announcementsTranslations
      case "fichaje-dialogs":
        return fichajeDialogsTranslations
      case "fichaje-cards":
        return fichajeCardsTranslations
      case "record-detail":
        return recordDetailTranslations
      case "default":
      default:
        return translations
    }
  }

  // t and tEnum must keep a stable identity between renders: consumers put
  // them in useMemo/useCallback dependency lists (the table templates derive
  // their filtered rows from `t`), and a fresh function each render silently
  // invalidates those caches.
  const t = useCallback(
    (key: string, params?: Record<string, any>) => {
      const bundle = getTranslationSource(namespace)[language]
      let translation: any =
        bundle?.[key] !== undefined ? bundle[key] : resolvePath(bundle, key)
      if (translation === undefined || translation === null) translation = key

      // Handle interpolation for dynamic values
      if (params && typeof translation === "string") {
        Object.keys(params).forEach((param) => {
          translation = translation.replace(`{{${param}}}`, params[param])
        })
      }

      return translation
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [namespace, language],
  )

  // Translate an enum/lookup value. `category` is the namespace inside
  // `enums` (e.g. "employerType"), `value` is the language-neutral key
  // returned by the backend (e.g. "HOME"). Falls back to the raw value
  // so missing translations never break the UI.
  const tEnum = useCallback(
    (category: string, value: string | null | undefined) => {
      if (value === null || value === undefined || value === "") return ""
      const key = `enums.${category}.${value}`
      const result = t(key)
      return result === key ? value : result
    },
    [t],
  )

  return useMemo(
    () => ({ language, setLanguage, t, tEnum }),
    [language, setLanguage, t, tEnum],
  )
}

// Walk a dot-notation path through the translation bundle. Only used as a
// fallback so existing flat keys (some of which legitimately contain dots,
// e.g. "Street, Number, Town...") keep their direct lookup.
function resolvePath(obj: any, path: string): any {
  if (!obj || typeof obj !== "object") return undefined
  const parts = path.split(".")
  let current: any = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined
    current = current[part]
  }
  return current
}
