


"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import EmployerDataTab from "@/components/employer-tabs/employer-data-tab"
import EmployerInvoicesTab from "@/components/employer-tabs/employer-invoices-tab"
import { useAuth } from "@/hooks/use-auth"

interface Employer {
  id: number
  partnerId: number
  name: string
  taxId: string
  address: string
  phone: string
  mobile: string | null
  landline: string
  typeId: number
  subTypeId: number
  fee: string
  discount: string
  paymentMethodId: number
  accountIban: string
  bicSwift: string
  probationPeriod: string
  responsible: string
  accessAccountStatus: string
  createdAt: string
  updatedAt: string
}

export default function EmployerDetailPage() {
  const { t } = useTranslation()
  const { id } = useParams() as { id: string }
  const router = useRouter()
  const [employer, setEmployer] = useState<Employer | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("data")
  const { session } = useAuth()

  useEffect(() => {
    const fetchEmployer = async () => {
      if (!id || !session?.accessToken) return

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/${id}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error("Failed to fetch employer")
        }

        const result = await response.json()
        if (result.isSuccess && result.data) {
          setEmployer(result.data)
        } else {
          throw new Error(result.developerError || "Failed to fetch employer")
        }
      } catch (error) {
        console.error("Error fetching employer:", error)
        setEmployer(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployer()
  }, [id, session?.accessToken])

  const getTypeLabel = (typeId: number) => {
    const types: Record<number, string> = { 1: t("home"), 2: t("static"), 3: t("remote") }
    return types[typeId] || t("unknown")
  }

  const getSubTypeLabel = (subTypeId: number) => {
    const subTypes = { 1: t("individual"), 2: t("freelancer"), 3: t("company") }
    return subTypes[subTypeId as keyof typeof subTypes] || t("unknown")
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    )
  }

  if (!employer) {
    return (
      <div className="p-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">{t("employerNotFound")}</h2>
          <p className="text-muted-foreground mb-4">{t("employerNotFoundDescription")}</p>
          <Button onClick={() => router.push("/employers")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t("backToEmployers")}
          </Button>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: "data", label: t("data") },
    { key: "invoices", label: t("invoices") },
  ]

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 pt-1 pb-1 sm:px-3 gap-1">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">
            {employer?.name || t("employer")}
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
      <div className="min-h-[400px] bg-card p-2">
        {activeTab === "data" && (
          <EmployerDataTab employerId={id} />
        )}
        {activeTab === "invoices" && <EmployerInvoicesTab />}
      </div>
    </div>
  )
}
