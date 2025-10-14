"use client"

import React, { useEffect, useState } from "react"
import { LocalizationProvider } from '@mui/x-date-pickers'
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs'
import { DateField } from '@mui/x-date-pickers/DateField'
import dayjs, { Dayjs } from 'dayjs'
import { useTranslation } from "@/hooks/use-translation"

type ManualDateFieldProps = {
  label?: string
  value?: string | null
  defaultValue?: string | Dayjs
  format?: string
  placeholder?: string
  className?: string
  size?: string
  onChange?: (value: string | null) => void
}

export default function ManualDateField({
  label,
  value,
  defaultValue,
  format = 'MM/DD',
  placeholder,
  className,
  onChange,
}: ManualDateFieldProps) {
  // Try to parse incoming value which may be ISO (YYYY-MM-DD) or localized (DD/MM or MM/DD)
  const parseIncoming = (v?: string | null) => {
    if (!v) return null
    const s = v.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return dayjs(s)
    // Try DD/MM then MM/DD
    const ddmm = dayjs(s, 'DD/MM', true)
    if (ddmm.isValid()) return ddmm
    const mmdd = dayjs(s, 'MM/DD', true)
    if (mmdd.isValid()) return mmdd
    // Fallback: let dayjs try a generic parse
    const guess = dayjs(s)
    return guess.isValid() ? guess : null
  }

  const [internal, setInternal] = useState<Dayjs | null>(parseIncoming(value ?? null) ?? (defaultValue ? (typeof defaultValue === 'string' ? dayjs(defaultValue) : defaultValue) : null))

  useEffect(() => {
    setInternal(parseIncoming(value ?? null) ?? (defaultValue ? (typeof defaultValue === 'string' ? dayjs(defaultValue) : defaultValue) : null))
  }, [value, defaultValue])

  // default to a narrower, compact input; height is controlled via MUI sx below
  const inputClass = className || 'w-16 text-xs'

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateField
        label={label}
        value={internal}
        onChange={(v) => {
          const dv = v as Dayjs | null
          setInternal(dv)
          if (onChange) {
            if (!dv) return onChange(null)
            // Emit ISO YYYY-MM-DD to parent for consistent storage
            const iso = dayjs(dv).format('YYYY-MM-DD')
            onChange(iso)
          }
        }}
        format={format}
        slotProps={{
          textField: {
            placeholder: placeholder || format,
            className: inputClass,
            size: (typeof ({} as any).size === 'string' ? 'small' : 'small') as any,
            sx: {
              width: 90,
              minWidth: 90,
              // compact the internal MUI input controls to reduce overall height
              '& .MuiInputBase-root': { height: 10, minHeight: 20, padding: '0 4px' },
              '& .MuiInputBase-input': { padding: '1px 4px', fontSize: 4, lineHeight: '8px' },
            },
          },
        }}
      />
    </LocalizationProvider>
  )
}
