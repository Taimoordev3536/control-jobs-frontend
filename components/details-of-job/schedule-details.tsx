"use client"

import { Label } from "@/components/ui/label"
import { useTranslation } from "@/hooks/use-translation"
import { Card } from "@/components/ui/card"

interface ScheduleDetailsProps {
  jobData: any
  isEditable: boolean
}

export function ScheduleDetails({ jobData, isEditable }: ScheduleDetailsProps) {
  const { t } = useTranslation()

  const shifts = jobData?.shifts || []
  const groupedByDay = shifts.reduce((acc: any, shift: any) => {
    if (!acc[shift.day]) {
      acc[shift.day] = []
    }
    acc[shift.day].push(shift)
    return acc
  }, {})

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("schedules") || "Schedules"}</h3>

      <div className="grid gap-4">
        {days.map((day) => {
          const dayShifts = groupedByDay[day] || []
          return (
            <Card key={day} className="p-4">
              <h4 className="font-medium text-foreground mb-3">{day}</h4>
              {dayShifts.length > 0 ? (
                <div className="space-y-2">
                  {dayShifts.map((shift: any, idx: number) => (
                    <div key={idx} className="text-sm text-foreground/80">
                      <span className="font-medium">{shift.shiftType}:</span> {shift.startTime} - {shift.endTime} ({shift.totalHours}h)
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">No shifts scheduled</div>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}
