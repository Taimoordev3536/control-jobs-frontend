"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  Calendar,
  Clock,
  MapPin,
  Users,
  FileText,
  Bell,
  Smartphone,
  CheckCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Edit,
  Trash2,
  Play,
  Save,
  X,
  Plus,
  Minus,
  ArrowLeft,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface JobDetailViewProps {
  jobId: string
  onBack?: () => void
}

interface Job {
  id: number
  jobName: string
  startDate: string
  endDate: string
  clientId: number
  clientName: string
  workCenterId: number
  workCenterName: string
  workerIds: number[]
  workerNames: string[]
  note: string
  status: string
  createdAt: string
  shifts: Array<{
    day: string
    shiftType: string
    startTime: string
    endTime: string
    totalHours: number
    scheduleType: string
    season: string
  }>
  signingMethods: Array<{
    methodType: string
    methodDetails: string[]
    verifyIdentity: boolean
  }>
  alerts: Array<{
    alertType: string
    triggerTime: string
    minDuration: number
  }>
  tasks: Array<{
    name: string
    note: string
    expectedDuration: number
    shift: string
    timing: string
    periodicity: string
    periodicityValue: string
    alertTask: boolean
    pendingTask: boolean
  }>
  survey: {
    title: string
    description: string
    questions: Array<{
      questionText: string
      questionType: string
      options?: string
      isRequired: boolean
      order: number
    }>
  }
}

export default function JobDetailView({ jobId, onBack }: JobDetailViewProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const router = useRouter()
  const [expandedSection, setExpandedSection] = useState<string | null>(null)
  const [isEditMode, setIsEditMode] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [job, setJob] = useState<Job | null>(null)
  const [editData, setEditData] = useState<Job | null>(null)

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId || !session?.accessToken) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch job")
        }

        const result = await response.json()
        if (result.isSuccess && result.data) {
          setJob(result.data)
          setEditData(result.data)
        } else {
          throw new Error(result.developerError || "Failed to fetch job")
        }
      } catch (error) {
        console.error("Error fetching job:", error)
        // Set sample data for demo
        const sampleJob: Job = {
          id: Number.parseInt(jobId),
          jobName: "Office Cleaning",
          startDate: "2025-07-15",
          endDate: "2025-07-20",
          clientId: 21,
          clientName: "ABC Corporation",
          workCenterId: 2,
          workCenterName: "Downtown Office Complex",
          workerIds: [10],
          workerNames: ["John Smith"],
          note: "Clean all floors and windows.",
          status: "Active",
          createdAt: "2025-07-10T10:30:00Z",
          shifts: [
            {
              day: "Monday",
              shiftType: "morning",
              startTime: "09:00",
              endTime: "13:00",
              totalHours: 4,
              scheduleType: "fixed",
              season: "summer",
            },
          ],
          signingMethods: [
            {
              methodType: "mobile",
              methodDetails: ["qrcode", "wifi"],
              verifyIdentity: true,
            },
          ],
          alerts: [
            {
              alertType: "sign_in",
              triggerTime: "08:00",
              minDuration: 2,
            },
          ],
          tasks: [
            {
              name: "Sweep floors",
              note: "Use eco-friendly products.",
              expectedDuration: 2,
              shift: "morning",
              timing: "before",
              periodicity: "daily",
              periodicityValue: "5",
              alertTask: true,
              pendingTask: false,
            },
          ],
          survey: {
            title: "Job Satisfaction Survey",
            description: "Please fill after job completion.",
            questions: [
              {
                questionText: "How satisfied are you with the job?",
                questionType: "rating",
                options: "1,2,3,4,5",
                isRequired: true,
                order: 1,
              },
            ],
          },
        }
        setJob(sampleJob)
        setEditData(sampleJob)
      } finally {
        setIsLoading(false)
      }
    }

    fetchJob()
  }, [jobId, session?.accessToken])

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section)
  }

  const handleEdit = () => {
    setIsEditMode(true)
    setEditData(job ? { ...job } : null)
  }

  const handleSave = async () => {
    if (!editData || !session?.accessToken) return

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/${jobId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(editData),
      })

      if (response.ok) {
        setJob(editData)
        setIsEditMode(false)
      }
    } catch (error) {
      console.error("Error saving job:", error)
    }
  }

  const handleCancel = () => {
    setEditData(job ? { ...job } : null)
    setIsEditMode(false)
  }

  const updateEditData = (path: string, value: any) => {
    if (!editData) return

    const keys = path.split(".")
    const newData = { ...editData }
    let current: any = newData

    for (let i = 0; i < keys.length - 1; i++) {
      current = current[keys[i]]
    }
    current[keys[keys.length - 1]] = value

    setEditData(newData)
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
      case "Completed":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400"
      case "Pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
      case "Cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
      default:
        return "bg-muted text-muted-foreground"
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  const CollapsibleSection = ({
    title,
    children,
    section,
    icon: Icon,
  }: {
    title: string
    children: React.ReactNode
    section: string
    icon: React.ComponentType<any>
  }) => (
    <Card className="mb-4">
      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => toggleSection(section)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Icon className="h-5 w-5 text-purple-600" />
            <CardTitle className="text-lg">{title}</CardTitle>
            {isEditMode && (
              <Badge
                variant="secondary"
                className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
              >
                {t("editing")}
              </Badge>
            )}
          </div>
          {expandedSection === section ? (
            <ChevronUp className="h-5 w-5 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-5 w-5 text-muted-foreground" />
          )}
        </div>
      </CardHeader>
      {expandedSection === section && <CardContent className="pt-0">{children}</CardContent>}
    </Card>
  )

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!job || !editData) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold mb-2">{t("jobNotFound")}</h2>
          <p className="text-muted-foreground mb-4">{t("jobNotFoundDescription")}</p>
          <Button onClick={onBack || (() => router.back())} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("back")}
          </Button>
        </div>
      </div>
    )
  }

  const currentData = isEditMode ? editData : job

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={onBack || (() => router.back())}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t("back")}
                </Button>
                <div className="flex-1">
                  {isEditMode ? (
                    <Input
                      value={currentData.jobName}
                      onChange={(e) => updateEditData("jobName", e.target.value)}
                      className="text-3xl font-bold border-0 border-b-2 border-purple-500 focus-visible:ring-0 focus-visible:border-purple-700 bg-transparent px-0"
                    />
                  ) : (
                    <h1 className="text-3xl font-bold">{currentData.jobName}</h1>
                  )}
                  <p className="text-muted-foreground mt-1">
                    {t("jobId")}: #{currentData.id}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                {isEditMode ? (
                  <Select value={currentData.status} onValueChange={(value) => updateEditData("status", value)}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">{t("active")}</SelectItem>
                      <SelectItem value="Pending">{t("pending")}</SelectItem>
                      <SelectItem value="Completed">{t("completed")}</SelectItem>
                      <SelectItem value="Cancelled">{t("cancelled")}</SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <Badge className={getStatusColor(currentData.status)}>{t(currentData.status.toLowerCase())}</Badge>
                )}

                {isEditMode ? (
                  <>
                    <Button onClick={handleSave} size="sm" className="bg-green-600 hover:bg-green-700">
                      <Save className="h-4 w-4 mr-2" />
                      {t("save")}
                    </Button>
                    <Button onClick={handleCancel} size="sm" variant="destructive">
                      <X className="h-4 w-4 mr-2" />
                      {t("cancel")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={handleEdit} size="sm" variant="outline">
                      <Edit className="h-4 w-4 mr-2" />
                      {t("edit")}
                    </Button>
                    <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700 bg-transparent">
                      <Trash2 className="h-4 w-4 mr-2" />
                      {t("delete")}
                    </Button>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-center space-x-3">
                <Calendar className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t("duration")}</p>
                  {isEditMode ? (
                    <div className="flex space-x-2">
                      <Input
                        type="date"
                        value={currentData.startDate}
                        onChange={(e) => updateEditData("startDate", e.target.value)}
                        className="text-sm"
                      />
                      <Input
                        type="date"
                        value={currentData.endDate}
                        onChange={(e) => updateEditData("endDate", e.target.value)}
                        className="text-sm"
                      />
                    </div>
                  ) : (
                    <p className="font-medium">
                      {formatDate(currentData.startDate)} - {formatDate(currentData.endDate)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t("workCenter")}</p>
                  {isEditMode ? (
                    <Input
                      value={currentData.workCenterName}
                      onChange={(e) => updateEditData("workCenterName", e.target.value)}
                      className="font-medium"
                    />
                  ) : (
                    <p className="font-medium">{currentData.workCenterName}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <Users className="h-5 w-5 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">{t("assignedWorkers")}</p>
                  {isEditMode ? (
                    <Input
                      value={currentData.workerNames.join(", ")}
                      onChange={(e) => updateEditData("workerNames", e.target.value.split(", "))}
                      className="font-medium"
                    />
                  ) : (
                    <p className="font-medium">{currentData.workerNames.join(", ")}</p>
                  )}
                </div>
              </div>
            </div>

            {(currentData.note || isEditMode) && (
              <div className="mt-6 p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start space-x-3">
                  <FileText className="h-5 w-5 text-purple-600 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="text-sm font-medium text-purple-900 dark:text-purple-100">{t("jobNotes")}</h4>
                    {isEditMode ? (
                      <Textarea
                        value={currentData.note}
                        onChange={(e) => updateEditData("note", e.target.value)}
                        className="w-full mt-1 text-sm bg-transparent border-purple-300 dark:border-purple-700"
                        rows={2}
                        placeholder={t("addJobNotes")}
                      />
                    ) : (
                      <p className="text-sm text-purple-800 dark:text-purple-200 mt-1">{currentData.note}</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shifts Schedule */}
        <CollapsibleSection title={t("shiftsSchedule")} section="shifts" icon={Clock}>
          <div className="space-y-4">
            {currentData.shifts.map((shift, index) => (
              <div key={index} className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1">
                    {isEditMode ? (
                      <>
                        <Select
                          value={shift.day}
                          onValueChange={(value) => updateEditData(`shifts.${index}.day`, value)}
                        >
                          <SelectTrigger className="w-32">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Monday">{t("monday")}</SelectItem>
                            <SelectItem value="Tuesday">{t("tuesday")}</SelectItem>
                            <SelectItem value="Wednesday">{t("wednesday")}</SelectItem>
                            <SelectItem value="Thursday">{t("thursday")}</SelectItem>
                            <SelectItem value="Friday">{t("friday")}</SelectItem>
                            <SelectItem value="Saturday">{t("saturday")}</SelectItem>
                            <SelectItem value="Sunday">{t("sunday")}</SelectItem>
                          </SelectContent>
                        </Select>
                        <Input
                          type="time"
                          value={shift.startTime}
                          onChange={(e) => updateEditData(`shifts.${index}.startTime`, e.target.value)}
                          className="w-24"
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={shift.endTime}
                          onChange={(e) => updateEditData(`shifts.${index}.endTime`, e.target.value)}
                          className="w-24"
                        />
                        <Input
                          type="number"
                          value={shift.totalHours}
                          onChange={(e) =>
                            updateEditData(`shifts.${index}.totalHours`, Number.parseInt(e.target.value))
                          }
                          className="w-20"
                        />
                        <span className="text-muted-foreground">{t("hours")}</span>
                      </>
                    ) : (
                      <>
                        <Badge
                          variant="secondary"
                          className="bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400"
                        >
                          {t(shift.day.toLowerCase())}
                        </Badge>
                        <div className="font-medium">
                          {shift.startTime} - {shift.endTime}
                        </div>
                        <div className="text-muted-foreground">
                          {shift.totalHours} {t("hours")}
                        </div>
                      </>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {isEditMode ? (
                      <Button
                        onClick={() => {
                          const newShifts = currentData.shifts.filter((_, i) => i !== index)
                          updateEditData("shifts", newShifts)
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-800"
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    ) : (
                      <>
                        <span className="text-sm text-muted-foreground capitalize">{t(shift.shiftType)}</span>
                        <span className="text-sm text-muted-foreground">•</span>
                        <span className="text-sm text-muted-foreground capitalize">{t(shift.scheduleType)}</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isEditMode && (
              <Button
                onClick={() => {
                  const newShift = {
                    day: "Monday",
                    shiftType: "morning",
                    startTime: "09:00",
                    endTime: "17:00",
                    totalHours: 8,
                    scheduleType: "fixed",
                    season: "summer",
                  }
                  updateEditData("shifts", [...currentData.shifts, newShift])
                }}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addShift")}
              </Button>
            )}
          </div>
        </CollapsibleSection>

        {/* Tasks */}
        <CollapsibleSection title={t("tasks")} section="tasks" icon={CheckCircle}>
          <div className="space-y-4">
            {currentData.tasks.map((task, index) => (
              <div key={index} className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    {isEditMode ? (
                      <Input
                        value={task.name}
                        onChange={(e) => updateEditData(`tasks.${index}.name`, e.target.value)}
                        className="font-medium mb-2"
                      />
                    ) : (
                      <h4 className="font-medium mb-2">{task.name}</h4>
                    )}

                    {isEditMode ? (
                      <Textarea
                        value={task.note}
                        onChange={(e) => updateEditData(`tasks.${index}.note`, e.target.value)}
                        className="w-full text-sm mb-3"
                        rows={2}
                      />
                    ) : (
                      <p className="text-sm text-muted-foreground mb-3">{task.note}</p>
                    )}

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">{t("duration")}:</span>
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={task.expectedDuration}
                            onChange={(e) =>
                              updateEditData(`tasks.${index}.expectedDuration`, Number.parseInt(e.target.value))
                            }
                            className="ml-2 w-16 h-6 text-xs"
                          />
                        ) : (
                          <span className="ml-2 font-medium">{task.expectedDuration}h</span>
                        )}
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("shift")}:</span>
                        <span className="ml-2 font-medium capitalize">{t(task.shift)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("timing")}:</span>
                        <span className="ml-2 font-medium capitalize">{t(task.timing)}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">{t("frequency")}:</span>
                        <span className="ml-2 font-medium capitalize">{t(task.periodicity)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 ml-4">
                    {isEditMode ? (
                      <>
                        <div className="flex items-center space-x-1">
                          <Checkbox
                            checked={task.alertTask}
                            onCheckedChange={(checked) => updateEditData(`tasks.${index}.alertTask`, checked)}
                          />
                          <span className="text-xs">{t("alert")}</span>
                        </div>
                        <Button
                          onClick={() => {
                            const newTasks = currentData.tasks.filter((_, i) => i !== index)
                            updateEditData("tasks", newTasks)
                          }}
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-800"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </>
                    ) : (
                      <>
                        {task.alertTask && (
                          <Badge
                            variant="secondary"
                            className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400"
                          >
                            {t("alertEnabled")}
                          </Badge>
                        )}
                        {!task.pendingTask && (
                          <Badge
                            variant="secondary"
                            className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                          >
                            {t("active")}
                          </Badge>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isEditMode && (
              <Button
                onClick={() => {
                  const newTask = {
                    name: "New Task",
                    note: "",
                    expectedDuration: 1,
                    shift: "morning",
                    timing: "before",
                    periodicity: "daily",
                    periodicityValue: "1",
                    alertTask: false,
                    pendingTask: false,
                  }
                  updateEditData("tasks", [...currentData.tasks, newTask])
                }}
                variant="outline"
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addTask")}
              </Button>
            )}
          </div>
        </CollapsibleSection>

        {/* Sign-in Methods */}
        <CollapsibleSection title={t("signInMethods")} section="signing" icon={Smartphone}>
          <div className="space-y-4">
            {currentData.signingMethods.map((method, index) => (
              <div key={index} className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium mb-2 capitalize">
                      {method.methodType} {t("signIn")}
                    </h4>
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm text-muted-foreground">{t("methods")}:</span>
                        {method.methodDetails.map((detail, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 capitalize"
                          >
                            {detail}
                          </Badge>
                        ))}
                      </div>
                      {method.verifyIdentity && (
                        <Badge
                          variant="secondary"
                          className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400"
                        >
                          {t("identityVerificationRequired")}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Alerts */}
        <CollapsibleSection title={t("alerts")} section="alerts" icon={Bell}>
          <div className="space-y-4">
            {currentData.alerts.map((alert, index) => (
              <div key={index} className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium mb-2 capitalize">
                      {alert.alertType.replace("_", " ")} {t("alert")}
                    </h4>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <div>
                        <span>{t("triggerTime")}:</span>
                        {isEditMode ? (
                          <Input
                            type="time"
                            value={alert.triggerTime}
                            onChange={(e) => updateEditData(`alerts.${index}.triggerTime`, e.target.value)}
                            className="ml-2 w-24 h-6 text-xs"
                          />
                        ) : (
                          <span className="ml-2 font-medium">{alert.triggerTime}</span>
                        )}
                      </div>
                      <div>
                        <span>{t("minDuration")}:</span>
                        {isEditMode ? (
                          <Input
                            type="number"
                            value={alert.minDuration}
                            onChange={(e) =>
                              updateEditData(`alerts.${index}.minDuration`, Number.parseInt(e.target.value))
                            }
                            className="ml-2 w-20 h-6 text-xs"
                          />
                        ) : (
                          <span className="ml-2 font-medium">
                            {alert.minDuration} {t("minutes")}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400"
                  >
                    {t("active")}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CollapsibleSection>

        {/* Survey */}
        <CollapsibleSection title={t("jobSurvey")} section="survey" icon={MessageSquare}>
          <div className="bg-muted/50 rounded-lg p-4">
            {isEditMode ? (
              <Input
                value={currentData.survey.title}
                onChange={(e) => updateEditData("survey.title", e.target.value)}
                className="font-medium mb-2"
              />
            ) : (
              <h4 className="font-medium mb-2">{currentData.survey.title}</h4>
            )}

            {isEditMode ? (
              <Textarea
                value={currentData.survey.description}
                onChange={(e) => updateEditData("survey.description", e.target.value)}
                className="w-full text-sm mb-4"
                rows={2}
              />
            ) : (
              <p className="text-sm text-muted-foreground mb-4">{currentData.survey.description}</p>
            )}

            <div className="space-y-4">
              {currentData.survey.questions.map((question, index) => (
                <div key={index} className="bg-background rounded-lg p-4 border">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      {isEditMode ? (
                        <Input
                          value={question.questionText}
                          onChange={(e) => updateEditData(`survey.questions.${index}.questionText`, e.target.value)}
                          className="font-medium"
                          placeholder={t("enterQuestionText")}
                        />
                      ) : (
                        <h5 className="font-medium">
                          {question.order}. {question.questionText}
                        </h5>
                      )}
                    </div>

                    <div className="flex items-center space-x-2 ml-4">
                      {isEditMode ? (
                        <>
                          <div className="flex items-center space-x-1">
                            <Checkbox
                              checked={question.isRequired}
                              onCheckedChange={(checked) =>
                                updateEditData(`survey.questions.${index}.isRequired`, checked)
                              }
                            />
                            <span className="text-xs">{t("required")}</span>
                          </div>
                          <Button
                            onClick={() => {
                              const newQuestions = currentData.survey.questions.filter((_, i) => i !== index)
                              updateEditData("survey.questions", newQuestions)
                            }}
                            size="sm"
                            variant="ghost"
                            className="text-red-600 hover:text-red-800"
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        question.isRequired && (
                          <Badge
                            variant="secondary"
                            className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400"
                          >
                            {t("required")}
                          </Badge>
                        )
                      )}
                    </div>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    {isEditMode ? (
                      <div className="flex items-center space-x-4">
                        <Select
                          value={question.questionType}
                          onValueChange={(value) => updateEditData(`survey.questions.${index}.questionType`, value)}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="text">{t("text")}</SelectItem>
                            <SelectItem value="rating">{t("rating")}</SelectItem>
                            <SelectItem value="multiple_choice">{t("multipleChoice")}</SelectItem>
                            <SelectItem value="yes_no">{t("yesNo")}</SelectItem>
                          </SelectContent>
                        </Select>
                        {(question.questionType === "rating" || question.questionType === "multiple_choice") && (
                          <Input
                            value={question.options || ""}
                            onChange={(e) => updateEditData(`survey.questions.${index}.options`, e.target.value)}
                            placeholder={t("optionsCommaSeparated")}
                            className="flex-1"
                          />
                        )}
                      </div>
                    ) : (
                      <>
                        <span className="capitalize">{t(question.questionType)}</span>
                        {question.options && (
                          <span className="ml-2">
                            ({t("options")}: {question.options})
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {isEditMode && (
              <Button
                onClick={() => {
                  const newQuestion = {
                    questionText: "",
                    questionType: "text",
                    options: "",
                    isRequired: false,
                    order: currentData.survey.questions.length + 1,
                  }
                  updateEditData("survey.questions", [...currentData.survey.questions, newQuestion])
                }}
                variant="outline"
                className="w-full mt-4"
              >
                <Plus className="h-4 w-4 mr-2" />
                {t("addQuestion")}
              </Button>
            )}
          </div>
        </CollapsibleSection>

        {/* Action Buttons */}
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {t("createdOn")} {new Date(currentData.createdAt).toLocaleDateString()}
              </div>
              <div className="flex items-center space-x-3">
                {!isEditMode && (
                  <>
                    <Button className="bg-green-600 hover:bg-green-700">
                      <Play className="h-4 w-4 mr-2" />
                      {t("startJob")}
                    </Button>
                    <Button onClick={handleEdit} className="bg-purple-600 hover:bg-purple-700">
                      <Edit className="h-4 w-4 mr-2" />
                      {t("editJob")}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
