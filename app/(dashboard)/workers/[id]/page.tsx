"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
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

  const tabs = [
    { key: "data", label: t("data") },
    { key: "calendar", label: t("calendar") },
    { key: "jobs", label: t("jobs") },
    { key: "customers", label: t("clients") },
    { key: "messages", label: t("messages") },
  ]

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-foreground">{t("worker")}</h1>
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

      {/* Tab Content */}
      <div>
        {activeTab === "data" && <WorkerDataTab />}
        {activeTab === "calendar" && <WorkerCalendarTab />}
        {activeTab === "jobs" && <WorkerJobsTab />}
        {activeTab === "customers" && <WorkerClientTab />}
        {activeTab === "messages" && <WorkerMessageTab />}
      </div>
    </div>
  )
}