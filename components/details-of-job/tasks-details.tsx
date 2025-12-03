"use client"

import { useTranslation } from "@/hooks/use-translation"
import { Card } from "@/components/ui/card"

interface TasksDetailsProps {
  jobData: any
  isEditable: boolean
}

export function TasksDetails({ jobData, isEditable }: TasksDetailsProps) {
  const { t } = useTranslation()

  const tasks = jobData?.tasks || []

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-center mb-6 underline">{t("tasks") || "Tasks"}</h3>

      <div className="grid gap-4">
        {tasks.length > 0 ? (
          tasks.map((task: any, idx: number) => (
            <Card key={idx} className="p-4">
              <h4 className="font-medium text-foreground mb-3">{task.name}</h4>
              <div className="space-y-2 text-sm text-foreground/80">
                {task.note && (
                  <div>
                    <span className="font-medium">Note:</span> {task.note}
                  </div>
                )}
                <div>
                  <span className="font-medium">Duration:</span> {task.expectedDuration} minutes
                </div>
                <div>
                  <span className="font-medium">Shift:</span> {task.shift}
                </div>
                <div>
                  <span className="font-medium">Timing:</span> {task.timing}
                </div>
                <div>
                  <span className="font-medium">Periodicity:</span> {task.periodicity}
                </div>
                {task.alertTask && <div className="text-amber-600">Alert on task completion enabled</div>}
                {task.pendingTask && <div className="text-amber-600">Pending task alert enabled</div>}
              </div>
            </Card>
          ))
        ) : (
          <div className="text-sm text-muted-foreground">No tasks configured</div>
        )}
      </div>
    </div>
  )
}
