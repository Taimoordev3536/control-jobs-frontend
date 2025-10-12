"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
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

  const tabs = [
    { key: "data", label: t("data") },
    { key: "work-centers", label: t("workCenters") },
    { key: "jobs", label: t("jobs") },
    { key: "workers", label: t("workers") },
    { key: "messages", label: t("messages") },
  ]

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-3 gap-2">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            {t("customer")}
          </h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] bg-card p-6">
        {activeTab === "data" && <ClientDataTab clientId={params.id as string} />}
        {activeTab === "work-centers" && <ClientWorkCenterTab clientId={params.id as string} />}
        {activeTab === "jobs" && <ClientJobsTab clientId={params.id as string} />}
        {activeTab === "workers" && <ClientWorkerTab clientId={params.id as string} />}
        {activeTab === "messages" && <ClientMessagesTab clientId={params.id as string} />}
      </div>
    </div>
  )
}