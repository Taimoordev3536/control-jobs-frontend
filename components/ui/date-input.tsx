// "use client"

// import React, { useEffect, useRef, useState } from "react"
// import { Input } from "@/components/ui/input"
// import { useTranslation } from "@/hooks/use-translation"

// export interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
//   value?: string // ISO yyyy-mm-dd
//   onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
// }

// function formatISO(date: Date) {
//   const y = date.getFullYear()
//   const m = String(date.getMonth() + 1).padStart(2, "0")
//   const d = String(date.getDate()).padStart(2, "0")
//   return `${y}-${m}-${d}`
// }

// function parseISO(value?: string) {
//   if (!value) return null
//   const parts = value.split("-")
//   if (parts.length !== 3) return null
//   const [y, m, d] = parts.map(Number)
//   if (!y || !m || !d) return null
//   return new Date(y, m - 1, d)
// }

// export const DateInput: React.FC<DateInputProps> = ({ value, onChange, className, placeholder, ...rest }) => {
//   const { t, language } = useTranslation()
//   const [open, setOpen] = useState(false)
//   const [viewDate, setViewDate] = useState<Date>(() => parseISO(value) || new Date())
//   const [isBelow, setIsBelow] = useState(true)
//   const ref = useRef<HTMLDivElement | null>(null)
//   const inputRef = useRef<HTMLInputElement | null>(null)

//   useEffect(() => {
//     setViewDate(parseISO(value) || new Date())
//   }, [value])

//   useEffect(() => {
//     function checkSpace() {
//       if (inputRef.current) {
//         const rect = inputRef.current.getBoundingClientRect()
//         const spaceBelow = window.innerHeight - rect.bottom
//         const dropdownHeight = 300 // Approximate height of the dropdown (adjust as needed)
//         setIsBelow(spaceBelow > dropdownHeight)
//       }
//     }

//     checkSpace()
//     window.addEventListener("resize", checkSpace)
//     window.addEventListener("scroll", checkSpace)
//     return () => {
//       window.removeEventListener("resize", checkSpace)
//       window.removeEventListener("scroll", checkSpace)
//     }
//   }, [open])

//   useEffect(() => {
//     function onDoc(e: MouseEvent) {
//       if (!ref.current) return
//       if (!ref.current.contains(e.target as Node)) setOpen(false)
//     }
//     document.addEventListener("mousedown", onDoc)
//     return () => document.removeEventListener("mousedown", onDoc)
//   }, [])

//   const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
//   const startWeekday = startOfMonth.getDay() // 0 Sun - 6 Sat
//   const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()

//   const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
//   const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

//   const pickDate = (day: number) => {
//     const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
//     const iso = formatISO(newDate)
//     if (onChange) {
//       const ev = { target: { value: iso } } as unknown as React.ChangeEvent<HTMLInputElement>
//       onChange(ev)
//     }
//     setOpen(false)
//   }

//   const monthLabel = t?.([
//     "january",
//     "february",
//     "march",
//     "april",
//     "may",
//     "june",
//     "july",
//     "august",
//     "september",
//     "october",
//     "november",
//     "december",
//   ][viewDate.getMonth()]) || viewDate.toLocaleString(language, { month: "long" })

//   const weekDays = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"].map((k) => t(k))

//   const cells: Array<Array<number | null>> = []
//   let week: Array<number | null> = []
//   for (let i = 0; i < startWeekday; i++) week.push(null)
//   for (let d = 1; d <= daysInMonth; d++) {
//     week.push(d)
//     if (week.length === 7) {
//       cells.push(week)
//       week = []
//     }
//   }
//   if (week.length) {
//     while (week.length < 7) week.push(null)
//     cells.push(week)
//   }

//   const displayValue = value || ""

//   return (
//     <div className="relative" ref={ref}>
//       <div className="relative">
//         <Input
//           ref={inputRef}
//           readOnly
//           value={displayValue}
//           onClick={() => setOpen((s) => !s)}
//           className={`pr-10 ${className}`}
//           placeholder={placeholder || t("selectDate") || "Select date"}
//           aria-label={placeholder || t("selectDate") || "Select date"}
//           {...(rest as any)}
//         />
//         <svg
//           className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
//           fill="none"
//           viewBox="0 0 24 24"
//           stroke="currentColor"
//         >
//           <path
//             strokeLinecap="round"
//             strokeLinejoin="round"
//             strokeWidth={2}
//             d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
//           />
//         </svg>
//       </div>

//       {open && (
//         <div
//           className="absolute z-50 w-72 rounded-md border border-border bg-background p-4 shadow-md"
//           style={{
//             top: isBelow ? "100%" : "auto",
//             bottom: isBelow ? "auto" : "100%",
//             marginTop: isBelow ? "0.5rem" : "0",
//             marginBottom: isBelow ? "0" : "0.5rem",
//           }}
//         >

//           <div className="flex items-center justify-between mb-3">
//             <button
//               type="button"
//               onClick={prevMonth}
//               className="rounded-full p-1 hover:bg-muted transition-colors"
//               aria-label={t("previousMonth") || "Previous month"}
//             >
//               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
//               </svg>
//             </button>
//             <div className="text-sm font-medium text-foreground">
//               {monthLabel} {viewDate.getFullYear()}
//             </div>
//             <button
//               type="button"
//               onClick={nextMonth}
//               className="rounded-full p-1 hover:bg-muted transition-colors"
//               aria-label={t("nextMonth") || "Next month"}
//             >
//               <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
//               </svg>
//             </button>
//           </div>

//           <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground mb-2">
//             {weekDays.map((wd, idx) => (
//               <div key={idx} className="text-center">
//                 {wd.charAt(0).toUpperCase()}
//               </div>
//             ))}
//           </div>

//           <div className="grid grid-cols-7 gap-1 text-sm">
//             {cells.flat().map((d, idx) => {
//               if (d === null) return <div key={idx} className="h-8" />
//               const isSelected = value === formatISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))
//               const isToday = formatISO(new Date()) === formatISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))
//               return (
//                 <button
//                   key={idx}
//                   type="button"
//                   onClick={() => pickDate(d)}
//                   className={`h-8 w-8 flex items-center justify-center rounded-full transition-colors ${
//                     isSelected
//                       ? "bg-primary text-primary-foreground"
//                       : isToday
//                       ? "bg-accent text-accent-foreground"
//                       : "hover:bg-muted text-foreground"
//                   }`}
//                 >
//                   {d}
//                 </button>
//               )
//             })}
//           </div>
//         </div>
//       )}
//     </div>
//   )
// }

// export default DateInput


"use client"

import React, { useEffect, useRef, useState } from "react"
import { Input } from "@/components/ui/input"
import { useTranslation } from "@/hooks/use-translation"

export interface DateInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  value?: string // ISO yyyy-mm-dd
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void
}

function formatISO(date: Date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseISO(value?: string) {
  if (!value) return null
  const parts = value.split("-")
  if (parts.length !== 3) return null
  const [y, m, d] = parts.map(Number)
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export const DateInput: React.FC<DateInputProps> = ({ value, onChange, className, placeholder, ...rest }) => {
  const { t, language } = useTranslation()
  const [open, setOpen] = useState(false)
  const [viewDate, setViewDate] = useState<Date>(() => parseISO(value) || new Date())
  const [isBelow, setIsBelow] = useState(true)
  const ref = useRef<HTMLDivElement | null>(null)
  const inputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    setViewDate(parseISO(value) || new Date())
  }, [value])

  useEffect(() => {
    function checkSpace() {
      if (inputRef.current) {
        const rect = inputRef.current.getBoundingClientRect()
        const spaceBelow = window.innerHeight - rect.bottom
        const dropdownHeight = 200
        setIsBelow(spaceBelow > dropdownHeight)
      }
    }

    checkSpace()
    window.addEventListener("resize", checkSpace)
    window.addEventListener("scroll", checkSpace)
    return () => {
      window.removeEventListener("resize", checkSpace)
      window.removeEventListener("scroll", checkSpace)
    }
  }, [open])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!ref.current) return
      if (!ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    return () => document.removeEventListener("mousedown", onDoc)
  }, [])

  const startOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1)
  const startWeekday = startOfMonth.getDay()
  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()

  const prevMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))
  const nextMonth = () => setViewDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))

  const pickDate = (day: number) => {
    const newDate = new Date(viewDate.getFullYear(), viewDate.getMonth(), day)
    const iso = formatISO(newDate)
    if (onChange) {
      const ev = { target: { value: iso } } as unknown as React.ChangeEvent<HTMLInputElement>
      onChange(ev)
    }
    setOpen(false)
  }

  const monthLabel = t?.([
    "january",
    "february",
    "march",
    "april",
    "may",
    "june",
    "july",
    "august",
    "september",
    "october",
    "november",
    "december",
  ][viewDate.getMonth()]) || viewDate.toLocaleString(language, { month: "long" })

  const weekDays = [ "mon", "tue", "wed", "thu", "fri", "sat", "sun"].map((k) => t(k))

  const cells: Array<Array<number | null>> = []
  let week: Array<number | null> = []
  for (let i = 0; i < startWeekday; i++) week.push(null)
  for (let d = 1; d <= daysInMonth; d++) {
    week.push(d)
    if (week.length === 7) {
      cells.push(week)
      week = []
    }
  }
  if (week.length) {
    while (week.length < 7) week.push(null)
    cells.push(week)
  }

  const displayValue = value || ""

  // Add year and month dropdowns
  const currentYear = viewDate.getFullYear()
  const years = Array.from({ length: 100 }, (_, i) => currentYear - 50 + i)
  const months = Array.from({ length: 12 }, (_, i) => i)

  const handleYearChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value, 10)
    setViewDate(new Date(newYear, viewDate.getMonth(), 1))
  }

  const handleMonthChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value, 10)
    setViewDate(new Date(viewDate.getFullYear(), newMonth, 1))
  }

  return (
    <div className="relative inline-block" ref={ref}>
      <div className="relative w-full">
        <Input
          ref={inputRef}
          readOnly
          value={displayValue}
          className={`pr-12 ${className}`}
          placeholder={placeholder || "dd/mm/yyyy"}
          aria-label={placeholder || "dd/mm/yyyy"}
          {...(rest as any)}
        />
        <button
          type="button"
          onClick={() => setOpen((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground p-1"
          aria-label={t("toggleCalendar") || "Toggle calendar"}
        >
          <svg
            className="h-4 w-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </button>
      </div>

      {open && (
        <div
          className="absolute z-50 w-52 rounded-md border border-border bg-background p-2 shadow-md"
          style={{
            top: isBelow ? "100%" : "auto",
            bottom: isBelow ? "auto" : "100%",
            marginTop: isBelow ? "0.25rem" : "0",
            marginBottom: isBelow ? "0" : "0.25rem",
          }}
        >
          <div className="flex items-center justify-between mb-2">
            <select
              value={viewDate.getFullYear()}
              onChange={handleYearChange}
              className="rounded p-0.5 text-xs bg-background border border-border hover:bg-muted"
            >
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
            <select
              value={viewDate.getMonth()}
              onChange={handleMonthChange}
              className="rounded p-0.5 text-xs bg-background border border-border hover:bg-muted"
            >
              {months.map((month) => (
                <option key={month} value={month}>
                  {t?.([
                    "january",
                    "february",
                    "march",
                    "april",
                    "may",
                    "june",
                    "july",
                    "august",
                    "september",
                    "october",
                    "november",
                    "december",
                  ][month]) || new Date(0, month).toLocaleString(language, { month: "long" })}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-center text-xs font-medium text-muted-foreground mb-1">
            {weekDays.map((wd, idx) => (
              <div key={idx} className="text-center">
                {wd.charAt(0)}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-0.5 text-xs">
            {cells.flat().map((d, idx) => {
              if (d === null) return <div key={idx} className="h-5" />
              const isSelected = value === formatISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))
              const isToday = formatISO(new Date()) === formatISO(new Date(viewDate.getFullYear(), viewDate.getMonth(), d))
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => pickDate(d)}
                  className={`h-5 w-5 flex items-center justify-center rounded-full transition-colors ${
                    isSelected
                      ? "bg-primary text-primary-foreground"
                      : isToday
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {d}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default DateInput