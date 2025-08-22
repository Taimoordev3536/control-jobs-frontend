"use client"

import { useState, useEffect, useCallback, useMemo } from "react"
import { X, Smartphone, Laptop, Phone, Wifi, MapPin, Globe, PhoneCall, QrCode, Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
  workCenterId: "",
  workerIds: [] as string[],
  observations: "",
  scheduleType: "free" as const,
  seasonType: "winter" as const,
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
    mobile: { qrCode: false, wifi: false, gps: false },
    laptop: { ip: false, wifi: false },
    phone: { callerId: false },
  },
  verifyIdentity: false,
  entrance: { whenSigningIn: false, delay: false, delayValue: "10" },
  exit: { whenSigningIn: false, duration: false, durationValue: "30" },
  task: "",
  taskObservations: "",
  duration: "",
  shifts: { tomorrow: false, late: false, evening: false },
  toBeCarriedOut: "during" as const,
  periodicity: "daily" as const,
  periodicityDate: "",
  periodicityValue: "1",
  weeklyDays: [] as string[],
  monthlyDay: "1",
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
    periodicityValue: string
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
  const [loadingWorkCenters, setLoadingWorkCenters] = useState(false)
  const [loadingWorkers, setLoadingWorkers] = useState(false)

  const [formData, setFormData] = useState(createInitialFormData)

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
    if (!formData.clientId) {
      setWorkCenters([])
      return
    }
    setLoadingWorkCenters(true)
    try {
      const data = await fetchWithAuth(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${formData.clientId}/work-centers`,
      )
      setWorkCenters(data?.data || [])
    } catch (error) {
      console.error("Error fetching work centers:", error)
      setWorkCenters([])
    } finally {
      setLoadingWorkCenters(false)
    }
  }, [fetchWithAuth, formData.clientId])

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
      [parent]: { ...prev[parent as keyof typeof prev], [field]: value },
    }))
  }, [])

  const updateScheduleTime = useCallback(
    (day: string, shift: string, timeType: "start" | "end", value: string) => {
      setFormData((prev) => {
        const newSchedules = { ...prev.schedules }
        newSchedules[day][shift as keyof DaySchedule][timeType] = value
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
      periodicityValue: formData.periodicityValue,
      periodicityDate: formData.periodicityDate,
      weeklyDays: formData.weeklyDays,
      monthlyDay: formData.monthlyDay,
      alertTaskCompleted: formData.alertTaskCompleted,
      pendingTaskAlert: formData.pendingTaskAlert,
    }

    setFormData((prev) => ({
      ...prev,
      tasks: [...prev.tasks, newTask],
      // Reset task form fields
      task: "",
      taskObservations: "",
      duration: "",
      shifts: { tomorrow: false, late: false, evening: false },
      toBeCarriedOut: "during",
      periodicity: "daily",
      periodicityValue: "1",
      periodicityDate: "",
      weeklyDays: [],
      monthlyDay: "1",
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
    if (currentMainStep === 1) {
      if (currentSigningStep < 4) {
        setCurrentSigningStep(currentSigningStep + 1)
      } else {
        setCurrentMainStep(2)
        setCurrentSigningStep(1)
      }
    } else if (currentMainStep === 2) {
      setCurrentMainStep(3)
    }
  }, [currentMainStep, currentSigningStep])

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
              scheduleType: formData.scheduleType === "programming" ? "fixed" : "flexible",
              season: formData.seasonType,
            })
          }
        })
      })

      // Build signing methods
      const signingMethods: any[] = []
      const { mobile, laptop, phone } = formData.signingMethods

      const mobileDetails = Object.entries(mobile)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => (key === "qrCode" ? "qrcode" : key))
      if (mobileDetails.length > 0) {
        signingMethods.push({
          methodType: "mobile",
          methodDetails: mobileDetails,
          verifyIdentity: formData.verifyIdentity,
        })
      }

      const laptopDetails = Object.entries(laptop)
        .filter(([_, enabled]) => enabled)
        .map(([key]) => key)
      if (laptopDetails.length > 0) {
        signingMethods.push({
          methodType: "laptop",
          methodDetails: laptopDetails,
          verifyIdentity: formData.verifyIdentity,
        })
      }

      if (phone.callerId) {
        signingMethods.push({
          methodType: "phone",
          methodDetails: ["callerId"],
          verifyIdentity: formData.verifyIdentity,
        })
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
const tasks: any[] = [];
if (enableTasks && formData.tasks.length > 0) {
  formData.tasks.forEach((task) => {
    const selectedShifts = Object.entries(task.shifts)
      .filter(([_, enabled]) => enabled)
      .map(([key]) => (key === "tomorrow" ? "morning" : key === "late" ? "noon" : "evening"));

    const taskPayload = {
      name: task.task,
      note: task.observations,
      expectedDuration: Number.parseInt(task.duration) || 1,
      shift: selectedShifts[0] || "morning",
      timing: task.toBeCarriedOut,
      periodicity: task.periodicity,
      periodicityValue: task.periodicityValue,
      alertTask: task.alertTaskCompleted,
      pendingTask: task.pendingTaskAlert,
    };

    // Conditionally add periodicity fields based on UI logic
    if (task.periodicity === "once" || task.periodicity === "personalized") {
      taskPayload.periodicityDate = task.periodicityDate;
    }
    if (task.periodicity === "weekly") {
      taskPayload.weeklyDays = task.weeklyDays;
    }
    if (task.periodicity === "monthly") {
      taskPayload.monthlyDay = Number(task.monthlyDay); // Ensure number
    }

    tasks.push(taskPayload);
  });
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
        workCenterId: Number.parseInt(formData.workCenterId),
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
                step.number <= currentMainStep ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"
              }`}
            >
              {step.number}
            </div>
            <span
              className={`text-xs mt-1 ${
                step.number === currentMainStep ? "text-purple-600 font-medium" : "text-muted-foreground"
              }`}
            >
              {step.label}
            </span>
          </div>
          {index < mainSteps.length - 1 && (
            <div className={`w-16 h-0.5 mx-2 ${step.number < currentMainStep ? "bg-purple-600" : "bg-muted"}`} />
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
              className={`w-3 h-3 rounded-full ${step.number <= currentSigningStep ? "bg-purple-600" : "bg-muted"}`}
            />
            {index < signingSteps.length - 1 && (
              <div className={`w-8 h-0.5 ${step.number < currentSigningStep ? "bg-purple-600" : "bg-muted"}`} />
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
          placeholder="Enter job name"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startDate" className="text-sm font-medium text-foreground">
            {t("startDate") || "Start Date"}
          </Label>
          <div className="relative">
            <Input
              id="startDate"
              type="date"
              value={formData.startDate}
              onChange={(e) => updateFormData("startDate", e.target.value)}
              className="mt-1"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="endDate" className="text-sm font-medium text-foreground">
            {t("endDate") || "End Date"}
          </Label>
          <div className="relative">
            <Input
              id="endDate"
              type="date"
              value={formData.endDate}
              onChange={(e) => updateFormData("endDate", e.target.value)}
              className="mt-1"
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
          <SelectTrigger className="mt-1">
            <SelectValue placeholder={loadingClients ? "Loading clients..." : "Select a client"} />
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
        <Label htmlFor="workCenter" className="text-sm font-medium text-foreground">
          {t("workCenter") || "Work Center"}
        </Label>
        <Select
          value={formData.workCenterId}
          onValueChange={(value) => updateFormData("workCenterId", value)}
          disabled={!formData.clientId}
        >
          <SelectTrigger className="mt-1">
            <SelectValue
              placeholder={
                !formData.clientId
                  ? "Select a client first"
                  : loadingWorkCenters
                    ? "Loading work centers..."
                    : "Select a work center"
              }
            />
          </SelectTrigger>
          <SelectContent>
            {workCenters.map((center) => (
              <SelectItem key={center.id} value={center.id.toString()}>
                {center.name} - {center.address}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label className="text-sm font-medium text-foreground flex items-center gap-1">
          {t("workers") || "Workers"}
          <Info className="w-4 h-4 text-muted-foreground" />
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
          className="mt-1"
          rows={3}
        />
      </div>
    </div>
  )

  const renderSchedulesStep = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("schedules") || "Schedules"}</h3>

      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{t("free") || "Free"}</span>
          <Switch
            checked={formData.scheduleType === "programming"}
            onCheckedChange={(checked) => updateFormData("scheduleType", checked ? "programming" : "free")}
          />
          <span className="text-sm font-medium">{t("programming") || "Programming"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-medium">{t("winter") || "Winter"}</span>
          <Switch
            checked={formData.seasonType === "summer"}
            onCheckedChange={(checked) => updateFormData("seasonType", checked ? "summer" : "winter")}
          />
          <span className="text-sm font-medium">{t("summer") || "Summer"}</span>
        </div>
      </div>

      {formData.scheduleType === "programming" && (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-border">
            <thead>
              <tr className="bg-muted/50">
                <th className="border border-border p-3 text-left font-medium text-foreground">{t("day") || "Day"}</th>
                <th className="border border-border p-3 text-center font-medium text-foreground">
                  {t("morning") || "Morning"}
                </th>
                <th className="border border-border p-3 text-center font-medium text-foreground">
                  {t("afternoon") || "Afternoon"}
                </th>
                <th className="border border-border p-3 text-center font-medium text-foreground">
                  {t("evening") || "Evening"}
                </th>
                <th className="border border-border p-3 text-center font-medium text-foreground">Total</th>
              </tr>
            </thead>
            <tbody>
              {daysOfWeek.map((day) => (
                <tr key={day.key} className="hover:bg-muted/30">
                  <td className="border border-border p-3 font-medium text-foreground bg-muted/20">{day.label}</td>
                  <td className="border border-border p-2 bg-background">
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        placeholder="--:--"
                        className="w-16 text-xs text-center bg-background border-input"
                        value={formData.schedules[day.key]?.tomorrow?.start || ""}
                        readOnly
                      />
                      <TimePicker
                        value={formData.schedules[day.key]?.tomorrow?.start}
                        onChange={(time) => updateScheduleTime(day.key, "tomorrow", "start", time)}
                      />
                      <span className="text-xs text-muted-foreground">-</span>
                      <Input
                        placeholder="--:--"
                        className="w-16 text-xs text-center bg-background border-input"
                        value={formData.schedules[day.key]?.tomorrow?.end || ""}
                        readOnly
                      />
                      <TimePicker
                        value={formData.schedules[day.key]?.tomorrow?.end}
                        onChange={(time) => updateScheduleTime(day.key, "tomorrow", "end", time)}
                      />
                    </div>
                  </td>
                  <td className="border border-border p-2 bg-background">
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        placeholder="--:--"
                        className="w-16 text-xs text-center bg-background border-input"
                        value={formData.schedules[day.key]?.late?.start || ""}
                        readOnly
                      />
                      <TimePicker
                        value={formData.schedules[day.key]?.late?.start}
                        onChange={(time) => updateScheduleTime(day.key, "late", "start", time)}
                      />
                      <span className="text-xs text-muted-foreground">-</span>
                      <Input
                        placeholder="--:--"
                        className="w-16 text-xs text-center bg-background border-input"
                        value={formData.schedules[day.key]?.late?.end || ""}
                        readOnly
                      />
                      <TimePicker
                        value={formData.schedules[day.key]?.late?.end}
                        onChange={(time) => updateScheduleTime(day.key, "late", "end", time)}
                      />
                    </div>
                  </td>
                  <td className="border border-border p-2 bg-background">
                    <div className="flex items-center gap-1 justify-center">
                      <Input
                        placeholder="--:--"
                        className="w-16 text-xs text-center bg-background border-input"
                        value={formData.schedules[day.key]?.evening?.start || ""}
                        readOnly
                      />
                      <TimePicker
                        value={formData.schedules[day.key]?.evening?.start}
                        onChange={(time) => updateScheduleTime(day.key, "evening", "start", time)}
                      />
                      <span className="text-xs text-muted-foreground">-</span>
                      <Input
                        placeholder="--:--"
                        className="w-16 text-xs text-center bg-background border-input"
                        value={formData.schedules[day.key]?.evening?.end || ""}
                        readOnly
                      />
                      <TimePicker
                        value={formData.schedules[day.key]?.evening?.end}
                        onChange={(time) => updateScheduleTime(day.key, "evening", "end", time)}
                      />
                    </div>
                  </td>
                  <td className="border border-border p-3 text-center font-mono text-foreground bg-muted/10">
                    {formData.schedules[day.key]?.total || "00:00"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="mt-4 text-right">
            <div className="inline-block border border-border p-3 bg-muted/50 font-mono font-bold text-foreground rounded">
              {calculateWeeklyTotal()}
            </div>
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
                      ...prev.signingMethods,
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
                      ...prev.signingMethods,
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
                id="mobile-gps"
                checked={formData.signingMethods.mobile.gps}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      ...prev.signingMethods,
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

        {/* Laptop */}
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Laptop className="w-12 h-12 text-foreground" />
          </div>
          <div className="flex gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="laptop-ip"
                checked={formData.signingMethods.laptop.ip}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      ...prev.signingMethods,
                      laptop: { ...prev.signingMethods.laptop, ip: !!checked },
                    },
                  }))
                }
              />
              <div className="flex flex-col items-center">
                <Globe className="w-8 h-8 mb-1" />
                <Label htmlFor="laptop-ip" className="text-sm">
                  IP
                </Label>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="laptop-wifi"
                checked={formData.signingMethods.laptop.wifi}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      ...prev.signingMethods,
                      laptop: { ...prev.signingMethods.laptop, wifi: !!checked },
                    },
                  }))
                }
              />
              <div className="flex flex-col items-center">
                <Wifi className="w-8 h-8 mb-1" />
                <Label htmlFor="laptop-wifi" className="text-sm">
                  Wifi
                </Label>
              </div>
            </div>
          </div>
        </div>

        {/* Phone */}
        <div className="flex items-center gap-8">
          <div className="w-20 h-20 flex items-center justify-center">
            <Phone className="w-12 h-12 text-foreground" />
          </div>
          <div className="flex gap-8">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="phone-caller"
                checked={formData.signingMethods.phone.callerId}
                onCheckedChange={(checked) =>
                  setFormData((prev) => ({
                    ...prev,
                    signingMethods: {
                      ...prev.signingMethods,
                      phone: { ...prev.signingMethods.phone, callerId: !!checked },
                    },
                  }))
                }
              />
              <div className="flex flex-col items-center">
                <PhoneCall className="w-8 h-8 mb-1" />
                <Label htmlFor="phone-caller" className="text-sm">
                  Caller ID
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-3">
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
            <h4 className="font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded">
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
            <div className="inline-flex items-center justify-center w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-lg mb-3">
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
            <h4 className="font-medium text-purple-600 dark:text-purple-400 bg-purple-100 dark:bg-purple-900/30 px-3 py-1 rounded">
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
              className="mt-1"
              rows={3}
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
                {/* <Select value={formData.periodicity} onValueChange={(value) => updateFormData("periodicity", value)}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
                    <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
                    <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
                    <SelectItem value="annual">{t("annual") || "Annual"}</SelectItem>
                    <SelectItem value="once">{t("once") || "Once"}</SelectItem>
                    <SelectItem value="personalize">{t("personalize") || "Personalize"}</SelectItem>
                  </SelectContent>
                </Select> */}
                <Select value={formData.periodicity} onValueChange={(value) => updateFormData("periodicity", value)}>
  <SelectTrigger className="w-40">
    <SelectValue />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
    <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
    <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
    <SelectItem value="annually">{t("annual") || "Annual"}</SelectItem>
    <SelectItem value="once">{t("once") || "Once"}</SelectItem>
    <SelectItem value="personalized">{t("personalize") || "Personalize"}</SelectItem>
  </SelectContent>
</Select>

                {/* Show different UI based on periodicity type */}
                {(formData.periodicity === "daily" ||
                  formData.periodicity === "weekly" ||
                  formData.periodicity === "monthly" ||
                  formData.periodicity === "annual") && (
                  <>
                    <span className="text-sm">each</span>
                    <Input
                      type="number"
                      value={formData.periodicityValue}
                      onChange={(e) => updateFormData("periodicityValue", e.target.value)}
                      className="w-16"
                      min="1"
                    />
                    <span className="text-sm">
                      {formData.periodicity === "daily"
                        ? "days"
                        : formData.periodicity === "weekly"
                          ? "weeks"
                          : formData.periodicity === "monthly"
                            ? "months"
                            : "years"}
                    </span>
                  </>
                )}

                {(formData.periodicity === "once" || formData.periodicity === "personalize") && (
                  <>
                    <span className="text-sm">the</span>
                    <Input
                      type="date"
                      value={formData.periodicityDate}
                      onChange={(e) => updateFormData("periodicityDate", e.target.value)}
                      className="w-40"
                    />
                  </>
                )}
              </div>

              {/* Weekly days selection */}
              {formData.periodicity === "weekly" && (
                <div className="mt-2 flex gap-2">
                  {[
                    { key: "L", label: "L" },
                    { key: "M", label: "M" },
                    { key: "X", label: "X" },
                    { key: "J", label: "J" },
                    { key: "V", label: "V" },
                    { key: "S", label: "S" },
                    { key: "D", label: "D" },
                  ].map((day) => (
                    <div key={day.key} className="flex items-center space-x-1">
                      <Checkbox
                        id={`day-${day.key}`}
                        checked={formData.weeklyDays?.includes(day.key) || false}
                        onCheckedChange={(checked) => {
                          const currentDays = formData.weeklyDays || []
                          if (checked) {
                            updateFormData("weeklyDays", [...currentDays, day.key])
                          } else {
                            updateFormData(
                              "weeklyDays",
                              currentDays.filter((d) => d !== day.key),
                            )
                          }
                        }}
                      />
                      <Label htmlFor={`day-${day.key}`} className="text-xs">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              )}

              {/* Monthly day selection */}
              {formData.periodicity === "monthly" && (
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-sm">The day</span>
                  <Input
                    type="number"
                    value={formData.monthlyDay}
                    onChange={(e) => updateFormData("monthlyDay", e.target.value)}
                    className="w-16"
                    min="1"
                    max="31"
                  />
                </div>
              )}
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
              <Button onClick={addTaskToList} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
                Add
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
                    periodicity: "daily",
                    periodicityValue: "1",
                    periodicityDate: "",
                    weeklyDays: [],
                    monthlyDay: "1",
                    alertTaskCompleted: false,
                    pendingTaskAlert: false,
                  }))
                }}
                className="px-6"
              >
                Cancel
              </Button>
            </div>
            <Button
              variant="destructive"
              onClick={() => setFormData((prev) => ({ ...prev, tasks: [] }))}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-6"
            >
              Eliminate
            </Button>
          </div>

          {formData.tasks.length > 0 && (
            <div className="mt-6">
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-purple-600 text-white">
                    <tr>
                      <th className="px-4 py-2 text-left text-sm font-medium">To be carried out</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Order</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Task</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Periodicity</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Duration</th>
                      <th className="px-4 py-2 text-left text-sm font-medium">Alerts</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.tasks.map((task, index) => (
                      <tr key={task.id} className="border-t hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm capitalize">{task.toBeCarriedOut}</td>
                        <td className="px-4 py-2 text-sm">{index + 1}</td>
                        <td className="px-4 py-2 text-sm">{task.task}</td>
                        <td className="px-4 py-2 text-sm">
                          {task.periodicity === "once" || task.periodicity === "personalize"
                            ? task.periodicityDate
                            : `Every ${task.periodicityValue} ${
                                task.periodicity === "daily"
                                  ? "day" + (task.periodicityValue !== "1" ? "s" : "")
                                  : task.periodicity === "weekly"
                                    ? "week" + (task.periodicityValue !== "1" ? "s" : "")
                                    : task.periodicity === "monthly"
                                      ? "month" + (task.periodicityValue !== "1" ? "s" : "")
                                      : task.periodicity === "annual"
                                        ? "year" + (task.periodicityValue !== "1" ? "s" : "")
                                        : ""
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
          <span className="text-sm">{t("si") || "Yes"}</span>
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
      <DialogContent className="max-w-5xl p-0 gap-0 [&>button]:hidden max-h-[90vh] flex flex-col bg-background">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium text-foreground">{t("newJob") || "New Job"}</DialogTitle>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
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
