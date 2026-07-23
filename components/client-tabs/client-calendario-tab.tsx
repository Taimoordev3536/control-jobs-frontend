"use client"

import { ScheduleCalendar } from "@/components/schedule/schedule-calendar"

interface ClientCalendarioTabProps {
  clientId: string
}

// The employer's view of one client's job schedule. Reuses the same calendar
// component as the client/worker self-view (Presence > Schedule) so both look
// and behave identically — only the data source (this client's id) differs.
export function ClientCalendarioTab({ clientId }: ClientCalendarioTabProps) {
  return (
    <div className="p-2">
      <ScheduleCalendar source={{ mode: "client", clientId }} />
    </div>
  )
}
