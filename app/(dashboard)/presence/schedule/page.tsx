"use client"

import { useTranslation } from "@/hooks/use-translation"
import { ScheduleCalendar } from "@/components/schedule/schedule-calendar"

export default function PresenceSchedulePage() {
  const { t } = useTranslation()

  return (
    <div className="w-full p-4 md:p-6 bg-background min-h-screen space-y-3">
      <h1 className="text-2xl font-semibold text-foreground">{t("schedule") || "Programación"}</h1>
      {/* Self-view: uses the logged-in worker's/client's own calendar. */}
      <ScheduleCalendar source={{ mode: "self" }} />
    </div>
  )
}
