"use client"
import React from "react"

interface SeasonDateProps {
  id?: string
  value: string
  onChange: (e: { target: { value: string } } | any) => void
  className?: string
}

// Simple input that enforces dd/mm formatting (day and month only) as the user types
export default function SeasonDate({ id, value, onChange, className }: SeasonDateProps) {
  const formatValue = (raw: string) => {
    // Remove non-digits
    const digits = raw.replace(/[^0-9]/g, "")
    let out = digits
    if (digits.length > 2) out = digits.slice(0, 2) + "/" + digits.slice(2, 4)
    return out
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatValue(e.target.value)
    onChange({ target: { value: formatted } })
  }

  return (
    <input
      id={id}
      value={value}
      onChange={handleChange}
      placeholder="dd/mm"
      className={className}
    />
  )
}
