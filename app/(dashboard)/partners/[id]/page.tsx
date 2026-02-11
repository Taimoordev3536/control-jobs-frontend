"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Plus, Filter, FileText, Download, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/hooks/use-translation"
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/use-auth"
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
  const partnerId = params.id as string
  const { session } = useAuth()
  const [activeTab, setActiveTab] = useState("data")
  const [loading, setLoading] = useState(true)
  const [partnerData, setPartnerData] = useState({
    nif: "",
    name: "",
    responsible: "",
    address: "",
    no: "",
    floorDoor: "",
    postalCode: "",
    locality: "",
    province: "",
    country: "",
    vatIct: "",
    phone: "",
    mobile: "",
    email: "",
    observations: "",
    guy: "",
    commission: "",
    retention: "",
    paymentMethod: "",
    accountIban: "",
    bicSwift: "",
  })

  useEffect(() => {
    const fetchPartnerData = async () => {
      setLoading(true)
      try {
        if (!partnerId || !session?.accessToken) return
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners/${partnerId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) throw new Error("Failed to fetch partner data")
        const data = await res.json()
        if (data.data) {
          setPartnerData({
            nif: data.data.taxId || "",
            name: data.data.name || "",
            responsible: data.data.responsible || "",
            address: data.data.address || "",
            no: data.data.no || "",
            floorDoor: data.data.floorDoor || "",
            postalCode: data.data.postalCode || "",
            locality: data.data.locality || "",
            province: data.data.province || "",
            country: data.data.country || "",
            vatIct: data.data.vatIct || "",
            phone: data.data.landline || "",
            mobile: data.data.mobile || "",
            email: data.data.email || "",
            observations: data.data.observations || "",
            guy: data.data.typeOfPartner || "",
            commission: data.data.commission || "",
            retention: data.data.retention || "",
            paymentMethod: data.data.paymentMethod || "",
            accountIban: data.data.accountIban || "",
            bicSwift: data.data.bicSwift || "",
          })
        }
      } catch (e) {
        // Optionally handle error
      } finally {
        setLoading(false)
      }
    }
    fetchPartnerData()
  }, [partnerId, session?.accessToken])

  if (loading) {
    return (
      <div className="bg-background min-h-screen py-6 px-3 sm:px-6">
        <div className="text-center py-10">
          <p className="text-muted-foreground">{t("loadingPartnerData")}</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { key: "data", label: t("data") },
    { key: "commissions", label: t("commissions") },
    { key: "employers", label: t("employers") },
    { key: "invoices", label: t("invoices") },
    { key: "wall", label: t("wall") },
  ]

  return (
    <div className="bg-background min-h-screen">
      <div className="bg-card border-b border-border">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-4 sm:p-6 gap-4">
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">{t("partner")}</h1>

          {/* Mobile Action Menu */}
          <div className="sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem>
                  <Plus className="w-4 h-4 mr-2" />
                  {t("add")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Filter className="w-4 h-4 mr-2" />
                  {t("filter")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <FileText className="w-4 h-4 mr-2" />
                  {t("exportPdf")}
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Download className="w-4 h-4 mr-2" />
                  {t("exportExcel")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Desktop Tabs */}
        <div className="hidden sm:block border-b border-border">
          <nav className="flex">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Mobile Tabs - Horizontal Scroll */}
        <div className="sm:hidden border-b border-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-purple-600 text-purple-600 bg-purple-50 dark:bg-purple-950/50"
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
      <div className="min-h-[400px] bg-card">
        {activeTab === "data" && <PartnerDataTab partnerData={partnerData} />}
        {activeTab === "commissions" && <PartnerCommissionsTab />}
        {activeTab === "employers" && <PartnerEmployersTab />}
        {activeTab === "invoices" && <PartnerInvoicesTab />}
        {activeTab === "wall" && <PartnerWallTab />}
      </div>
    </div>
  )
}
