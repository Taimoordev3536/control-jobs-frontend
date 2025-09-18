"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { X, Smartphone, Wifi, MapPin, Globe, QrCode, Info } from "lucide-react"
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
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface AddJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobAdded?: (job: any) => void
}

interface TimeSlot {
  start: string
  end: string
}

interface DaySchedule {
  tomorrow: TimeSlot
  late: TimeSlot
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
  tomorrow: { start: "", end: "" },
  late: { start: "", end: "" },
  evening: { start: "", end: "" },
  total: "00:00",
})

const createInitialFormData = () => ({
  denomination: "",
  startDate: "",
  endDate: "",
  clientId: "",
  workCenterId: "1", // Always use mock WorkCenter id
  workerIds: [] as string[],
  observations: "",
  scheduleType: "free" as string,
  seasonType: "winter" as string,
  schedules: {
    monday: createInitialSchedule(),
    tuesday: createInitialSchedule(),
    wednesday: createInitialSchedule(),
    thursday: createInitialSchedule(),
    friday: createInitialSchedule(),
    saturday: createInitialSchedule(),
    sunday: createInitialSchedule(),
  } as ScheduleData,
  totalWeeklyHours: "00:00",
  signingMethods: {
    mobile: { qrCode: true, wifi: true, ip: true, gps: true },
  },
  verifyIdentity: false,
  entrance: { whenSigningIn: false, delay: false, delayValue: "10" },
  exit: { whenSigningIn: false, duration: false, durationValue: "30" },
  task: "",
  taskObservations: "",
  duration: "",
  shifts: { tomorrow: false, late: false, evening: false },
  toBeCarriedOut: "during" as const,
  periodicity: "once" as string,
  interval: 1,
  onceDate: "",
  taskStartDate: "",
  taskEndDate: "",
  weeklyDays: [] as number[],
  monthlyDays: [] as number[],
  monthlyWeekdays: [] as number[],
  monthlyMode: "dates" as "dates" | "weekdays",
  yearlyMonths: [] as number[],
  yearlyDays: [] as number[],
  alertTaskCompleted: false,
  pendingTaskAlert: false,
  tasks: [] as Array<{
    id: string
    task: string
    observations: string
    duration: string
    shifts: { tomorrow: boolean; late: boolean; evening: boolean }
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
    yearlyMonths: number[]
    yearlyDays: number[]
    alertTaskCompleted: boolean
    pendingTaskAlert: boolean
  }>,
  customerSurvey: {
    questionText: "",
    monitoringValue: [5],
    textAlertTracking: "",
    farewellText: "",
    periodicity: "daily" as const,
    periodicityValue: "1",
    hour: "08:00",
  },
  workerSurvey: {
    questionText: "",
    monitoringValue: [5],
    textAlertTracking: "",
    farewellText: "",
    periodicity: "daily" as const,
    periodicityValue: "1",
    hour: "08:00",
  },
})

export default function AddJobModal({ open, onOpenChange, onJobAdded }: AddJobModalProps) {
  const [currentMainStep, setCurrentMainStep] = useState(1)
  const [currentSigningStep, setCurrentSigningStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [workCenterTooltipOpen, setWorkCenterTooltipOpen] = useState(false)
  const [workersTooltipOpen, setWorkersTooltipOpen] = useState(false)
  const [enableTasks, setEnableTasks] = useState(false)
  const [enableSurveys, setEnableSurveys] = useState(false)
  const [surveyTab, setSurveyTab] = useState("customer")

  const { t } = useTranslation()
  const { session } = useAuth()

  // API Data
  const [clients, setClients] = useState<Client[]>([])
  const [workCenters, setWorkCenters] = useState<WorkCenter[]>([])
  const [workers, setWorkers] = useState<Worker[]>([])
  const [loadingClients, setLoadingClients] = useState(false)
  // const [loadingWorkCenters, setLoadingWorkCenters] = useState(false) // Commented: API loading logic for work centers
  const [loadingWorkers, setLoadingWorkers] = useState(false)

  const [formData, setFormData] = useState(createInitialFormData)
  const [errors, setErrors] = useState<{ denomination?: string; startDate?: string; workers?: string }>({})

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
      const data = await fetchWithAuth(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client`)
      setClients(data?.data || [])
    } catch (error) {
      console.error("Error fetching clients:", error)
      setClients([])
    } finally {
      setLoadingClients(false)
    }
  }, [fetchWithAuth])

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
    // Always use mock WorkCenter for all clients
    setWorkCenters([
      {
        id: 1,
        name: "WorkCenter 1",
        address: "",
        contactName: "",
        contactPhone: "",
        contactEmail: "",
        clientId: Number(formData.clientId),
        createdAt: "",
        updatedAt: "",
      },
    ])
    // setLoadingWorkCenters(false); // Commented: not needed for mock logic

    /*
      // Previous code to fetch work centers from API
      // if (!formData.clientId) {
      //   setWorkCenters([])
      //   return
      // }
      // setLoadingWorkCenters(true)
      // try {
      //   const data = await fetchWithAuth(
      //     `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${formData.clientId}/work-centers`,
      //   )
      //   setWorkCenters(data?.data || [])
      // } catch (error) {
      //   console.error("Error fetching work centers:", error)
      //   setWorkCenters([])
      // } finally {
      //   setLoadingWorkCenters(false)
      // }
      */
  }, [formData.clientId])

  // Time calculation functions
  const timeToMinutes = useCallback((timeStr: string): number => {
    if (!timeStr) return 0
    const [time, period] = timeStr.split(" ")
    if (!time || !period) return 0
    const [hours, minutes] = time.split(":").map(Number)
    let totalMinutes = minutes
    if (period === "AM") {
      totalMinutes += hours === 12 ? 0 : hours * 60
    } else {
      totalMinutes += hours === 12 ? 12 * 60 : (hours + 12) * 60
    }
    return totalMinutes
  }, [])

  const minutesToTime = useCallback((minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }, [])

  const calculateDayTotal = useCallback(
    (daySchedule: DaySchedule): string => {
      let totalMinutes = 0
      const shifts = [daySchedule.tomorrow, daySchedule.late, daySchedule.evening]

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

  const calculateWeeklyTotal = useCallback((): string => {
    let totalMinutes = 0
    Object.values(formData.schedules).forEach((daySchedule) => {
      const dayTotal = calculateDayTotal(daySchedule)
      const [hours, minutes] = dayTotal.split(":").map(Number)
      totalMinutes += hours * 60 + minutes
    })
    return minutesToTime(totalMinutes)
  }, [formData.schedules, calculateDayTotal, minutesToTime])

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
    (day: string, shift: string, timeType: "start" | "end", value: string) => {
      setFormData((prev) => {
        const newSchedules = { ...prev.schedules }
        const daySchedule = newSchedules[day] as DaySchedule
        if (daySchedule && typeof daySchedule === "object" && shift in daySchedule) {
          const shiftData = daySchedule[shift as keyof DaySchedule] as TimeSlot
          if (shiftData && typeof shiftData === "object") {
            shiftData[timeType] = value
          }
        }
        newSchedules[day].total = calculateDayTotal(newSchedules[day])
        return {
          ...prev,
          schedules: newSchedules,
          totalWeeklyHours: calculateWeeklyTotal(),
        }
      })
    },
    [calculateDayTotal, calculateWeeklyTotal],
  )

  const toggleWorkerSelection = useCallback((workerId: string) => {
    setFormData((prev) => ({
      ...prev,
      workerIds: prev.workerIds.includes(workerId)
        ? prev.workerIds.filter((id) => id !== workerId)
        : [...prev.workerIds, workerId],
    }))
  }, [])

  const addTaskToList = () => {
    if (!formData.task.trim()) {
      toast({
        title: "Task Required",
        description: "Please enter a task name",
        variant: "destructive",
      })
      return
    }

    const newTask = {
      id: Date.now().toString(),
      task: formData.task,
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
      yearlyMonths: formData.yearlyMonths,
      yearlyDays: formData.yearlyDays,
      alertTaskCompleted: formData.alertTaskCompleted,
      pendingTaskAlert: formData.pendingTaskAlert,
    }

    setFormData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
      // Reset task form fields (preserve job-level start/end)
      task: "",
      taskObservations: "",
      duration: "",
      shifts: { tomorrow: false, late: false, evening: false },
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

  const getShiftLabels = (shifts: { tomorrow: boolean; late: boolean; evening: boolean }) => {
    const labels = []
    if (shifts.tomorrow) labels.push("Morning")
    if (shifts.late) labels.push("Afternoon")
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
      if (!formData.workerIds || formData.workerIds.length === 0) {
        newErrors.workers = t("thisFieldIsRequired")
      }

      // If any validation errors, set them and abort advancing
      if (Object.keys(newErrors).length > 0) {
        setErrors(newErrors)
        return
      }

      // Otherwise advance signing sub-steps or main step
      if (currentSigningStep < 4) {
        setCurrentSigningStep(currentSigningStep + 1)
      } else {
        setCurrentMainStep(2)
        setCurrentSigningStep(1)
      }
    } else if (currentMainStep === 2) {
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

  const handleCreate = useCallback(async () => {
    setIsLoading(true)
    try {
      const endDate = formData.endDate || "2126-08-01"

      // Build shifts array
      const shifts: any[] = []
      const shiftTypeMap = { tomorrow: "morning", late: "noon", evening: "evening" }

      Object.entries(formData.schedules).forEach(([day, schedule]) => {
        Object.entries(shiftTypeMap).forEach(([key, shiftType]) => {
          const shift = schedule[key as keyof DaySchedule] as TimeSlot
          if (shift.start && shift.end) {
            shifts.push({
              day: day.charAt(0).toUpperCase() + day.slice(1),
              shiftType,
              startTime: shift.start,
              endTime: shift.end,
              totalHours: Math.floor((timeToMinutes(shift.end) - timeToMinutes(shift.start)) / 60),
              scheduleType: (formData.scheduleType as string) === "programming" ? "fixed" : "flexible",
              season: formData.seasonType,
            })
          }
        })
      })
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

      // const tasks: any[] = []
      // if (enableTasks && formData.tasks.length > 0) {
      //   formData.tasks.forEach((task) => {
      //     const selectedShifts = Object.entries(task.shifts)
      //       .filter(([_, enabled]) => enabled)
      //       .map(([key]) => (key === "tomorrow" ? "morning" : key === "late" ? "afternoon" : "evening"))

      //     tasks.push({
      //       name: task.task,
      //       note: task.observations,
      //       expectedDuration: Number.parseInt(task.duration) || 1,
      //       shift: selectedShifts[0] || "morning",
      //       timing: task.toBeCarriedOut,
      //       periodicity: task.periodicity,
      //       periodicityValue: task.periodicityValue,
      //       periodicityDate: task.periodicityDate,
      //       weeklyDays: task.weeklyDays,
      //       monthlyDay: task.monthlyDay,
      //       alertTask: task.alertTaskCompleted,
      //       pendingTask: task.pendingTaskAlert,
      //     })
      //   })
      // }
      const tasks: any[] = []
      if (enableTasks && formData.tasks.length > 0) {
        formData.tasks.forEach((task) => {
          const selectedShifts = Object.entries(task.shifts)
            .filter(([_, enabled]) => enabled)
            .map(([key]) => (key === "tomorrow" ? "morning" : key === "late" ? "noon" : "evening"))

          const taskPayload: any = {
            name: task.task,
            note: task.observations,
            expectedDuration: Number.parseInt(task.duration) || 1,
            shift: selectedShifts[0] || "morning",
            timing: task.toBeCarriedOut,
            periodicity: task.periodicity,
            alertTask: task.alertTaskCompleted,
            pendingTask: task.pendingTaskAlert,
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

      // Build survey
      let survey: any = null
      if (enableSurveys) {
        const questions: any[] = []
        if (formData.customerSurvey.questionText) {
          questions.push({
            questionText: formData.customerSurvey.questionText,
            questionType: "rating",
            options: "1,2,3,4,5,6,7,8,9,10",
            isRequired: true,
            order: 1,
          })
        }
        if (formData.customerSurvey.textAlertTracking) {
          questions.push({
            questionText: formData.customerSurvey.textAlertTracking,
            questionType: "text",
            isRequired: false,
            order: 2,
          })
        }

        if (questions.length > 0) {
          survey = {
            title: "Job Survey",
            description: formData.customerSurvey.farewellText || "Please fill after job completion.",
            questions,
          }
        }
      }

      const payload = {
        jobName: formData.denomination,
        startDate: formData.startDate,
        endDate,
        clientId: Number.parseInt(formData.clientId),
        workCenterId: 1, // Always use mock WorkCenter id as integer
        workerIds: formData.workerIds.map((id) => Number.parseInt(id)),
        note: formData.observations,
        shifts,
        signingMethods,
        alerts,
        tasks,
        ...(survey && { survey }),
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
    fetchClients()
    fetchWorkers()
  }, [fetchClients, fetchWorkers])

  useEffect(() => {
    fetchWorkCenters()
  }, [fetchWorkCenters])

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
          {t("denomination") || "Denomination"}
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
          <Label htmlFor="startDate" className="text-sm font-medium text-foreground">
            {t("startDate") || "Start Date"}
          </Label>
          <div className="relative">
            <DateInput
              id="startDate"
              value={formData.startDate}
              onChange={(e) => updateFormData("startDate", e.target.value)}
              className="mt-1 w-40"
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
              className="mt-1 w-40"
            />
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="client" className="text-sm font-medium text-foreground">
          {t("client") || "Client"}
        </Label>
        <Select
          value={formData.clientId}
          onValueChange={(value) => {
            updateFormData("clientId", value)
            updateFormData("workCenterId", "")
          }}
        >
          <SelectTrigger className="mt-1 text-muted-foreground">
            <SelectValue placeholder={loadingClients ? t("loadingClients") : t("selectAClient")} />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id.toString()}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="workCenter" className="text-sm font-medium text-foreground flex items-center gap-1">
          {t("workCenter") || "Work Center"}
          <TooltipProvider>
            <Tooltip open={workCenterTooltipOpen} onOpenChange={setWorkCenterTooltipOpen} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center p-0"
                  aria-label="Ayuda centro de trabajo"
                  onClick={() => setWorkCenterTooltipOpen((s) => !s)}
                >
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[12.6rem]">
                {t("selectWorkCentersInfo")}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </Label>
        <Select
          value={formData.workCenterId}
          onValueChange={(value) => updateFormData("workCenterId", value)}
          disabled={!formData.clientId}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={!formData.clientId ? "Select a client first" : "Select a work center"} />
          </SelectTrigger>
          <SelectContent>
            {/* Only show the mock WorkCenter with id 1 and value '1' */}
            <SelectItem key={workCenters[0]?.id || "1"} value="1">
              {workCenters[0]?.name || "Default WorkCenter"}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div>
        <Label className="text-sm font-medium text-foreground flex items-center gap-1">
          {t("workers") || "Workers"}
          <TooltipProvider>
            <Tooltip open={workersTooltipOpen} onOpenChange={setWorkersTooltipOpen} delayDuration={0}>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center p-0"
                  aria-label="Ayuda trabajadores"
                  onClick={() => setWorkersTooltipOpen((s) => !s)}
                >
                  <Info className="w-3 h-3 text-muted-foreground cursor-help" />
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
                workers.map((worker) => (
                  <div key={worker.id} className="flex items-center space-x-2 py-1">
                    <Checkbox
                      id={`worker-${worker.id}`}
                      checked={formData.workerIds.includes(worker.id.toString())}
                      onCheckedChange={() => toggleWorkerSelection(worker.id.toString())}
                    />
                    <Label htmlFor={`worker-${worker.id}`} className="text-sm cursor-pointer">
                      {worker.name} - {worker.occupation}
                    </Label>
                  </div>
                ))
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

  // const renderSchedulesStep = () => (
  //   <div className="space-y-4">
  //     <h3 className="text-lg font-medium text-center mb-4 underline">{t("schedules") || "Schedules"}</h3>

  //     <div className="flex items-center justify-between mb-4">
  //       <div className="flex items-center gap-3">
  //         <span className="text-sm font-medium">{t("free") || "Free"}</span>
  //         <Switch
  //           checked={(formData.scheduleType as string) === "programming"}
  //           onCheckedChange={(checked) => updateFormData("scheduleType", checked ? "programming" : "free")}
  //         />
  //         <span className="text-sm font-medium">{t("programming") || "Programming"}</span>
  //       </div>
  //       {(formData.scheduleType as string) === "programming" && (
  //         <div className="flex items-center gap-3">
  //           <span className="text-sm font-medium">{t("winter") || "Winter"}</span>
  //           <Switch
  //             checked={(formData.seasonType as string) === "summer"}
  //             onCheckedChange={(checked) => updateFormData("seasonType", checked ? "summer" : "winter")}
  //           />
  //           <span className="text-sm font-medium">{t("summer") || "Summer"}</span>
  //         </div>
  //       )}
  //     </div>

  //     {(formData.scheduleType as string) === "programming" && (
  //       <div className="w-full">
  //         <table className="w-full border-collapse">
  //           <thead>
  //             <tr className="bg-muted/30">
  //               <th className="border border-border px-3 py-2 text-left font-medium text-sm w-20">
  //                 {t("day") || "Day"}
  //               </th>
  //               <th className="border border-border px-2 py-2 text-center font-medium text-sm">
  //                 {t("tomorrow") || "Tomorrow"}
  //               </th>
  //               <th className="border border-border px-2 py-2 text-center font-medium text-sm">
  //                 {t("late") || "Late"}
  //               </th>
  //               <th className="border border-border px-2 py-2 text-center font-medium text-sm">
  //                 {t("evening") || "Evening"}
  //               </th>
  //               <th className="border border-border px-2 py-2 text-center font-medium text-sm w-16">Total</th>
  //             </tr>
  //           </thead>
  //           <tbody>
  //             {daysOfWeek.map((day) => (
  //               <tr key={day.key} className="hover:bg-muted/20">
  //                 <td className="border border-border px-3 py-2 font-medium text-sm bg-muted/10">{day.label}</td>
  //                 <td className="border border-border px-1 py-1">
  //                   <div className="flex items-center justify-center gap-1">
  //                     <div className="relative">
  //                       <Input
  //                         placeholder="--:--"
  //                         className="w-16 h-6 text-xs text-center pr-5 border-gray-300"
  //                         value={formData.schedules[day.key]?.tomorrow?.start || ""}
  //                         readOnly
  //                       />
  //                       <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
  //                         <TimePicker
  //                           value={formData.schedules[day.key]?.tomorrow?.start}
  //                           onChange={(time) => updateScheduleTime(day.key, "tomorrow", "start", time)}
  //                         />
  //                       </div>
  //                     </div>
  //                     <span className="text-xs text-muted-foreground">-</span>
  //                     <div className="relative">
  //                       <Input
  //                         placeholder="--:--"
  //                         className="w-16 h-6 text-xs text-center pr-5 border-gray-300"
  //                         value={formData.schedules[day.key]?.tomorrow?.end || ""}
  //                         readOnly
  //                       />
  //                       <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
  //                         <TimePicker
  //                           value={formData.schedules[day.key]?.tomorrow?.end}
  //                           onChange={(time) => updateScheduleTime(day.key, "tomorrow", "end", time)}
  //                         />
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </td>
  //                 <td className="border border-border px-1 py-1">
  //                   <div className="flex items-center justify-center gap-1">
  //                     <div className="relative">
  //                       <Input
  //                         placeholder="--:--"
  //                         className="w-16 h-6 text-xs text-center pr-5 border-gray-300"
  //                         value={formData.schedules[day.key]?.late?.start || ""}
  //                         readOnly
  //                       />
  //                       <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
  //                         <TimePicker
  //                           value={formData.schedules[day.key]?.late?.start}
  //                           onChange={(time) => updateScheduleTime(day.key, "late", "start", time)}
  //                         />
  //                       </div>
  //                     </div>
  //                     <span className="text-xs text-muted-foreground">-</span>
  //                     <div className="relative">
  //                       <Input
  //                         placeholder="--:--"
  //                         className="w-16 h-6 text-xs text-center pr-5 border-gray-300"
  //                         value={formData.schedules[day.key]?.late?.end || ""}
  //                         readOnly
  //                       />
  //                       <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
  //                         <TimePicker
  //                           value={formData.schedules[day.key]?.late?.end}
  //                           onChange={(time) => updateScheduleTime(day.key, "late", "end", time)}
  //                         />
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </td>
  //                 <td className="border border-border px-1 py-1">
  //                   <div className="flex items-center justify-center gap-1">
  //                     <div className="relative">
  //                       <Input
  //                         placeholder="--:--"
  //                         className="w-16 h-6 text-xs text-center pr-5 border-gray-300"
  //                         value={formData.schedules[day.key]?.evening?.start || ""}
  //                         readOnly
  //                       />
  //                       <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
  //                         <TimePicker
  //                           value={formData.schedules[day.key]?.evening?.start}
  //                           onChange={(time) => updateScheduleTime(day.key, "evening", "start", time)}
  //                         />
  //                       </div>
  //                     </div>
  //                     <span className="text-xs text-muted-foreground">-</span>
  //                     <div className="relative">
  //                       <Input
  //                         placeholder="--:--"
  //                         className="w-16 h-6 text-xs text-center pr-5 border-gray-300"
  //                         value={formData.schedules[day.key]?.evening?.end || ""}
  //                         readOnly
  //                       />
  //                       <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
  //                         <TimePicker
  //                           value={formData.schedules[day.key]?.evening?.end}
  //                           onChange={(time) => updateScheduleTime(day.key, "evening", "end", time)}
  //                         />
  //                       </div>
  //                     </div>
  //                   </div>
  //                 </td>
  //                 <td className="border border-border px-2 py-2 text-center font-mono text-xs bg-muted/5">
  //                   {formData.schedules[day.key]?.total || "00:00"}
  //                 </td>
  //               </tr>
  //             ))}
  //           </tbody>
  //         </table>
  //       </div>
  //     )}
  //   </div>
  // )

const renderSchedulesStep = () => (
  <div className="space-y-4">
    <h3 className="text-lg font-medium text-center mb-4 underline">{t("schedules") || "Schedules"}</h3>

    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-[1px]">
        <span className="text-sm font-medium">{t("free") || "Free"}</span>
        <Switch
          className="scale-[0.65]"
          checked={(formData.scheduleType as string) === "programming"}
          onCheckedChange={(checked) => updateFormData("scheduleType", checked ? "programming" : "free")}
        />
        <span className="text-sm font-medium">{t("programming") || "Programming"}</span>
      </div>
      {(formData.scheduleType as string) === "programming" && (
        <div className="flex items-center gap-[1px]">
          <span className="text-sm font-medium">{t("winter") || "Winter"}</span>
          <Switch
            className="scale-[0.65]"
            checked={(formData.seasonType as string) === "summer"}
            onCheckedChange={(checked) => updateFormData("seasonType", checked ? "summer" : "winter")}
          />
          <span className="text-sm font-medium">{t("summer") || "Summer"}</span>
        </div>
      )}
    </div>

    {(formData.scheduleType as string) === "programming" && (
      <div className="w-full">
        <table className="w-full border-collapse">
          <thead  >
            <tr className="bg-gray-100 border-b-[3px] border-[#7547a3]">
              <th className="border border-border px-2 py-2 text-center font-medium text-sm w-20">
                {t("day") || "Day"}
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium text-sm w-24">
                {t("morning") || "Morning"}
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium text-sm w-24">
                {t("afternoon") || "Afternoon"}
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium text-sm w-24">
                {t("evening") || "Evening"}
              </th>
              <th className="border border-border px-2 py-2 text-center font-medium text-sm w-16">Total</th>
            </tr>
          </thead>
          <tbody>
            {daysOfWeek.map((day) => (
              <tr key={day.key} className="hover:bg-muted/20">
                <td className="border border-border px-3 py-2 font-medium text-sm bg-muted/10">{day.label}</td>
                <td className="border border-border px-2 py-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative">
                      <Input
                        placeholder="--:--"
                        className={`w-20 h-6 text-xs text-center pr-7 border-gray-300 ${
                          formData.schedules[day.key]?.tomorrow?.start ? 'bg-gray-100' : ''
                        }`}
                        value={formData.schedules[day.key]?.tomorrow?.start || ""}
                        readOnly
                      />
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                        <TimePicker
                          value={formData.schedules[day.key]?.tomorrow?.start}
                          onChange={(time) => updateScheduleTime(day.key, "tomorrow", "start", time)}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">-</span>
                    <div className="relative">
                      <Input
                        placeholder="--:--"
                        className={`w-20 h-6 text-xs text-center pr-7 border-gray-300 ${
                          formData.schedules[day.key]?.tomorrow?.end ? 'bg-gray-100' : ''
                        }`}
                        value={formData.schedules[day.key]?.tomorrow?.end || ""}
                        readOnly
                      />
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                        <TimePicker
                          value={formData.schedules[day.key]?.tomorrow?.end}
                          onChange={(time) => updateScheduleTime(day.key, "tomorrow", "end", time)}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="border border-border px-2 py-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative">
                      <Input
                        placeholder="--:--"
                        className={`w-20 h-6 text-xs text-center pr-7 border-gray-300 ${
                          formData.schedules[day.key]?.late?.start ? 'bg-gray-100' : ''
                        }`}
                        value={formData.schedules[day.key]?.late?.start || ""}
                        readOnly
                      />
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                        <TimePicker
                          value={formData.schedules[day.key]?.late?.start}
                          onChange={(time) => updateScheduleTime(day.key, "late", "start", time)}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">-</span>
                    <div className="relative">
                      <Input
                        placeholder="--:--"
                        className={`w-20 h-6 text-xs text-center pr-7 border-gray-300 ${
                          formData.schedules[day.key]?.late?.end ? 'bg-gray-100' : ''
                        }`}
                        value={formData.schedules[day.key]?.late?.end || ""}
                        readOnly
                      />
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                        <TimePicker
                          value={formData.schedules[day.key]?.late?.end}
                          onChange={(time) => updateScheduleTime(day.key, "late", "end", time)}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className="border border-border px-2 py-1">
                  <div className="flex items-center justify-center gap-2">
                    <div className="relative">
                      <Input
                        placeholder="--:--"
                        className={`w-20 h-6 text-xs text-center pr-7 border-gray-300 ${
                          formData.schedules[day.key]?.evening?.start ? 'bg-gray-100' : ''
                        }`}
                        value={formData.schedules[day.key]?.evening?.start || ""}
                        readOnly
                      />
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                        <TimePicker
                          value={formData.schedules[day.key]?.evening?.start}
                          onChange={(time) => updateScheduleTime(day.key, "evening", "start", time)}
                        />
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground">-</span>
                    <div className="relative">
                      <Input
                        placeholder="--:--"
                        className={`w-20 h-6 text-xs text-center pr-7 border-gray-300 ${
                          formData.schedules[day.key]?.evening?.end ? 'bg-gray-100' : ''
                        }`}
                        value={formData.schedules[day.key]?.evening?.end || ""}
                        readOnly
                      />
                      <div className="absolute right-1 top-1/2 transform -translate-y-1/2 z-50">
                        <TimePicker
                          value={formData.schedules[day.key]?.evening?.end}
                          onChange={(time) => updateScheduleTime(day.key, "evening", "end", time)}
                        />
                      </div>
                    </div>
                  </div>
                </td>
                <td className={`border border-border px-2 py-2 text-center font-mono text-xs ${
                  formData.schedules[day.key]?.total && formData.schedules[day.key]?.total !== "00:00" ? 'bg-gray-100' : 'bg-muted/5'
                }`}>
                  {formData.schedules[day.key]?.total || "00:00"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end mt-3">
          <div className="bg-gray-100 text-sm font-semibold px-4 py-2 rounded">{calculateWeeklyTotal()}</div>
        </div>
      </div>
    )}
  </div>
)

  const renderSigningMethodsStep = () => (
    <div className="space-y-8">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("signingMethods") || "Signing methods"}</h3>

      <div className="space-y-8">
        {/* Mobile Device */}
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Smartphone className="w-12 h-12 text-foreground" />
          </div>
          <div className="flex gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-qr"
                checked={formData.signingMethods.mobile.qrCode}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      mobile: { ...prev.signingMethods.mobile, qrCode: !!checked },
                    },
                  }))
                }
              />
              <div className="flex flex-col items-center">
                <QrCode className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-qr" className="text-sm">
                  QR Code
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-wifi"
                checked={formData.signingMethods.mobile.wifi}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      mobile: { ...prev.signingMethods.mobile, wifi: !!checked },
                    },
                  }))
                }
              />
              <div className="flex flex-col items-center">
                <Wifi className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-wifi" className="text-sm">
                  Wifi
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="mobile-ip"
                checked={formData.signingMethods.mobile.ip}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      mobile: { ...prev.signingMethods.mobile, ip: !!checked },
                    },
                  }))
                }
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
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      mobile: { ...prev.signingMethods.mobile, gps: !!checked },
                    },
                  }))
                }
              />
              <div className="flex flex-col items-center">
                <MapPin className="w-8 h-8 mb-1" />
                <Label htmlFor="mobile-gps" className="text-sm">
                  GPS
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-12 text-center">
        <div className="flex items-center justify-center gap-4">
          <span className="text-sm font-medium">{t("verifyIdentity") || "Verify Identity"}</span>
          <div className="flex items-center gap-2">
            <span className="text-sm">{t("no") || "No"}</span>
            <Switch
              checked={formData.verifyIdentity}
              onCheckedChange={(checked) => updateFormData("verifyIdentity", checked)}
            />
            <span className="text-sm">{t("si") || "Yes"}</span>
          </div>
        </div>
      </div>
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
              className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-3"
              style={{ backgroundColor: "#f6eef9" }}
            >
              <div className="w-12 h-12 border-2 border-foreground rounded-lg flex items-center justify-center relative bg-background">
                <div className="absolute left-1 w-3 h-3 bg-foreground rounded-full">
                  <div className="w-1 h-1 bg-background rounded-full mt-1 ml-1"></div>
                </div>
                <div className="ml-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-foreground"
                  >
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <h4 className="font-medium px-3 py-1 rounded" style={{ color: "#662D91", backgroundColor: "#f6eef9" }}>
              {t("entrance") || "Entrance"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="entrance-signing"
                checked={formData.entrance.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "whenSigningIn", checked)}
              />
              <Label htmlFor="entrance-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "When signing in"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="entrance-delay"
                checked={formData.entrance.delay}
                onCheckedChange={(checked) => updateNestedFormData("entrance", "delay", checked)}
              />
              <Label htmlFor="entrance-delay" className="text-sm text-foreground">
                {t("delay") || "Delay"} <Info className="w-4 h-4 inline ml-1 text-muted-foreground" />
              </Label>
            </div>
          </div>
        </div>

        {/* Exit */}
        <div className="space-y-6">
          <div className="text-center">
            <div
              className="inline-flex items-center justify-center w-16 h-16 rounded-lg mb-3"
              style={{ backgroundColor: "#f6eef9" }}
            >
              <div className="w-12 h-12 border-2 border-foreground rounded-lg flex items-center justify-center relative bg-background">
                <div className="absolute right-1 w-3 h-3 bg-foreground rounded-full">
                  <div className="w-1 h-1 bg-background rounded-full mt-1 ml-1"></div>
                </div>
                <div className="mr-2">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="text-foreground"
                  >
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
              </div>
            </div>
            <h4 className="font-medium px-3 py-1 rounded" style={{ color: "#662D91", backgroundColor: "#f6eef9" }}>
              {t("exit") || "Exit"}
            </h4>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <Checkbox
                id="exit-signing"
                checked={formData.exit.whenSigningIn}
                onCheckedChange={(checked) => updateNestedFormData("exit", "whenSigningIn", checked)}
              />
              <Label htmlFor="exit-signing" className="text-sm text-foreground">
                {t("whenSigningIn") || "When signing in"}
              </Label>
            </div>

            <div className="flex items-center space-x-3">
              <Checkbox
                id="exit-duration"
                checked={formData.exit.duration}
                onCheckedChange={(checked) => updateNestedFormData("exit", "duration", checked)}
              />
              <Label htmlFor="exit-duration" className="text-sm text-foreground">
                {t("duration") || "Duration"} <Info className="w-4 h-4 inline ml-1 text-muted-foreground" />
              </Label>
            </div>
          </div>
        </div>
      </div>

      {/* Input fields for delay and duration */}
      <div className="grid grid-cols-2 gap-12 mt-8">
        <div>
          <Label className="text-sm font-medium text-foreground">{t("delay") || "Delay"}</Label>
          <Input
            type="number"
            value={formData.entrance.delayValue}
            onChange={(e) => updateNestedFormData("entrance", "delayValue", e.target.value)}
            className="mt-1 w-24 bg-background border-input"
            placeholder="10"
          />
        </div>
        <div>
          <Label className="text-sm font-medium text-foreground">{t("duration") || "Duration"}</Label>
          <Input
            type="number"
            value={formData.exit.durationValue}
            onChange={(e) => updateNestedFormData("exit", "durationValue", e.target.value)}
            className="mt-1 w-24 bg-background border-input"
            placeholder="30"
          />
        </div>
      </div>
    </div>
  )

  const renderTasksStep = () => (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">{t("introduceTasksNow") || "Enter tasks now?"}</h3>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">{t("no") || "No"}</span>
          <Switch checked={enableTasks} onCheckedChange={setEnableTasks} />
          <span className="text-sm">{t("si") || "Yeah"}</span>
        </div>
      </div>

      {enableTasks && (
        <div className="space-y-6 mt-8">
          <div>
            <Label htmlFor="task" className="text-sm font-medium text-foreground">
              {t("task") || "Task"}
            </Label>
            <Input
              id="task"
              value={formData.task}
              onChange={(e) => updateFormData("task", e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="taskObservations" className="text-sm font-medium text-foreground flex items-center gap-1">
              {t("observations") || "Observations"}
              <Info className="w-4 h-4 text-muted-foreground" />
            </Label>
            <Textarea
              id="taskObservations"
              value={formData.taskObservations}
              onChange={(e) => updateFormData("taskObservations", e.target.value)}
              className="mt-1 min-h-[48px]"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div>
              <Label htmlFor="duration" className="text-sm font-medium text-foreground flex items-center gap-1">
                {t("duration") || "Duration"}
                <Info className="w-4 h-4 text-muted-foreground" />
              </Label>
              <div className="flex items-center gap-2 mt-1">
                <Input
                  id="duration"
                  value={formData.duration}
                  onChange={(e) => updateFormData("duration", e.target.value)}
                  placeholder="--:-- --"
                  className="w-24"
                />
                <TimePicker value={formData.duration} onChange={(time) => updateFormData("duration", time)} />
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                {t("toBeCarriedOut") || "To be carried out"}
                <Info className="w-4 h-4 text-muted-foreground" />
              </Label>
              <div className="mt-2 space-y-3">
                <div className="flex gap-6">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="tomorrow"
                      checked={formData.shifts.tomorrow}
                      onCheckedChange={(checked) => updateNestedFormData("shifts", "tomorrow", checked)}
                    />
                    <Label htmlFor="tomorrow" className="text-sm">
                      {t("morning") || "Morning"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="late"
                      checked={formData.shifts.late}
                      onCheckedChange={(checked) => updateNestedFormData("shifts", "late", checked)}
                    />
                    <Label htmlFor="late" className="text-sm">
                      {t("afternoon") || "Afternoon"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="evening"
                      checked={formData.shifts.evening}
                      onCheckedChange={(checked) => updateNestedFormData("shifts", "evening", checked)}
                    />
                    <Label htmlFor="evening" className="text-sm">
                      {t("evening") || "Evening"}
                    </Label>
                  </div>
                </div>

                <RadioGroup
                  value={formData.toBeCarriedOut}
                  onValueChange={(value) => updateFormData("toBeCarriedOut", value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="before" id="before" />
                    <Label htmlFor="before" className="text-sm">
                      {t("before") || "Before"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="during" id="during" />
                    <Label htmlFor="during" className="text-sm">
                      {t("during") || "During"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="after" id="after" />
                    <Label htmlFor="after" className="text-sm">
                      {t("after") || "After"}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
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
                    <Label className="text-sm font-medium mb-2 block">{t("startDate") || "Start Date"}</Label>
                    <DateInput
                      value={formData.taskStartDate}
                      onChange={(e) => updateFormData("taskStartDate", e.target.value)}
                      className="w-40"
                      placeholder={t("startDate") || "Start date"}
                    />
                  </div>
                )}

                {((formData.periodicity as string) === "daily" ||
                  (formData.periodicity as string) === "weekly" ||
                  (formData.periodicity as string) === "monthly" ||
                  (formData.periodicity as string) === "yearly") && (
                  <>
                    <div className="mb-4">
                      <Label className="text-sm font-medium mb-2 block">
                        {t("endDate") || "End Date"} ({t("optional") || "optional"})
                      </Label>
                      <DateInput
                        value={formData.taskEndDate}
                        onChange={(e) => updateFormData("taskEndDate", e.target.value)}
                        className="w-40"
                        placeholder={`${t("endDate") || "End date"} (${t("optional") || "optional"})`}
                      />
                    </div>
                    <div className="mb-4">
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
                  </>
                )}

                {(formData.periodicity as string) === "once" && (
                  <div className="mb-4">
                    <Label className="text-sm font-medium mb-2 block">{t("date") || "Date"}</Label>
                    <DateInput
                      value={formData.onceDate}
                      onChange={(e) => updateFormData("onceDate", e.target.value)}
                      className="w-40"
                      placeholder={t("selectDate") || "Select date"}
                    />
                  </div>
                )}

                {(formData.periodicity as string) === "weekly" && (
                  <div>
                    <Label className="text-sm font-medium mb-2 block">{t("selectDays")}</Label>
                    <div className="flex gap-2">
                      {[
                        { key: 0, label: t("dayS"), full: t("sunday") },
                        { key: 1, label: t("dayM"), full: t("monday") },
                        { key: 2, label: t("dayT"), full: t("tuesday") },
                        { key: 3, label: t("dayW"), full: t("wednesday") },
                        { key: 4, label: t("dayT"), full: t("thursday") },
                        { key: 5, label: t("dayF"), full: t("friday") },
                        { key: 6, label: t("dayS"), full: t("saturday") },
                      ].map((day) => (
                        <button
                          key={day.key}
                          type="button"
                          className={`
                            w-8 h-8 flex items-center justify-center text-sm font-medium rounded border-2 transition-all
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
                      </div>
                    </div>

                    {formData.monthlyMode === "dates" && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("monthlyDates")}</Label>
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

                    {formData.monthlyMode === "weekdays" && (
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("monthlyWeekdays")}</Label>
                        <div className="flex flex-wrap gap-3">
                          {[
                            { key: "sunday", label: t("sunday"), value: 0 },
                            { key: "monday", label: t("monday"), value: 1 },
                            { key: "tuesday", label: t("tuesday"), value: 2 },
                            { key: "wednesday", label: t("wednesday"), value: 3 },
                            { key: "thursday", label: t("thursday"), value: 4 },
                            { key: "friday", label: t("friday"), value: 5 },
                            { key: "saturday", label: t("saturday"), value: 6 },
                          ].map((day) => (
                            <div key={day.key} className="flex items-center space-x-2">
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
                              px-3 py-2 text-sm font-medium rounded border-2 transition-all
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
                    shifts: { tomorrow: false, late: false, evening: false },
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
            <Button
              variant="destructive"
              onClick={() => setFormData((prev) => ({ ...prev, tasks: [] }))}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6"
            >
              {t("eliminate") || "Eliminate"}
            </Button>
          </div>

          {formData.tasks.length > 0 && (
            <div className="mt-6">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="text-white" style={{ backgroundColor: "#662D91" }}>
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">
                        {t("toBeCarriedOut") || "To be carried out"}
                      </th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("order") || "Order"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("task") || "Task"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("periodicity") || "Periodicity"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("duration") || "Duration"}</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">{t("alerts") || "Alerts"}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.tasks.map((task, index) => (
                      <tr key={task.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm capitalize">{task.toBeCarriedOut}</td>
                        <td className="px-4 py-2 text-sm">{index + 1}</td>
                        <td className="px-4 py-2 text-sm">{task.task}</td>
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
                          {task.alertTaskCompleted || task.pendingTaskAlert ? "👍" : ""}
                        </td>
                      </tr>
                    ))}
                  </tbody>
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
          <Switch checked={enableSurveys} onCheckedChange={setEnableSurveys} />
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
                    {t("questionText") || "Question Text"}
                  </Label>
                  <Input
                    id="customerQuestionText"
                    value={formData.customerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="customerMonitoringValue" className="text-sm font-medium text-foreground">
                    {t("monitoringValue") || "Monitoring Value"}
                  </Label>
                  <Slider
                    defaultValue={formData.customerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("customerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="customerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Text Alert Tracking"}
                  </Label>
                  <Textarea
                    id="customerTextAlertTracking"
                    value={formData.customerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("customerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="customerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Farewell Text"}
                  </Label>
                  <Textarea
                    id="customerFarewellText"
                    value={formData.customerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("customerSurvey", "farewellText", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label className="text-sm font-medium text-foreground">{t("periodicity") || "Periodicity"}</Label>
                    <Select
                      value={formData.customerSurvey.periodicity}
                      onValueChange={(value) => updateNestedFormData("customerSurvey", "periodicity", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("selectPeriodicity") || "Select periodicity"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
                        <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
                        <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="customerPeriodicityValue" className="text-sm font-medium text-foreground">
                      {t("periodicityValue") || "Periodicity Value"}
                    </Label>
                    <Input
                      id="customerPeriodicityValue"
                      type="number"
                      value={formData.customerSurvey.periodicityValue}
                      onChange={(e) => updateNestedFormData("customerSurvey", "periodicityValue", e.target.value)}
                      className="mt-1 w-24"
                    />
                  </div>

                  <div>
                    <Label htmlFor="customerHour" className="text-sm font-medium text-foreground">
                      {t("hour") || "Hour"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="customerHour"
                        value={formData.customerSurvey.hour}
                        onChange={(e) => updateNestedFormData("customerSurvey", "hour", e.target.value)}
                        placeholder="08:00"
                        className="w-24"
                      />
                      <TimePicker
                        value={formData.customerSurvey.hour}
                        onChange={(time) => updateNestedFormData("customerSurvey", "hour", time)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="worker">
              <div className="space-y-6">
                <div>
                  <Label htmlFor="workerQuestionText" className="text-sm font-medium text-foreground">
                    {t("questionText") || "Question Text"}
                  </Label>
                  <Input
                    id="workerQuestionText"
                    value={formData.workerSurvey.questionText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "questionText", e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <Label htmlFor="workerMonitoringValue" className="text-sm font-medium text-foreground">
                    {t("monitoringValue") || "Monitoring Value"}
                  </Label>
                  <Slider
                    defaultValue={formData.workerSurvey.monitoringValue}
                    max={10}
                    step={1}
                    onValueChange={(value) => updateNestedFormData("workerSurvey", "monitoringValue", value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="workerTextAlertTracking" className="text-sm font-medium text-foreground">
                    {t("textAlertTracking") || "Text Alert Tracking"}
                  </Label>
                  <Textarea
                    id="workerTextAlertTracking"
                    value={formData.workerSurvey.textAlertTracking}
                    onChange={(e) => updateNestedFormData("workerSurvey", "textAlertTracking", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div>
                  <Label htmlFor="workerFarewellText" className="text-sm font-medium text-foreground">
                    {t("farewellText") || "Farewell Text"}
                  </Label>
                  <Textarea
                    id="workerFarewellText"
                    value={formData.workerSurvey.farewellText}
                    onChange={(e) => updateNestedFormData("workerSurvey", "farewellText", e.target.value)}
                    className="mt-1"
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div>
                    <Label className="text-sm font-medium text-foreground">{t("periodicity") || "Periodicity"}</Label>
                    <Select
                      value={formData.workerSurvey.periodicity}
                      onValueChange={(value) => updateNestedFormData("workerSurvey", "periodicity", value)}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder={t("selectPeriodicity") || "Select periodicity"} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
                        <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
                        <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="workerPeriodicityValue" className="text-sm font-medium text-foreground">
                      {t("periodicityValue") || "Periodicity Value"}
                    </Label>
                    <Input
                      id="workerPeriodicityValue"
                      type="number"
                      value={formData.workerSurvey.periodicityValue}
                      onChange={(e) => updateNestedFormData("workerSurvey", "periodicityValue", e.target.value)}
                      className="mt-1 w-24"
                    />
                  </div>

                  <div>
                    <Label htmlFor="workerHour" className="text-sm font-medium text-foreground">
                      {t("hour") || "Hour"}
                    </Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="workerHour"
                        value={formData.workerSurvey.hour}
                        onChange={(e) => updateNestedFormData("workerSurvey", "hour", e.target.value)}
                        placeholder="08:00"
                        className="w-24"
                      />
                      <TimePicker
                        value={formData.workerSurvey.hour}
                        onChange={(time) => updateNestedFormData("workerSurvey", "hour", time)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-[50rem] p-0 gap-0 [&>button]:hidden max-h-[90vh] flex flex-col bg-background ml-1 mr-3">
        <DialogHeader className="p-6 pb-6">
          <div className="flex items-center justify-between relative">
            <div className="flex-1" />
            <div className="absolute left-1/2 transform -translate-x-1/2 mb-3">
              <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
                {t("newJob") || "New Job"}
              </DialogTitle>
            </div>
            <div className="flex-1 flex justify-end">
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
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

        <div className="flex items-center justify-between p-6">
          <Button
            variant="secondary"
            onClick={handlePrevious}
            disabled={currentMainStep === 1 && currentSigningStep === 1}
          >
            {t("previous") || "Previous"}
          </Button>
          {currentMainStep === 3 ? (
            <Button onClick={handleCreate} disabled={isLoading}>
              {isLoading ? t("creating") || "Creating..." : t("create") || "Create"}
            </Button>
          ) : (
            <Button onClick={handleNext}>{t("next") || "Next"}</Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
