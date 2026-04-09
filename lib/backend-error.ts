"use client"

/**
 * Centralized backend-error translation.
 *
 * Backend (NestJS + class-validator) returns errors in shapes such as:
 *   { message: "contactEmail must be an email", statusCode: 400 }
 *   { message: ["name should not be empty", "contactEmail must be an email"] }
 *   "<plain string>"  (rare — wrapped in Error)
 *   Error("<json string>")  (when callsite re-throws errorData.message)
 *
 * The frontend used to surface `err.message` directly, which left untranslated
 * English text like "contactEmail must be an email" inside Spanish UIs.
 *
 * This module provides ONE place to:
 *   1. Extract the underlying message(s) from any of the above shapes.
 *   2. Translate known class-validator constraint patterns into the active locale.
 *   3. Translate known backend field names ("contactEmail" → "Email de contacto").
 *
 * Usage:
 *   const translateBackendError = useBackendError()
 *   toast({ title: translateBackendError(err), variant: "destructive" })
 */

import { useCallback } from "react"
import { useTranslation } from "@/hooks/use-translation"

// ── 1. Extract raw messages from any error shape ─────────────────────────────
export function extractBackendMessages(err: unknown): string[] {
  if (err == null) return []

  let raw: any
  if (err instanceof Error) raw = err.message
  else if (typeof err === "string") raw = err
  else raw = err

  // If it's a string, try to parse as JSON in case the callsite stuffed JSON into Error.message
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      try {
        raw = JSON.parse(trimmed)
      } catch {
        /* not JSON, leave as string */
      }
    }
  }

  if (raw && typeof raw === "object") {
    if (Array.isArray((raw as any).message)) return (raw as any).message.map(String)
    if (typeof (raw as any).message === "string") return [(raw as any).message]
    if (Array.isArray(raw)) return (raw as any[]).map(String)
    if ((raw as any).error) return [String((raw as any).error)]
  }

  return [typeof raw === "string" ? raw : String(raw)]
}

// ── 2. Class-validator constraint patterns ──────────────────────────────────
// Each entry maps a regex over the raw English message to a translation key.
// Capture group 1 is always the field name; capture group 2 (if present) is a value.
type Pattern = { re: RegExp; key: string }

const PATTERNS: Pattern[] = [
  { re: /^(\w+) must be an email$/i, key: "valMustBeEmail" },
  { re: /^(\w+) should not be empty$/i, key: "valRequired" },
  { re: /^(\w+) must not be empty$/i, key: "valRequired" },
  { re: /^(\w+) is required$/i, key: "valRequired" },
  { re: /^(\w+) must be a string$/i, key: "valMustBeString" },
  { re: /^(\w+) must be a number(?: conforming to the specified constraints)?$/i, key: "valMustBeNumber" },
  { re: /^(\w+) must be an integer number$/i, key: "valMustBeInteger" },
  { re: /^(\w+) must be a boolean value$/i, key: "valMustBeBoolean" },
  { re: /^(\w+) must be a Date instance$/i, key: "valMustBeDate" },
  { re: /^(\w+) must be a valid ISO 8601 date string$/i, key: "valMustBeDate" },
  { re: /^(\w+) must be longer than or equal to (\d+) characters?$/i, key: "valMinLength" },
  { re: /^(\w+) must be shorter than or equal to (\d+) characters?$/i, key: "valMaxLength" },
  { re: /^(\w+) must contain at least (\d+) characters?$/i, key: "valMinLength" },
  { re: /^(\w+) must not be greater than (\d+) characters?$/i, key: "valMaxLength" },
  { re: /^(\w+) must be a valid phone number$/i, key: "valMustBePhone" },
  { re: /^(\w+) must match (.+) regular expression$/i, key: "valInvalidFormat" },
  { re: /^(\w+) must be one of the following values:.*$/i, key: "valInvalidValue" },
  { re: /^(\w+) must be a UUID$/i, key: "valMustBeUuid" },
  { re: /^(\w+) must be a positive number$/i, key: "valMustBePositive" },
  { re: /^(\w+) must not be less than (\d+)$/i, key: "valMinValue" },
  { re: /^(\w+) must not be greater than (\d+)$/i, key: "valMaxValue" },
]

// ── 3. Field-name translation ────────────────────────────────────────────────
// Convert a camelCase field name to a translated label. Falls back to a
// readable Title-Case version of the camelCase identifier if no key exists.
function camelCaseToReadable(s: string): string {
  return s
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/^./, (c) => c.toUpperCase())
}

function translateFieldName(field: string, t: (k: string, p?: any) => string): string {
  // Try a translation key matching the field name verbatim
  const direct = t(field)
  if (direct !== field) return direct
  // Otherwise produce a readable version of the camelCase identifier
  return camelCaseToReadable(field)
}

// ── 4. Translate one extracted message ───────────────────────────────────────
function translateOne(msg: string, t: (k: string, p?: any) => string): string {
  const trimmed = (msg ?? "").trim()
  if (!trimmed) return ""

  // Direct lookup — lets backends or callers send a translation key as the message.
  const direct = t(trimmed)
  if (direct !== trimmed) return direct

  // Pattern-based class-validator translation
  for (const { re, key } of PATTERNS) {
    const m = trimmed.match(re)
    if (m) {
      const fieldName = m[1]
      const fieldTranslated = translateFieldName(fieldName, t)
      const params: Record<string, any> = { field: fieldTranslated }
      if (m[2]) params.value = m[2]
      return t(key, params)
    }
  }

  // Unknown message — return as-is (better than throwing it away)
  return trimmed
}

// ── 5. Public API: hook returning a stable translator function ───────────────
export function useBackendError() {
  const { t } = useTranslation()

  return useCallback(
    (err: unknown, fallbackKey: string = "unexpectedError"): string => {
      const messages = extractBackendMessages(err)
      if (messages.length === 0) return t(fallbackKey)
      const translated = messages.map((m) => translateOne(m, t)).filter(Boolean)
      if (translated.length === 0) return t(fallbackKey)
      return translated.join(". ")
    },
    [t]
  )
}
