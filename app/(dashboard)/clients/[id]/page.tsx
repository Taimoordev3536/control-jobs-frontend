



"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ClientDataTab } from "@/components/client-tabs/client-data-tab"
import { ClientWorkCenterTab } from "@/components/client-tabs/client-work-center-tab"
import { ClientJobsTab } from "@/components/client-tabs/client-jobs-tab"
import { ClientWorkerTab } from "@/components/client-tabs/client-worker-tab"
import { ClientMessagesTab } from "@/components/client-tabs/client-messages-tab"
import { useTranslation } from "@/hooks/use-translation"

export default function ClientDetailPage() {
   const { t } = useTranslation()
  const params = useParams()
  const [activeTab, setActiveTab] = useState("data")

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-6 text-foreground">Customer</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-transparent border-b border-border rounded-none h-auto p-0">
          <TabsTrigger
            value="data"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent bg-transparent text-muted-foreground data-[state=active]:text-purple-600 font-medium py-3 px-4"
          >
            {t("data")}
          </TabsTrigger>
          <TabsTrigger
            value="work-centers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent bg-transparent text-muted-foreground data-[state=active]:text-purple-600 font-medium py-3 px-4"
          >
            {t("workCenters")}
          </TabsTrigger>
          <TabsTrigger
            value="jobs"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent bg-transparent text-muted-foreground data-[state=active]:text-purple-600 font-medium py-3 px-4"
          >
            {t("jobs")}
          </TabsTrigger>
          <TabsTrigger
            value="workers"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent bg-transparent text-muted-foreground data-[state=active]:text-purple-600 font-medium py-3 px-4"
          >
           {t("workers")}
          </TabsTrigger>
          <TabsTrigger
            value="messages"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-purple-600 data-[state=active]:bg-transparent bg-transparent text-muted-foreground data-[state=active]:text-purple-600 font-medium py-3 px-4"
          >
            {t("messages")}
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="data" className="mt-0">
            <ClientDataTab clientId={params.id as string} />
          </TabsContent>
          <TabsContent value="work-centers" className="mt-0">
            <ClientWorkCenterTab clientId={params.id as string} />
          </TabsContent>
          <TabsContent value="jobs" className="mt-0">
            <ClientJobsTab clientId={params.id as string} />
          </TabsContent>
          <TabsContent value="workers" className="mt-0">
            <ClientWorkerTab clientId={params.id as string} />
          </TabsContent>
          <TabsContent value="messages" className="mt-0">
            <ClientMessagesTab clientId={params.id as string} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  )
}
