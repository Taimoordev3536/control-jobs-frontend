"use client"

import { useState } from "react"
import PartnerDataTab from "@/components/partner-tabs/partner-data-tab"
import { AdminCredentials } from "@/components/admin-credentials"
import { useTranslation } from "@/hooks/use-translation"

export function PartnerMyDataTabs() {
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
                  ? "border-[#662D91] text-[#662D91]"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="p-2">
        {activeTab === "data" && <PartnerDataTab partnerId="" selfService />}
        {activeTab === "credentials" && <AdminCredentials endpointBase="/users/me" />}
      </div>
    </div>
  )
}
