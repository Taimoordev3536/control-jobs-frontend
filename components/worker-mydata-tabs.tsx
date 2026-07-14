"use client"

import { useState } from "react"
import { WorkerDataTab } from "@/components/worker-tab/worker-data-tab"
import { AdminCredentials } from "@/components/admin-credentials"
import { useTranslation } from "@/hooks/use-translation"

export function WorkerMyDataTabs() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<"data" | "credentials">("data")

  const tabs: { key: "data" | "credentials"; label: string }[] = [
    { key: "data", label: t("data") || "Data" },
    { key: "credentials", label: t("credentials") || "Credentials" },
  ]

  return (
    <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
      <div className="border-b border-border bg-muted/20">
        <nav className="flex overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.key
                  ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                  : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-2">
        {activeTab === "data" && <WorkerDataTab selfService />}
        {activeTab === "credentials" && <AdminCredentials endpointBase="/users/me" />}
      </div>
    </div>
  )
}
