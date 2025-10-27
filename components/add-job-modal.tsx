"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { X, Smartphone, Wifi, MapPin, Globe, QrCode, Info, LockKeyholeOpen,Laptop } from "lucide-react"
import InterIcon from "../icons/alerts/Entrada.svg"
import ExitIcon from "../icons/alerts/Salida.svg"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import DateInput from "@/components/ui/date-input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { TimePicker } from "@/components/ui/time-picker"
import TimeField, { isValidDuration } from "@/components/ui/time-field"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import ManualDateField from "@/components/ui/manual-date-field"
import { useAuth } from "@/hooks/use-auth"
import {interIcon} from "../icons/alerts/Entrada.svg"
import {exitIcon} from "../icons/alerts/Salida.svg"

interface AddJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobAdded?: (job: any) => void
}

interface TimeSlot {
  start: string
  end: string
  isContinuous?: boolean
}

interface DaySchedule {
  morning: TimeSlot
  afternoon: TimeSlot
  evening: TimeSlot
  total: string
}

interface ScheduleData {
  [key: string]: DaySchedule
}

interface Client {
  id: number
  name: string
  locality: string
  type: string
  responsible: string
  telephones: string
  asset: string
  isSelf?: boolean
}

interface WorkCenter {
  id: number
  name: string
  address: string
  contactName: string
  contactPhone: string
  contactEmail: string
  clientId: number
  createdAt: string
  updatedAt: string
}

interface Worker {
  id: number
  name: string
  occupation: string
  telephones: string
  address: string
  asset: string
}

// Initial form data factory to avoid repetitive object creation
const createInitialSchedule = (): DaySchedule => ({
  morning: { start: "", end: "" },
  afternoon: { start: "", end: "" },
  evening: { start: "", end: "" },
  total: "00:00",
})

const createInitialFormData = () => ({
  denomination: "",
  startDate: "",
  endDate: "",
  clientId: "",
  workCenterIds: [] as string[],
  workerIds: [] as string[],
  observations: "",
  scheduleType: "free" as string,
  currentSeason: "normal" as "normal" | "summer",
  // season-specific periods (e.g., summer)
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
    // Only Web (wifi) selected by default per device. Devices are independent.
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
    tasks: [] as Array<{
    id: string
    task: string
    observations: string
    duration: string
    shifts: { morning: boolean; afternoon: boolean; evening: boolean }
    toBeCarriedOut: string
    periodicity: string
    startDate: string
    endDate: string
    interval: number
    onceDate: string
    weeklyDays: number[]
    monthlyDays: number[]
    monthlyWeekdays: number[]
    monthlyMode: string
  monthlyFirstWeekday: number | null
  monthlyLastWeekday: number | null
    yearlyMonths: number[]
    yearlyDays: number[]
    alertTaskCompleted: boolean
    pendingTaskAlert: boolean
    workCenterIds?: string[]
  }>,
  customerSurvey: {
    questionText: "",
    monitoringValue: [5],
    textAlertTracking: "",
    farewellText: "",
    periodicity: "daily" as const,
    periodicityValue: "1",
    hour: "08:00",
  // Scheduling fields (match task periodicity model)
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
  // Scheduling fields
    interval: 1,
    weeklyDays: [] as number[],
    monthlyDays: [] as number[],
    monthlyWeekdays: [] as number[],
    monthlyMode: "dates" as string,
    monthlyFirstWeekday: null as number | null,
    monthlyLastWeekday: null as number | null,
  },
})

export default function AddJobModal({ open, onOpenChange, onJobAdded }: AddJobModalProps) {
  const [currentMainStep, setCurrentMainStep] = useState(1)
  const [currentSigningStep, setCurrentSigningStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [workCenterTooltipOpen, setWorkCenterTooltipOpen] = useState(false)
  const [workersTooltipOpen, setWorkersTooltipOpen] = useState(false)
  const [seasonTooltipOpen, setSeasonTooltipOpen] = useState(false)
  const [delayTooltipOpen, setDelayTooltipOpen] = useState(false)
  const [durationTooltipOpen, setDurationTooltipOpen] = useState(false)
  const [enableTasks, setEnableTasks] = useState(false)
  const [enableSurveys, setEnableSurveys] = useState(false)
  const [surveyTab, setSurveyTab] = useState("customer")

  const { t } = useTranslation()
  const { session } = useAuth()

  // API Data
  const [clients, setClients] = useState<Client[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [workCenterQuery, setWorkCenterQuery] = useState("")
  const [workerQuery, setWorkerQuery] = useState("")
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingWorkCenters, setLoadingWorkCenters] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(false)

  const [formData, setFormData] = useState(createInitialFormData)
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Temporary input values when user is typing times in schedule cells
  const [tempValues, setTempValues] = useState<Record<string, string>>({})

  useEffect(() => {
    // Clear transient edits when the authoritative formData changes (e.g., reset)
    setTempValues({})
  }, [formData])

  const formatAsYouType = (raw: string) => {
    // Keep only digits
    const digitsOnly = raw.replace(/[^0-9]/g, "")
    if (digitsOnly.length === 0) return ""

    // Extract hour and minute parts from typed digits
    let hourPart = digitsOnly.slice(0, 2)
    let minutePart = digitsOnly.slice(2, 4)

    // Clamp hour to 00-23 when two digits are present
    if (hourPart.length === 2) {
      const h = parseInt(hourPart, 10)
      if (!Number.isNaN(h) && h > 23) {
        hourPart = "23"
      }
    }

    // Clamp minutes to 00-59 when present
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

    // If user typed only hour digits (1-2 digits) show them without colon while typing
    if (digitsOnly.length <= 2) return hourPart

    // Otherwise show HH:MM (limit to 5 chars)
    return `${hourPart}:${minutePart}`.slice(0, 5)
  }

  const isValidTime = (val: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(val)

  const commitValue = (dayKey: string, shiftKey: ShiftKey, timeType: "start" | "end", cellKey: string) => {
    const parentVal = formData.schedules[formData.currentSeason][dayKey]?.[shiftKey]?.[timeType] || ""
    const candidate = (tempValues[cellKey] ?? parentVal).trim()

    if (candidate === "") {
      // Clear parent value
      updateScheduleTime(dayKey, shiftKey, timeType, "")
      setTempValues((p) => {
        const c = { ...p }
        delete c[cellKey]
        return c
      })
      return
    }

    if (isValidTime(candidate)) {
      updateScheduleTime(dayKey, shiftKey, timeType, candidate)
      setTempValues((p) => {
        const c = { ...p }
        delete c[cellKey]
        return c
      })
    } else {
      // invalid: revert to parent's value
      setTempValues((p) => {
        const c = { ...p }
        delete c[cellKey]
        return c
      })
    }
  }

  // Ensure mutual exclusion between Web (wifi) and other signing methods per device.
  // device: 'mobile' | 'laptop' | 'phone'
  const updateSigningMethod = (
    device: 'mobile' | 'laptop' | 'phone',
    method: string,
    checked: boolean,
  ) => {
    setFormData((prev) => {
      const deviceObj = { ...(prev.signingMethods as any)[device] } || {}

      // If toggling wifi (Web)
      if (method === 'wifi') {
        if (checked) {
          // Enable wifi and disable other methods for this device only
          const newDevice: Record<string, boolean> = {}
          Object.keys(deviceObj).forEach((k) => {
            newDevice[k] = k === 'wifi'
          })
          // If device had keys but none named 'wifi', ensure wifi exists
          if (!('wifi' in newDevice)) newDevice['wifi'] = true
          return { ...prev, signingMethods: { ...prev.signingMethods, [device]: newDevice } }
        }

        // just disabling wifi for that device
        return { ...prev, signingMethods: { ...prev.signingMethods, [device]: { ...deviceObj, wifi: false } } }
      }

      // Enabling a non-web method should disable wifi for that device
      if (checked) {
        return {
          ...prev,
          signingMethods: { ...prev.signingMethods, [device]: { ...deviceObj, [method]: true, wifi: false } },
        }
      }

      // disabling a non-web method
      return { ...prev, signingMethods: { ...prev.signingMethods, [device]: { ...deviceObj, [method]: false } } }
    })
  }

  // Memoized constants
  const mainSteps = useMemo(
    () => [
      { number: 1, label: t("signings") || "Signings" },
      { number: 2, label: t("tasks") || "Tasks" },
      { number: 3, label: t("surveys") || "Surveys" },
    ],
    [t],
  )

  const signingSteps = useMemo(
    () => [
      { number: 1, label: t("definition") || "Definition" },
      { number: 2, label: t("schedules") || "Schedules" },
      { number: 3, label: t("signingMethods") || "Signing methods" },
      { number: 4, label: t("alerts") || "Alerts" },
    ],
    [t],
  )

  const daysOfWeek = useMemo(
    () => [
      { key: "monday", label: t("monday") || "Monday" },
      { key: "tuesday", label: t("tuesday") || "Tuesday" },
      { key: "wednesday", label: t("wednesday") || "Wednesday" },
      { key: "thursday", label: t("thursday") || "Thursday" },
      { key: "friday", label: t("friday") || "Friday" },
      { key: "saturday", label: t("saturday") || "Saturday" },
      { key: "sunday", label: t("sunday") || "Sunday" },
    ],
    [t],
  )

  // Memoized API fetchers
  const fetchWithAuth = useCallback(
    async (url: string) => {
      if (!session?.accessToken) return null
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      return response.ok ? response.json() : null
    },
    [session?.accessToken],
  )

  const fetchClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const data = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/for-add-job`)
      let apiClients = data?.data || []
      const userId = session?.user?.id ? Number(session.user.id) : null
      const userName =
        session?.user?.name || `${session?.user?.firstName || ""} ${session?.user?.lastName || ""}`.trim()

      // Normalize and mark any returned client that matches the logged-in user
      apiClients = apiClients.map((c: any) => ({
        ...c,
        id: c.id !== null ? Number(c.id) : c.id, // Preserve null ID for self-entry
        isSelf: userId && (Number(c.id) === userId || (c.isSelf && c.name === userName)), // Check both ID and name/isSelf
      }))

      // If API didn't include the logged-in employer as a client, prepend it
      if (userId && !apiClients.some((c: any) => c.isSelf || (Number(c.id) === userId && c.name === userName))) {
        apiClients = [
          {
            id: userId,
            name: userName || "Yourself",
            locality: "",
            type: "",
            responsible: "",
            telephones: "",
            asset: "yeah",
            isSelf: true,
            isEmployer: true,
          },
          ...apiClients,
        ]
      } else {
        // Ensure the self-entry (if present) is moved to the top
        apiClients.sort((a: any, b: any) => {
          if (a.isSelf === b.isSelf) return 0
          return a.isSelf ? -1 : 1
        })
      }

      setClients(apiClients)
    } catch (error) {
      console.error("Error fetching clients:", error)
      setClients([])
    } finally {
      setLoadingClients(false)
    }
  }, [fetchWithAuth, session])

  const fetchWorkers = useCallback(async () => {
    setLoadingWorkers(true)
    try {
      const data = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker`)
      setWorkers(data?.data || [])
    } catch (error) {
      console.error("Error fetching workers:", error)
      setWorkers([])
    } finally {
      setLoadingWorkers(false)
    }
  }, [fetchWithAuth])

  const fetchWorkCenters = useCallback(async () => {
    // If clientId is empty or invalid, clear list
    if (formData.clientId == null) {
      setWorkCenters([])
      return
    }

    const clientIdNum = Number(formData.clientId)
    if (isNaN(clientIdNum)) {
      // invalid selection (e.g. non-numeric like 'self')
      setWorkCenters([])
      return
    }

    setLoadingWorkCenters(true)
    try {
      const data = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientIdNum}/work-centers`)

      // API may return array directly or { data: [...] }
      const apiCenters = Array.isArray(data) ? data : data?.data || []
      // Normalize ids as numbers; preserve null clientId for employer-owned centers
      const normalized = (apiCenters || []).map((wc: any) => ({
        ...wc,
        id: Number(wc.id),
        clientId: wc.clientId !== null && wc.clientId !== undefined ? Number(wc.clientId) : null,
      }))
      setWorkCenters(normalized)

      // Do not auto-select the first work center. Let the user choose.
    } catch (error) {
      console.error("Error fetching work centers:", error)
      setWorkCenters([])
    } finally {
      setLoadingWorkCenters(false)
    }
  }, [formData.clientId, fetchWithAuth])

  // Time calculation functions
  const timeToMinutes = useCallback((timeStr: string): number => {
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
  }, [])

  const minutesToTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }, [])

  type ShiftKey = "morning" | "afternoon" | "evening"
  const SHIFT_KEYS: ShiftKey[] = ["morning", "afternoon", "evening"]
  const shiftOrder: Record<ShiftKey, number> = { morning: 0, afternoon: 1, evening: 2 }
  const DAY_KEYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const
  type DayKey = (typeof DAY_KEYS)[number]

  interface TimeEvent {
    kind: "start" | "end"
    dayIndex: number
    shift: ShiftKey
    minutes: number
  }

  // Build chronological list of all start/end events across the entire week
  const collectTimeEvents = useCallback(
    (schedules: ScheduleData): TimeEvent[] => {
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
      // Order by dayIndex then minutes
      events.sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes)
      return events
    },
    [timeToMinutes],
  )

  // Distribute minutes for one contiguous block across days
  const addBlockToPerDay = (perDay: number[], startDay: number, startMin: number, endDay: number, endMin: number) => {
    const MIN_PER_DAY = 24 * 60
    // Support endDay possibly > 6 (spanning into next week). Use modulo to map into perDay array.
    if (startDay === endDay) {
      const diff = Math.max(0, endMin - startMin)
      perDay[startDay % 7] += diff
      return
    }
    // Start day: from start to midnight
    perDay[startDay % 7] += Math.max(0, MIN_PER_DAY - startMin)
    // Full in-between days
    for (let d = startDay + 1; d < endDay; d++) {
      perDay[d % 7] += MIN_PER_DAY
    }
    // End day: from midnight to end
    perDay[endDay % 7] += Math.max(0, endMin)
  }

  // Compute per-day totals and weekly total for possibly multiple multi-day blocks
  const computeMultiDayTotals = useCallback(
    (schedules: ScheduleData) => {
      const perDay: number[] = Array(7).fill(0)
      const disabledSlots = new Set<string>()
      const processedShifts = new Set<string>()

      // First pass: Process complete single shifts (both start and end times present)
      DAY_KEYS.forEach((dayKey, dayIndex) => {
        const daySchedule = schedules[dayKey]
        SHIFT_KEYS.forEach((shift) => {
          const shiftData = daySchedule[shift]
          if (shiftData.start && shiftData.end) {
            // Complete single shift - calculate hours and mark as processed
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
      // Only create continuous shifts if there's a clear intent (adjacent time slots with logical continuity)
      const events = collectTimeEvents(schedules)
      const pendingStarts: TimeEvent[] = []

      // Find shifts with only start time (no end time on same day/shift)
      DAY_KEYS.forEach((dayKey) => {
        const daySchedule = schedules[dayKey]
        SHIFT_KEYS.forEach((shift) => {
          const shiftData = daySchedule[shift]
          const shiftKey = `${dayKey}-${shift}`
          
          // Only consider if not already processed as a complete shift
          if (!processedShifts.has(shiftKey)) {
            if (shiftData.start && !shiftData.end) {
              // This is a potential multi-day start
              const dayIndex = DAY_KEYS.indexOf(dayKey)
              pendingStarts.push({
                dayIndex,
                shift,
                minutes: timeToMinutes(shiftData.start),
                kind: "start"
              })
            }
          }
        })
      })

      // Find matching end times for pending starts with stricter logic
      const extendedEvents = events.concat(events.map((e) => ({ ...e, dayIndex: e.dayIndex + 7 })))
      
      pendingStarts.forEach((startEvent) => {
        // Look for the next end event that could match this start - but with stricter criteria
        let matchingEnd = extendedEvents.find((ev) => {
          if (ev.kind !== "end") return false
          
          const endShiftKey = `${DAY_KEYS[ev.dayIndex % 7]}-${ev.shift}`
          if (processedShifts.has(endShiftKey)) return false
          
          const endDaySchedule = schedules[DAY_KEYS[ev.dayIndex % 7]]
          const endShiftData = endDaySchedule[ev.shift]
          
          // Must have end time but no start time (defining end of multi-day shift)
          if (!endShiftData.end || endShiftData.start) return false
          
          // Must come after the start event
          const isAfterStart = ev.dayIndex > startEvent.dayIndex || 
            (ev.dayIndex === startEvent.dayIndex && ev.minutes >= startEvent.minutes)
          
          if (!isAfterStart) return false
          
          // NEW LOGIC: Only create continuous shifts if they are logically connected
          // This means checking if there are no other complete shifts between start and end
          const hasCompleteShiftsBetween = () => {
            // Check if there are any complete shifts between the start and end
            for (let d = startEvent.dayIndex; d <= ev.dayIndex; d++) {
              const dayKey = DAY_KEYS[d % 7]
              const daySchedule = schedules[dayKey]
              
              for (const shift of SHIFT_KEYS) {
                const shiftData = daySchedule[shift]
                const shiftKey = `${dayKey}-${shift}`
                
                // Skip the start and end shifts themselves
                if (d === startEvent.dayIndex && shift === startEvent.shift) continue
                if (d === ev.dayIndex && shift === ev.shift) continue
                
                // If there's a complete shift between start and end, don't create continuous
                if (shiftData.start && shiftData.end && !processedShifts.has(shiftKey)) {
                  return true
                }
              }
            }
            return false
          }
          
          // Only create continuous shift if there are no complete shifts in between
          // AND the gap is reasonable (not more than 2-3 days apart unless explicitly continuous)
          const dayGap = ev.dayIndex - startEvent.dayIndex
          if (dayGap > 3) {
            return false // Don't auto-connect shifts more than 3 days apart
          }
          
          return !hasCompleteShiftsBetween()
        })

        // If strict matching failed, fall back to a relaxed match to avoid missing intended continuous shifts
        if (!matchingEnd) {
          matchingEnd = extendedEvents.find((ev) => {
            if (ev.kind !== "end") return false
            const endShiftKey = `${DAY_KEYS[ev.dayIndex % 7]}-${ev.shift}`
            if (processedShifts.has(endShiftKey)) return false
            const endDaySchedule = schedules[DAY_KEYS[ev.dayIndex % 7]]
            const endShiftData = endDaySchedule[ev.shift]
            if (!endShiftData.end || endShiftData.start) return false
            const isAfterStart = ev.dayIndex > startEvent.dayIndex || 
              (ev.dayIndex === startEvent.dayIndex && ev.minutes >= startEvent.minutes)
            return !!isAfterStart
          })
        }

        if (matchingEnd) {
          // Found a valid multi-day continuous shift
          addBlockToPerDay(perDay, startEvent.dayIndex, startEvent.minutes, matchingEnd.dayIndex, matchingEnd.minutes)
          
          // Mark both shifts as processed
          processedShifts.add(`${DAY_KEYS[startEvent.dayIndex]}-${startEvent.shift}`)
          processedShifts.add(`${DAY_KEYS[matchingEnd.dayIndex % 7]}-${matchingEnd.shift}`)
          
          // Calculate disabled slots for this continuous block
          const startDayKey = DAY_KEYS[startEvent.dayIndex]
          const endDayKey = DAY_KEYS[matchingEnd.dayIndex % 7]
          const startShiftIdx = shiftOrder[startEvent.shift]
          const endShiftIdx = shiftOrder[matchingEnd.shift]
          
          // Disable the connected slots
          disabledSlots.add(`${startDayKey}-${startEvent.shift}-end`)
          disabledSlots.add(`${endDayKey}-${matchingEnd.shift}-start`)
          
          if (startEvent.dayIndex % 7 === matchingEnd.dayIndex % 7) {
            // Same day, disable shifts between start and end
            for (let s = startShiftIdx + 1; s < endShiftIdx; s++) {
              const sh = SHIFT_KEYS[s]
              disabledSlots.add(`${startDayKey}-${sh}-start`)
              disabledSlots.add(`${startDayKey}-${sh}-end`)
            }
          } else {
            // Multi-day: disable after start on start day
            for (let s = startShiftIdx + 1; s < 3; s++) {
              const sh = SHIFT_KEYS[s]
              disabledSlots.add(`${startDayKey}-${sh}-start`)
              disabledSlots.add(`${startDayKey}-${sh}-end`)
            }
            // Disable before end on end day
            for (let s = 0; s < endShiftIdx; s++) {
              const sh = SHIFT_KEYS[s]
              disabledSlots.add(`${endDayKey}-${sh}-start`)
              disabledSlots.add(`${endDayKey}-${sh}-end`)
            }
            // Disable all shifts on middle days
            for (let d = startEvent.dayIndex + 1; d < matchingEnd.dayIndex; d++) {
              const dk = DAY_KEYS[d % 7]
              SHIFT_KEYS.forEach((sh) => {
                disabledSlots.add(`${dk}-${sh}-start`)
                disabledSlots.add(`${dk}-${sh}-end`)
              })
            }
          }
        }
      })

      // Convert to strings
      const totalsByDay: Record<DayKey, string> = {} as any
      DAY_KEYS.forEach((dk, i) => {
        totalsByDay[dk] = minutesToTime(perDay[i])
      })
      const weeklyMinutes = perDay.reduce((acc, m) => acc + m, 0)
      return { totalsByDay, weeklyTotal: minutesToTime(weeklyMinutes), disabledSlots }
    },
    [collectTimeEvents, minutesToTime, timeToMinutes],
  )

  const calculateDayTotal = useCallback(
    (daySchedule: DaySchedule): string => {
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
    },
    [timeToMinutes, minutesToTime],
  )

  // Helper to parse task duration strings like 'HH:MM' into minutes
  const parseDurationToMinutes = useCallback((dur?: string | null) => {
    if (!dur) return 0
    const m = String(dur).trim().match(/^(\d{1,2}):([0-5]\d)$/)
    if (!m) return 0
    const h = Number(m[1])
    const mm = Number(m[2])
    if (Number.isNaN(h) || Number.isNaN(mm)) return 0
    return h * 60 + mm
  }, [])

  const tasksTotalMinutes = useMemo(() => {
    return (formData.tasks || []).reduce((acc, t: any) => acc + parseDurationToMinutes(t.duration), 0)
  }, [formData.tasks, parseDurationToMinutes])

  const tasksTotalDisplay = minutesToTime(tasksTotalMinutes)

  // Form update functions
  const updateFormData = useCallback((field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }, [])

  const updateNestedFormData = useCallback((parent: string, field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [parent]: { ...(prev[parent as keyof typeof prev] as any), [field]: value },
    }))
  }, [])

  const updateScheduleTime = useCallback(
    (day: string, shift: ShiftKey, timeType: "start" | "end", value: string) => {
      setFormData((prev) => {
        const newSchedules = { ...prev.schedules }
        const currentSeasonSchedules = { ...newSchedules[prev.currentSeason] }
        const daySchedule = { ...currentSeasonSchedules[day] }
        const shiftData = { ...daySchedule[shift] } as TimeSlot
        shiftData[timeType] = value
        daySchedule[shift] = shiftData
        currentSeasonSchedules[day] = daySchedule
        newSchedules[prev.currentSeason] = currentSeasonSchedules

        const { totalsByDay, weeklyTotal } = computeMultiDayTotals(currentSeasonSchedules)
        DAY_KEYS.forEach((dk) => {
          currentSeasonSchedules[dk].total = totalsByDay[dk]
        })

        return {
          ...prev,
          schedules: newSchedules,
          totalWeeklyHours: weeklyTotal,
        }
      })
    },
    [computeMultiDayTotals],
  )

  // Clear all schedule entries for the current season (e.g., normal or summer)
  const clearCurrentSeasonSchedules = useCallback(() => {
    setFormData((prev) => {
      const season = prev.currentSeason
      const newSchedules = { ...prev.schedules }
      // reset each day to initial empty schedule
      newSchedules[season] = {
        monday: createInitialSchedule(),
        tuesday: createInitialSchedule(),
        wednesday: createInitialSchedule(),
        thursday: createInitialSchedule(),
        friday: createInitialSchedule(),
        saturday: createInitialSchedule(),
        sunday: createInitialSchedule(),
      }

      // recompute totals
      const { totalsByDay, weeklyTotal } = computeMultiDayTotals(newSchedules[season])
      Object.keys(totalsByDay).forEach((dk) => {
        // @ts-expect-error indexing by dynamic key
        newSchedules[season][dk].total = totalsByDay[dk as DayKey]
      })

      return {
        ...prev,
        schedules: newSchedules,
        totalWeeklyHours: weeklyTotal,
      }
    })

    toast({ title: "Borrado", description: "Horarios borrados" })
  }, [computeMultiDayTotals])

  const toggleWorkerSelection = useCallback((workerId: string) => {
    setFormData((prev) => ({
      ...prev,
      workerIds: prev.workerIds.includes(workerId)
        ? prev.workerIds.filter((id) => id !== workerId)
        : [...prev.workerIds, workerId],
    }))
  }, [])

  const toggleWorkCenterSelection = useCallback((wcId: string) => {
    setFormData((prev) => {
      const exists = prev.workCenterIds.includes(wcId)
      const newWorkCenterIds = exists ? prev.workCenterIds.filter((id) => id !== wcId) : [...prev.workCenterIds, wcId]
      return { ...prev, workCenterIds: newWorkCenterIds }
    })
  }, [])

  const addTaskToList = () => {
    if (!formData.task.trim()) {
      toast({
        title: t("taskRequired"),
        description: t("taskRequiredDescription"),
        variant: "destructive",
      })
      return
    }

  // Validate duration format if provided
    if (formData.duration && !isValidDuration(formData.duration)) {
      toast({
        title: "Invalid duration",
        description: "Please enter a valid duration in hh:mm format",
        variant: "destructive",
      })
      // also mark field-level error
      setErrors((prev) => ({ ...prev, duration: t("invalidTime") || "Invalid time" }))
      return
    }

    // Validate task start/end dates when periodicity uses dates
    if (formData.taskStartDate) {
      const taskStartIso = toISODate(formData.taskStartDate)
      if (!taskStartIso) {
        setErrors((prev) => ({ ...prev, taskStartDate: t("invalidDate") }))
        return
      }
      if (formData.taskEndDate) {
        const taskEndIso = toISODate(formData.taskEndDate)
        if (!taskEndIso) {
          setErrors((prev) => ({ ...prev, taskEndDate: t("invalidDate") }))
          return
        }
        const startObj = new Date(taskStartIso + "T00:00:00")
        const endObj = new Date(taskEndIso + "T00:00:00")
        if (endObj < startObj) {
          setErrors((prev) => ({ ...prev, taskEndDate: t("endDateMustBeEqualOrAfterStart") || "End date must be equal or after Start date" }))
          return
        }
      }
    }

    const newTask = {
      id: Date.now().toString(),
      task: formData.task,
      // Coerce taskWorkCenterId to number so virtual ids (-1/-2) are stored as numbers
      workCenterId: formData.taskWorkCenterId ? (Number(formData.taskWorkCenterId) || null) : null,
      observations: formData.taskObservations,
      duration: formData.duration,
      shifts: { ...formData.shifts },
      toBeCarriedOut: formData.toBeCarriedOut,
      periodicity: formData.periodicity,
      startDate: formData.taskStartDate,
      endDate: formData.taskEndDate,
      interval: formData.interval,
      onceDate: formData.onceDate,
      weeklyDays: formData.weeklyDays,
      monthlyDays: formData.monthlyDays,
      monthlyWeekdays: formData.monthlyWeekdays,
      monthlyMode: formData.monthlyMode,
      monthlyFirstWeekday: formData.monthlyFirstWeekday,
      monthlyLastWeekday: formData.monthlyLastWeekday,
      yearlyMonths: formData.yearlyMonths,
      yearlyDays: formData.yearlyDays,
      alertTaskCompleted: formData.alertTaskCompleted,
      pendingTaskAlert: formData.pendingTaskAlert,
    }

    setFormData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
      task: "",
      taskObservations: "",
      taskWorkCenterId: "",
      duration: "",
      shifts: { morning: false, afternoon: false, evening: false },
      toBeCarriedOut: "during",
      periodicity: "once",
      taskStartDate: "",
      taskEndDate: "",
      interval: 1,
      onceDate: "",
      weeklyDays: [],
      monthlyDays: [],
      monthlyWeekdays: [],
      monthlyMode: "dates",
      monthlyFirstWeekday: null,
      monthlyLastWeekday: null,
      yearlyMonths: [],
      yearlyDays: [],
      alertTaskCompleted: false,
      pendingTaskAlert: false,
    }))

    toast({
      title: "Task Added",
      description: "Task has been added to the list",
    })
  }

  const removeTaskFromList = (taskId: string) => {
    setFormData((prev) => ({
      ...prev,
      tasks: prev.tasks.filter((task) => task.id !== taskId),
    }))
  }

  // Drag & drop reorder for tasks
  const dragItemIndex = useRef<number | null>(null)
  const dragOverItemIndex = useRef<number | null>(null)

  const handleDragStart = (e: React.DragEvent, index: number) => {
    dragItemIndex.current = index
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragEnter = (e: React.DragEvent, index: number) => {
    dragOverItemIndex.current = index
    e.preventDefault()
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const from = dragItemIndex.current
    const to = dragOverItemIndex.current
    if (from == null || to == null || from === to) return

    setFormData((prev) => {
      const newTasks = [...prev.tasks]
      const [moved] = newTasks.splice(from, 1)
      newTasks.splice(to, 0, moved)
      return { ...prev, tasks: newTasks }
    })

    dragItemIndex.current = null
    dragOverItemIndex.current = null
  }

  const handleDragEnd = () => {
    dragItemIndex.current = null
    dragOverItemIndex.current = null
  }

  const getShiftLabels = (shifts: { morning: boolean; afternoon: boolean; evening: boolean }) => {
    const labels = []
    if (shifts.morning) labels.push("Morning")
    if (shifts.afternoon) labels.push("Afternoon")
    if (shifts.evening) labels.push("Evening")
    return labels.join(", ") || "None"
  }

  // Navigation functions
  const handleNext = useCallback(() => {
    // Clear previous errors
    setErrors({})

    // If we're on the Definition main step, validate required fields
    if (currentMainStep === 1) {
      const newErrors: typeof errors = {}
      if (!formData.denomination || !formData.denomination.trim()) {
        newErrors.denomination = t("thisFieldIsRequired")
      }
      if (!formData.startDate) {
        newErrors.startDate = t("thisFieldIsRequired")
      }
      // Client is required (same as startDate)
      if (!formData.clientId && formData.clientId !== 0) {
        newErrors.client = t("thisFieldIsRequired")
      }
      // At least one work center must be selected
      if (!formData.workCenterIds || formData.workCenterIds.length === 0) {
        newErrors.workCenters = t("thisFieldIsRequired")
      }
      if (!formData.workerIds || formData.workerIds.length === 0) {
        newErrors.workers = t("thisFieldIsRequired")
      }

      // If any validation errors, set them and abort advancing
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      // Validate startDate is a valid date and not before today
      const startIso = toISODate(formData.startDate)
      if (!startIso) {
        setErrors({ startDate: t("invalidDate") })
        return
      }
      // Compare dates using local date (no time)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDateObj = new Date(startIso + "T00:00:00")
      if (startDateObj < today) {
        setErrors({ startDate: t("invalidDate") })
        return
      }

      // If an end date was provided, ensure it's valid and not before the start date
      if (formData.endDate) {
        const endIso = toISODate(formData.endDate)
        if (!endIso) {
          setErrors({ endDate: t("invalidDate") })
          return
        }
        const endDateObj = new Date(endIso + "T00:00:00")
        if (isNaN(endDateObj.getTime())) {
          setErrors({ endDate: t("invalidDate") })
          return
        }
        if (endDateObj < startDateObj) {
          setErrors({ endDate: t("endDateMustBeEqualOrAfterStart") || "End date must be equal or after Start date" })
          return
        }
      }

      // Otherwise advance signing sub-steps or main step
      // If we're on the Signing Methods sub-step (3) require at least one method selected
      if (currentSigningStep === 3) {
        const sm = formData.signingMethods || {}
        const anySelected = Object.values(sm).some((device: any) =>
          Object.values(device || {}).some((v: any) => !!v),
        )
        if (!anySelected) {
          setErrors({ signingMethods: t("requiredSigningMethods") })
          return
        }
      }

      if (currentSigningStep < 4) {
        setCurrentSigningStep(currentSigningStep + 1)
      } else {
        setCurrentMainStep(2)
        setCurrentSigningStep(1)
      }
    } else if (currentMainStep === 2) {
      // If user has partially filled the task form (draft), validate its dates before allowing to advance
      const draftPresent = (() => {
        // Consider draft present if there's a task name or any date/periodicity/interval set
        if ((formData.task || "").trim() !== "") return true
        if (formData.taskStartDate) return true
        if (formData.taskEndDate) return true
        if (formData.periodicity && formData.periodicity !== "once") return true
        return false
      })()

      if (draftPresent) {
        // If start provided, ensure it's valid
        if (formData.taskStartDate) {
          const s = toISODate(formData.taskStartDate)
          if (!s) {
            setErrors((prev) => ({ ...prev, taskStartDate: t("invalidDate") }))
            return
          }
          if (formData.taskEndDate) {
            const e = toISODate(formData.taskEndDate)
            if (!e) {
              setErrors((prev) => ({ ...prev, taskEndDate: t("invalidDate") }))
              return
            }
            const startObj = new Date(s + "T00:00:00")
            const endObj = new Date(e + "T00:00:00")
            if (endObj < startObj) {
              setErrors((prev) => ({ ...prev, taskEndDate: t("endDateMustBeEqualOrAfterStart") || "End date must be equal or after Start date" }))
              return
            }
          }
        }
      }

      setCurrentMainStep(3)
    }
  }, [currentMainStep, currentSigningStep, formData, setErrors])

  const handlePrevious = useCallback(() => {
    if (currentMainStep === 1) {
      if (currentSigningStep > 1) {
        setCurrentSigningStep(currentSigningStep - 1)
      }
    } else if (currentMainStep === 2) {
      setCurrentMainStep(1)
      setCurrentSigningStep(4)
    } else if (currentMainStep === 3) {
      setCurrentMainStep(2)
    }
  }, [currentMainStep, currentSigningStep])

  const resetForm = useCallback(() => {
    setCurrentMainStep(1)
    setCurrentSigningStep(1)
    setEnableTasks(false)
    setEnableSurveys(false)
    setSurveyTab("customer")
    setFormData(createInitialFormData())
  }, [])

  // Helper: convert common UI date formats (MM/DD, MM/DD/YYYY or YYYY-MM-DD) to ISO YYYY-MM-DD
  // Placed here so it's initialized before any handlers that use it.
  const toISODate = (input?: string | null): string | null => {
    if (!input) return null
    const s = input.trim()
    // already ISO YYYY-MM-DD
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
    // Try MM/DD or DD/MM with optional year (MM/DD/YYYY or DD/MM/YYYY) or short forms
    const m = s.match(/^(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{2,4}))?$/)
    if (m) {
      const part1 = Number(m[1])
      const part2 = Number(m[2])
      let year = m[3] ? Number(m[3]) : new Date().getFullYear()
      if (year < 100) year += 2000

      // Heuristic: if first part > 12 it's almost certainly a day (DD/MM).
      // Otherwise try MM/DD first, but fall back to DD/MM if the date is invalid.
      let month = part1
      let day = part2

      if (part1 > 12 && part2 <= 31) {
        month = part2
        day = part1
      }

      let d = new Date(Date.UTC(year, month - 1, day))
      if (!(d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day)) {
        // Try the swapped interpretation (DD/MM)
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

  const handleCreate = useCallback(async () => {
    setIsLoading(true)
    try {
      const endDate = formData.endDate || "2126-08-01"

      // toISODate helper is defined earlier; no duplicate definition here.

      // Build seasonalSchedules payload by converting morning/afternoon/evening
      // table entries into contiguous shift blocks that may span multiple days.
      // The resulting shape matches the backend expectation:
      // { season, startDate, endDate, shifts: [{ startWeekday, endWeekday, baseStartTime, baseEndTime, isContinuous, totalHours }] }
      const seasonalSchedules: any[] = []

      if (formData.scheduleType === "programming") {
        ;(["normal", "summer"] as const).forEach((season) => {
          const seasonSchedules = formData.schedules[season]

          // use shared toISODate helper defined above

          // collect chronological start/end events for this season
          const events = collectTimeEvents(seasonSchedules)

          let openStart: { dayIndex: number; minutes: number; shift: ShiftKey } | null = null

          const blocks: Array<{
            startWeekday: string
            endWeekday: string
            baseStartTime: string
            baseEndTime: string
            isContinuous: boolean
            totalHours: number
          }> = []

          for (const ev of events) {
            if (ev.kind === "start") {
              openStart = { dayIndex: ev.dayIndex, minutes: ev.minutes, shift: ev.shift }
            } else if (ev.kind === "end") {
              if (openStart) {
                const startAbs = openStart.dayIndex * 24 * 60 + openStart.minutes
                const endAbs = ev.dayIndex * 24 * 60 + ev.minutes
                if (endAbs > startAbs) {
                  const startWeekday = DAY_KEYS[openStart.dayIndex]
                  const endWeekday = DAY_KEYS[ev.dayIndex]
                  const baseStartTime = minutesToTime(openStart.minutes)
                  const baseEndTime = minutesToTime(ev.minutes)
                  const isContinuous = openStart.dayIndex !== ev.dayIndex || openStart.shift !== ev.shift
                  const totalHours = Math.floor((endAbs - startAbs) / 60)

                  blocks.push({ startWeekday, endWeekday, baseStartTime, baseEndTime, isContinuous, totalHours })
                }
                openStart = null
              }
            }
          }

          // Find optional season period (start/end) provided by the user
          const seasonPeriod = (Array.isArray(formData.seasonPeriods) ? formData.seasonPeriods : []).find(
            (p: any) => p && p.season === season,
          )

          const seasonObj: any = { season, shifts: blocks }
          if (seasonPeriod) {
            const s = toISODate(seasonPeriod.startDate)
            const e = toISODate(seasonPeriod.endDate)
            if (s) seasonObj.startDate = s
            if (e) seasonObj.endDate = e
          }
          seasonalSchedules.push(seasonObj)
        })
      }

      // toISODate helper is defined above

      // Prepare seasonPeriods payload: normalize dates to ISO (YYYY-MM-DD) and only include valid entries
      const seasonPeriodsPayload: any[] = []
      if (Array.isArray(formData.seasonPeriods)) {
        formData.seasonPeriods.forEach((p: any) => {
          if (!p || !p.season) return
          const startIso = toISODate(p.startDate)
          const endIso = toISODate(p.endDate)
          if (startIso && endIso) {
            seasonPeriodsPayload.push({ season: p.season, startDate: startIso, endDate: endIso })
          }
        })
      }

      // Build signing methods
      const signingMethods: any[] = []
      if (formData.signingMethods.mobile) {
        const mobileDetails = Object.entries(formData.signingMethods.mobile)
          .filter(([_, enabled]) => enabled)
          .map(([key]) => (key === "qrCode" ? "qrcode" : key))
        if (mobileDetails.length > 0) {
          signingMethods.push({
            methodType: "mobile",
            methodDetails: mobileDetails,
            verifyIdentity: formData.verifyIdentity,
          })
        }
      }

      // Build alerts
      const alerts: any[] = []
      if (formData.entrance.whenSigningIn || formData.entrance.delay) {
        alerts.push({
          alertType: "sign_in",
          triggerTime: "08:00",
          minDuration: Number.parseInt(formData.entrance.delayValue) || 10,
        })
      }
      if (formData.exit.whenSigningIn || formData.exit.duration) {
        alerts.push({
          alertType: "sign_out",
          triggerTime: "18:00",
          minDuration: Number.parseInt(formData.exit.durationValue) || 30,
        })
      }

      const tasks: any[] = []
      if (enableTasks && formData.tasks.length > 0) {
        formData.tasks.forEach((task) => {
          const selectedShifts = Object.entries(task.shifts)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => (key === "morning" ? "morning" : key === "afternoon" ? "noon" : "evening"))

          const taskPayload: any = {
            name: task.task,
            note: task.observations,
            expectedDuration: Number.parseInt(task.duration) || 1,
            shift: selectedShifts[0] || "morning",
            timing: task.toBeCarriedOut,
            periodicity: task.periodicity,
            alertTask: task.alertTaskCompleted,
            pendingTask: task.pendingTaskAlert,
            ...(typeof task.workCenterId !== 'undefined' && task.workCenterId !== null && task.workCenterId !== '' ? { workCenterId: Number(task.workCenterId) } : {}),
          }

          // Common fields
          if (task.startDate) taskPayload.startDate = task.startDate
          if (task.endDate) taskPayload.endDate = task.endDate
          if (task.interval) taskPayload.interval = Number(task.interval)

          // Specific periodicity fields
          if (task.periodicity === "once" && task.onceDate) {
            taskPayload.onceDate = task.onceDate
          }
          if (task.periodicity === "weekly" && task.weeklyDays.length > 0) {
            taskPayload.weeklyDays = task.weeklyDays
          }
          if (task.periodicity === "monthly") {
            if (task.monthlyMode === "dates" && task.monthlyDays.length > 0) {
              taskPayload.monthlyDays = task.monthlyDays
            }
            if (task.monthlyMode === "weekdays" && task.monthlyWeekdays.length > 0) {
              taskPayload.monthlyWeekdays = task.monthlyWeekdays
            }
            // First/Last weekday modes map to backend monthlyStartWeekday/monthlyEndWeekday
            if (task.monthlyMode === "firstWeekDay" && typeof task.monthlyFirstWeekday !== 'undefined' && task.monthlyFirstWeekday !== null) {
              taskPayload.monthlyStartWeekday = Number(task.monthlyFirstWeekday)
            }
            if (task.monthlyMode === "lastWeekDay" && typeof task.monthlyLastWeekday !== 'undefined' && task.monthlyLastWeekday !== null) {
              taskPayload.monthlyEndWeekday = Number(task.monthlyLastWeekday)
            }
          }
          if (task.periodicity === "yearly") {
            if (task.yearlyMonths.length > 0) {
              taskPayload.yearlyMonths = task.yearlyMonths
            }
            if (task.yearlyDays.length > 0) {
              taskPayload.yearlyDays = task.yearlyDays
            }
          }

          tasks.push(taskPayload)
        })
      }

      // Build surveys for customer and worker (if enabled)
      const parseMonitoringValue = (val: any) => {
        // Slider component sometimes returns an array (for ranges). We store a single threshold number 1..10
        let n = 1
        if (Array.isArray(val)) {
          n = Number(val[0]) || 1
        } else {
          n = Number(val) || 1
        }
        if (Number.isNaN(n)) n = 1
        if (n < 1) n = 1
        if (n > 10) n = 10
        return n
      }

      let customerSurveyPayload: any = null
      let workerSurveyPayload: any = null

      if (enableSurveys) {
        // Customer survey
        const custQuestions: any[] = []
        if (formData.customerSurvey.questionText) {
          custQuestions.push({
            questionText: formData.customerSurvey.questionText,
            questionType: "rating",
            // store options as string for compatibility with previous format
            options: "1,2,3,4,5,6,7,8,9,10",
            isRequired: true,
            order: 1,
          })
        }
        if (formData.customerSurvey.textAlertTracking) {
          custQuestions.push({
            questionText: formData.customerSurvey.textAlertTracking,
            questionType: "text",
            isRequired: false,
            order: 2,
          })
        }

        if (custQuestions.length > 0) {
          customerSurveyPayload = {
            // Single question shown as survey-level question
            questionText: formData.customerSurvey.questionText,
            // Farewell/greeting text
            greetingText: formData.customerSurvey.farewellText || "Please fill after job completion.",
            // Numeric threshold
            rateDigit: parseMonitoringValue(formData.customerSurvey.monitoringValue),
            // If provided, text alert that will be stored as a text-question as well
            textAlertTracking: formData.customerSurvey.textAlertTracking || null,
            periodicity: formData.customerSurvey.periodicity,
            interval: Number(formData.customerSurvey.interval) || 1,
            // time to send
            sendTime: formData.customerSurvey.hour || null,
            // weeklyDays (UI) -> monthlyWeekdays in backend model
            monthlyWeekdays: formData.customerSurvey.weeklyDays?.length ? formData.customerSurvey.weeklyDays : (formData.customerSurvey.monthlyWeekdays || []),
            monthlyDays: formData.customerSurvey.monthlyDays || [],
            monthlyStartWeekday: formData.customerSurvey.monthlyFirstWeekday,
            monthlyEndWeekday: formData.customerSurvey.monthlyLastWeekday,
          }
        }

        // Worker survey
        const workQuestions: any[] = []
        if (formData.workerSurvey.questionText) {
          workQuestions.push({
            questionText: formData.workerSurvey.questionText,
            questionType: "rating",
            options: "1,2,3,4,5,6,7,8,9,10",
            isRequired: true,
            order: 1,
          })
        }
        if (formData.workerSurvey.textAlertTracking) {
          workQuestions.push({
            questionText: formData.workerSurvey.textAlertTracking,
            questionType: "text",
            isRequired: false,
            order: 2,
          })
        }

        if (workQuestions.length > 0) {
          workerSurveyPayload = {
            questionText: formData.workerSurvey.questionText,
            greetingText: formData.workerSurvey.farewellText || "Please fill after job completion.",
            rateDigit: parseMonitoringValue(formData.workerSurvey.monitoringValue),
            textAlertTracking: formData.workerSurvey.textAlertTracking || null,
            periodicity: formData.workerSurvey.periodicity,
            interval: Number(formData.workerSurvey.interval) || 1,
            sendTime: formData.workerSurvey.hour || null,
            monthlyWeekdays: formData.workerSurvey.weeklyDays?.length ? formData.workerSurvey.weeklyDays : (formData.workerSurvey.monthlyWeekdays || []),
            monthlyDays: formData.workerSurvey.monthlyDays || [],
            monthlyStartWeekday: formData.workerSurvey.monthlyFirstWeekday,
            monthlyEndWeekday: formData.workerSurvey.monthlyLastWeekday,
          }
        }
      }

      // No survey start/end date validations: surveys don't use explicit start/end dates anymore.

      const payload = {
        jobName: formData.denomination,
        startDate: formData.startDate,
        endDate,
        clientId: Number.parseInt(formData.clientId),
  workCenterIds: formData.workCenterIds ? formData.workCenterIds.map((id) => Number.parseInt(id)) : [],
        workerIds: formData.workerIds.map((id) => Number.parseInt(id)),
        note: formData.observations,
        scheduleType: formData.scheduleType === "programming" ? "seasonal" : "free",
        seasonalSchedules: formData.scheduleType === "programming" ? seasonalSchedules : [],
        signingMethods,
        alerts,
        tasks,
        ...(seasonPeriodsPayload.length > 0 && { seasonPeriods: seasonPeriodsPayload }),
        ...(customerSurveyPayload && { customerSurvey: customerSurveyPayload }),
        ...(workerSurveyPayload && { workerSurvey: workerSurveyPayload }),
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create job")
      }

      const result = await response.json()

      toast({
        title: t("jobCreatedSuccessfully") || "Job created successfully!",
        variant: "default",
      })

      if (onJobAdded && result.data) {
        const newJob = {
          id: result.data.id,
          name: result.data.jobName || formData.denomination,
          status: "Active",
          client: result.data.client?.name || "",
          startDate: result.data.startDate,
          endDate: result.data.endDate,
          createdAt: new Date().toLocaleDateString(),
        }
        onJobAdded(newJob)
      }

      setTimeout(() => {
        onOpenChange(false)
        resetForm()
      }, 1000)
    } catch (error: any) {
      console.error("Error creating job:", error)
      toast({
        title: error.message || t("errorCreatingJob") || "Error creating job",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }, [formData, enableTasks, enableSurveys, timeToMinutes, session, t, onJobAdded, onOpenChange, resetForm])

  // Effects
  useEffect(() => {
    if (!session?.accessToken) return
    fetchClients()
    fetchWorkers()
  }, [fetchClients, fetchWorkers, session?.accessToken])

  useEffect(() => {
    fetchWorkCenters()
  }, [fetchWorkCenters])

  // No per-task single work center: tasks inherit job-level workCenterIds. No effect required.

  useEffect(() => {
    if (formData.scheduleType === "programming") {
      const currentSeasonSchedules = formData.schedules[formData.currentSeason]
      const { weeklyTotal } = computeMultiDayTotals(currentSeasonSchedules)
      setFormData((prev) => ({ ...prev, totalWeeklyHours: weeklyTotal }))
    } else {
      setFormData((prev) => ({ ...prev, totalWeeklyHours: "00:00" }))
    }
  }, [formData.currentSeason, formData.schedules, formData.scheduleType, computeMultiDayTotals])

  // Render functions for better organization
  const renderProgressSteps = () => (
    <div className="flex items-center justify-center mt-6 mb-4">
      {mainSteps.map((step, index) => (
        <div key={step.number} className="flex items-center">
          <div className="flex flex-col items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                step.number <= currentMainStep ? "text-white" : "bg-muted text-muted-foreground"
              }`}
              style={step.number <= currentMainStep ? { backgroundColor: "#662D91" } : {}}
            >
              {step.number}
            </div>
            <span
              className={`text-xs mt-1 ${step.number === currentMainStep ? "font-medium" : "text-muted-foreground"}`}
              style={step.number === currentMainStep ? { color: "#662D91" } : undefined}
            >
              {step.label}
            </span>
          </div>
          {index < mainSteps.length - 1 && (
            <div
              className={`w-16 h-0.5 mx-2 ${step.number < currentMainStep ? "" : "bg-muted"}`}
              style={step.number < currentMainStep ? { backgroundColor: "#662D91" } : undefined}
            />
          )}
        </div>
      ))}
    </div>
  )

  const renderSigningSubSteps = () =>
    currentMainStep === 1 && (
      <div className="flex items-center justify-center mt-4">
        {signingSteps.map((step, index) => (
          <div key={step.number} className="flex items-center">
            <div
              className={`w-3 h-3 rounded-full ${step.number <= currentSigningStep ? "" : "bg-muted"}`}
              style={step.number <= currentSigningStep ? { backgroundColor: "#662D91" } : undefined}
            />
            {index < signingSteps.length - 1 && (
              <div
                className={`w-8 h-0.5 ${step.number < currentSigningStep ? "" : "bg-muted"}`}
                style={step.number < currentSigningStep ? { backgroundColor: "#662D91" } : undefined}
              />
            )}
          </div>
        ))}
      </div>
    )

  const renderDefinitionStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("definition") || "Definition"}</h3>

      <div>
        <Label htmlFor="denomination" className="text-sm font-medium text-foreground">
          <span>
            {t("denomination") || "Denomination"}
            <span className="text-destructive ml-1">*</span>
          </span>
        </Label>
        <Input
          id="denomination"
          value={formData.denomination}
          onChange={(e) => updateFormData("denomination", e.target.value)}
          className="mt-1"
          placeholder={t("enterJobName") || "Enter job name"}
        />
        {errors.denomination && <div className="text-sm text-destructive mt-1">{errors.denomination}</div>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate" className="text-sm font-medium text-foreground flex items-center gap-1">
              <span>
                {t("startDate") || "Start Date"}
                <span className="text-destructive ml-1">*</span>
              </span>
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center p-0" aria-label={t("startDate") || "Start date info"} tabIndex={-1}>
                      <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                    {t("jobStartDateTip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="relative">
              <DateInput
                id="startDate"
                value={formData.startDate}
                onChange={(e) => updateFormData("startDate", e.target.value)}
                className="mt-1 w-36"
              />

              {errors.startDate && <div className="text-sm text-destructive mt-1">{errors.startDate}</div>}
            </div>
          </div>
        <div>
          <Label htmlFor="endDate" className="text-sm font-medium text-foreground">
            {t("endDate") || "End Date"}
          </Label>
          <div className="relative">
            <DateInput
              id="endDate"
              value={formData.endDate}
              onChange={(e) => updateFormData("endDate", e.target.value)}
              className="mt-1 w-36"
            />
            {errors.endDate && <div className="text-sm text-destructive mt-1">{errors.endDate}</div>}
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="client" className="text-sm font-medium text-foreground flex items-center gap-1">
          <span>
            {t("client") || "Client"}
            <span className="text-destructive ml-1">*</span>
          </span>
        </Label>
        <Select
          value={formData.clientId ? formData.clientId.toString() : ""}
          onValueChange={(value) => {
            updateFormData("clientId", value ? Number(value) : null)
            // clear selected work centers when client changes
            updateFormData("workCenterIds", [])
          }}
          disabled={loadingClients}
        >
          <SelectTrigger className="mt-1 text-foreground">
            <SelectValue placeholder={loadingClients ? t("loadingClients") : t("selectAClient")} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client, index) => (
              <SelectItem
                key={client.id !== null ? client.id : `self-${index}`} // Use index for null IDs to avoid duplicate keys
                value={client.id !== null ? client.id.toString() : "self"} // Use a unique string for null IDs
              >
                {client.name} {client.isSelf ? `(${t("mySelf")})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
    {errors.client && <div className="text-sm text-destructive mt-1">{errors.client}</div>}
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground flex items-center gap-1">
          <span>
            {t("workCenter") || "Work Center"}
            <span className="text-destructive ml-1">*</span>
          </span>
          <TooltipProvider>
            <Tooltip open={workCenterTooltipOpen} onOpenChange={setWorkCenterTooltipOpen} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center p-0"
                  aria-label="Ayuda centro de trabajo"
                  onClick={() => setWorkCenterTooltipOpen((s) => !s)}
                  tabIndex={-1}
                >
                  <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                {t("selectWorkCentersInfo")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        {errors.workCenters && <div className="text-sm text-destructive mt-1">{errors.workCenters}</div>}

        <div className="mt-1 border rounded-md p-3 min-h-[120px] bg-background">
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {formData.workCenterIds.length > 0 && (
              <div className="mb-2">
                {formData.workCenterIds.map((wcId) => {
                  const wc = workCenters.find((w) => String(w.id) === wcId)
                  return wc ? (
                    <div key={wcId} className="text-sm text-foreground">
                      {wc.name}
                    </div>
                  ) : null
                })}
              </div>
            )}

            <div className="border-t pt-2">
              {!formData.clientId ? (
                <div className="text-sm text-muted-foreground">{t("workCenterSelector")}</div>
              ) : loadingWorkCenters ? (
                <div className="text-sm text-muted-foreground">{t("loadingWorkCenters")}</div>
              ) : workCenters && workCenters.length ? (
                <div>
                  <div className="mb-2 ml-3 mr-6">
                    <Input
                      placeholder={t("search") || "Search..."}
                      value={workCenterQuery}
                      onChange={(e) => setWorkCenterQuery(e.target.value)}
                      className="w-full mb-2"
                    />
                    {workCenters
                      .filter((wc) => wc.name.toLowerCase().includes(workCenterQuery.toLowerCase()) || (wc.address || "").toLowerCase().includes(workCenterQuery.toLowerCase()))
                      .map((wc) => (
                        <div key={wc.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`wc-${wc.id}`}
                            checked={formData.workCenterIds.includes(String(wc.id))}
                            onCheckedChange={() => toggleWorkCenterSelection(String(wc.id))}
                          />
                          <Label htmlFor={`wc-${wc.id}`} className="text-sm text-muted-foreground cursor-pointer">
                            {wc.name} {wc.address ? `- ${wc.address}` : ""}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">{t("noWorkCentersAvailable")}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div>
        <Label className="text-sm font-medium text-foreground flex items-center gap-1">
          <span>
            {t("workers") || "Workers"}
            <span className="text-destructive ml-1">*</span>
          </span>
            <TooltipProvider>
              <Tooltip open={workersTooltipOpen} onOpenChange={setWorkersTooltipOpen} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center p-0"
                  aria-label="Ayuda trabajadores"
                  onClick={() => setWorkersTooltipOpen((s) => !s)}
                  tabIndex={-1}
                >
                  <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                {t("selectWorkersInfo")}
              </TooltipContent>
            </Tooltip>
            </TooltipProvider>
        </Label>
        <div className="mt-1 border rounded-md p-3 min-h-[120px] bg-background">
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {formData.workerIds.length > 0 && (
              <div className="mb-2">
                {formData.workerIds.map((workerId) => {
                  const worker = workers.find((w) => w.id.toString() === workerId)
                  return worker ? (
                    <div key={workerId} className="text-sm text-foreground">
                      {worker.name}
                    </div>
                  ) : null
                })}
              </div>
            )}
            <div className="border-t pt-2">
              {loadingWorkers ? (
                <div className="text-sm text-muted-foreground">Loading workers...</div>
              ) : (
                <div>
                  <div className="mb-2 ml-3 mr-6">
                    <Input
                      placeholder={t("search") || "Search..."}
                      value={workerQuery}
                      onChange={(e) => setWorkerQuery(e.target.value)}
                      className="w-full mb-2"
                    />
                    {workers
                      .filter((w) =>
                        w.name.toLowerCase().includes(workerQuery.toLowerCase()) ||
                        (w.occupation || "").toLowerCase().includes(workerQuery.toLowerCase()),
                      )
                      .map((worker) => (
                        <div key={worker.id} className="flex items-center space-x-2 py-1">
                          <Checkbox
                            id={`worker-${worker.id}`}
                            checked={formData.workerIds.includes(worker.id.toString())}
                            onCheckedChange={() => toggleWorkerSelection(worker.id.toString())}
                          />
                          <Label htmlFor={`worker-${worker.id}`} className="text-sm text-muted-foreground cursor-pointer">
                            {worker.name} - {worker.occupation}
                          </Label>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          </div>
          {errors.workers && <div className="text-sm text-destructive mt-1">{errors.workers}</div>}
        </div>
      </div>

      <div>
        <Label htmlFor="observations" className="text-sm font-medium text-foreground">
          {t("observations") || "Observations"}
        </Label>
        <Textarea
          id="observations"
          value={formData.observations}
          onChange={(e) => updateFormData("observations", e.target.value)}
          className="mt-1 min-h-[48px]"
          rows={2}
        />
      </div>
    </div>
  )

  const renderSchedulesStep = () => {
    const currentSeasonSchedules = formData.schedules[formData.currentSeason]
    const { disabledSlots } = computeMultiDayTotals(currentSeasonSchedules)

    return (
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-center mb-4 underline">{t("schedules") || "Schedules"}</h3>

        <div className="flex items-center justify-between gap-4 mb-4 ml-4">
          <div className="flex items-center gap-[1px]">
            <span className="text-sm font-medium">{t("free") || "Free"}</span>
            <Switch
              className="scale-[0.65]"
              checked={(formData.scheduleType as string) === "programming"}
              onCheckedChange={(checked) => updateFormData("scheduleType", checked ? "programming" : "free")}
            />
            <span className="text-sm font-medium">{t("programming") || "Programming"}</span>
          </div>

          {/* center: seasonal switch when programming */}
          {(formData.scheduleType as string) === "programming" && (
            <div className="flex-1 flex items-center justify-between ml-24 h-10">
              <div className="flex items-center gap-[1px]">
                <span className="text-sm font-medium">{t("normal") || "Normal"}</span>
                <Switch
                  className="scale-[0.65]"
                  checked={(formData.currentSeason as string) === "summer"}
                  onCheckedChange={(checked) => updateFormData("currentSeason", checked ? "summer" : "normal")}
                />
                <span className="text-sm font-medium">{t("summer") || "Summer"}</span>
                <TooltipProvider>
                  <Tooltip open={seasonTooltipOpen} onOpenChange={setSeasonTooltipOpen} delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex items-center p-0 ml-1"
                          aria-label="Seasons info"
                          onClick={() => setSeasonTooltipOpen((s) => !s)}
                          tabIndex={-1}
                        >
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                        </button>
                      </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                      {t("seasonsInfo")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
          )}

          {/* right: when summer selected show season range inputs in header */}
          {(formData.scheduleType as string) === "programming" && formData.currentSeason === "summer" && (
            <div className="flex items-center gap-2 mr-4">
              <div className="flex items-center gap-2">
                <ManualDateField
                  label={t("start") || "Start"}
                  value={formData.seasonPeriods.find((p) => p.season === "summer")?.startDate || null}
                  onChange={(v) => {
                    const updated = formData.seasonPeriods.filter((p) => p.season !== "summer")
                    updated.push({ season: "summer", startDate: v || "", endDate: formData.seasonPeriods.find((p) => p.season === "summer")?.endDate || "" })
                    updateFormData("seasonPeriods", updated)
                  }}
                  format={"DD/MM"}
                  placeholder={"DD/MM"}
                />
                <span className="text-sm">{t("to") || "to"}</span>
                <ManualDateField
                  label={t("end") || "End"}
                  value={formData.seasonPeriods.find((p) => p.season === "summer")?.endDate || null}
                  onChange={(v) => {
                    const updated = formData.seasonPeriods.filter((p) => p.season !== "summer")
                    updated.push({ season: "summer", startDate: formData.seasonPeriods.find((p) => p.season === "summer")?.startDate || "", endDate: v || "" })
                    updateFormData("seasonPeriods", updated)
                  }}
                  format={"DD/MM"}
                  placeholder={"DD/MM"}
                  size="sm"
                />
              </div>
            </div>
          )}
        </div>

        {(formData.scheduleType as string) === "programming" && (
          <div className="w-full">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b-[3px] border-[#7547a3]">
                  <th className="border border-border px-2 py-1 text-center font-medium text-sm w-20">
                    {t("day") || "Day"}
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium text-sm w-24">
                    {t("morning") || "Morning"}
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium text-sm w-24">
                    {t("afternoon") || "Afternoon"}
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium text-sm w-24">
                    {t("evening") || "Evening"}
                  </th>
                  <th className="border border-border px-2 py-1 text-center font-medium text-sm w-16">Total</th>
                </tr>
              </thead>
              <tbody>
                {daysOfWeek.map((day) => (
                  <tr key={day.key} className="hover:bg-muted/20">
                    <td className="border border-border px-3 py-2 font-medium text-sm bg-muted/10">{day.label}</td>
                    {SHIFT_KEYS.map((shift) => (
                      <td key={shift} className="border border-border px-2 py-1">
                        <div className="flex items-center justify-center gap-2">
                          <div className="relative">
                            {(() => {
                              const cellKey = `${day.key}-${shift}-start`
                              const parentVal = formData.schedules[formData.currentSeason][day.key]?.[shift]?.start || ""
                              const shown = tempValues[cellKey] ?? (disabledSlots.has(`${day.key}-${shift}-start`) ? "--:--" : parentVal)
                              return (
                                <Input
                                  placeholder="--:--"
                                  inputMode="numeric"
                                  pattern="[0-9:]*"
                                  maxLength={5}
                                  className={`w-[4.5rem] h-6 text-xs text-center pr-7 pl-1 border-gray-300 ${parentVal ? "bg-gray-100" : ""}`}
                                  value={shown}
                                  onChange={(e) => setTempValues((p) => ({ ...p, [cellKey]: formatAsYouType(e.target.value) }))}
                                  onBlur={() => commitValue(day.key, shift, "start", cellKey)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      commitValue(day.key, shift, "start", cellKey)
                                      ;(e.target as HTMLInputElement).blur()
                                    }
                                  }}
                                  readOnly={disabledSlots.has(`${day.key}-${shift}-start`)}
                                />
                              )
                            })()}
                            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                              <TimePicker
                                value={formData.schedules[formData.currentSeason][day.key]?.[shift]?.start}
                                onChange={(time) => updateScheduleTime(day.key, shift, "start", time)}
                                disabled={disabledSlots.has(`${day.key}-${shift}-start`)}
                              />
                            </div>
                          </div>
                          <span className="text-xs text-muted-foreground">-</span>
                          <div className="relative">
                            {(() => {
                              const cellKey = `${day.key}-${shift}-end`
                              const parentVal = formData.schedules[formData.currentSeason][day.key]?.[shift]?.end || ""
                              const shown = tempValues[cellKey] ?? (disabledSlots.has(`${day.key}-${shift}-end`) ? "--:--" : parentVal)
                              return (
                                <Input
                                  placeholder="--:--"
                                  inputMode="numeric"
                                  pattern="[0-9:]*"
                                  maxLength={5}
                                  className={`w-[4.5rem] h-6 text-xs text-center pr-7 pl-1 border-gray-300 ${parentVal ? "bg-gray-100" : ""}`}
                                  value={shown}
                                  onChange={(e) => setTempValues((p) => ({ ...p, [cellKey]: formatAsYouType(e.target.value) }))}
                                  onBlur={() => commitValue(day.key, shift, "end", cellKey)}
                                  onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                      e.preventDefault()
                                      commitValue(day.key, shift, "end", cellKey)
                                      ;(e.target as HTMLInputElement).blur()
                                    }
                                  }}
                                  readOnly={disabledSlots.has(`${day.key}-${shift}-end`)}
                                />
                              )
                            })()}
                            <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                              <TimePicker
                                value={formData.schedules[formData.currentSeason][day.key]?.[shift]?.end}
                                onChange={(time) => updateScheduleTime(day.key, shift, "end", time)}
                                disabled={disabledSlots.has(`${day.key}-${shift}-end`)}
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                    ))}
                    <td
                      className={`border border-border px-2 py-2 text-center font-mono text-xs ${
                        formData.schedules[formData.currentSeason][day.key]?.total && formData.schedules[formData.currentSeason][day.key]?.total !== "00:00"
                          ? "bg-gray-100"
                          : "bg-muted/5"
                      }`}
                    >
                      {formData.schedules[formData.currentSeason][day.key]?.total || "00:00"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="flex justify-end mt-1">
              <div className="bg-gray-100 text-sm px-3 py-1 rounded">{formData.totalWeeklyHours || "00:00"}</div>
            </div>
            {/* 'Borrar' moved to modal footer to align with Previous/Next buttons on schedules step */}
          </div>
        )}
      </div>
    )
  }

  const renderSigningMethodsStep = () => (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("signingMethods") || "Signing methods"}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info tabIndex={-1} className="inline-flex items-center p-0 w-3 h-3 text-muted-foreground cursor-help ml-1" />
                </TooltipTrigger>
                <TooltipContent side="right" align="left" sideOffset={6} className="max-w-[12.6rem] text-left whitespace-pre-line">
                  {t("signingMethodTitleTips")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
      </h3>

      <div className="ml-8">
        {/* Mobile Device */}
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Smartphone className="w-16 h-16 text-foreground" />
            <TooltipProvider>
              <Tooltip>
                  <TooltipTrigger>
                    <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                  {t("signingMethodTipsMobile")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="ml-6 flex gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-web"
                checked={formData.signingMethods.mobile.wifi}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'wifi', !!checked)}
              />
              <div className="flex flex-col items-center">
                <LockKeyholeOpen className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-web" className="text-sm">
                  Web
                </Label>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-ip"
                checked={formData.signingMethods.mobile.ip}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'ip', !!checked)}
              />
              <div className="flex flex-col items-center">
                <Globe className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-ip" className="text-sm">
                  IP
                </Label>
              </div>
            </div>
 
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-gps"
                checked={formData.signingMethods.mobile.gps}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'gps', !!checked)}
              />
              <div className="flex flex-col items-center">
                <MapPin className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-gps" className="text-sm">
                  GPS
                </Label>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-qr"
                checked={formData.signingMethods.mobile.qrCode}
                onCheckedChange={(checked) => updateSigningMethod('mobile', 'qrCode', !!checked)}
              />
              <div className="flex flex-col items-center">
                <QrCode className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-qr" className="text-sm">
                  QR Code
                </Label>
              </div>
            </div>
          </div>
        </div>
        <br />
         {/* Desktop Device */}
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Laptop className="w-16 h-16 text-foreground" />
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>

                  <Info tabIndex={-1} className=" w-3 h-3 text-muted-foreground cursor-help ml-1" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                  {t("signingMethodTipsDesktop")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="ml-6 flex gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="desktop-web"
                checked={formData.signingMethods.laptop?.wifi}
                onCheckedChange={(checked) => updateSigningMethod('laptop', 'wifi', !!checked)}
              />
              <div className="flex flex-col items-center">
                <LockKeyholeOpen className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-web" className="text-sm">
                  Web
                </Label>
              </div>
            </div>
 
            <div className="flex items-center space-x-2">
              <Checkbox
                id="desktop-ip"
                checked={formData.signingMethods.laptop?.ip}
                onCheckedChange={(checked) => updateSigningMethod('laptop', 'ip', !!checked)}
              />
              <div className="flex flex-col items-center">
                <Globe className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-ip" className="text-sm">
                  IP
                </Label>
              </div>
            </div>
          </div>
        </div>
      {/* Show validation error for signing methods if any */}
      {/* {errors.signingMethods && (
        <p className="mt-2 text-sm text-red-500 text-center">{errors.signingMethods}</p>
      )} */}
      </div>

      <div className="mt-12 text-center">
        <div className="flex items-center justify-center">
          <span className="text-sm p-1 font-medium">{t("verifyIdentity") || "Verify Identity"}</span>
                     <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Info tabIndex={-1} className="inline-flex items-center p-0 w-3 h-3 text-muted-foreground cursor-help ml-1" />
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                  {t("signingMethodIdentityTips")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          <div className="flex items-center pl-2">
            <span className=" text-sm">{t("no") || "No"}</span>
            <Switch className=" scale-[0.65]"
              checked={formData.verifyIdentity}
              onCheckedChange={(checked) => updateFormData("verifyIdentity", checked)}
            />
            <span className="text-sm">{t("si") || "Yes"}</span>
          </div>
        </div>
      </div>
     {/* Show validation error for signing methods if any */}
      {errors.signingMethods && (
        <p className="mt-2 text-sm text-red-500 text-center">{errors.signingMethods}</p>
      )}
    </div>
  )

  const renderAlertsStep = () => (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-center mb-8 underline text-foreground">{t("alerts") || "Alerts"}</h3>

      <div className="grid grid-cols-2 gap-12">
        {/* Entrance */}
        <div className="space-y-6">
          <div className="text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-3">
                <InterIcon className="w-12 h-12 text-foreground" />
            </div>
            <h4 className="font-medium px-3 py-1 rounded" style={{ color: "#662D91", backgroundColor: "#f6eef9" }}>
              {t("entrance") || "Entrance"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 ">
              <Checkbox
                id="entrance-signing"
                checked={formData.entrance.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "whenSigningIn", checked)}
              />
              <Label htmlFor="entrance-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "Al fichar"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="entrance-delay"
                className="mt-3"
                checked={formData.entrance.delay}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "delay", checked)}
              />
              <Label htmlFor="entrance-delay" className="text-sm text-foreground flex items-center mt-3">
                {t("delay") || "Retraso"}
                <TooltipProvider>
                  <Tooltip open={delayTooltipOpen} onOpenChange={setDelayTooltipOpen} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center p-0 ml-2" aria-label="Delay tips" onClick={() => setDelayTooltipOpen(s => !s)} tabIndex={-1}>
                        <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={6} className="max-w-xs">
                      {t("delayTips")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>

              {formData.entrance.delay && (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={formData.entrance.delayValue}
                    onChange={(e) => {
                      const raw = e.target.value
                      const n = Number(raw)
                      if (raw === "") return updateNestedFormData("entrance", "delayValue", "")
                      if (Number.isNaN(n)) return
                      const clamped = Math.max(0, Math.min(59, Math.floor(n)))
                      updateNestedFormData("entrance", "delayValue", String(clamped))
                    }}
                    className="ml-2 w-20 h-8 bg-background border-input text-sm"
                    placeholder="10"
                  />
                  <span className="text-sm text-muted-foreground">{t("minutes") || "minutos"}</span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Exit */}
        <div className="space-y-6">
          <div className="text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-3">
              <ExitIcon className="w-12 h-12 text-foreground" />
            </div>
            <h4 className="font-medium px-3 py-1 rounded" style={{ color: "#662D91", backgroundColor: "#f6eef9" }}>
              {t("exit") || "Exit"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3 ">
              <Checkbox
                id="exit-signing"
                checked={formData.exit.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("exit", "whenSigningIn", checked)}
              />
              <Label htmlFor="exit-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "Al fichar"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="exit-duration"
                className="mt-3"
                checked={formData.exit.duration}
                onCheckedChange={(checked) => updateNestedFormData("exit", "duration", checked)}
              />
              <Label htmlFor="exit-duration" className="text-sm text-foreground flex items-center mt-3">
                {t("duration") || "Duración"}
                <TooltipProvider>
                  <Tooltip open={durationTooltipOpen} onOpenChange={setDurationTooltipOpen} delayDuration={0}>
                    <TooltipTrigger asChild>
                      <button type="button" className="inline-flex items-center p-0 ml-1" aria-label="Duration tips" onClick={() => setDurationTooltipOpen(s => !s)} tabIndex={-1}>
                        <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="right" align="center" sideOffset={6} className="max-w-xs">
                      {t("durationTips")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>

              {formData.exit.duration && (
                <>
                  <Input
                    type="number"
                    min={0}
                    max={59}
                    value={formData.exit.durationValue}
                    onChange={(e) => {
                      const raw = e.target.value
                      const n = Number(raw)
                      if (raw === "") return updateNestedFormData("exit", "durationValue", "")
                      if (Number.isNaN(n)) return
                      const clamped = Math.max(0, Math.min(59, Math.floor(n)))
                      updateNestedFormData("exit", "durationValue", String(clamped))
                    }}
                    className="ml-2 w-20 h-8 bg-background border-input text-sm"
                    placeholder="00"
                  />
                  <span className="text-sm text-muted-foreground">{t("minutes") || "minutos"}</span>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Inputs are shown inline inside each column to match design */}
    </div>
  )

  const renderTasksStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">{t("introduceTasksNow") || "Enter tasks now?"}</h3>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">{t("no") || "No"}</span>
          <Switch className="scale-[0.65]" checked={enableTasks} onCheckedChange={setEnableTasks} />
          <span className="text-sm">{t("si") || "Yeah"}</span>
        </div>
      </div>

      {enableTasks && (
        <div className="space-y-6 mt-8">
          {/* Tasks use job-level workCenterIds. Show the selected work centers for context. */}
          <div>
            <Label className="text-sm font-medium text-foreground flex items-center gap-1">
              <span>{t("workCenter") || "Work Center(s)"}</span>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger>
                    <Info tabIndex={-1} className="inline-flex items-center p-0 w-3 h-3 text-muted-foreground cursor-help ml-1" />
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                    {t("taskWorkCenterTips") || "taskWorkCenterTips"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <div className="mt-1">
              {formData.workCenterIds && formData.workCenterIds.length > 0 ? (
                <Select
                  value={formData.taskWorkCenterId ? String(formData.taskWorkCenterId) : ""}
                  onValueChange={(value) => updateFormData("taskWorkCenterId", value)}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("selectWorkCenter") || "Select a work center"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem key="-1" value="-1">
                      {t("itinereEntrada") || "In itinere - In"}
                    </SelectItem>
                    {formData.workCenterIds.map((wcId) => {
                      const wc = workCenters.find((w) => String(w.id) === String(wcId))
                      return wc ? (
                        <SelectItem key={wc.id} value={String(wc.id)}>
                          {wc.name} {wc.address ? ` - ${wc.address}` : ""}
                        </SelectItem>
                      ) : null
                    })}
                    {/* Virtual/inline work centers: In itinere (Entrada) and In itinere (Salida) */}
                 
                    <SelectItem key="-2" value="-2">
                      {t("itinereSalida") || "In itinere - Out"}
                    </SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <div className="p-2 bg-muted/30 border border-border rounded text-sm text-muted-foreground">
                  {t("selectAClientFirst") || "Select a client first"}
                </div>
              )}
            </div>
          </div>
          <div>
            <Label htmlFor="task" className="text-sm font-medium text-foreground">
              {t("task") || "Task"}
            </Label>
            <Input
              id="task"
              value={formData.task}
              onChange={(e) => updateFormData("task", e.target.value)}
              className="mt-1"
              placeholder={t("taskPlaceholder") || "Task description"}
            />
          </div>

          

          <div className="grid gap-8" style={{ gridTemplateColumns: '70% 20%' }}>
            <div>
              <Label htmlFor="taskObservations" className="text-sm font-medium text-foreground flex items-center gap-1">
                {t("observations") || "Observations"}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("taskObservationTips")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Textarea
                id="taskObservations"
                value={formData.taskObservations}
                onChange={(e) => updateFormData("taskObservations", e.target.value)}
                className="mt-1 min-h-[24px]"
                rows={2}
              />
            </div>

            <div>
              <div>
                <Label htmlFor="duration" className="text-sm font-medium text-foreground flex items-center gap-1">
                  {t("duration") || "Duration"}
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent>
                        {t("taskDurationTips")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex items-center gap-2 mt-1">
                  <TimeField
                    id="duration"
                    value={formData.duration}
                    onChange={(v) => updateFormData("duration", v)}
                    placeholder="hh:mm"
                    className="w-24"
                  />
                  {/* <TimePicker value={formData.duration} onChange={(time) => updateFormData("duration", time)} /> */}
                </div>
              </div>

              {/* removed shifts & toBeCarriedOut controls as per UI update - kept Duration only */}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label className="text-sm font-medium text-foreground">{t("periodicity") || "Periodicity"}</Label>
              <div className="flex items-center gap-2 mt-1">
                <Select value={formData.periodicity} onValueChange={(value) => updateFormData("periodicity", value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="once">{t("once") || "Once"}</SelectItem>
                    <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
                    <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
                    <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
                    <SelectItem value="yearly">{t("yearly") || "Yearly"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
                {(formData.periodicity as string) !== "once" && (
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-6 items-end">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("startDate") || "Start Date"}</Label>
                        <DateInput
                          value={formData.taskStartDate}
                          onChange={(e) => updateFormData("taskStartDate", e.target.value)}
                          className=" w-36"
                          placeholder="dd/mm/aaaa"
                        />
                        {errors.taskStartDate && <div className="text-sm text-destructive mt-1">{errors.taskStartDate}</div>}
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">
                          {t("endDate") || "End Date"} ({t("optional") || "optional"})
                        </Label>
                        <DateInput
                          value={formData.taskEndDate}
                          onChange={(e) => updateFormData("taskEndDate", e.target.value)}
                          className=" w-36"
                          placeholder="dd/mm/aaaa"
                        />
                         {errors.taskEndDate && <div className="text-sm text-destructive mt-1">{errors.taskEndDate}</div>}
                      </div>

                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("interval") || "Interval"}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t("every") || "Every"}</span>
                          <Input
                            type="number"
                            value={formData.interval}
                            onChange={(e) => updateFormData("interval", Number(e.target.value))}
                            className="w-16 text-center"
                            min="1"
                          />
                          <span className="text-sm text-muted-foreground">
                            {(formData.periodicity as string) === "daily"
                              ? formData.interval === 1
                                ? t("day") || "day"
                                : t("days") || "days"
                              : (formData.periodicity as string) === "weekly"
                                ? formData.interval === 1
                                  ? t("week") || "week"
                                  : t("weeks") || "weeks"
                                : (formData.periodicity as string) === "monthly"
                                  ? formData.interval === 1
                                    ? t("month") || "month"
                                    : t("months") || "months"
                                  : formData.interval === 1
                                    ? t("year") || "year"
                                    : t("years") || "years"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {(formData.periodicity as string) === "once" && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">{t("date") || "Date"}</Label>
                    <DateInput
                      value={formData.onceDate}
                      onChange={(e) => updateFormData("onceDate", e.target.value)}
                      className="w-36"
                      placeholder="dd/mm/aaaa"
                    />
                  </div>
                )}

                {(formData.periodicity as string) === "weekly" && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t("selectDays")}</Label>
                    <div className="flex gap-2">
                      {[
                        { key: 1, label: t("dayM"), full: t("monday") },
                        { key: 2, label: t("dayT"), full: t("tuesday") },
                        { key: 3, label: t("dayW"), full: t("wednesday") },
                        { key: 4, label: t("dayTh"), full: t("thursday") },
                        { key: 5, label: t("dayF"), full: t("friday") },
                        { key: 6, label: t("daySa"), full: t("saturday") },
                        { key: 0, label: t("daySu"), full: t("sunday") },
                      ].map((day) => (
                        <button
                          key={day.key}
                          type="button"
                          className={`
                            w-8 h-8 flex items-center justify-center text-sm font-medium rounded border transition-all
                            ${
                              formData.weeklyDays?.includes(day.key)
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }
                          `}
                          onClick={() => {
                            const currentDays = formData.weeklyDays || []
                            if (currentDays.includes(day.key)) {
                              updateFormData(
                                "weeklyDays",
                                currentDays.filter((d) => d !== day.key),
                              )
                            } else {
                              updateFormData("weeklyDays", [...currentDays, day.key])
                            }
                          }}
                          title={day.full}
                        >
                          {day.label}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {(formData.periodicity as string) === "monthly" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t("scheduleBy")}</Label>
                      <div className="flex gap-3">
                        <button
                          type="button"
                          className={`
                            flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center
                            ${
                              formData.monthlyMode === "dates"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }
                          `}
                          onClick={() => {
                            updateFormData("monthlyMode", "dates")
                            updateFormData("monthlyWeekdays", []) // Clear weekdays when switching to dates
                          }}
                        >
                          {t("dates")}
                        </button>
                        <button
                          type="button"
                          className={`
                            flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center
                            ${
                              formData.monthlyMode === "weekdays"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }
                          `}
                          onClick={() => {
                            updateFormData("monthlyMode", "weekdays")
                            updateFormData("monthlyDays", []) // Clear dates when switching to weekdays
                          }}
                        >
                          {t("weekdays")}
                        </button>
                        <button
                          type="button"
                          className={`
                            flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center
                            ${
                              formData.monthlyMode === "firstWeekDay"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }
                          `}
                          onClick={() => {
                            updateFormData("monthlyMode", "firstWeekDay")
                            updateFormData("monthlyDays", [])
                            updateFormData("monthlyWeekdays", [])
                            updateFormData("monthlyFirstWeekday", null)
                          }}
                        >
                          {t("firstWeekDay") || "First Weekday"}
                        </button>
                        <button
                          type="button"
                          className={`
                            flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center
                            ${
                              formData.monthlyMode === "lastWeekDay"
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background hover:border-primary hover:bg-muted"
                            }
                          `}
                          onClick={() => {
                            updateFormData("monthlyMode", "lastWeekDay")
                            updateFormData("monthlyDays", [])
                            updateFormData("monthlyWeekdays", [])
                            updateFormData("monthlyLastWeekday", null)
                          }}
                        >
                          {t("lastWeekDay") || "Last Weekday"}
                        </button>
                      </div>
                    </div>

                    {formData.monthlyMode === "dates" && (
                      <div>
                        {/* <Label className="text-sm font-medium mb-2 block">{t("monthlyDates")}</Label> */}
                        <div className="flex flex-wrap gap-2">
                          {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                            <button
                              key={date}
                              type="button"
                              className={`
                                w-8 h-8 flex items-center justify-center text-sm font-medium rounded border-2 transition-all
                                ${
                                  formData.monthlyDays?.includes(date)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary hover:bg-muted"
                                }
                              `}
                              onClick={() => {
                                const currentDates = formData.monthlyDays || []
                                if (currentDates.includes(date)) {
                                  updateFormData(
                                    "monthlyDays",
                                    currentDates.filter((d) => d !== date),
                                  )
                                } else {
                                  updateFormData("monthlyDays", [...currentDates, date])
                                }
                              }}
                            >
                              {date}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {(formData.monthlyMode === "weekdays" || formData.monthlyMode === "firstWeekDay" || formData.monthlyMode === "lastWeekDay") && (
                      <div>
                        {/* <Label className="text-sm font-medium mb-2 block">{t("monthlyWeekdays")}</Label> */}
                        <div className="flex flex-wrap gap-3">
                          {[
                            { key: "monday", label: t("monday"), value: 1 },
                            { key: "tuesday", label: t("tuesday"), value: 2 },
                            { key: "wednesday", label: t("wednesday"), value: 3 },
                            { key: "thursday", label: t("thursday"), value: 4 },
                            { key: "friday", label: t("friday"), value: 5 },
                            { key: "saturday", label: t("saturday"), value: 6 },
                            { key: "sunday", label: t("sunday"), value: 0 },
                          ].map((day) => (
                            <div key={day.key} className="flex items-center space-x-2">
                              {formData.monthlyMode === "weekdays" ? (
                                <>
                                  <Checkbox
                                    id={`monthly-${day.key}`}
                                    checked={formData.monthlyWeekdays?.includes(day.value) || false}
                                    onCheckedChange={(checked) => {
                                      const currentDays = formData.monthlyWeekdays || []
                                      if (checked) {
                                        updateFormData("monthlyWeekdays", [...currentDays, day.value])
                                      } else {
                                        updateFormData(
                                          "monthlyWeekdays",
                                          currentDays.filter((d) => d !== day.value),
                                        )
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`monthly-${day.key}`} className="text-sm cursor-pointer">
                                    {day.label}
                                  </Label>
                                </>
                              ) : (
                                // firstWeekDay or lastWeekDay: single-select radio-like behavior
                                <>
                                  <input
                                    type="radio"
                                    name={formData.monthlyMode}
                                    id={`monthly-${day.key}`}
                                    checked={
                                      formData.monthlyMode === "firstWeekDay"
                                        ? formData.monthlyFirstWeekday === day.value
                                        : formData.monthlyLastWeekday === day.value
                                    }
                                    onChange={() => {
                                      if (formData.monthlyMode === "firstWeekDay") {
                                        updateFormData("monthlyFirstWeekday", day.value)
                                        updateFormData("monthlyLastWeekday", null)
                                      } else {
                                        updateFormData("monthlyLastWeekday", day.value)
                                        updateFormData("monthlyFirstWeekday", null)
                                      }
                                    }}
                                    className="form-radio text-primary"
                                  />
                                  <Label htmlFor={`monthly-${day.key}`} className="text-sm cursor-pointer ml-2">
                                    {day.label}
                                  </Label>
                                </>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {(formData.periodicity as string) === "yearly" && (
                  <div className="space-y-4">
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t("yearlyMonths")}</Label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { key: "january", label: t("jan"), value: 1 },
                          { key: "february", label: t("feb"), value: 2 },
                          { key: "march", label: t("mar"), value: 3 },
                          { key: "april", label: t("apr"), value: 4 },
                          { key: "may", label: t("may"), value: 5 },
                          { key: "june", label: t("jun"), value: 6 },
                          { key: "july", label: t("jul"), value: 7 },
                          { key: "august", label: t("aug"), value: 8 },
                          { key: "september", label: t("sep"), value: 9 },
                          { key: "october", label: t("oct"), value: 10 },
                          { key: "november", label: t("nov"), value: 11 },
                          { key: "december", label: t("dec"), value: 12 },
                        ].map((month) => (
                          <button
                            key={month.key}
                            type="button"
                            className={`
                              px-2 py-1 text-sm font-medium rounded border-2 transition-all
                              ${
                                formData.yearlyMonths?.includes(month.value)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary hover:bg-muted"
                              }
                            `}
                            onClick={() => {
                              const currentMonths = formData.yearlyMonths || []
                              if (currentMonths.includes(month.value)) {
                                updateFormData(
                                  "yearlyMonths",
                                  currentMonths.filter((m) => m !== month.value),
                                )
                              } else {
                                updateFormData("yearlyMonths", [...currentMonths, month.value])
                              }
                            }}
                          >
                            {month.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <Label className="text-sm font-medium mb-2 block">{t("yearlyDates") || "Yearly Dates"}</Label>
                      <div className="flex flex-wrap gap-2">
                        {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                          <button
                            key={date}
                            type="button"
                            className={`
                              w-8 h-8 flex items-center justify-center text-sm font-medium rounded border-2 transition-all
                              ${
                                formData.yearlyDays?.includes(date)
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border bg-background hover:border-primary hover:bg-muted"
                              }
                            `}
                            onClick={() => {
                              const currentDates = formData.yearlyDays || []
                              if (currentDates.includes(date)) {
                                updateFormData(
                                  "yearlyDays",
                                  currentDates.filter((d) => d !== date),
                                )
                              } else {
                                updateFormData("yearlyDays", [...currentDates, date])
                              }
                            }}
                          >
                            {date}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="alertTaskCompleted"
                checked={formData.alertTaskCompleted}
                onCheckedChange={(checked) => updateFormData("alertTaskCompleted", checked)}
              />
              <Label htmlFor="alertTaskCompleted" className="text-sm">
                {t("alertTaskCompleted") || "Alert task completed"}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="pendingTaskAlert"
                checked={formData.pendingTaskAlert}
                onCheckedChange={(checked) => updateFormData("pendingTaskAlert", checked)}
              />
              <Label htmlFor="pendingTaskAlert" className="text-sm">
                {t("pendingTaskAlert") || "Pending task alert"}
              </Label>
            </div>
          </div>

            <div className="flex justify-between items-center pt-4">
            <div className="flex gap-2">
              <Button onClick={addTaskToList} className="text-white px-6" style={{ backgroundColor: "#662D91" }}>
                {t("add") || "Add"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFormData((prev) => ({
                    ...prev,
                    task: "",
                    taskObservations: "",
                    duration: "",
                    shifts: { morning: false, afternoon: false, evening: false },
                    toBeCarriedOut: "during",
                    periodicity: "once",
                    startDate: "",
                    endDate: "",
                    interval: 1,
                    onceDate: "",
                    weeklyDays: [],
                    monthlyDays: [],
                    monthlyWeekdays: [],
                    monthlyMode: "dates",
                    yearlyMonths: [],
                    yearlyDays: [],
                    alertTaskCompleted: false,
                    pendingTaskAlert: false,
                  }))
                }}
                className="px-6"
              >
                {t("cancel") || "Cancel"}
              </Button>
            </div>
            {/* Removed the 'Eliminate' (clear all) button - users can delete individual tasks from the table */}
          </div>

          {formData.tasks.length > 0 && (
            <div className="mt-6">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="text-white" style={{ backgroundColor: "#662D91" }}>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("order") || "Order"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("task") || "Task"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("workCenter") || "Workcenter"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("periodicity") || "Periodicity"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("duration") || "Duration"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("alerts") || "Alerts"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium"> </th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.tasks.map((task, index) => {
                      const isDragOver = dragOverItemIndex.current === index
                      return (
                        <tr
                          key={task.id}
                          className={`border-t hover:bg-gray-50 ${isDragOver ? "bg-muted/20" : ""}`}
                          draggable
                          onDragStart={(e) => handleDragStart(e, index)}
                          onDragEnter={(e) => handleDragEnter(e, index)}
                          onDragOver={handleDragOver}
                          onDrop={handleDrop}
                          onDragEnd={handleDragEnd}
                        >
                          <td className="px-4 py-2 text-sm">{index + 1}</td>
                          <td className="px-4 py-2 text-sm">{task.task}</td>
                          <td className="px-4 py-2 text-sm">
                            {(() => {
                              const wc = workCenters.find((w) => String(w.id) === String((task as any).workCenterId))
                                if (wc) return wc.name
                                // Friendly labels for virtual work centers stored as negative ids
                                if ((task as any).workCenterId === -1 || String((task as any).workCenterId) === "-1") return (t("itinereEntrada") || "In itinere - In")
                                if ((task as any).workCenterId === -2 || String((task as any).workCenterId) === "-2") return (t("itinereSalida") || "In itinere - Out")
                                return (task as any).workCenterId ? String((task as any).workCenterId) : "-"
                            })()}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {task.periodicity === "once"
                              ? task.onceDate
                              : `${t("every") || "Every"} ${task.interval} ${
                                  task.periodicity === "daily"
                                    ? task.interval === 1
                                      ? t("day") || "day"
                                      : t("days") || "days"
                                    : task.periodicity === "weekly"
                                      ? task.interval === 1
                                        ? t("week") || "week"
                                        : t("weeks") || "weeks"
                                      : task.periodicity === "monthly"
                                        ? task.interval === 1
                                          ? t("month") || "month"
                                          : t("months") || "months"
                                        : task.interval === 1
                                          ? t("year") || "year"
                                          : t("years") || "years"
                                }`}
                          </td>
                          <td className="px-4 py-2 text-sm">{task.duration || "--:-- --"}</td>
                          <td className="px-4 py-2 text-sm">
                            <div className="flex items-center gap-2">
                              {task.alertTaskCompleted && (
                                <span title={t("alertTaskCompleted") || "Alert completed"} className="text-green-600">👍</span>
                              )}
                              {task.pendingTaskAlert && (
                                <span title={t("pendingTaskAlert") || "Pending alert"} className="text-yellow-600">👎</span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <button
                              type="button"
                              aria-label={`delete-task-${task.id}`}
                              onClick={() => removeTaskFromList(task.id)}
                              className="text-red-500 hover:text-red-700 px-2 py-1"
                            >
                              ✖
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                  <tfoot className="bg-gray-200">
                    <tr>
                      <td />
                      <td />
                      <td />
                      <td />
                    <td className="px-4 py-2 text-sm font-semibold bg-[#EDE7F6] border-2 border-[#6A1B9A] rounded-lg text-[#4A148C]" >
                        {tasksTotalDisplay}
                      </td>
                      <td />
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )

  const renderSurveysStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">{t("introduceSurveysNow") || "Introduce surveys now?"}</h3>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">{t("no") || "No"}</span>
          <Switch className="scale-[0.65]" checked={enableSurveys} onCheckedChange={setEnableSurveys} />
          <span className="text-sm">{t("si") || "Yeah"}</span>
        </div>
      </div>

      {enableSurveys && (
        <div className="space-y-6 mt-8">
          <Tabs defaultValue="customer" className="w-full">
            <TabsList>
              <TabsTrigger value="customer" onClick={() => setSurveyTab("customer")}>
                {t("customerSurvey") || "Customer Survey"}
              </TabsTrigger>
              <TabsTrigger value="worker" onClick={() => setSurveyTab("worker")}>
                {t("workerSurvey") || "Worker Survey"}
              </TabsTrigger>
            </TabsList>
            <TabsContent value="customer">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="customerQuestionText" className="text-sm font-medium text-foreground">
                    {t("questionText") || "Texto de la pregunta"}
                  </Label>
                  <Input
                    id="customerQuestionText"
                    value={formData.customerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                    placeholder={t("questionTextPlaceHolder") || "Texto de la pregunta"}
                  />
                </div>

                <div>
                  <Label htmlFor="customerMonitoringValue" className="text-sm font-medium text-foreground">
                      {t("monitoringValue") || "Límite de alerta"}
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                          </TooltipTrigger>
                          <TooltipContent>
                            {t("surveyMonitoringValueTips")}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </Label>
                  <Slider
                    defaultValue={formData.customerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("customerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                  {/* Numeric scale below slider (0..10) to match screenshot */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i} className="w-6 text-center">{i}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="customerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Mensaje de alerta"}
                  </Label>
                  <Textarea
                    id="customerTextAlertTracking"
                    value={formData.customerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("customerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("textAlertTrackingPlaceHolder") || "Indícanos en qué debemos mejorar"}
                    rows={1}
                  />
                </div>

                <div>
                  <Label htmlFor="customerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Mensaje de despedida"}
                  </Label>
                  <Textarea
                    id="customerFarewellText"
                    value={formData.customerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "farewellText", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("farewellTextPlaceHolder") || "Gracias por tu colaboración"}
                    rows={1}
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">{t("periodicity") || "Periodicidad"}</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                    </TooltipTrigger>
                    <TooltipContent>
                      {t("surveyPriodicityTips")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                  <Select
                    value={formData.customerSurvey.periodicity}
                    onValueChange={(value) => updateNestedFormData("customerSurvey", "periodicity", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("selectPeriodicity") || "Seleccione periodicidad"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("daily") || "Diaria"}</SelectItem>
                      <SelectItem value="weekly">{t("weekly") || "Semanal"}</SelectItem>
                      <SelectItem value="monthly">{t("monthly") || "Mensual"}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
                    <div className="grid grid-cols-1 gap-6 items-end">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("interval") || "Intervalo"}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t("every") || "Cada"}</span>
                          <Input
                            type="number"
                            value={formData.customerSurvey.interval}
                            onChange={(e) => updateNestedFormData("customerSurvey", "interval", Number(e.target.value))}
                            className="w-16 text-center"
                            min="1"
                          />
                          <span className="text-sm text-muted-foreground">{(formData.customerSurvey.periodicity === "daily" ? (formData.customerSurvey.interval === 1 ? t("day") || "Día" : t("days") || "Días") : formData.customerSurvey.periodicity === "weekly" ? (formData.customerSurvey.interval === 1 ? t("week") || "Semana" : t("weeks") || "Semanas") : (formData.customerSurvey.interval === 1 ? t("month") || "Mes" : t("months") || "Meses"))}</span>
                        </div>
                      </div>
                    </div>

                    {formData.customerSurvey.periodicity === "weekly" && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium mb-2 block">{t("selectDays") || "Seleccionar Días"}</Label>
                        <div className="flex gap-2">
                          {[
                            { key: 1, label: t("dayM"), full: t("monday") },
                            { key: 2, label: t("dayT"), full: t("tuesday") },
                            { key: 3, label: t("dayW"), full: t("wednesday") },
                            { key: 4, label: t("dayTh"), full: t("thursday") },
                            { key: 5, label: t("dayF"), full: t("friday") },
                            { key: 6, label: t("daySa"), full: t("saturday") },
                            { key: 0, label: t("daySu"), full: t("sunday") },
                          ].map((day) => (
                            <button
                              key={day.key}
                              type="button"
                              className={`
                                w-8 h-8 flex items-center justify-center text-sm font-medium rounded border transition-all
                                ${
                                  formData.customerSurvey.weeklyDays?.includes(day.key)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary hover:bg-muted"
                                }
                              `}
                              onClick={() => {
                                const currentDays = formData.customerSurvey.weeklyDays || []
                                if (currentDays.includes(day.key)) {
                                  updateNestedFormData(
                                    "customerSurvey",
                                    "weeklyDays",
                                    currentDays.filter((d) => d !== day.key),
                                  )
                                } else {
                                  updateNestedFormData("customerSurvey", "weeklyDays", [...currentDays, day.key])
                                }
                              }}
                              title={day.full}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.customerSurvey.periodicity === "monthly" && (
                      <div className="mt-4 space-y-4">
                        <Label className="text-sm font-medium mb-2 block">{t("scheduleBy") || "Programar"}</Label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.customerSurvey.monthlyMode === "dates" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "dates")}
                          >
                            {t("dates") || "Días concretos"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.customerSurvey.monthlyMode === "weekdays" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "weekdays")}
                          >
                            {t("weekdays") || "Días de la Semana"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.customerSurvey.monthlyMode === "firstWeekDay" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "firstWeekDay")}
                          >
                            {t("firstWeekDay") || "El primero del mes"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.customerSurvey.monthlyMode === "lastWeekDay" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("customerSurvey", "monthlyMode", "lastWeekDay")}
                          >
                            {t("lastWeekDay") || "El último del mes"}
                          </button>
                        </div>

                        {formData.customerSurvey.monthlyMode === "dates" && (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                              <button
                                key={date}
                                type="button"
                                className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded border-2 transition-all ${formData.customerSurvey.monthlyDays?.includes(date) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                                onClick={() => {
                                  const current = formData.customerSurvey.monthlyDays || []
                                  if (current.includes(date)) {
                                    updateNestedFormData("customerSurvey", "monthlyDays", current.filter((d) => d !== date))
                                  } else {
                                    updateNestedFormData("customerSurvey", "monthlyDays", [...current, date])
                                  }
                                }}
                              >
                                {date}
                              </button>
                            ))}
                          </div>
                        )}

                        {(formData.customerSurvey.monthlyMode === "weekdays" || formData.customerSurvey.monthlyMode === "firstWeekDay" || formData.customerSurvey.monthlyMode === "lastWeekDay") && (
                          <div className="flex flex-wrap gap-3">
                            {[
                              { key: "monday", label: t("monday"), value: 1 },
                              { key: "tuesday", label: t("tuesday"), value: 2 },
                              { key: "wednesday", label: t("wednesday"), value: 3 },
                              { key: "thursday", label: t("thursday"), value: 4 },
                              { key: "friday", label: t("friday"), value: 5 },
                              { key: "saturday", label: t("saturday"), value: 6 },
                              { key: "sunday", label: t("sunday"), value: 0 },
                            ].map((day) => (
                              <div key={day.key} className="flex items-center space-x-2">
                                {formData.customerSurvey.monthlyMode === "weekdays" ? (
                                  <>
                                    <Checkbox
                                      id={`customer-monthly-${day.key}`}
                                      checked={formData.customerSurvey.monthlyWeekdays?.includes(day.value) || false}
                                      onCheckedChange={(checked) => {
                                        const current = formData.customerSurvey.monthlyWeekdays || []
                                        if (checked) {
                                          updateNestedFormData("customerSurvey", "monthlyWeekdays", [...current, day.value])
                                        } else {
                                          updateNestedFormData("customerSurvey", "monthlyWeekdays", current.filter((d) => d !== day.value))
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`customer-monthly-${day.key}`} className="text-sm cursor-pointer">
                                      {day.label}
                                    </Label>
                                  </>
                                ) : (
                                  <>
                                    <input
                                      type="radio"
                                      name={`customer-monthly-${formData.customerSurvey.monthlyMode}`}
                                      id={`customer-monthly-${day.key}-radio`}
                                      checked={formData.customerSurvey.monthlyMode === "firstWeekDay" ? formData.customerSurvey.monthlyFirstWeekday === day.value : formData.customerSurvey.monthlyLastWeekday === day.value}
                                      onChange={() => {
                                        if (formData.customerSurvey.monthlyMode === "firstWeekDay") {
                                          updateNestedFormData("customerSurvey", "monthlyFirstWeekday", day.value)
                                          updateNestedFormData("customerSurvey", "monthlyLastWeekday", null)
                                        } else {
                                          updateNestedFormData("customerSurvey", "monthlyLastWeekday", day.value)
                                          updateNestedFormData("customerSurvey", "monthlyFirstWeekday", null)
                                        }
                                      }}
                                      className="form-radio text-primary"
                                    />
                                    <Label htmlFor={`customer-monthly-${day.key}-radio`} className="text-sm cursor-pointer ml-2">
                                      {day.label}
                                    </Label>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="worker">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="workerQuestionText" className="text-sm font-medium text-foreground">
                    {t("questionText") || "Texto de la pregunta"}
                  </Label>
                  <Input
                    id="workerQuestionText"
                    value={formData.workerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                    placeholder={t("questionTextPlaceHolder") || "Texto de la pregunta"}
                  />
                </div>

                <div>
                  <Label htmlFor="workerMonitoringValue" className="text-sm font-medium text-foreground">
                    {t("monitoringValue") || "Límite de alerta"}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("surveyMonitoringValueTips")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Slider
                    defaultValue={formData.workerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("workerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground mt-2 px-1">
                    {Array.from({ length: 11 }, (_, i) => (
                      <span key={i} className="w-6 text-center">{i}</span>
                    ))}
                  </div>
                </div>

                <div>
                  <Label htmlFor="workerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Mensaje de alerta"}
                  </Label>
                  <Textarea
                    id="workerTextAlertTracking"
                    value={formData.workerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("workerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("textAlertTrackingPlaceHolder") || "Indícanos en qué debemos mejorar"}
                    rows={1}
                  />
                </div>

                <div>
                  <Label htmlFor="workerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Mensaje de despedida"}
                  </Label>
                  <Textarea
                    id="workerFarewellText"
                    value={formData.workerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "farewellText", e.target.value)}
                    className="mt-1 min-h-[48px]"
                    placeholder={t("farewellTextPlaceHolder") || "Gracias por tu colaboración"}
                    rows={1}
                  />
                </div>

                <div>
                  <Label className="text-sm font-medium text-foreground">{t("periodicity") || "Periodicidad"}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help ml-1" />
                        </TooltipTrigger>
                        <TooltipContent>
                          {t("surveyPriodicityTips")}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </Label>
                  <Select
                    value={formData.workerSurvey.periodicity}
                    onValueChange={(value) => updateNestedFormData("workerSurvey", "periodicity", value)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder={t("selectPeriodicity") || "Seleccione periodicidad"} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">{t("daily") || "Diaria"}</SelectItem>
                      <SelectItem value="weekly">{t("weekly") || "Semanal"}</SelectItem>
                      <SelectItem value="monthly">{t("monthly") || "Mensual"}</SelectItem>
                    </SelectContent>
                  </Select>

                  <div className="mt-4 p-4 bg-muted/30 border border-border rounded-lg">
                    <div className="grid grid-cols-1 gap-6 items-end">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("interval") || "Intervalo"}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground">{t("every") || "Cada"}</span>
                          <Input
                            type="number"
                            value={formData.workerSurvey.interval}
                            onChange={(e) => updateNestedFormData("workerSurvey", "interval", Number(e.target.value))}
                            className="w-16 text-center"
                            min="1"
                          />
                          <span className="text-sm text-muted-foreground">{(formData.workerSurvey.periodicity === "daily" ? (formData.workerSurvey.interval === 1 ? t("day") || "Día" : t("days") || "Días") : formData.workerSurvey.periodicity === "weekly" ? (formData.workerSurvey.interval === 1 ? t("week") || "Semana" : t("weeks") || "Semanas") : (formData.workerSurvey.interval === 1 ? t("month") || "Mes" : t("months") || "Meses"))}</span>
                        </div>
                      </div>
                    </div>

                    {formData.workerSurvey.periodicity === "weekly" && (
                      <div className="mt-4">
                        <Label className="text-sm font-medium mb-2 block">{t("selectDays") || "Seleccionar Días"}</Label>
                        <div className="flex gap-2">
                          {[
                            { key: 1, label: t("dayM"), full: t("monday") },
                            { key: 2, label: t("dayT"), full: t("tuesday") },
                            { key: 3, label: t("dayW"), full: t("wednesday") },
                            { key: 4, label: t("dayTh"), full: t("thursday") },
                            { key: 5, label: t("dayF"), full: t("friday") },
                            { key: 6, label: t("daySa"), full: t("saturday") },
                            { key: 0, label: t("daySu"), full: t("sunday") },
                          ].map((day) => (
                            <button
                              key={day.key}
                              type="button"
                              className={`
                                w-8 h-8 flex items-center justify-center text-sm font-medium rounded border transition-all
                                ${
                                  formData.workerSurvey.weeklyDays?.includes(day.key)
                                    ? "border-primary bg-primary text-primary-foreground"
                                    : "border-border bg-background hover:border-primary hover:bg-muted"
                                }
                              `}
                              onClick={() => {
                                const currentDays = formData.workerSurvey.weeklyDays || []
                                if (currentDays.includes(day.key)) {
                                  updateNestedFormData(
                                    "workerSurvey",
                                    "weeklyDays",
                                    currentDays.filter((d) => d !== day.key),
                                  )
                                } else {
                                  updateNestedFormData("workerSurvey", "weeklyDays", [...currentDays, day.key])
                                }
                              }}
                              title={day.full}
                            >
                              {day.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {formData.workerSurvey.periodicity === "monthly" && (
                      <div className="mt-4 space-y-4">
                        <Label className="text-sm font-medium mb-2 block">{t("scheduleBy") || "Programar"}</Label>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.workerSurvey.monthlyMode === "dates" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "dates")}
                          >
                            {t("dates") || "Días concretos"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.workerSurvey.monthlyMode === "weekdays" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "weekdays")}
                          >
                            {t("weekdays") || "Días de la Semana"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.workerSurvey.monthlyMode === "firstWeekDay" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "firstWeekDay")}
                          >
                            {t("firstWeekDay") || "El primero del mes"}
                          </button>
                          <button
                            type="button"
                            className={`flex-1 py-3 px-4 text-sm font-medium rounded border-2 transition-all text-center ${formData.workerSurvey.monthlyMode === "lastWeekDay" ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                            onClick={() => updateNestedFormData("workerSurvey", "monthlyMode", "lastWeekDay")}
                          >
                            {t("lastWeekDay") || "El último del mes"}
                          </button>
                        </div>

                        {formData.workerSurvey.monthlyMode === "dates" && (
                          <div className="flex flex-wrap gap-2">
                            {Array.from({ length: 31 }, (_, i) => i + 1).map((date) => (
                              <button
                                key={date}
                                type="button"
                                className={`w-8 h-8 flex items-center justify-center text-sm font-medium rounded border-2 transition-all ${formData.workerSurvey.monthlyDays?.includes(date) ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background hover:border-primary hover:bg-muted"}`}
                                onClick={() => {
                                  const current = formData.workerSurvey.monthlyDays || []
                                  if (current.includes(date)) {
                                    updateNestedFormData("workerSurvey", "monthlyDays", current.filter((d) => d !== date))
                                  } else {
                                    updateNestedFormData("workerSurvey", "monthlyDays", [...current, date])
                                  }
                                }}
                              >
                                {date}
                              </button>
                            ))}
                          </div>
                        )}

                        {(formData.workerSurvey.monthlyMode === "weekdays" || formData.workerSurvey.monthlyMode === "firstWeekDay" || formData.workerSurvey.monthlyMode === "lastWeekDay") && (
                          <div className="flex flex-wrap gap-3">
                            {[
                              { key: "monday", label: t("monday"), value: 1 },
                              { key: "tuesday", label: t("tuesday"), value: 2 },
                              { key: "wednesday", label: t("wednesday"), value: 3 },
                              { key: "thursday", label: t("thursday"), value: 4 },
                              { key: "friday", label: t("friday"), value: 5 },
                              { key: "saturday", label: t("saturday"), value: 6 },
                              { key: "sunday", label: t("sunday"), value: 0 },
                            ].map((day) => (
                              <div key={day.key} className="flex items-center space-x-2">
                                {formData.workerSurvey.monthlyMode === "weekdays" ? (
                                  <>
                                    <Checkbox
                                      id={`worker-monthly-${day.key}`}
                                      checked={formData.workerSurvey.monthlyWeekdays?.includes(day.value) || false}
                                      onCheckedChange={(checked) => {
                                        const current = formData.workerSurvey.monthlyWeekdays || []
                                        if (checked) {
                                          updateNestedFormData("workerSurvey", "monthlyWeekdays", [...current, day.value])
                                        } else {
                                          updateNestedFormData("workerSurvey", "monthlyWeekdays", current.filter((d) => d !== day.value))
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`worker-monthly-${day.key}`} className="text-sm cursor-pointer">
                                      {day.label}
                                    </Label>
                                  </>
                                ) : (
                                  <>
                                    <input
                                      type="radio"
                                      name={`worker-monthly-${formData.workerSurvey.monthlyMode}`}
                                      id={`worker-monthly-${day.key}-radio`}
                                      checked={formData.workerSurvey.monthlyMode === "firstWeekDay" ? formData.workerSurvey.monthlyFirstWeekday === day.value : formData.workerSurvey.monthlyLastWeekday === day.value}
                                      onChange={() => {
                                        if (formData.workerSurvey.monthlyMode === "firstWeekDay") {
                                          updateNestedFormData("workerSurvey", "monthlyFirstWeekday", day.value)
                                          updateNestedFormData("workerSurvey", "monthlyLastWeekday", null)
                                        } else {
                                          updateNestedFormData("workerSurvey", "monthlyLastWeekday", day.value)
                                          updateNestedFormData("workerSurvey", "monthlyFirstWeekday", null)
                                        }
                                      }}
                                      className="form-radio text-primary"
                                    />
                                    <Label htmlFor={`worker-monthly-${day.key}-radio`} className="text-sm cursor-pointer ml-2">
                                      {day.label}
                                    </Label>
                                  </>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Hour selector shown after the tabs (applies to currently selected survey tab) */}
          <div className="mt-4">
            <Label className="text-sm font-medium text-foreground">{t("surveySendTime") || "Hora envío"}</Label>
            <div className="mt-1">
              <div className="relative inline-block">
                <Input
                  id="surveyHour"
                  value={surveyTab === "customer" ? formData.customerSurvey.hour : formData.workerSurvey.hour}
                  onChange={(e) =>
                    updateNestedFormData(surveyTab === "customer" ? "customerSurvey" : "workerSurvey", "hour", e.target.value)
                  }
                  placeholder="20:00"
                  className="w-24 pr-8" // add right padding for the icon
                />

                <div className="absolute right-1 top-1/2 transform -translate-y-1/2">
                  <TimePicker
                    value={surveyTab === "customer" ? formData.customerSurvey.hour : formData.workerSurvey.hour}
                    onChange={(time) =>
                      updateNestedFormData(surveyTab === "customer" ? "customerSurvey" : "workerSurvey", "hour", time)
                    }
                    className="h-5 w-5"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[50rem] p-0 gap-0 max-h-[90vh] flex flex-col bg-background ml-1 mr-3">
        <DialogHeader className="p-6 pb-6 space-y-4">
          <div className="flex items-center justify-between relative">
            <div className="flex-1" />
            <div className="absolute left-1/2 transform -translate-x-1/2 mb-3">
              <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
                {t("newJob") || "New Job"}
              </DialogTitle>
            </div>
            <div className="flex-1 flex justify-end" />
          </div>

          {renderProgressSteps()}
          {renderSigningSubSteps()}
        </DialogHeader>

        <div className="px-6 pb-8 flex-1 overflow-y-auto">
          {/* Signings Steps */}
          {currentMainStep === 1 && (
            <>
              {currentSigningStep === 1 && renderDefinitionStep()}
              {currentSigningStep === 2 && renderSchedulesStep()}
              {currentSigningStep === 3 && renderSigningMethodsStep()}
              {currentSigningStep === 4 && renderAlertsStep()}
            </>
          )}

          {/* Tasks Step */}
          {currentMainStep === 2 && renderTasksStep()}

          {/* Surveys Step */}
          {currentMainStep === 3 && renderSurveysStep()}
        </div>

  {/* Footer: when Previous is hidden (definition step) keep Next/Create aligned to the right */}
  <div
    className={`flex items-center p-2 px-6 ${currentMainStep === 1 && currentSigningStep === 1 ? "justify-end" : "justify-between"}`}
  >
    {/* Hide the Previous button when rendering the Definition signing step */}
    {!(currentMainStep === 1 && currentSigningStep === 1) && (
      <button variant="secondary" onClick={handlePrevious} className="bg-[#7d7d7d] text-white font-normal p-2 rounded-lg" disabled={currentMainStep === 1 && currentSigningStep === 1}>
        {t("previous") || "Previous"}
      </button>
    )}

    {/* Show destructive 'Borrar' between Previous and Next when on Schedules sub-step and schedule type is programming */}
    {currentMainStep === 1 && currentSigningStep === 2 && (formData.scheduleType as string) === "programming" && (
      <Button
        variant="destructive"
        onClick={clearCurrentSeasonSchedules}
        className="bg-yellow-500 hover:bg-yellow-600 text-white px-6"
      >
        {t("clearSchedules") || "Borrar"}
      </Button>
    )}

    <div className="flex items-center gap-3">
      {currentMainStep === 3 ? (
        <Button onClick={handleCreate} disabled={isLoading}>
          {isLoading ? t("creating") || "Creating..." : t("create") || "Create"}
        </Button>
      ) : (
        <Button onClick={handleNext}>{t("next") || "Next"}</Button>
      )}
    </div>
  </div>
      </DialogContent>
    </Dialog>
  )
}

