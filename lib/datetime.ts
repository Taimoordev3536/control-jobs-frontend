/**
 * Centralised date/time formatter.
 *
 * Spain-first: every timestamp is rendered in Europe/Madrid regardless of
 * where the user (or their browser) sits. This guarantees that an event
 * which happened at 15:16 Madrid time always reads "15:16" — for the
 * Spain-based admin, the Pakistan-based partner, and a worker in
 * Argentina alike.
 *
 * Always 24-hour. Format is dd/mm/yyyy, HH:MM:SS.
 */

const DEFAULT_TIMEZONE = "Europe/Madrid"

function toInstant(input: string | Date): Date {
  if (input instanceof Date) return input
  // Postgres `timestamp` columns serialise without timezone info on some
  // setups (e.g. "2026-05-07T10:25:29.000"). Treat those as UTC since the
  // backend session is UTC. Strings WITH a timezone marker (`Z` or +/-hhmm)
  // are trusted as-is.
  if (/Z|[+-]\d{2}:?\d{2}$/.test(input)) return new Date(input)
  return new Date(`${input}Z`)
}

function formatWith(
  input: string | Date | null | undefined,
  options: Intl.DateTimeFormatOptions,
): string {
  if (!input) return ""
  const d = toInstant(input)
  if (Number.isNaN(d.getTime())) return ""
  return d.toLocaleString("es-ES", { timeZone: DEFAULT_TIMEZONE, hour12: false, ...options })
}

export function formatLocalDateTime(input: string | Date | null | undefined): string {
  return formatWith(input, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

export function formatLocalDate(input: string | Date | null | undefined): string {
  return formatWith(input, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function formatLocalTime(input: string | Date | null | undefined): string {
  return formatWith(input, {
    hour: "2-digit",
    minute: "2-digit",
  })
}
