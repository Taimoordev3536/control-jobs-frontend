"use client"

import { useTranslation } from "@/hooks/use-translation"
import { Card } from "@/components/ui/card"

interface AlertsDetailsProps {
  jobData: any
  isEditable: boolean
}

export function AlertsDetails({ jobData, isEditable }: AlertsDetailsProps) {
  const { t } = useTranslation()

  const alerts = jobData?.alerts || []

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("alerts") || "Alerts"}</h3>

      <div className="grid gap-4">
        {alerts.length > 0 ? (
          alerts.map((alert: any, idx: number) => (
            <Card key={idx} className="p-4">
              <h4 className="font-medium text-foreground mb-3 capitalize">{alert.alertType.replace("_", " ")}</h4>
              <div className="space-y-2 text-sm text-foreground/80">
                <div>
                  <span className="font-medium">Trigger Time:</span> {alert.triggerTime}
                </div>
                <div>
                  <span className="font-medium">Min Duration:</span> {alert.minDuration} minutes
                </div>
              </div>
            </Card>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No alerts configured</div>
        )}
      </div>
    </div>
  )
}
