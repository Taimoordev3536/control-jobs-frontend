"use client"

import { useState } from "react"
import { useParams, useSearchParams } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"
import dynamic from "next/dynamic"
import { AnimatedLoader } from "@/components/animated-loader"

// Import tab components dynamically
const PartnerDataTab = dynamic(() => import("@/components/partner-tabs/partner-data-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})
const PartnerCommissionsTab = dynamic(() => import("@/components/partner-tabs/partner-commissions-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})
const PartnerEmployersTab = dynamic(() => import("@/components/partner-tabs/partner-employers-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})
const PartnerInvoicesTab = dynamic(() => import("@/components/partner-tabs/partner-invoices-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})
const PartnerWallTab = dynamic(() => import("@/components/partner-tabs/partner-wall-tab"), {
  loading: () => <AnimatedLoader size={24} className="p-6" />,
})

export default function PartnerDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const searchParams = useSearchParams()
  const partnerId = params.id as string
  const [activeTab, setActiveTab] = useState("data")
  const [partnerName, setPartnerName] = useState(searchParams.get("name") || "")

  const tabs = [
    { key: "data", label: t("data") },
    { key: "commissions", label: t("commissions") },
    { key: "employers", label: t("employers") },
    { key: "invoices", label: t("invoices") },
    { key: "wall", label: t("wall") },
  ]

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 pt-1 pb-1 sm:px-3 gap-1">
          <h1 className="text-base sm:text-lg font-semibold text-foreground">
            {partnerName}
          </h1>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-6 py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
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
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] bg-card p-2">
        {activeTab === "data" && <PartnerDataTab partnerId={partnerId} onNameChange={(n) => setPartnerName(n)} />}
        {activeTab === "commissions" && <PartnerCommissionsTab />}
        {activeTab === "employers" && <PartnerEmployersTab partnerId={partnerId} />}
        {activeTab === "invoices" && <PartnerInvoicesTab />}
        {activeTab === "wall" && <PartnerWallTab />}
      </div>
    </div>
  )
}
