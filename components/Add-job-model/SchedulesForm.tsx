"use client"

import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TimePicker } from "@/components/ui/time-picker"
import { useTranslation } from "@/hooks/use-translation"

interface DaySchedule {
  tomorrow: { start: string; end: string }
  late: { start: string; end: string }
  evening: { start: string; end: string }
  total: string
}

interface ScheduleData {
  [key: string]: DaySchedule
}

interface SchedulesFormProps {
  formData: any
  updateFormData: (field: string, value: any) => void
  updateScheduleTime: (day: string, shift: string, timeType: "start" | "end", value: string) => void
  calculateWeeklyTotal: () => string
}

export function SchedulesForm({
  formData,
  updateFormData,
  updateScheduleTime,
  calculateWeeklyTotal,
}: SchedulesFormProps) {
  const { t } = useTranslation()

  const daysOfWeek = [
    { key: "monday", label: t("monday") || "Monday" },
    { key: "tuesday", label: t("tuesday") || "Tuesday" },
    { key: "wednesday", label: t("wednesday") || "Wednesday" },
    { key: "thursday", label: t("thursday") || "Thursday" },
    { key: "friday", label: t("friday") || "Friday" },
    { key: "saturday", label: t("saturday") || "Saturday" },
    { key: "sunday", label: t("sunday") || "Sunday" },
  ]

  return (
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
                <th className="border border-border p-3 text-left font-medium text-foreground">
                  {t("day") || "Day"}
                </th>
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
                  <td className="border border-border p-3 font-medium text-foreground bg-muted/20">
                    {day.label}
                  </td>
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
}
