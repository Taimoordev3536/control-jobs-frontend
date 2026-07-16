"use client"

import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { TimePicker } from "@/components/ui/time-picker"
import { useTranslation } from "@/hooks/use-translation"
import { FormData, ShiftKey, DayKey } from "./types"
import { SHIFT_KEYS, DAY_KEYS, formatAsYouType, isValidTime, computeMultiDayTotals } from "./utils"

interface SchedulesFormProps {
  formData: FormData
  tempValues: Record<string, string>
  setTempValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  seasonTooltipOpen: boolean
  setSeasonTooltipOpen: (open: boolean) => void
  pairingRegistryRef: React.MutableRefObject<Map<string, string>>
  daysOfWeek: Array<{ key: string; label: string }>
  updateFormData: (field: string, value: any) => void
  updateScheduleTime: (day: string, shift: ShiftKey, timeType: "start" | "end", value: string) => void
  commitValue: (key: string, value: string) => void
  clearCurrentSeasonSchedules: () => void
  // Summer period sourced from the selected client's profile (DD/MM strings).
  // Replaces the previously manual per-job inputs — same shape/naming as the
  // job-side seasonalSchedule.startDate / endDate so the existing job logic
  // can consume it without translation.
  clientSummerPeriod: { startDate: string | null; endDate: string | null } | null
}

export default function SchedulesForm({
  formData,
  tempValues,
  setTempValues,
  seasonTooltipOpen,
  setSeasonTooltipOpen,
  pairingRegistryRef,
  daysOfWeek,
  updateFormData,
  updateScheduleTime,
  commitValue,
  clearCurrentSeasonSchedules,
  clientSummerPeriod,
}: SchedulesFormProps) {
  const { t } = useTranslation()

  const currentSeasonSchedules = formData.schedules[formData.currentSeason]
  const { disabledSlots, pairingRegistry } = computeMultiDayTotals(currentSeasonSchedules, pairingRegistryRef.current)
  pairingRegistryRef.current = pairingRegistry

  // Detect whether the user has actually entered any summer shift cells.
  // Used to decide whether to surface the "missing client period" warning
  // — entering shifts is what makes the client period mandatory.
  const summerHasShifts = (() => {
    const summer = formData.schedules?.summer
    if (!summer) return false
    for (const day of DAY_KEYS) {
      const daySched = (summer as any)[day]
      if (!daySched) continue
      for (const shift of SHIFT_KEYS) {
        const cell = daySched[shift]
        if (cell && (cell.start || cell.end)) return true
      }
    }
    return false
  })()

  const clientPeriodMissing =
    !clientSummerPeriod?.startDate || !clientSummerPeriod?.endDate

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
                      onClick={() => setSeasonTooltipOpen(!seasonTooltipOpen)}
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

        {/* right: when summer selected show read-only season range from client profile */}
        {(formData.scheduleType as string) === "programming" && formData.currentSeason === "summer" && (
          <div className="flex flex-col items-end gap-1 mr-4">
            <div className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                  {t("start") || "Start"}
                </span>
                <Input
                  readOnly
                  tabIndex={-1}
                  placeholder="DD/MM"
                  value={clientSummerPeriod?.startDate || ""}
                  className="h-7 w-20 text-xs text-center bg-muted border-input cursor-not-allowed"
                />
              </div>
              <span className="text-sm mt-3">{t("to") || "to"}</span>
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                  {t("end") || "End"}
                </span>
                <Input
                  readOnly
                  tabIndex={-1}
                  placeholder="DD/MM"
                  value={clientSummerPeriod?.endDate || ""}
                  className="h-7 w-20 text-xs text-center bg-muted border-input cursor-not-allowed"
                />
              </div>
            </div>
            {clientPeriodMissing && summerHasShifts && (
              <span className="text-[10px] text-red-600">
                {t("summerPeriodMissingInClient") || "Summer period missing in client profile"}
              </span>
            )}
          </div>
        )}
      </div>

      {(formData.scheduleType as string) === "programming" && (
        <div className="w-full">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted border-b-[3px] border-[#7547a3]">
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
                                className={`w-[4.5rem] h-6 text-xs text-center pr-7 pl-1 border-input ${parentVal ? "bg-muted" : ""}`}
                                value={shown}
                                onChange={(e) => setTempValues((p) => ({ ...p, [cellKey]: formatAsYouType(e.target.value) }))}
                                onBlur={() => commitValue(cellKey, tempValues[cellKey] || "")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    commitValue(cellKey, tempValues[cellKey] || "")
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
                                className={`w-[4.5rem] h-6 text-xs text-center pr-7 pl-1 border-input ${parentVal ? "bg-muted" : ""}`}
                                value={shown}
                                onChange={(e) => setTempValues((p) => ({ ...p, [cellKey]: formatAsYouType(e.target.value) }))}
                                onBlur={() => commitValue(cellKey, tempValues[cellKey] || "")}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    e.preventDefault()
                                    commitValue(cellKey, tempValues[cellKey] || "")
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
                        ? "bg-muted"
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
            <div className="bg-muted text-sm px-3 py-1 rounded">{formData.totalWeeklyHours || "00:00"}</div>
          </div>
        </div>
      )}
    </div>
  )
}
