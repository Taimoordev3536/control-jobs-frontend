"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { ClientDataTab } from "@/components/client-tabs/client-data-tab"
import { ClientWorkCenterTab } from "@/components/client-tabs/client-work-center-tab"
import { ClientJobsTab } from "@/components/client-tabs/client-jobs-tab"
import { ClientWorkerTab } from "@/components/client-tabs/client-worker-tab"
import { ClientMessagesTab } from "@/components/client-tabs/client-messages-tab"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

export default function ClientDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("data")
  const [clientName, setClientName] = useState(searchParams.get("name") || "")

  useEffect(() => {
    const fetchClientName = async () => {
      if (!session?.accessToken || !params.id) return
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${params.id}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (res.ok) {
          const result = await res.json()
          setClientName(result.data?.name || "")
        }
      } catch (err) {
        console.error("Error fetching client name:", err)
      }
    }
    fetchClientName()
  }, [session?.accessToken, params.id])

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
        {activeTab === "data" ? (
          <div className="grid grid-cols-3 items-center px-4 pt-1 pb-1 sm:px-3">
            <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {clientName}
            </h1>
            <span className="text-sm sm:text-base font-medium text-foreground text-center">
              {t("clients")}
            </span>
            <div className="flex justify-end">
              <button onClick={() => router.back()} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <ArrowLeft className="h-5 w-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center px-4 pt-1 pb-1 sm:px-3">
            <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {clientName}
            </h1>
          </div>
        )}

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
        {activeTab === "data" && <ClientDataTab clientId={params.id as string} />}
        {activeTab === "work-centers" && <ClientWorkCenterTab clientId={params.id as string} />}
        {activeTab === "jobs" && <ClientJobsTab clientId={params.id as string} />}
        {activeTab === "workers" && <ClientWorkerTab clientId={params.id as string} />}
        {activeTab === "messages" && <ClientMessagesTab clientId={params.id as string} />}
      </div>
    </div>
  )
}