"use client"

import React, { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface TimeFieldProps {
  id?: string
  value?: string
  onChange?: (val: string) => void
  placeholder?: string
  className?: string
}

// Validates duration strings in hh:mm format.
// Rules: hours 0-24, minutes 0-59. If hours === 24 then minutes must be 00.
export function isValidDuration(val?: string): boolean {
  if (!val) return false
  const m = val.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return false
  const hh = Number(m[1])
  const mm = Number(m[2])
  if (Number.isNaN(hh) || Number.isNaN(mm)) return false
  if (hh < 0 || hh > 24) return false
  if (mm < 0 || mm > 59) return false
  if (hh === 24 && mm !== 0) return false
  return true
}

export default function TimeField({ id, value = "", onChange, placeholder = "hh:mm", className = "" }: TimeFieldProps) {
  const [internal, setInternal] = useState(value || "")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => setInternal(value || ""), [value])

  const sanitizeDigits = (raw: string) => raw.replace(/\D/g, "").slice(0, 4)

  const formatFromDigits = (digits: string) => {
    if (digits.length <= 2) return digits
    const hh = digits.slice(0, 2)
    const mm = digits.slice(2)
    return `${hh}:${mm}`
  }

  const normalizeOnly = (digits: string) => {
    // Only pad/format, do NOT clamp values — keep user-editable numbers
    if (digits.length === 0) return ""
    let hhStr = "00"
    let mmStr = "00"
    if (digits.length === 1) {
      hhStr = digits.padStart(2, "0")
      mmStr = "00"
    } else if (digits.length === 2) {
      hhStr = digits
      mmStr = "00"
    } else if (digits.length === 3) {
      hhStr = digits.slice(0, 2)
      mmStr = (digits.slice(2) + "0").slice(0, 2)
    } else {
      hhStr = digits.slice(0, 2)
      mmStr = digits.slice(2, 4)
    }
    return `${hhStr.padStart(2, "0")}:${mmStr.padStart(2, "0")}`
  }

  const handleChange = (raw: string) => {
    const digits = sanitizeDigits(raw)
    const display = formatFromDigits(digits)
    setInternal(display)

    // If the user has entered a full hhmm (4 digits), emit a normalized value
    if (digits.length === 4) {
      const normalized = normalizeOnly(digits)
      onChange?.(normalized)
      setError(isValidDuration(normalized) ? null : "Invalid time")
    } else {
      // partial input; clear field-level error until blur or full input
      setError(null)
      onChange?.(display)
    }
  }

  const handleBlur = () => {
    const digits = sanitizeDigits(internal)
    if (digits.length === 0) {
      setInternal("")
      setError(null)
      onChange?.("")
      return
    }

    const normalized = normalizeOnly(digits)
    setInternal(normalized)
    onChange?.(normalized)
    // Keep validation but DO NOT overwrite user data further — show error if out-of-range
    setError(isValidDuration(normalized) ? null : "Invalid time (hh:mm)")
  }

  return (
    <div>
      <Input
        id={id}
        value={internal}
        onChange={(e) => handleChange(e.target.value)}
        onPaste={(e: React.ClipboardEvent<HTMLInputElement>) => {
          const pasted = e.clipboardData.getData("text") || ""
          e.preventDefault()
          handleChange(pasted)
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        inputMode="numeric"
        pattern="[0-9:]*"
        maxLength={5}
        className={cn(className, error ? "border-red-500" : "")}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}
