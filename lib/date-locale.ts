// Maps the app's language code ("en" | "es" | "de") to a BCP-47 locale for
// Intl date/number formatting. English uses en-GB so numeric dates keep the
// app's day/month/year order (matching the Spanish default) instead of the
// US month/day/year order. Falls back to Spanish for any unknown value.
export function localeForLanguage(language: string | undefined | null): string {
  switch (language) {
    case "en":
      return "en-GB"
    case "de":
      return "de-DE"
    case "es":
    default:
      return "es-ES"
  }
}
