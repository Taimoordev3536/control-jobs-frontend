"use client"

import { useState } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { WorkCenterDescriptionTab } from "@/components/work-center-tabs/work-center-description-tab"
import { WorkCenterMethodsTab } from "@/components/work-center-tabs/methods/work-center-methods-tab"
import { AnimatedLoader } from "@/components/animated-loader"

interface WorkCenterDetailViewProps {
  workCenterId: string
  onBack?: () => void
}

interface WorkCenter {
  id: number
  publicId?: string
  clientId?: string
  clientName?: string
  code: string
  name: string
  denomination: string
  responsible: string
  address: string
  street: string
  streetNumber: string
  floorDoor: string
  postalCode: string
  city: string
  province: string
  country: string
  latitude: number | null
  longitude: number | null
  phone: string
  mobile: string
  email: string
  observations: string
  signingMethods?: {
    mobile?: {
      qrCode?: { active: boolean; code: string }
      wifi?: { active: boolean; ssid: string }
      gps?: { active: boolean; latitude: number; longitude: number; radius: number }
    }
    computer?: {
      ip?: { active: boolean; ipAddress: string }
      wifi?: { active: boolean; ssid: string }
    }
    phone?: {
      callerId?: { active: boolean }
    }
  }
}

export default function WorkCenterDetailView({ workCenterId, onBack }: WorkCenterDetailViewProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const router = useRouter()
  
  const [activeTab, setActiveTab] = useState("description")

  const { data: workCenter = null, isLoading, refetch } = useQuery<WorkCenter | null>({
    queryKey: ["work-centers", "detail", workCenterId],
    enabled: !!session?.accessToken && !!workCenterId,
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}`, {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        console.error("GET work-center error body:", errBody)
        throw new Error("Failed to fetch work center")
      }
      const result = await response.json()
      if (!result.data) return null
      const backendData = result.data
      return {
        id: backendData.id,
        publicId: backendData.publicId,
        clientId: backendData.client?.publicId || backendData.clientId || undefined,
        clientName: backendData.client?.name || "",
        code: backendData.code || `WC${backendData.id.toString().padStart(3, '0')}`,
        name: backendData.name,
        denomination: backendData.name,
        responsible: backendData.contactName || "",
        address: backendData.address || "",
        street: backendData.street || "",
        streetNumber: backendData.streetNumber || "",
        floorDoor: backendData.floor || "",
        postalCode: backendData.postalCode || "",
        city: backendData.locality || "",
        province: backendData.province || "",
        country: backendData.country || "",
        latitude: backendData.latitude ?? null,
        longitude: backendData.longitude ?? null,
        phone: backendData.landline || "",
        mobile: backendData.contactPhone || "",
        email: backendData.contactEmail || "",
        observations: backendData.observations || "",
        signingMethods: {
          mobile: {
            qrCode: { active: backendData.isQrcodeActive ?? false, code: "" },
            wifi: { active: false, ssid: "" },
            gps: {
              active: backendData.isGpsActive ?? false,
              latitude: Number(backendData.latitude) || 0,
              longitude: Number(backendData.longitude) || 0,
              radius: Number(backendData.gpsRadius) || 100,
            },
          },
          computer: {
            ip: { active: backendData.isIpActive ?? false, ipAddress: backendData.allowedIp || "" },
            wifi: { active: false, ssid: "" },
          },
          phone: {
            callerId: { active: false },
          },
        },
      }
    },
  })
  // Child tabs call this after saving to refresh the record.
  const fetchWorkCenterData = () => refetch()

  const handleBack = () => {
    if (onBack) {
      onBack()
      return
    }
    if (workCenter?.clientId) {
      router.push(`/clients/${workCenter.clientId}?tab=work-centers`)
    } else {
      router.back()
    }
  }

  if (isLoading) {
    return (
      <AnimatedLoader size={32} className="py-12" />
    )
  }

  if (!workCenter) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg">{t("workCenterNotFound")}</div>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="grid grid-cols-3 items-center px-4 pt-1 pb-1 sm:px-3">
          <div />
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate text-center">
            {workCenter?.clientName || ""}
          </h1>
          <div className="flex justify-end">
            <button onClick={handleBack} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-border">
          <nav className="flex overflow-x-auto scrollbar-hide">
            <button
              onClick={() => setActiveTab("description")}
              className={`flex-shrink-0 px-6 py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "description"
                  ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                  : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
              }`}
            >
              {t("workCenter")}
            </button>
            <button
              onClick={() => setActiveTab("methods")}
              className={`flex-shrink-0 px-6 py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "methods"
                  ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                  : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
              }`}
            >
              {t("signingMethods")}
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      <div className="min-h-[400px] bg-card p-2">
        {activeTab === "description" && (
          <WorkCenterDescriptionTab 
            workCenter={workCenter} 
            onUpdate={fetchWorkCenterData}
          />
        )}

        {activeTab === "methods" && (
          <WorkCenterMethodsTab 
            workCenter={workCenter}
            onUpdate={fetchWorkCenterData}
          />
        )}
      </div>
    </div>
  )
}
