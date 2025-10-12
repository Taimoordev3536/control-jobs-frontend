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
  const parse = (v: any) => (v ? dayjs(v) : null)

  const [internal, setInternal] = useState<Dayjs | null>(
    value ? dayjs(value) : defaultValue ? (typeof defaultValue === 'string' ? dayjs(defaultValue) : defaultValue) : null,
  )

  useEffect(() => {
    setInternal(value ? dayjs(value) : defaultValue ? (typeof defaultValue === 'string' ? dayjs(defaultValue) : defaultValue) : null)
  }, [value, defaultValue])

  // default to a narrower, compact input; height is controlled via MUI sx below
  const inputClass = className || 'w-16 text-xs'

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <DateField
        label={label}
        value={internal}
        onChange={(v) => {
          setInternal(v as Dayjs | null)
          if (onChange) onChange(v ? dayjs(v).format(format) : null)
        }}
        format={format}
        views={["month", "day"]}
        openTo="month"
        slotProps={{
          textField: {
            placeholder: placeholder || format,
            className: inputClass,
            size: 'small',
            sx: {
              width: 90,
              minWidth: 90,
              // compact the internal MUI input controls to reduce overall height
              '& .MuiInputBase-root': { height: 10, minHeight: 20, padding: '0 4px' },
              '& .MuiInputBase-input': { padding: '1px 4px', fontSize: 4, lineHeight: '8px'},
            },
          },
        }}
      />
    </LocalizationProvider>
  )
}
