import { DaySchedule, ScheduleData, ShiftKey, DayKey, TimeEvent, FormData } from "./types"

// Constants
export const SHIFT_KEYS: ShiftKey[] = ["morning", "afternoon", "evening"]
export const shiftOrder: Record<ShiftKey, number> = { morning: 0, afternoon: 1, evening: 2 }
export const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const

// Initial form data factory
export const createInitialSchedule = (): DaySchedule => ({
  morning: { start: "", end: "" },
  afternoon: { start: "", end: "" },
  evening: { start: "", end: "" },
  total: "00:00",
})

export const createInitialFormData = (): FormData => ({
  denomination: "",
  startDate: "",
  endDate: "",
  clientId: "",
  workCenterIds: [] as string[],
  workerIds: [] as string[],
  observations: "",
  scheduleType: "free" as string,
  currentSeason: "normal" as "normal" | "summer",
  seasonPeriods: [] as Array<{ season: string; startDate: string; endDate: string }>,
  schedules: {
    normal: {
      monday: createInitialSchedule(),
      tuesday: createInitialSchedule(),
      wednesday: createInitialSchedule(),
      thursday: createInitialSchedule(),
      friday: createInitialSchedule(),
      saturday: createInitialSchedule(),
      sunday: createInitialSchedule(),
    },
    summer: {
      monday: createInitialSchedule(),
      tuesday: createInitialSchedule(),
      wednesday: createInitialSchedule(),
      thursday: createInitialSchedule(),
      friday: createInitialSchedule(),
      saturday: createInitialSchedule(),
      sunday: createInitialSchedule(),
    },
  } as { normal: ScheduleData; summer: ScheduleData },
  totalWeeklyHours: "00:00",
  signingMethods: {
    mobile: { qrCode: false, wifi: true, ip: false, gps: false },
    laptop: { wifi: true, ip: false },
    phone: { callerId: false },
  },
  verifyIdentity: false,
  entrance: { whenSigningIn: false, delay: false, delayValue: "10" },
  exit: { whenSigningIn: false, duration: false, durationValue: "00" },
  task: "",
  taskObservations: "",
  duration: "",
  shifts: { morning: false, afternoon: false, evening: false },
  toBeCarriedOut: "during" as const,
  periodicity: "once" as string,
  interval: 1,
  onceDate: "",
  taskStartDate: "",
  taskEndDate: "",
  weeklyDays: [] as number[],
  monthlyDays: [] as number[],
  monthlyWeekdays: [] as number[],
  monthlyMode: "dates" as "dates" | "weekdays" | "firstWeekDay" | "lastWeekDay",
  monthlyFirstWeekday: null as number | null,
  monthlyLastWeekday: null as number | null,
  yearlyMonths: [] as number[],
  yearlyDays: [] as number[],
  alertTaskCompleted: false,
  pendingTaskAlert: false,
  tasks: [] as Array<any>,
  customerSurvey: {
    questionText: "",
    monitoringValue: [5],
    textAlertTracking: "",
    farewellText: "",
    periodicity: "daily" as const,
    periodicityValue: "1",
    hour: "08:00",
    interval: 1,
    weeklyDays: [] as number[],
    monthlyDays: [] as number[],
    monthlyWeekdays: [] as number[],
    monthlyMode: "dates" as string,
    monthlyFirstWeekday: null as number | null,
    monthlyLastWeekday: null as number | null,
  },
  workerSurvey: {
    questionText: "",
    monitoringValue: [5],
    textAlertTracking: "",
    farewellText: "",
    periodicity: "daily" as const,
    periodicityValue: "1",
    hour: "08:00",
    interval: 1,
    weeklyDays: [] as number[],
    monthlyDays: [] as number[],
    monthlyWeekdays: [] as number[],
    monthlyMode: "dates" as string,
    monthlyFirstWeekday: null as number | null,
    monthlyLastWeekday: null as number | null,
  },
})

// Time formatting functions
export const formatAsYouType = (raw: string) => {
  const digitsOnly = raw.replace(/[^0-9]/g, "")
  if (digitsOnly.length === 0) return ""

  let hourPart = digitsOnly.slice(0, 2)
  let minutePart = digitsOnly.slice(2, 4)

  if (hourPart.length === 2) {
    const h = parseInt(hourPart, 10)
    if (!Number.isNaN(h) && h > 23) {
      hourPart = "23"
    }
  }

  if (minutePart.length >= 1) {
    if (minutePart.length === 1) {
      // single digit minute is fine while typing
    } else {
      const m = parseInt(minutePart.slice(0, 2), 10)
      if (!Number.isNaN(m) && m > 59) {
        minutePart = "59"
      }
    }
  }

  if (digitsOnly.length <= 2) return hourPart
  return `${hourPart}:${minutePart}`.slice(0, 5)
}

export const isValidTime = (val: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(val)

// Time calculation functions
export const timeToMinutes = (timeStr: string): number => {
  if (!timeStr) return 0
  if (timeStr.includes(' ')) {
    const [time, period] = timeStr.split(" ")
    const [hours, minutes] = time.split(":").map(Number)
    let h = hours
    if (period.toUpperCase() === "PM" && h < 12) h += 12
    if (period.toUpperCase() === "AM" && h === 12) h = 0
    return h * 60 + (minutes || 0)
  } else {
    const [hours, minutes] = timeStr.split(":").map(Number)
    return (hours || 0) * 60 + (minutes || 0)
  }
}

export const minutesToTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
}

// Helper to parse task duration strings like 'HH:MM' into minutes
export const parseDurationToMinutes = (dur?: string | null) => {
  if (!dur) return 0
  const m = String(dur).trim().match(/^(\d{1,2}):([0-5]\d)$/)
  if (!m) return 0
  const h = Number(m[1])
  const mm = Number(m[2])
  if (Number.isNaN(h) || Number.isNaN(mm)) return 0
  return h * 60 + mm
}

// Build chronological list of all start/end events across the entire week
export const collectTimeEvents = (schedules: ScheduleData): TimeEvent[] => {
  const events: TimeEvent[] = []
  DAY_KEYS.forEach((dayKey, idx) => {
    const ds = schedules[dayKey]
    if (!ds) return
    SHIFT_KEYS.forEach((sk) => {
      const slot = ds[sk]
      if (slot?.start) {
        const m = timeToMinutes(slot.start)
        if (m >= 0) {
          events.push({ kind: "start", dayIndex: idx, shift: sk, minutes: m })
        }
      }
      if (slot?.end) {
        const m = timeToMinutes(slot.end)
        if (m >= 0) {
          events.push({ kind: "end", dayIndex: idx, shift: sk, minutes: m })
        }
      }
    })
  })
  events.sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes)
  return events
}

// Distribute minutes for one contiguous block across days
export const addBlockToPerDay = (perDay: number[], startDay: number, startMin: number, endDay: number, endMin: number) => {
  const MIN_PER_DAY = 24 * 60
  if (startDay === endDay) {
    const diff = Math.max(0, endMin - startMin)
    perDay[startDay % 7] += diff
    return
  }
  perDay[startDay % 7] += Math.max(0, MIN_PER_DAY - startMin)
  for (let d = startDay + 1; d < endDay; d++) {
    perDay[d % 7] += MIN_PER_DAY
  }
  perDay[endDay % 7] += Math.max(0, endMin)
}

// Compute per-day totals and weekly total for possibly multiple multi-day blocks
export const computeMultiDayTotals = (schedules: ScheduleData, priorRegistry?: Map<string, string>) => {
  const DEBUG = false
  const perDay: number[] = Array(7).fill(0)
  const disabledSlots = new Set<string>()
  const processedShifts = new Set<string>()

  const pairingRegistry = new Map<string, string>(priorRegistry ? Array.from(priorRegistry.entries()) : [])

  // First pass: Process complete single shifts
  DAY_KEYS.forEach((dayKey, dayIndex) => {
    const daySchedule = schedules[dayKey]
    SHIFT_KEYS.forEach((shift) => {
      const shiftData = daySchedule[shift]
      if (shiftData.start && shiftData.end) {
        const startMinutes = timeToMinutes(shiftData.start)
        const endMinutes = timeToMinutes(shiftData.end)
        if (endMinutes > startMinutes) {
          perDay[dayIndex] += endMinutes - startMinutes
          processedShifts.add(`${dayKey}-${shift}`)
        }
      }
    })
  })

  // Second pass: Process multi-day continuous shifts
  const events = collectTimeEvents(schedules)
  if (DEBUG) console.debug("computeMultiDayTotals: events:", events)

  const endEvents = events.filter((e) => e.kind === "end")
  const endKeys = endEvents.map((ev) => `${ev.dayIndex}-${ev.shift}-end`)

  const pendingStartsMap = new Map<string, TimeEvent>()
  DAY_KEYS.forEach((dayKey) => {
    const daySchedule = schedules[dayKey]
    SHIFT_KEYS.forEach((shift) => {
      const shiftData = daySchedule[shift]
      const shiftKey = `${dayKey}-${shift}`
      if (!processedShifts.has(shiftKey)) {
        if (shiftData.start && !shiftData.end) {
          const dayIndex = DAY_KEYS.indexOf(dayKey)
          const sKey = `${dayIndex}-${shift}-start`
          pendingStartsMap.set(sKey, { dayIndex, shift, minutes: timeToMinutes(shiftData.start), kind: "start" })
        }
      }
    })
  })

  const assignedEnds = new Set<number>()
  const MAX_GAP = 6

  // Try to preserve prior pairings when still valid
  for (const [sKey, eKey] of Array.from(pairingRegistry.entries())) {
    const start = pendingStartsMap.get(sKey)
    if (!start) {
      pairingRegistry.delete(sKey)
      continue
    }
    const endIdx = endKeys.indexOf(eKey)
    if (endIdx === -1) {
      pairingRegistry.delete(sKey)
      continue
    }
    const ev = endEvents[endIdx]
    const endDaySchedule = schedules[DAY_KEYS[ev.dayIndex % 7]]
    const endShiftData = endDaySchedule[ev.shift]
    if (!endShiftData.end || endShiftData.start) {
      pairingRegistry.delete(sKey)
      continue
    }

    const adjustedDayIndex = ev.dayIndex >= start.dayIndex ? ev.dayIndex : ev.dayIndex + 7
    const dayGap = adjustedDayIndex - start.dayIndex
    if (adjustedDayIndex < start.dayIndex || dayGap > MAX_GAP) {
      pairingRegistry.delete(sKey)
      continue
    }

    let hasCompleteBetween = false
    for (let d = start.dayIndex; d <= adjustedDayIndex; d++) {
      const dayKey = DAY_KEYS[d % 7]
      const daySchedule = schedules[dayKey]
      for (const shift of SHIFT_KEYS) {
        const shiftData = daySchedule[shift]
        const shiftKey = `${dayKey}-${shift}`
        if (d === start.dayIndex && shift === start.shift) continue
        if (d === adjustedDayIndex && shift === ev.shift) continue
        if (shiftData.start && shiftData.end && !processedShifts.has(shiftKey)) {
          hasCompleteBetween = true
          break
        }
      }
      if (hasCompleteBetween) break
    }
    if (hasCompleteBetween) {
      pairingRegistry.delete(sKey)
      continue
    }

    assignedEnds.add(endIdx)
    addBlockToPerDay(perDay, start.dayIndex, start.minutes, adjustedDayIndex, ev.minutes)
    processedShifts.add(`${DAY_KEYS[start.dayIndex]}-${start.shift}`)
    processedShifts.add(`${DAY_KEYS[adjustedDayIndex % 7]}-${ev.shift}`)

    const startDayKey = DAY_KEYS[start.dayIndex]
    const endDayKey = DAY_KEYS[adjustedDayIndex % 7]
    const startShiftIdx = shiftOrder[start.shift]
    const endShiftIdx = shiftOrder[ev.shift]
    disabledSlots.add(`${startDayKey}-${start.shift}-end`)
    disabledSlots.add(`${endDayKey}-${ev.shift}-start`)

    if (start.dayIndex % 7 === adjustedDayIndex % 7) {
      for (let s = startShiftIdx + 1; s < endShiftIdx; s++) {
        const sh = SHIFT_KEYS[s]
        disabledSlots.add(`${startDayKey}-${sh}-start`)
        disabledSlots.add(`${startDayKey}-${sh}-end`)
      }
    } else {
      for (let s = startShiftIdx + 1; s < 3; s++) {
        const sh = SHIFT_KEYS[s]
        disabledSlots.add(`${startDayKey}-${sh}-start`)
        disabledSlots.add(`${startDayKey}-${sh}-end`)
      }
      for (let s = 0; s < endShiftIdx; s++) {
        const sh = SHIFT_KEYS[s]
        disabledSlots.add(`${endDayKey}-${sh}-start`)
        disabledSlots.add(`${endDayKey}-${sh}-end`)
      }
      for (let d = start.dayIndex + 1; d < adjustedDayIndex; d++) {
        const dk = DAY_KEYS[d % 7]
        SHIFT_KEYS.forEach((sh) => {
          disabledSlots.add(`${dk}-${sh}-start`)
          disabledSlots.add(`${dk}-${sh}-end`)
        })
      }
    }

    pendingStartsMap.delete(sKey)
  }

  // Remaining starts: stable nearest-end matching
  const pendingStarts = Array.from(pendingStartsMap.values())
  pendingStarts.sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes)
  if (DEBUG) console.debug("computeMultiDayTotals: pendingStarts:", pendingStarts, "endEvents:", endEvents)

  pendingStarts.forEach((startEvent) => {
    let chosen: { ev: TimeEvent; adjustedDayIndex: number; endIndex: number } | null = null

    for (let i = 0; i < endEvents.length; i++) {
      if (assignedEnds.has(i)) continue
      const ev = endEvents[i]

      const adjustedDayIndex = ev.dayIndex >= startEvent.dayIndex ? ev.dayIndex : ev.dayIndex + 7
      if (adjustedDayIndex < startEvent.dayIndex) continue
      const dayGap = adjustedDayIndex - startEvent.dayIndex
      if (dayGap > MAX_GAP) continue

      const endDaySchedule = schedules[DAY_KEYS[ev.dayIndex % 7]]
      const endShiftData = endDaySchedule[ev.shift]
      if (!endShiftData.end || endShiftData.start) continue

      let hasCompleteBetween = false
      for (let d = startEvent.dayIndex; d <= adjustedDayIndex; d++) {
        const dayKey = DAY_KEYS[d % 7]
        const daySchedule = schedules[dayKey]
        for (const shift of SHIFT_KEYS) {
          const shiftData = daySchedule[shift]
          const shiftKey = `${dayKey}-${shift}`
          if (d === startEvent.dayIndex && shift === startEvent.shift) continue
          if (d === adjustedDayIndex && shift === ev.shift) continue
          if (shiftData.start && shiftData.end && !processedShifts.has(shiftKey)) {
            hasCompleteBetween = true
            break
          }
        }
        if (hasCompleteBetween) break
      }
      if (hasCompleteBetween) continue

      if (DEBUG) console.debug("consider candidate end", { start: startEvent, end: ev, adjustedDayIndex, dayGap })

      if (
        !chosen ||
        adjustedDayIndex < chosen.adjustedDayIndex ||
        (adjustedDayIndex === chosen.adjustedDayIndex && ev.minutes < chosen.ev.minutes)
      ) {
        chosen = { ev, adjustedDayIndex, endIndex: i }
      }
    }

    if (chosen) {
      const { ev, adjustedDayIndex, endIndex } = chosen
      if (DEBUG) console.debug("chosen for start", startEvent, "=>", ev, "adjustedDayIndex", adjustedDayIndex)
      assignedEnds.add(endIndex)
      addBlockToPerDay(perDay, startEvent.dayIndex, startEvent.minutes, adjustedDayIndex, ev.minutes)
      processedShifts.add(`${DAY_KEYS[startEvent.dayIndex]}-${startEvent.shift}`)
      processedShifts.add(`${DAY_KEYS[adjustedDayIndex % 7]}-${ev.shift}`)

      const startDayKey = DAY_KEYS[startEvent.dayIndex]
      const endDayKey = DAY_KEYS[adjustedDayIndex % 7]
      const startShiftIdx = shiftOrder[startEvent.shift]
      const endShiftIdx = shiftOrder[ev.shift]

      disabledSlots.add(`${startDayKey}-${startEvent.shift}-end`)
      disabledSlots.add(`${endDayKey}-${ev.shift}-start`)

      if (startEvent.dayIndex % 7 === adjustedDayIndex % 7) {
        for (let s = startShiftIdx + 1; s < endShiftIdx; s++) {
          const sh = SHIFT_KEYS[s]
          disabledSlots.add(`${startDayKey}-${sh}-start`)
          disabledSlots.add(`${startDayKey}-${sh}-end`)
        }
      } else {
        for (let s = startShiftIdx + 1; s < 3; s++) {
          const sh = SHIFT_KEYS[s]
          disabledSlots.add(`${startDayKey}-${sh}-start`)
          disabledSlots.add(`${startDayKey}-${sh}-end`)
        }
        for (let s = 0; s < endShiftIdx; s++) {
          const sh = SHIFT_KEYS[s]
          disabledSlots.add(`${endDayKey}-${sh}-start`)
          disabledSlots.add(`${endDayKey}-${sh}-end`)
        }
        for (let d = startEvent.dayIndex + 1; d < adjustedDayIndex; d++) {
          const dk = DAY_KEYS[d % 7]
          SHIFT_KEYS.forEach((sh) => {
            disabledSlots.add(`${dk}-${sh}-start`)
            disabledSlots.add(`${dk}-${sh}-end`)
          })
        }
      }

      const startKey = `${startEvent.dayIndex}-${startEvent.shift}-start`
      const endKey = `${ev.dayIndex}-${ev.shift}-end`
      pairingRegistry.set(startKey, endKey)
    }
  })

  // Convert to strings
  const totalsByDay: Record<DayKey, string> = {} as any
  DAY_KEYS.forEach((dk, i) => {
    totalsByDay[dk] = minutesToTime(perDay[i])
  })
  const weeklyMinutes = perDay.reduce((acc, m) => acc + m, 0)
  return { totalsByDay, weeklyTotal: minutesToTime(weeklyMinutes), disabledSlots, pairingRegistry }
}

export const calculateDayTotal = (daySchedule: DaySchedule): string => {
  let totalMinutes = 0
  const shifts = [daySchedule.morning, daySchedule.afternoon, daySchedule.evening]

  shifts.forEach((shift) => {
    if (shift.start && shift.end) {
      const startMinutes = timeToMinutes(shift.start)
      const endMinutes = timeToMinutes(shift.end)
      const diffMinutes = endMinutes - startMinutes
      if (diffMinutes > 0) totalMinutes += diffMinutes
    }
  })

  return minutesToTime(totalMinutes)
}

// Helper: convert common UI date formats to ISO YYYY-MM-DD
export const toISODate = (input?: string | null): string | null => {
  if (!input) return null
  const s = input.trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/)
  if (m) {
    const part1 = Number(m[1])
    const part2 = Number(m[2])
    let year = m[3] ? Number(m[3]) : new Date().getFullYear()
    if (year < 100) year += 2000

    let month = part1
    let day = part2

    if (part1 > 12 && part2 <= 31) {
      month = part2
      day = part1
    }

    let d = new Date(Date.UTC(year, month - 1, day))
    if (!(d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day)) {
      const altMonth = part2
      const altDay = part1
      const dd = new Date(Date.UTC(year, altMonth - 1, altDay))
      if (dd.getUTCFullYear() === year && dd.getUTCMonth() === altMonth - 1 && dd.getUTCDate() === altDay) {
        month = altMonth
        day = altDay
        d = dd
      } else {
        return null
      }
    }

    const mm = String(month).padStart(2, "0")
    const ddStr = String(day).padStart(2, "0")
    return `${year}-${mm}-${ddStr}`
  }
  return null
}
