"use client"

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { TimePicker } from "@/components/ui/time-picker"
import { Info } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface TasksFormProps {
  formData: any
  updateFormData: (field: string, value: any) => void
  updateNestedFormData: (parent: string, field: string, value: any) => void
  enableTasks: boolean
  setEnableTasks: (value: boolean) => void
}

export function TasksForm({
  formData,
  updateFormData,
  updateNestedFormData,
  enableTasks,
  setEnableTasks,
}: TasksFormProps) {
  const { t } = useTranslation()

  // Map Sunday=0 ... Saturday=6 per backend
  const daysOfWeek = [
    { key: 0, label: t("sunday") || "Sunday" },
    { key: 1, label: t("monday") || "Monday" },
    { key: 2, label: t("tuesday") || "Tuesday" },
    { key: 3, label: t("wednesday") || "Wednesday" },
    { key: 4, label: t("thursday") || "Thursday" },
    { key: 5, label: t("friday") || "Friday" },
    { key: 6, label: t("saturday") || "Saturday" },
  ]

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-medium mb-4">{t("introduceTasksNow") || "Introduce tasks now?"}</h3>
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm">{t("no") || "No"}</span>
          <Switch checked={enableTasks} onCheckedChange={setEnableTasks} />
          <span className="text-sm">{t("si") || "Yes"}</span>
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
            <Label
              htmlFor="taskObservations"
              className="text-sm font-medium text-foreground flex items-center gap-1"
            >
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
                  placeholder="03:32"
                  className="w-24"
                />
                <TimePicker value={formData.duration} onChange={(time) => updateFormData("duration", time)} />
              </div>
            </div>

            <div className="space-y-2">
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
                      {t("tomorrow") || "Morning"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="late"
                      checked={formData.shifts.late}
                      onCheckedChange={(checked) => updateNestedFormData("shifts", "late", checked)}
                    />
                    <Label htmlFor="late" className="text-sm">
                      {t("late") || "Afternoon"}
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
                  defaultValue={formData.toBeCarriedOut}
                  onValueChange={(value) => updateFormData("toBeCarriedOut", value)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="before"
                      id="before"
                      className="peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <Label htmlFor="before" className="text-sm peer-data-[state=checked]:text-primary">
                      {t("before") || "Before"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="during"
                      id="during"
                      className="peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <Label htmlFor="during" className="text-sm peer-data-[state=checked]:text-primary">
                      {t("during") || "During"}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="after"
                      id="after"
                      className="peer h-4 w-4 shrink-0 rounded-full border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground"
                    />
                    <Label htmlFor="after" className="text-sm peer-data-[state=checked]:text-primary">
                      {t("after") || "After"}
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-foreground flex items-center gap-1">
                {t("periodicity") || "Periodicity"}
                <Info className="w-4 h-4 text-muted-foreground" />
              </Label>
              <Select
                value={formData.periodicity}
                onValueChange={(value) => updateFormData("periodicity", value)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder={t("selectPeriodicity") || "Select periodicity"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="once">{t("once") || "Once"}</SelectItem>
                  <SelectItem value="daily">{t("daily") || "Daily"}</SelectItem>
                  <SelectItem value="weekly">{t("weekly") || "Weekly"}</SelectItem>
                  <SelectItem value="monthly">{t("monthly") || "Monthly"}</SelectItem>
                  <SelectItem value="yearly">{t("yearly") || "Yearly"}</SelectItem>
                </SelectContent>
              </Select>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="taskStartDate" className="text-sm font-medium text-foreground">{t("startDate") || "Start date"}</Label>
                  <Input id="taskStartDate" type="date" value={formData.startDate || ""} onChange={(e) => updateFormData("startDate", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="taskEndDate" className="text-sm font-medium text-foreground">{t("endDate") || "End date"}</Label>
                  <Input id="taskEndDate" type="date" value={formData.endDate || ""} onChange={(e) => updateFormData("endDate", e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label htmlFor="taskInterval" className="text-sm font-medium text-foreground">{t("interval") || "Interval"}</Label>
                  <Input id="taskInterval" type="number" min={1} value={formData.interval ?? 1} onChange={(e) => updateFormData("interval", e.target.value)} className="mt-1" />
                </div>
              </div>
            </div>

            {formData.periodicity === "once" && (
              <div>
                <Label htmlFor="onceDate" className="text-sm font-medium text-foreground">
                  {t("onceDate") || "Once date"}
                </Label>
                <Input
                  id="onceDate"
                  type="date"
                  value={formData.onceDate || ""}
                  onChange={(e) => updateFormData("onceDate", e.target.value)}
                  className="mt-1"
                />
              </div>
            )}

            {formData.periodicity === "daily" && (
              <div className="text-sm text-muted-foreground">{t("runsEveryInterval") || "Runs every interval days between start and end dates"}</div>
            )}

            {formData.periodicity === "weekly" && (
              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("weeklyDays") || "Weekly Days"}
                </Label>
                <div className="mt-1 space-y-1">
                  {daysOfWeek.map((day) => (
                    <div key={day.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={`weekly-${day.key}`}
                        checked={Array.isArray(formData.weeklyDays) && formData.weeklyDays.includes(day.key)}
                        onCheckedChange={(checked) => {
                          const safe = Array.isArray(formData.weeklyDays) ? formData.weeklyDays : []
                          const newDays = checked
                            ? [...safe, day.key]
                            : safe.filter((d: number) => d !== day.key)
                          updateFormData("weeklyDays", newDays)
                        }}
                      />
                      <Label htmlFor={`weekly-${day.key}`} className="text-sm">
                        {day.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {formData.periodicity === "monthly" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="monthlyDaysCsv" className="text-sm font-medium text-foreground">
                    {t("monthlyDays") || "Monthly Days (comma-separated)"}
                  </Label>
                  <Input
                    id="monthlyDaysCsv"
                    placeholder="1,15"
                    value={formData.monthlyDaysCsv || ""}
                    onChange={(e) => updateFormData("monthlyDaysCsv", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label className="text-sm font-medium text-foreground">{t("monthlyWeekdays") || "Monthly Weekdays"}</Label>
                  <div className="mt-1 space-y-1">
                    {daysOfWeek.map((day) => (
                      <div key={`mwd-${day.key}`} className="flex items-center space-x-2">
                        <Checkbox
                          id={`mwd-${day.key}`}
                          checked={Array.isArray(formData.monthlyWeekdays) && formData.monthlyWeekdays.includes(day.key)}
                          onCheckedChange={(checked) => {
                            const safe = Array.isArray(formData.monthlyWeekdays) ? formData.monthlyWeekdays : []
                            const newDays = checked
                              ? [...safe, day.key]
                              : safe.filter((d: number) => d !== day.key)
                            updateFormData("monthlyWeekdays", newDays)
                          }}
                        />
                        <Label htmlFor={`mwd-${day.key}`} className="text-sm">{day.label}</Label>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {formData.periodicity === "yearly" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="yearlyMonthsCsv" className="text-sm font-medium text-foreground">
                    {t("yearlyMonths") || "Yearly Months (1-12, comma-separated)"}
                  </Label>
                  <Input
                    id="yearlyMonthsCsv"
                    placeholder="9"
                    value={formData.yearlyMonthsCsv || ""}
                    onChange={(e) => updateFormData("yearlyMonthsCsv", e.target.value)}
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="yearlyDaysCsv" className="text-sm font-medium text-foreground">
                    {t("yearlyDays") || "Yearly Days (1-31, comma-separated)"}
                  </Label>
                  <Input
                    id="yearlyDaysCsv"
                    placeholder="3"
                    value={formData.yearlyDaysCsv || ""}
                    onChange={(e) => updateFormData("yearlyDaysCsv", e.target.value)}
                    className="mt-1"
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between mt-8">
              <div className="flex items-center gap-2">
                <span className="text-sm">{t("alertTaskCompleted") || "Alert Task Completed"}</span>
                <Switch
                  checked={formData.alertTaskCompleted}
                  onCheckedChange={(checked) => updateFormData("alertTaskCompleted", checked)}
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm">{t("pendingTaskAlert") || "Pending Task Alert"}</span>
                <Switch
                  checked={formData.pendingTaskAlert}
                  onCheckedChange={(checked) => updateFormData("pendingTaskAlert", checked)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}