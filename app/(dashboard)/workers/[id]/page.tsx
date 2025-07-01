



"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { WorkerDataTab } from "@/components/worker-tab/worker-data-tab"
import { WorkerCalendarTab } from "@/components/worker-tab/worker-calendar-tab"
import { WorkerJobsTab } from "@/components/worker-tab/worker-jobs-tab"
import { WorkerClientTab } from "@/components/worker-tab/worker-client-tab"
import { WorkerMessageTab } from "@/components/worker-tab/worker-message-tab"
import { useTranslation } from "@/hooks/use-translation"

export default function WorkerDetailPage() {
   const { t } = useTranslation()
  const params = useParams()
  const [activeTab, setActiveTab] = useState("data")

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("worker")}</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 mb-6">
          <TabsTrigger
            value="data"
            className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600"
          >
           {t("data")}
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600"
          >
            {t("calendar")}
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600"
          >
            {t("jobs")}
          </TabsTrigger>
          <TabsTrigger
            value="customers"
            className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600"
          >
            {t("clients")}
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 data-[state=active]:text-purple-600"
          >
            {t("messages")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="data">
          <WorkerDataTab />
        </TabsContent>

        <TabsContent value="calendar">
          <WorkerCalendarTab />
        </TabsContent>

        <TabsContent value="jobs">
          <WorkerJobsTab />
        </TabsContent>

        <TabsContent value="customers">
          <WorkerClientTab />
        </TabsContent>

        <TabsContent value="messages">
          <WorkerMessageTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
