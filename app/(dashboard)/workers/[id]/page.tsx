"use client"

import { useState, useEffect } from "react"
import { useParams, useSearchParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { WorkerDataTab } from "@/components/worker-tab/worker-data-tab"
import { WorkerCalendarTab } from "@/components/worker-tab/worker-calendar-tab"
import { WorkerJobsTab } from "@/components/worker-tab/worker-jobs-tab"
import { WorkerClientTab } from "@/components/worker-tab/worker-client-tab"
import { WorkerMessageTab } from "@/components/worker-tab/worker-message-tab"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

export default function WorkerDetailPage() {
  const { t } = useTranslation()
  const params = useParams()
  const searchParams = useSearchParams()
  const { session } = useAuth()
  const router = useRouter()
  const [activeTab, setActiveTab] = useState("data")
  const [workerName, setWorkerName] = useState(searchParams.get("name") || "")

  useEffect(() => {
    const fetchWorkerName = async () => {
      if (!session?.accessToken || !params.id) return
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${params.id}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (res.ok) {
          const result = await res.json()
          setWorkerName(result.data?.name || "")
        }
      } catch (err) {
        console.error("Error fetching worker name:", err)
      }
    }
    fetchWorkerName()
  }, [session?.accessToken, params.id])

  const tabs = [
    { key: "data", label: t("data") },
    { key: "calendar", label: t("calendar") },
    { key: "jobs", label: t("jobs") },
    { key: "customers", label: t("clients") },
    { key: "messages", label: t("messages") },
  ]

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border">
        {activeTab === "data" ? (
          <div className="grid grid-cols-3 items-center px-4 pt-1 pb-1 sm:px-3">
            <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
              {workerName}
            </h1>
            <span className="text-sm sm:text-base font-medium text-foreground text-center">
              {t("workers")}
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
              {workerName}
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
        {activeTab === "data" && <WorkerDataTab />}
        {activeTab === "calendar" && <WorkerCalendarTab />}
        {activeTab === "jobs" && <WorkerJobsTab />}
        {activeTab === "customers" && <WorkerClientTab />}
        {activeTab === "messages" && <WorkerMessageTab />}
      </div>
    </div>
  )
}