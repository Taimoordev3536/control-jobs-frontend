"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { DefinitionDetails } from "./definition-details"
import { ScheduleDetails } from "./schedule-details"
import { SigningMethodsDetails } from "./signing-methods-details"
import { AlertsDetails } from "./alerts-details"
import { TasksDetails } from "./tasks-details"
import { SurveysDetails } from "./surveys-details"

interface JobDetailsViewProps {
  jobData: any
  clients: any[]
  workCenters: any[]
  workers: any[]
}

export function JobDetailsView({ jobData, clients, workCenters, workers }: JobDetailsViewProps) {
  const [isEditable, setIsEditable] = useState(false)
  const [editedData, setEditedData] = useState(jobData)
  const { t } = useTranslation()

  const handleUpdate = (field: string, value: any) => {
    setEditedData((prev: any) => ({
      ...prev,
      [field]: value,
    }))
  }

  const handleSave = async () => {
    // TODO: Implement save functionality
    setIsEditable(false)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-foreground">{jobData?.jobName || "Job Details"}</h2>
        <Button
          onClick={() => {
            if (isEditable) {
              handleSave()
            } else {
              setIsEditable(true)
            }
          }}
          variant={isEditable ? "default" : "outline"}
        >
          {isEditable ? t("save") || "Save" : t("edit") || "Edit"}
        </Button>
      </div>

      <Tabs defaultValue="definition" className="w-full">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="definition">{t("definition") || "Definition"}</TabsTrigger>
          <TabsTrigger value="schedule">{t("schedules") || "Schedule"}</TabsTrigger>
          <TabsTrigger value="signing">{t("signingMethods") || "Signing"}</TabsTrigger>
          <TabsTrigger value="alerts">{t("alerts") || "Alerts"}</TabsTrigger>
          <TabsTrigger value="tasks">{t("tasks") || "Tasks"}</TabsTrigger>
          <TabsTrigger value="surveys">{t("surveys") || "Surveys"}</TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="definition">
            <DefinitionDetails
              jobData={editedData}
              clients={clients}
              workCenters={workCenters}
              workers={workers}
              isEditable={isEditable}
              onUpdate={handleUpdate}
            />
          </TabsContent>

          <TabsContent value="schedule">
            <ScheduleDetails jobData={editedData} isEditable={isEditable} />
          </TabsContent>

          <TabsContent value="signing">
            <SigningMethodsDetails jobData={editedData} isEditable={isEditable} />
          </TabsContent>

          <TabsContent value="alerts">
            <AlertsDetails jobData={editedData} isEditable={isEditable} />
          </TabsContent>

          <TabsContent value="tasks">
            <TasksDetails jobData={editedData} isEditable={isEditable} />
          </TabsContent>

          <TabsContent value="surveys">
            <SurveysDetails jobData={editedData} isEditable={isEditable} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
