// Shared TypeScript interfaces and types for Add Job Modal

export interface AddJobModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onJobAdded?: (job: any) => void
}

export interface TimeSlot {
  start: string
  end: string
  isContinuous?: boolean
}

export interface DaySchedule {
  morning: TimeSlot
  afternoon: TimeSlot
  evening: TimeSlot
  total: string
}

export interface ScheduleData {
  [key: string]: DaySchedule
}

export interface Client {
  id: string | number
  publicId?: string
  name: string
  locality: string
  type: string
  responsible: string
  telephones: string
  asset: string
  isSelf?: boolean
  isEmployer?: boolean
}

export interface WorkCenter {
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

export interface Worker {
  id: number
  name: string
  occupation: string
  telephones: string
  address: string
  asset: string
}

export interface TaskData {
  id: string
  task: string
  workCenterId?: number | null
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
}

export interface SurveyData {
  questionText: string
  monitoringValue: number[]
  textAlertTracking: string
  farewellText: string
  periodicity: "daily" | "weekly" | "monthly"
  periodicityValue: string
  hour: string
  interval: number
  weeklyDays: number[]
  monthlyDays: number[]
  monthlyWeekdays: number[]
  monthlyMode: string
  monthlyFirstWeekday: number | null
  monthlyLastWeekday: number | null
}

export interface FormData {
  denomination: string
  startDate: string
  endDate: string
  clientId: string
  workCenterIds: string[]
  workerIds: string[]
  observations: string
  scheduleType: string
  currentSeason: "normal" | "summer"
  seasonPeriods: Array<{ season: string; startDate: string; endDate: string }>
  schedules: { normal: ScheduleData; summer: ScheduleData }
  totalWeeklyHours: string
  signingMethods: {
    mobile: { qrCode: boolean; wifi: boolean; ip: boolean; gps: boolean }
    laptop: { wifi: boolean; ip: boolean }
    phone: { callerId: boolean }
  }
  verifyIdentity: boolean
  entrance: { whenSigningIn: boolean; delay: boolean; delayValue: string }
  exit: { whenSigningIn: boolean; duration: boolean; durationValue: string }
  task: string
  taskObservations: string
  taskWorkCenterId?: string
  duration: string
  shifts: { morning: boolean; afternoon: boolean; evening: boolean }
  toBeCarriedOut: "during" | "before" | "after"
  periodicity: string
  interval: number
  onceDate: string
  taskStartDate: string
  taskEndDate: string
  weeklyDays: number[]
  monthlyDays: number[]
  monthlyWeekdays: number[]
  monthlyMode: "dates" | "weekdays" | "firstWeekDay" | "lastWeekDay"
  monthlyFirstWeekday: number | null
  monthlyLastWeekday: number | null
  yearlyMonths: number[]
  yearlyDays: number[]
  alertTaskCompleted: boolean
  pendingTaskAlert: boolean
  tasks: TaskData[]
  customerSurvey: SurveyData
  workerSurvey: SurveyData
}

export type ShiftKey = "morning" | "afternoon" | "evening"
export type DayKey = "monday" | "tuesday" | "wednesday" | "thursday" | "friday" | "saturday" | "sunday"

export interface TimeEvent {
  kind: "start" | "end"
  dayIndex: number
  shift: ShiftKey
  minutes: number
}
