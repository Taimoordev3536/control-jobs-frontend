"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { isValidDuration } from "@/components/ui/time-field"

// Import all form components
import DefinitionForm from "./DefinitionForm"
import SchedulesForm from "./SchedulesForm"
import SigningMethodsForm from "./SigningMethodsForm"
import AlertsForm from "./AlertsForm"
import TasksForm from "./TasksForm"
import SurveysForm from "./SurveysForm"

// Import types and utilities
import type { AddJobModalProps, Client, WorkCenter, Worker, ShiftKey } from "./types"
import {
  createInitialFormData,
  computeMultiDayTotals,
  toISODate,
  parseDurationToMinutes,
  minutesToTime,
  timeToMinutes,
  DAY_KEYS,
} from "./utils"

export default function AddJobModal({ open, onOpenChange, onJobAdded }: AddJobModalProps) {
  const [currentMainStep, setCurrentMainStep] = useState(1)
  const [currentSigningStep, setCurrentSigningStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [enableTasks, setEnableTasks] = useState(false)
  const [enableSurveys, setEnableSurveys] = useState(false)
  const [workCenterTooltipOpen, setWorkCenterTooltipOpen] = useState(false)
  const [workersTooltipOpen, setWorkersTooltipOpen] = useState(false)
  const [seasonTooltipOpen, setSeasonTooltipOpen] = useState(false)
  const [delayTooltipOpen, setDelayTooltipOpen] = useState(false)
  const [durationTooltipOpen, setDurationTooltipOpen] = useState(false)
  const [workCenterQuery, setWorkCenterQuery] = useState("")
  const [workerQuery, setWorkerQuery] = useState("")

  const { t } = useTranslation()
  const { session } = useAuth()

  // API Data
  const [clients, setClients] = useState<Client[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  const [loadingWorkCenters, setLoadingWorkCenters] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(false)

  const [formData, setFormData] = useState(createInitialFormData)
  const pairingRegistryRef = useRef<Map<string, string>>(new Map())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [tempValues, setTempValues] = useState<Record<string, string>>({})

  // Drag & drop for tasks
  const dragItemIndex = useRef<number | null>(null)
  const dragOverItemIndex = useRef<number | null>(null)

  useEffect(() => {
    setTempValues({})
  }, [formData])

  // Memoized constants
  const mainSteps = useMemo(
    () => [
      { number: 1, label: t("signings") || "Signings" },
      { number: 2, label: t("tasks") || "Tasks" },
      { number: 3, label: t("surveys") || "Surveys" },
    ],
    [t]
  )

  const signingSteps = useMemo(
    () => [
      { number: 1, label: t("definition") || "Definition" },
      { number: 2, label: t("schedules") || "Schedules" },
      { number: 3, label: t("signingMethods") || "Signing methods" },
      { number: 4, label: t("alerts") || "Alerts" },
    ],
    [t]
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
    [t]
  )

  // API fetchers
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
    [session?.accessToken]
  )

  const fetchClients = useCallback(async () => {
    setLoadingClients(true)
    try {
      const data = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/for-add-job`)
      let apiClients = data?.data || []
      const userId = session?.user?.id ? Number(session.user.id) : null
      const userName =
        session?.user?.name || `${session?.user?.firstName || ""} ${session?.user?.lastName || ""}`.trim()

      apiClients = apiClients.map((c: any) => ({
        ...c,
        id: c.id !== null ? Number(c.id) : c.id,
        isSelf: userId && (Number(c.id) === userId || (c.isSelf && c.name === userName)),
      }))

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
    if (formData.clientId == null) {
      setWorkCenters([])
      return
    }

    const clientIdNum = Number(formData.clientId)
    if (isNaN(clientIdNum)) {
      setWorkCenters([])
      return
    }

    setLoadingWorkCenters(true)
    try {
      const data = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientIdNum}/work-centers`)
      const apiCenters = Array.isArray(data) ? data : data?.data || []
      const normalized = (apiCenters || []).map((wc: any) => ({
        ...wc,
        id: Number(wc.id),
        clientId: wc.clientId !== null && wc.clientId !== undefined ? Number(wc.clientId) : null,
      }))
      setWorkCenters(normalized)
    } catch (error) {
      console.error("Error fetching work centers:", error)
      setWorkCenters([])
    } finally {
      setLoadingWorkCenters(false)
    }
  }, [formData.clientId, fetchWithAuth])

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
        const shiftData = { ...daySchedule[shift] }
        shiftData[timeType] = value
        daySchedule[shift] = shiftData
        currentSeasonSchedules[day] = daySchedule
        newSchedules[prev.currentSeason] = currentSeasonSchedules

        const { totalsByDay, weeklyTotal, pairingRegistry } = computeMultiDayTotals(
          currentSeasonSchedules,
          pairingRegistryRef.current
        )
        pairingRegistryRef.current = pairingRegistry
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
    []
  )

  const clearCurrentSeasonSchedules = useCallback(() => {
    setFormData((prev) => {
      const season = prev.currentSeason
      const newSchedules = { ...prev.schedules }
      newSchedules[season] = {
        monday: { morning: { start: "", end: "" }, afternoon: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        tuesday: { morning: { start: "", end: "" }, afternoon: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        wednesday: { morning: { start: "", end: "" }, afternoon: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        thursday: { morning: { start: "", end: "" }, afternoon: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        friday: { morning: { start: "", end: "" }, afternoon: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        saturday: { morning: { start: "", end: "" }, afternoon: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        sunday: { morning: { start: "", end: "" }, afternoon: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
      }

      const { totalsByDay, weeklyTotal, pairingRegistry } = computeMultiDayTotals(
        newSchedules[season],
        pairingRegistryRef.current
      )
      pairingRegistryRef.current = pairingRegistry
      Object.keys(totalsByDay).forEach((dk) => {
        newSchedules[season][dk as keyof typeof newSchedules.normal].total = totalsByDay[dk as keyof typeof totalsByDay]
      })

      return {
        ...prev,
        schedules: newSchedules,
        totalWeeklyHours: weeklyTotal,
      }
    })

    toast({ title: "Borrado", description: "Horarios borrados" })
  }, [])

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

  const updateSigningMethod = useCallback(
    (device: 'mobile' | 'laptop' | 'phone', method: string, checked: boolean) => {
      setFormData((prev) => {
        const deviceObj = { ...(prev.signingMethods as any)[device] }

        if (method === 'wifi') {
          if (checked) {
            const newDevice: Record<string, boolean> = {}
            Object.keys(deviceObj).forEach((k) => {
              newDevice[k] = k === 'wifi'
            })
            if (!('wifi' in newDevice)) newDevice['wifi'] = true
            return { ...prev, signingMethods: { ...prev.signingMethods, [device]: newDevice } }
          }
          return { ...prev, signingMethods: { ...prev.signingMethods, [device]: { ...deviceObj, wifi: false } } }
        }

        if (checked) {
          return {
            ...prev,
            signingMethods: { ...prev.signingMethods, [device]: { ...deviceObj, [method]: true, wifi: false } },
          }
        }

        return { ...prev, signingMethods: { ...prev.signingMethods, [device]: { ...deviceObj, [method]: false } } }
      })
    },
    []
  )

  const addTaskToList = () => {
    if (!formData.task.trim()) {
      toast({
        title: t("taskRequired"),
        description: t("taskRequiredDescription"),
        variant: "destructive",
      })
      return
    }

    if (formData.duration && !isValidDuration(formData.duration)) {
      toast({
        title: "Invalid duration",
        description: "Please enter a valid duration in hh:mm format",
        variant: "destructive",
      })
      setErrors((prev) => ({ ...prev, duration: t("invalidTime") || "Invalid time" }))
      return
    }

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
          setErrors((prev) => ({
            ...prev,
            taskEndDate: t("endDateMustBeEqualOrAfterStart") || "End date must be equal or after Start date",
          }))
          return
        }
      }
    }

    const newTask = {
      id: Date.now().toString(),
      task: formData.task,
      workCenterId: formData.taskWorkCenterId ? Number(formData.taskWorkCenterId) || null : null,
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

  // Navigation functions
  const handleNext = useCallback(() => {
    setErrors({})

    if (currentMainStep === 1) {
      const newErrors: typeof errors = {}
      if (!formData.denomination || !formData.denomination.trim()) {
        newErrors.denomination = t("thisFieldIsRequired")
      }
      if (!formData.startDate) {
        newErrors.startDate = t("thisFieldIsRequired")
      }
      if (!formData.clientId) {
        newErrors.client = t("thisFieldIsRequired")
      }
      if (!formData.workCenterIds || formData.workCenterIds.length === 0) {
        newErrors.workCenters = t("thisFieldIsRequired")
      }
      if (!formData.workerIds || formData.workerIds.length === 0) {
        newErrors.workers = t("thisFieldIsRequired")
      }

      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      const startIso = toISODate(formData.startDate)
      if (!startIso) {
        setErrors({ startDate: t("invalidDate") })
        return
      }
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const startDateObj = new Date(startIso + "T00:00:00")
      if (startDateObj < today) {
        setErrors({ startDate: t("invalidDate") })
        return
      }

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

      if (currentSigningStep === 3) {
        const sm = formData.signingMethods || {}
        const anySelected = Object.values(sm).some((device: any) => Object.values(device || {}).some((v: any) => !!v))
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
      const draftPresent =
        (formData.task || "").trim() !== "" ||
        formData.taskStartDate ||
        formData.taskEndDate ||
        (formData.periodicity && formData.periodicity !== "once")

      if (draftPresent) {
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
              setErrors((prev) => ({
                ...prev,
                taskEndDate: t("endDateMustBeEqualOrAfterStart") || "End date must be equal or after Start date",
              }))
              return
            }
          }
        }
      }

      setCurrentMainStep(3)
    }
  }, [currentMainStep, currentSigningStep, formData, t])

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
    setFormData(createInitialFormData())
  }, [])

  const handleCreate = useCallback(async () => {
    setIsLoading(true)
    try {
      const endDate = formData.endDate || "2126-08-01"

      const seasonalSchedules: any[] = []

      if (formData.scheduleType === "programming") {
        const buildShiftBlocks = (schedules: any) => {
          type Block = {
            startWeekday: string
            endWeekday: string
            baseStartTime: string
            baseEndTime: string
            isContinuous: boolean
            totalHours: number
          }

          const collectTimeEvents = (schedules: any) => {
            const events: any[] = []
            DAY_KEYS.forEach((dayKey, idx) => {
              const ds = schedules[dayKey]
              if (!ds) return
              ;["morning", "afternoon", "evening"].forEach((sk) => {
                const slot = ds[sk as ShiftKey]
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

          const events = collectTimeEvents(schedules)
          const starts = events.filter((e) => e.kind === "start")
          const ends = events.filter((e) => e.kind === "end")

          starts.sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes)
          ends.sort((a, b) => a.dayIndex - b.dayIndex || a.minutes - b.minutes)

          const assignedEnds = new Set<number>()
          const blocks: Block[] = []

          for (const sEv of starts) {
            let chosen: { end: (typeof ends)[number]; endIndex: number; adjustedDayIndex: number } | null = null
            for (let i = 0; i < ends.length; i++) {
              if (assignedEnds.has(i)) continue
              const eEv = ends[i]

              let adjustedDayIndex = eEv.dayIndex >= sEv.dayIndex ? eEv.dayIndex : eEv.dayIndex + 7
              if (adjustedDayIndex === sEv.dayIndex && eEv.minutes <= sEv.minutes) continue
              const dayGap = adjustedDayIndex - sEv.dayIndex
              if (dayGap < 0 || dayGap > 6) continue

              if (
                !chosen ||
                adjustedDayIndex < chosen.adjustedDayIndex ||
                (adjustedDayIndex === chosen.adjustedDayIndex && eEv.minutes < chosen.end.minutes)
              ) {
                chosen = { end: eEv, endIndex: i, adjustedDayIndex }
              }
            }

            if (chosen) {
              const startAbs = sEv.dayIndex * 24 * 60 + sEv.minutes
              const endAbs = chosen.adjustedDayIndex * 24 * 60 + chosen.end.minutes
              if (endAbs > startAbs) {
                const startWeekday = DAY_KEYS[sEv.dayIndex]
                const endWeekday = DAY_KEYS[chosen.adjustedDayIndex % 7]
                const baseStartTime = minutesToTime(sEv.minutes)
                const baseEndTime = minutesToTime(chosen.end.minutes)
                const isContinuous = sEv.dayIndex % 7 !== chosen.adjustedDayIndex % 7
                const totalHours = Math.floor((endAbs - startAbs) / 60)
                blocks.push({ startWeekday, endWeekday, baseStartTime, baseEndTime, isContinuous, totalHours })
                assignedEnds.add(chosen.endIndex)
              }
            }
          }

          return blocks
        }

        ;(["normal", "summer"] as const).forEach((season) => {
          const seasonSchedules = formData.schedules[season]
          const blocks = buildShiftBlocks(seasonSchedules)

          const seasonPeriod = (Array.isArray(formData.seasonPeriods) ? formData.seasonPeriods : []).find(
            (p: any) => p && p.season === season
          )

          const seasonObj: any = { season, shifts: blocks }
          if (seasonPeriod) {
            const normalizeDayMonth = (val: any): string | null => {
              if (!val) return null
              let s = String(val).trim()
              const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})$/)
              if (iso) {
                return `${iso[3]}-${iso[2]}`
              }
              const dm = s.match(/^(\d{1,2})[\/\-](\d{1,2})$/)
              if (dm) {
                let a = Number(dm[1])
                let b = Number(dm[2])
                let day: number
                let month: number
                if (a > 12 && b <= 12) {
                  day = a
                  month = b
                } else if (b > 12 && a <= 12) {
                  day = b
                  month = a
                } else {
                  day = a
                  month = b
                }
                if (day < 1 || day > 31 || month < 1 || month > 12) return null
                return `${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`
              }
              return null
            }
            const s = normalizeDayMonth(seasonPeriod.startDate)
            const e = normalizeDayMonth(seasonPeriod.endDate)
            if (s) seasonObj.startDate = s
            if (e) seasonObj.endDate = e
          }
          seasonalSchedules.push(seasonObj)
        })
      }

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

      const signingMethods: any[] = []
      const mapDetailKey = (key: string) => {
        const k = String(key).toLowerCase()
        if (k === "wifi" || k === "web") return "web"
        if (k === "ip") return "ip"
        if (k === "gps") return "gps"
        if (k === "qrcode" || k === "qrcode" || k === "qrcode") return "qrcode"
        return k
      }

      if (formData.signingMethods.mobile) {
        const mobileDetails = Object.entries(formData.signingMethods.mobile)
          .filter(([_, enabled]) => enabled)
          .map(([key]) => mapDetailKey(key))
        if (mobileDetails.length > 0) {
          signingMethods.push({
            methodType: "mobile",
            methodDetails: mobileDetails,
            verifyIdentity: !!formData.verifyIdentity,
          })
        }
      }

      if (formData.signingMethods.laptop) {
        const laptopDetails = Object.entries(formData.signingMethods.laptop)
          .filter(([_, enabled]) => enabled)
          .map(([key]) => mapDetailKey(key))
        if (laptopDetails.length > 0) {
          signingMethods.push({
            methodType: "pc",
            methodDetails: laptopDetails,
            verifyIdentity: !!formData.verifyIdentity,
          })
        }
      }

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
            ...(typeof task.workCenterId !== "undefined" && task.workCenterId !== null
              ? { workCenterId: Number(task.workCenterId) }
              : {}),
          }

          if (task.startDate) taskPayload.startDate = task.startDate
          if (task.endDate) taskPayload.endDate = task.endDate
          if (task.interval) taskPayload.interval = Number(task.interval)

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
            if (
              task.monthlyMode === "firstWeekDay" &&
              typeof task.monthlyFirstWeekday !== "undefined" &&
              task.monthlyFirstWeekday !== null
            ) {
              taskPayload.monthlyStartWeekday = Number(task.monthlyFirstWeekday)
            }
            if (
              task.monthlyMode === "lastWeekDay" &&
              typeof task.monthlyLastWeekday !== "undefined" &&
              task.monthlyLastWeekday !== null
            ) {
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

      const parseMonitoringValue = (val: any) => {
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
        const custQuestions: any[] = []
        if (formData.customerSurvey.questionText) {
          custQuestions.push({
            questionText: formData.customerSurvey.questionText,
            questionType: "rating",
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
            questionText: formData.customerSurvey.questionText,
            greetingText: formData.customerSurvey.farewellText || "Please fill after job completion.",
            rateDigit: parseMonitoringValue(formData.customerSurvey.monitoringValue),
            textAlertTracking: formData.customerSurvey.textAlertTracking || null,
            periodicity: formData.customerSurvey.periodicity,
            interval: Number(formData.customerSurvey.interval) || 1,
            sendTime: formData.customerSurvey.hour || null,
            monthlyWeekdays: formData.customerSurvey.weeklyDays?.length
              ? formData.customerSurvey.weeklyDays
              : formData.customerSurvey.monthlyWeekdays || [],
            monthlyDays: formData.customerSurvey.monthlyDays || [],
            monthlyStartWeekday: formData.customerSurvey.monthlyFirstWeekday,
            monthlyEndWeekday: formData.customerSurvey.monthlyLastWeekday,
          }
        }

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
            monthlyWeekdays: formData.workerSurvey.weeklyDays?.length
              ? formData.workerSurvey.weeklyDays
              : formData.workerSurvey.monthlyWeekdays || [],
            monthlyDays: formData.workerSurvey.monthlyDays || [],
            monthlyStartWeekday: formData.workerSurvey.monthlyFirstWeekday,
            monthlyEndWeekday: formData.workerSurvey.monthlyLastWeekday,
          }
        }
      }

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
  }, [formData, enableTasks, enableSurveys, session, t, onJobAdded, onOpenChange, resetForm])

  // Effects
  useEffect(() => {
    if (!session?.accessToken) return
    fetchClients()
    fetchWorkers()
  }, [fetchClients, fetchWorkers, session?.accessToken])

  useEffect(() => {
    fetchWorkCenters()
  }, [fetchWorkCenters])

  useEffect(() => {
    if (formData.scheduleType === "programming") {
      const currentSeasonSchedules = formData.schedules[formData.currentSeason]
      const { weeklyTotal, pairingRegistry } = computeMultiDayTotals(currentSeasonSchedules, pairingRegistryRef.current)
      pairingRegistryRef.current = pairingRegistry
      setFormData((prev) => ({ ...prev, totalWeeklyHours: weeklyTotal }))
    } else {
      setFormData((prev) => ({ ...prev, totalWeeklyHours: "00:00" }))
    }
  }, [formData.currentSeason, formData.schedules, formData.scheduleType])

  // Render functions
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
          {currentMainStep === 1 && (
            <>
              {currentSigningStep === 1 && (
                <DefinitionForm
                  formData={formData}
                  updateFormData={updateFormData}
                  clients={clients}
                  workCenters={workCenters}
                  workers={workers}
                  loadingClients={loadingClients}
                  loadingWorkCenters={loadingWorkCenters}
                  loadingWorkers={loadingWorkers}
                  errors={errors}
                  toggleWorkCenterSelection={toggleWorkCenterSelection}
                  toggleWorkerSelection={toggleWorkerSelection}
                  workCenterTooltipOpen={workCenterTooltipOpen}
                  setWorkCenterTooltipOpen={setWorkCenterTooltipOpen}
                  workersTooltipOpen={workersTooltipOpen}
                  setWorkersTooltipOpen={setWorkersTooltipOpen}
                  workCenterQuery={workCenterQuery}
                  setWorkCenterQuery={setWorkCenterQuery}
                  workerQuery={workerQuery}
                  setWorkerQuery={setWorkerQuery}
                />
              )}
              {currentSigningStep === 2 && (
                <SchedulesForm
                  formData={formData}
                  updateFormData={updateFormData}
                  updateScheduleTime={updateScheduleTime}
                  tempValues={tempValues}
                  setTempValues={setTempValues}
                  seasonTooltipOpen={seasonTooltipOpen}
                  setSeasonTooltipOpen={setSeasonTooltipOpen}
                  pairingRegistryRef={pairingRegistryRef}
                  daysOfWeek={daysOfWeek}
                  clearCurrentSeasonSchedules={clearCurrentSeasonSchedules}
                  commitValue={(key: string, value: string) => {
                    setTempValues((prev) => {
                      const updated = { ...prev }
                      delete updated[key]
                      return updated
                    })
                  }}
                />
              )}
              {currentSigningStep === 3 && (
                <SigningMethodsForm
                  formData={formData}
                  updateFormData={updateFormData}
                  errors={errors}
                  updateSigningMethod={updateSigningMethod}
                />
              )}
              {currentSigningStep === 4 && (
                <AlertsForm
                  formData={formData}
                  updateNestedFormData={updateNestedFormData}
                  delayTooltipOpen={delayTooltipOpen}
                  setDelayTooltipOpen={setDelayTooltipOpen}
                  durationTooltipOpen={durationTooltipOpen}
                  setDurationTooltipOpen={setDurationTooltipOpen}
                />
              )}
            </>
          )}

          {currentMainStep === 2 && (
            <TasksForm
              enableTasks={enableTasks}
              setEnableTasks={setEnableTasks}
              formData={formData}
              updateFormData={updateFormData}
              workCenters={workCenters}
              errors={errors}
              setErrors={setErrors}
              onAddTask={addTaskToList}
              onRemoveTask={removeTaskFromList}
              dragItemIndex={dragItemIndex}
              dragOverItemIndex={dragOverItemIndex}
              handleDragStart={handleDragStart}
              handleDragEnter={handleDragEnter}
              handleDragOver={handleDragOver}
              handleDrop={handleDrop}
              handleDragEnd={handleDragEnd}
            />
          )}

          {currentMainStep === 3 && (
            <SurveysForm
              enableSurveys={enableSurveys}
              setEnableSurveys={setEnableSurveys}
              formData={formData}
              updateNestedFormData={updateNestedFormData}
            />
          )}
        </div>

        <div
          className={`flex items-center p-2 px-6 ${
            currentMainStep === 1 && currentSigningStep === 1 ? "justify-end" : "justify-between"
          }`}
        >
          {!(currentMainStep === 1 && currentSigningStep === 1) && (
            <button
              className="bg-[#7d7d7d] text-white font-normal p-2 rounded-lg"
              onClick={handlePrevious}
              disabled={currentMainStep === 1 && currentSigningStep === 1}
            >
              {t("previous") || "Previous"}
            </button>
          )}

          {currentMainStep === 1 &&
            currentSigningStep === 2 &&
            (formData.scheduleType as string) === "programming" && (
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
