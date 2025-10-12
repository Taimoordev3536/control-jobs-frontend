"use client"

import { useState, useEffect } from "react"
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { DefinitionForm } from "./DefinitionForm"
import { SchedulesForm } from "./SchedulesForm"
import { SigningMethodsForm } from "./SigningMethodsForm"
import { AlertsForm } from "./AlertsForm"
import { TasksForm } from "./TasksForm"
import { SurveysForm } from "./surveysForm"

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

export default function AddJobModal({ open, onOpenChange, onJobAdded }: AddJobModalProps) {
  const [currentMainStep, setCurrentMainStep] = useState(1) // 1: Signings, 2: Tasks, 3: Surveys
  const [currentSigningStep, setCurrentSigningStep] = useState(1) // 1: Definition, 2: Schedules, 3: Signing methods, 4: Alerts
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

  const [formData, setFormData] = useState({
    denomination: "",
    startDate: "",
    endDate: "",
    clientId: "",
  workCenterIds: [] as string[],
    workerIds: [] as string[],
    observations: "",
    scheduleType: "free",
    seasonType: "winter",
    schedules: {
      monday: {
        tomorrow: { start: "", end: "" },
        late: { start: "", end: "" },
        evening: { start: "", end: "" },
        total: "00:00",
      },
      tuesday: {
        tomorrow: { start: "", end: "" },
        late: { start: "", end: "" },
        evening: { start: "", end: "" },
        total: "00:00",
      },
      wednesday: {
        tomorrow: { start: "", end: "" },
        late: { start: "", end: "" },
        evening: { start: "", end: "" },
        total: "00:00",
      },
      thursday: {
        tomorrow: { start: "", end: "" },
        late: { start: "", end: "" },
        evening: { start: "", end: "" },
        total: "00:00",
      },
      friday: {
        tomorrow: { start: "", end: "" },
        late: { start: "", end: "" },
        evening: { start: "", end: "" },
        total: "00:00",
      },
      saturday: {
        tomorrow: { start: "", end: "" },
        late: { start: "", end: "" },
        evening: { start: "", end: "" },
        total: "00:00",
      },
      sunday: {
        tomorrow: { start: "", end: "" },
        late: { start: "", end: "" },
        evening: { start: "", end: "" },
        total: "00:00",
      },
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
    toBeCarriedOut: "during",
    periodicity: "once",
    periodicityDate: "",
    periodicityValue: "1",
    weeklyDays: [] as string[],
    monthlyDay: "1",
    alertTaskCompleted: false,
    pendingTaskAlert: false,
    customerSurvey: {
      questionText: "",
      monitoringValue: [5],
      textAlertTracking: "",
      farewellText: "",
      periodicity: "daily",
      periodicityValue: "1",
      hour: "08:00",
    },
    workerSurvey: {
      questionText: "",
      monitoringValue: [5],
      textAlertTracking: "",
      farewellText: "",
      periodicity: "daily",
      periodicityValue: "1",
      hour: "08:00",
    },
  })

  const mainSteps = [
    { number: 1, label: t("signings") || "Signings" },
    { number: 2, label: t("tasks") || "Tasks" },
    { number: 3, label: t("surveys") || "Surveys" },
  ]

  const signingSteps = [
    { number: 1, label: t("definition") || "Definition" },
    { number: 2, label: t("schedules") || "Schedules" },
    { number: 3, label: t("signingMethods") || "Signing methods" },
    { number: 4, label: t("alerts") || "Alerts" },
  ]

  // Fetch clients on component mount
  useEffect(() => {
    const fetchClients = async () => {
      if (!session?.accessToken) return
      setLoadingClients(true)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          setClients(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching clients:", error)
        setClients([])
      } finally {
        setLoadingClients(false)
      }
    }
    fetchClients()
  }, [session?.accessToken])

  // Fetch workers on component mount
  useEffect(() => {
    const fetchWorkers = async () => {
      if (!session?.accessToken) return
      setLoadingWorkers(true)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          setWorkers(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching workers:", error)
        setWorkers([])
      } finally {
        setLoadingWorkers(false)
      }
    }
    fetchWorkers()
  }, [session?.accessToken])

  // Fetch work centers when client changes
  useEffect(() => {
    const fetchWorkCenters = async () => {
      if (!session?.accessToken || !formData.clientId) {
        setWorkCenters([])
        return
      }
      setLoadingWorkCenters(true)
      try {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${formData.clientId}/work-centers`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          },
        )
        if (response.ok) {
          const data = await response.json()
          setWorkCenters(data.data || [])
        }
      } catch (error) {
        console.error("Error fetching work centers:", error)
        setWorkCenters([])
      } finally {
        setLoadingWorkCenters(false)
      }
    }
    fetchWorkCenters()
  }, [session?.accessToken, formData.clientId])

  // Convert 12-hour time to minutes for calculation
  const timeToMinutes = (timeStr: string): number => {
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
  }

  // Convert minutes back to display format
  const minutesToTime = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}`
  }

  // Calculate total hours for a day
  const calculateDayTotal = (daySchedule: DaySchedule): string => {
    let totalMinutes = 0
    const shifts = [daySchedule.tomorrow, daySchedule.late, daySchedule.evening]
    shifts.forEach((shift) => {
      if (shift.start && shift.end) {
        const startMinutes = timeToMinutes(shift.start)
        const endMinutes = timeToMinutes(shift.end)
        const diffMinutes = endMinutes - startMinutes
        if (diffMinutes > 0) {
          totalMinutes += diffMinutes
        }
      }
    })
    return minutesToTime(totalMinutes)
  }

  // Calculate total weekly hours
  const calculateWeeklyTotal = (): string => {
    let totalMinutes = 0
    Object.values(formData.schedules).forEach((daySchedule) => {
      const dayTotal = calculateDayTotal(daySchedule)
      const [hours, minutes] = dayTotal.split(":").map(Number)
      totalMinutes += hours * 60 + minutes
    })
    return minutesToTime(totalMinutes)
  }

  // Update schedule time and recalculate totals
  const updateScheduleTime = (day: string, shift: string, timeType: "start" | "end", value: string) => {
    const newSchedules = { ...formData.schedules }
    newSchedules[day][shift as keyof DaySchedule][timeType] = value
    newSchedules[day].total = calculateDayTotal(newSchedules[day])
    setFormData((prev: any) => ({
      ...prev,
      schedules: newSchedules,
      totalWeeklyHours: calculateWeeklyTotal(),
    }))
  }

  const handleNext = () => {
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
  }

  const handlePrevious = () => {
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
  }

  const handleCreate = async () => {
    setIsLoading(true)
    try {
      const endDate = formData.endDate || "2126-08-01"
      const shifts: any[] = []
      Object.entries(formData.schedules).forEach(([day, schedule]) => {
        if (schedule.tomorrow.start && schedule.tomorrow.end) {
          shifts.push({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            shiftType: "morning",
            startTime: schedule.tomorrow.start,
            endTime: schedule.tomorrow.end,
            totalHours: Math.floor(
              (timeToMinutes(schedule.tomorrow.end) - timeToMinutes(schedule.tomorrow.start)) / 60,
            ),
            scheduleType: formData.scheduleType === "programming" ? "fixed" : "flexible",
            season: formData.seasonType,
          })
        }
        if (schedule.late.start && schedule.late.end) {
          shifts.push({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            shiftType: "noon",
            startTime: schedule.late.start,
            endTime: schedule.late.end,
            totalHours: Math.floor((timeToMinutes(schedule.late.end) - timeToMinutes(schedule.late.start)) / 60),
            scheduleType: formData.scheduleType === "programming" ? "fixed" : "flexible",
            season: formData.seasonType,
          })
        }
        if (schedule.evening.start && schedule.evening.end) {
          shifts.push({
            day: day.charAt(0).toUpperCase() + day.slice(1),
            shiftType: "evening",
            startTime: schedule.evening.start,
            endTime: schedule.evening.end,
            totalHours: Math.floor((timeToMinutes(schedule.evening.end) - timeToMinutes(schedule.evening.start)) / 60),
            scheduleType: formData.scheduleType === "programming" ? "fixed" : "flexible",
            season: formData.seasonType,
          })
        }
      })

      const signingMethods: any[] = []
      const mobileDetails: string[] = []
      if (formData.signingMethods.mobile.qrCode) mobileDetails.push("qrcode")
      if (formData.signingMethods.mobile.wifi) mobileDetails.push("wifi")
      if (formData.signingMethods.mobile.gps) mobileDetails.push("gps")
      if (mobileDetails.length > 0) {
        signingMethods.push({
          methodType: "mobile",
          methodDetails: mobileDetails,
          verifyIdentity: formData.verifyIdentity,
        })
      }

      const laptopDetails: string[] = []
      if (formData.signingMethods.laptop.ip) laptopDetails.push("ip")
      if (formData.signingMethods.laptop.wifi) laptopDetails.push("wifi")
      if (laptopDetails.length > 0) {
        signingMethods.push({
          methodType: "laptop",
          methodDetails: laptopDetails,
          verifyIdentity: formData.verifyIdentity,
        })
      }

      if (formData.signingMethods.phone.callerId) {
        signingMethods.push({
          methodType: "phone",
          methodDetails: ["callerId"],
          verifyIdentity: formData.verifyIdentity,
        })
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
      if (enableTasks && formData.task) {
        const selectedShifts: string[] = []
        if (formData.shifts.tomorrow) selectedShifts.push("morning")
        if (formData.shifts.late) selectedShifts.push("noon")
        if (formData.shifts.evening) selectedShifts.push("evening")
        tasks.push({
          name: formData.task,
          note: formData.taskObservations,
          expectedDuration: Number.parseInt(formData.duration) || 1,
          shift: selectedShifts[0] || "morning",
          timing: formData.toBeCarriedOut,
          periodicity: formData.periodicity,
          periodicityValue: formData.periodicityValue,
          alertTask: formData.alertTaskCompleted,
          pendingTask: formData.pendingTaskAlert,
        })
      }

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
    workCenterIds: formData.workCenterIds ? formData.workCenterIds.map((id: string) => Number.parseInt(id)) : [],
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
          name: result.data.jobName,
          client: clients.find((c) => c.id === Number.parseInt(formData.clientId))?.name || "",
          workCenter: formData.workCenterIds && formData.workCenterIds.length
            ? workCenters.find((wc) => wc.id === Number.parseInt(formData.workCenterIds[0]))?.name || ""
            : "",
          startDate: formData.startDate,
          endDate: formData.endDate,
          workers: formData.workerIds.map((id) => workers.find((w) => w.id.toString() === id)?.name || ""),
        }
        onJobAdded(newJob)
      }

      onOpenChange(false)
      resetForm()
    } catch (error) {
      console.error("Error creating job:", error)
      toast({
        title: t("errorCreatingJob") || "Error creating job",
        description: error.message || "Something went wrong",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const resetForm = () => {
    setFormData({
      denomination: "",
      startDate: "",
      endDate: "",
      clientId: "",
  workCenterIds: [],
      workerIds: [],
      observations: "",
      scheduleType: "free",
      seasonType: "winter",
      schedules: {
        monday: { tomorrow: { start: "", end: "" }, late: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        tuesday: { tomorrow: { start: "", end: "" }, late: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        wednesday: { tomorrow: { start: "", end: "" }, late: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        thursday: { tomorrow: { start: "", end: "" }, late: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        friday: { tomorrow: { start: "", end: "" }, late: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        saturday: { tomorrow: { start: "", end: "" }, late: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
        sunday: { tomorrow: { start: "", end: "" }, late: { start: "", end: "" }, evening: { start: "", end: "" }, total: "00:00" },
      },
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
      toBeCarriedOut: "during",
      periodicity: "once",
      periodicityDate: "",
      periodicityValue: "1",
      weeklyDays: [],
      monthlyDay: "1",
      alertTaskCompleted: false,
      pendingTaskAlert: false,
      customerSurvey: {
        questionText: "",
        monitoringValue: [5],
        textAlertTracking: "",
        farewellText: "",
        periodicity: "daily",
        periodicityValue: "1",
        hour: "08:00",
      },
      workerSurvey: {
        questionText: "",
        monitoringValue: [5],
        textAlertTracking: "",
        farewellText: "",
        periodicity: "daily",
        periodicityValue: "1",
        hour: "08:00",
      },
    })
    setCurrentMainStep(1)
    setCurrentSigningStep(1)
    setEnableTasks(false)
    setEnableSurveys(false)
    setSurveyTab("customer")
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  const updateNestedFormData = (parent: string, field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [parent]: {
        ...prev[parent],
        [field]: value,
      },
    }))
  }

  const toggleWorkerSelection = (workerId: string) => {
    setFormData((prev: any) => {
      const workerIds = prev.workerIds.includes(workerId)
        ? prev.workerIds.filter((id: string) => id !== workerId)
        : [...prev.workerIds, workerId]
      return { ...prev, workerIds }
    })
  }

  const toggleWorkCenterSelection = (wcId: string) => {
    setFormData((prev: any) => {
      const workCenterIds = prev.workCenterIds.includes(wcId)
        ? prev.workCenterIds.filter((id: string) => id !== wcId)
        : [...prev.workCenterIds, wcId]
      return { ...prev, workCenterIds }
    })
  }

  const isNextDisabled = () => {
    if (currentMainStep === 1) {
      if (currentSigningStep === 1) {
        return (
          !formData.denomination ||
          !formData.startDate ||
          !formData.clientId ||
          !(formData.workCenterIds && formData.workCenterIds.length > 0)
        )
      }
      if (currentSigningStep === 2 && formData.scheduleType === "programming") {
        return !Object.values(formData.schedules).some(
          (day) => day.tomorrow.start || day.late.start || day.evening.start
        )
      }
      if (currentSigningStep === 3) {
        return !Object.values(formData.signingMethods).some(
          (method: any) => Object.values(method).some((v) => v)
        )
      }
    }
    if (currentMainStep === 2 && enableTasks) {
      return !formData.task
    }
    if (currentMainStep === 3 && enableSurveys) {
      return !formData.customerSurvey.questionText && !formData.workerSurvey.questionText
    }
    return false
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) resetForm()
      onOpenChange(isOpen)
    }}>
      <DialogContent className="max-w-4xl p-0 bg-background">
        <DialogHeader className="flex flex-row items-center justify-between px-6 py-4 border-b">
          <DialogTitle className="text-lg font-medium text-foreground">
            {t("addNewJob") || "Add New Job"}
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onOpenChange(false)}
            className="text-foreground hover:bg-muted"
          >
            <X className="h-5 w-5" />
          </Button>
        </DialogHeader>

        <div className="px-6 py-4">
          {/* Main Steps Navigation */}
          <div className="flex justify-center gap-4 mb-6">
            {mainSteps.map((step) => (
              <div
                key={step.number}
                className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer ${
                  currentMainStep === step.number
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80"
                }`}
                onClick={() => {
                  setCurrentMainStep(step.number)
                  if (step.number === 1) setCurrentSigningStep(1)
                }}
              >
                <span className="text-sm font-medium">{step.label}</span>
                {currentMainStep === step.number && (
                  <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                )}
              </div>
            ))}
          </div>

          {/* Signing Steps Navigation (only shown in Signings) */}
          {currentMainStep === 1 && (
            <div className="flex justify-center gap-4 mb-6">
              {signingSteps.map((step) => (
                <div
                  key={step.number}
                  className={`flex items-center gap-2 px-4 py-2 rounded-full cursor-pointer ${
                    currentSigningStep === step.number
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground hover:bg-muted/80"
                  }`}
                  onClick={() => setCurrentSigningStep(step.number)}
                >
                  <span className="text-sm font-medium">{step.label}</span>
                  {currentSigningStep === step.number && (
                    <span className="h-2 w-2 rounded-full bg-primary-foreground" />
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Form Content */}
          <div className="max-h-[60vh] overflow-y-auto px-4">
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
                    toggleWorkerSelection={toggleWorkerSelection}
                    toggleWorkCenterSelection={toggleWorkCenterSelection}
                  />
                )}
                {currentSigningStep === 2 && (
                  <SchedulesForm
                    formData={formData}
                    updateFormData={updateFormData}
                    updateScheduleTime={updateScheduleTime}
                    calculateWeeklyTotal={calculateWeeklyTotal}
                  />
                )}
                {currentSigningStep === 3 && (
                  <SigningMethodsForm
                    formData={formData}
                    setFormData={setFormData}
                    updateFormData={updateFormData}
                  />
                )}
                {currentSigningStep === 4 && (
                  <AlertsForm
                    formData={formData}
                    updateNestedFormData={updateNestedFormData}
                  />
                )}
              </>
            )}
            {currentMainStep === 2 && (
              <TasksForm
                formData={formData}
                updateFormData={updateFormData}
                updateNestedFormData={updateNestedFormData}
                enableTasks={enableTasks}
                setEnableTasks={setEnableTasks}
              />
            )}
            {currentMainStep === 3 && (
              <SurveysForm
                formData={formData}
                updateNestedFormData={updateNestedFormData}
                enableSurveys={enableSurveys}
                setEnableSurveys={setEnableSurveys}
                surveyTab={surveyTab}
                setSurveyTab={setSurveyTab}
              />
            )}
          </div>
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between px-6 py-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentMainStep === 1 && currentSigningStep === 1}
            className="text-foreground hover:bg-muted"
          >
            {t("previous") || "Previous"}
          </Button>
          <div className="flex gap-2">
            {currentMainStep === 3 && (enableSurveys || enableTasks) ? (
              <Button
                onClick={handleCreate}
                disabled={isLoading || isNextDisabled()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {isLoading ? t("creating") || "Creating..." : t("create") || "Create"}
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                disabled={isNextDisabled()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("next") || "Next"}
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}