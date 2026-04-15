

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
import { useContext } from "react"
import translations from "@/lib/translations/translations"
import dashboardTranslations from "@/lib/translations/dashboard"
import workerDashboardTranslations from "@/lib/translations/worker-dashboard"
import employerDashboardTranslations from "@/lib/translations/employer-dashboard"
import jobAttendanceDetailTranslations from "@/lib/translations/job-attendance-detail"
import loginTranslations from "@/lib/translations/login"
import jobDetailTranslations from "@/lib/translations/job-detail"
import subUserTranslations from "@/lib/translations/sub-user"

type TranslationNamespace =
  | "default"
  | "dashboard"
  | "worker-dashboard"
  | "employer-dashboard"
  | "job-attendance-detail"
  | "login"
  | "job-detail"
  | "sub-user"

export function useTranslation(namespace: TranslationNamespace = "default") {
  const { language, setLanguage } = useContext(LanguageContext)

  const getTranslationSource = (ns: TranslationNamespace) => {
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
      case "default":
      default:
        return translations
    }
  }

  const t = (key: string, params?: Record<string, any>) => {
    const translationSource = getTranslationSource(namespace) as any
    let translation = translationSource[language]?.[key] || key

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
