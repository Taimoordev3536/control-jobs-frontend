"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Textarea } from "@/components/ui/textarea"
import DateInput from "@/components/ui/date-input"
import TimeField, { isValidDuration } from "@/components/ui/time-field"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { FormData, WorkCenter } from "./types"
import { toISODate, parseDurationToMinutes, minutesToTime } from "./utils"

interface TasksFormProps {
  enableTasks: boolean
  setEnableTasks: (enabled: boolean) => void
  formData: FormData
  updateFormData: (field: string, value: any) => void
  workCenters: WorkCenter[]
  errors: Record<string, string>
  setErrors: (errors: Record<string, string> | ((prev: Record<string, string>) => Record<string, string>)) => void
  onAddTask: () => void
  onRemoveTask: (taskId: string) => void
  onEditTask: (taskId: string) => void
  onCancelEdit: () => void
  editingTaskId: string | null
  dragItemIndex: React.MutableRefObject<number | null>
  dragOverItemIndex: React.MutableRefObject<number | null>
  handleDragStart: (e: React.DragEvent, index: number) => void
  handleDragEnter: (e: React.DragEvent, index: number) => void
  handleDragOver: (e: React.DragEvent) => void
  handleDrop: (e: React.DragEvent) => void
  handleDragEnd: () => void
}

export default function TasksForm({
  enableTasks,
  setEnableTasks,
  formData,
  updateFormData,
  workCenters,
  errors,
  setErrors,
  onAddTask,
  onRemoveTask,
  onEditTask,
  onCancelEdit,
  editingTaskId,
  dragItemIndex,
  dragOverItemIndex,
  handleDragStart,
  handleDragEnter,
  handleDragOver,
  handleDrop,
  handleDragEnd,
}: TasksFormProps) {
  const { t } = useTranslation()

  const tasksTotalMinutes = formData.tasks.reduce(
    (acc, t) => acc + parseDurationToMinutes(t.duration),
    0
  )
  const tasksTotalDisplay = minutesToTime(tasksTotalMinutes)

  const handleClearForm = () => {
    updateFormData("task", "")
    updateFormData("taskObservations", "")
    updateFormData("taskWorkCenterId", "")
    updateFormData("duration", "")
    updateFormData("shifts", { morning: false, afternoon: false, evening: false })
    updateFormData("toBeCarriedOut", "during")
    updateFormData("periodicity", "once")
    updateFormData("taskStartDate", "")
    updateFormData("taskEndDate", "")
    updateFormData("interval", 1)
    updateFormData("onceDate", "")
    updateFormData("weeklyDays", [])
    updateFormData("monthlyDays", [])
    updateFormData("monthlyWeekdays", [])
    updateFormData("monthlyMode", "dates")
    updateFormData("monthlyFirstWeekday", null)
    updateFormData("monthlyLastWeekday", null)
    updateFormData("yearlyMonths", [])
    updateFormData("yearlyDays", [])
    updateFormData("alertTaskCompleted", false)
    updateFormData("pendingTaskAlert", false)
  }

  return (
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
          {/* Work Center Selector */}
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

          {/* Task Name */}
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

          {/* Observations and Duration */}
          <div className="grid gap-8" style={{ gridTemplateColumns: "70% 20%" }}>
            <div>
              <Label htmlFor="taskObservations" className="text-sm font-medium text-foreground flex items-center gap-1">
                {t("observations") || "Observations"}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>{t("taskObservationTips")}</TooltipContent>
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
              <Label htmlFor="duration" className="text-sm font-medium text-foreground flex items-center gap-1">
                {t("duration") || "Duration"}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent>{t("taskDurationTips")}</TooltipContent>
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
              </div>
            </div>
          </div>

          {/* Periodicity */}
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
                {formData.periodicity !== "once" && (
                  <div className="mb-4">
                    <div className="grid grid-cols-3 gap-6 items-end">
                      <div>
                        <Label className="text-sm font-medium mb-2 block">{t("startDate") || "Start Date"}</Label>
                        <DateInput
                          value={formData.taskStartDate}
                          onChange={(e) => updateFormData("taskStartDate", e.target.value)}
                          className="w-36"
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
                          className="w-36"
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
                            {formData.periodicity === "daily"
                              ? formData.interval === 1
                                ? t("day") || "day"
                                : t("days") || "days"
                              : formData.periodicity === "weekly"
                                ? formData.interval === 1
                                  ? t("week") || "week"
                                  : t("weeks") || "weeks"
                                : formData.periodicity === "monthly"
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

                {formData.periodicity === "once" && (
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

                {formData.periodicity === "weekly" && (
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
                                currentDays.filter((d) => d !== day.key)
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

                {formData.periodicity === "monthly" && (
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
                            updateFormData("monthlyWeekdays", [])
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
                            updateFormData("monthlyDays", [])
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
                                    currentDates.filter((d) => d !== date)
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

                    {(formData.monthlyMode === "weekdays" ||
                      formData.monthlyMode === "firstWeekDay" ||
                      formData.monthlyMode === "lastWeekDay") && (
                      <div>
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
                                          currentDays.filter((d) => d !== day.value)
                                        )
                                      }
                                    }}
                                  />
                                  <Label htmlFor={`monthly-${day.key}`} className="text-sm cursor-pointer">
                                    {day.label}
                                  </Label>
                                </>
                              ) : (
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

                {formData.periodicity === "yearly" && (
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
                                  currentMonths.filter((m) => m !== month.value)
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
                                  currentDates.filter((d) => d !== date)
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

          {/* Alert Checkboxes */}
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

          {/* Add/Update/Cancel Buttons */}
          <div className="flex justify-between items-center pt-4">
            <div className="flex gap-2">
              <Button onClick={onAddTask} className="text-white px-6" style={{ backgroundColor: "#662D91" }}>
                {editingTaskId ? (t("update") || "Update") : (t("add") || "Add")}
              </Button>
              <Button variant="outline" onClick={editingTaskId ? onCancelEdit : handleClearForm} className="px-6">
                {t("cancel") || "Cancel"}
              </Button>
            </div>
            {editingTaskId && (
              <span className="text-sm text-blue-600 font-medium">
                {t("editingTask") || "Editing task..."}
              </span>
            )}
          </div>

          {/* Tasks Table */}
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
                              if (
                                (task as any).workCenterId === -1 ||
                                String((task as any).workCenterId) === "-1"
                              )
                                return t("itinereEntrada") || "In itinere - In"
                              if (
                                (task as any).workCenterId === -2 ||
                                String((task as any).workCenterId) === "-2"
                              )
                                return t("itinereSalida") || "In itinere - Out"
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
                                <span title={t("alertTaskCompleted") || "Alert completed"} className="text-green-600">
                                  👍
                                </span>
                              )}
                              {task.pendingTaskAlert && (
                                <span title={t("pendingTaskAlert") || "Pending alert"} className="text-yellow-600">
                                  👎
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                aria-label={`edit-task-${task.id}`}
                                onClick={() => onEditTask(task.id)}
                                className="text-blue-500 hover:text-blue-700 px-2 py-1"
                                title={t("editTask") || "Edit task"}
                              >
                                ✏️
                              </button>
                              <button
                                type="button"
                                aria-label={`delete-task-${task.id}`}
                                onClick={() => onRemoveTask(task.id)}
                                className="text-red-500 hover:text-red-700 px-2 py-1"
                                title={t("deleteTask") || "Delete task"}
                              >
                                ✖
                              </button>
                            </div>
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
                      <td className="px-4 py-2 text-sm font-semibold bg-[#EDE7F6] border-2 border-[#6A1B9A] rounded-lg text-[#4A148C]">
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
}
