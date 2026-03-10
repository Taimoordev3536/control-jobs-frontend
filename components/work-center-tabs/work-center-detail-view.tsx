"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
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
  
  const [workCenter, setWorkCenter] = useState<WorkCenter | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("description")

  useEffect(() => {
    if (session?.accessToken && workCenterId) {
      fetchWorkCenterData()
    }
  }, [workCenterId, session?.accessToken])

  const fetchWorkCenterData = async () => {
    if (!session?.accessToken || !workCenterId) return

    setIsLoading(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const errBody = await response.json().catch(() => ({}))
        console.error("GET work-center error body:", errBody)
        throw new Error("Failed to fetch work center")
      }
      
      const result = await response.json()
      if (result.data) {
        // Map backend fields to frontend fields
        const backendData = result.data
        setWorkCenter({
          id: backendData.id,
          publicId: backendData.publicId,
          code: backendData.code || `WC${backendData.id.toString().padStart(3, '0')}`,
          name: backendData.name,
          denomination: backendData.name, // name -> denomination
          responsible: backendData.contactName || "", // contactName -> responsible
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
          signingMethods: backendData.signingMethods
        })
      } else {
        console.warn("Unexpected response format:", result)
      }
    } catch (error) {
      console.error("Error fetching work center:", error)
      // Leave workCenter as null to show error state
    } finally {
      setIsLoading(false)
    }
  }

  const loadSampleData = () => {
    setWorkCenter({
      id: Number.parseInt(workCenterId),
      code: "WC001",
      name: "Sucursal 1",
      denomination: "Sucursal 1",
      responsible: "Responsable 1",
      address: "Gran Vía 25",
      street: "Gran Vía",
      streetNumber: "25",
      floorDoor: "5º",
      postalCode: "49123",
      city: "Sevilla",
      latitude: null,
      longitude: null,
      province: "Sevilla",
      country: "España",
      phone: "946123555",
      mobile: "645888999",
      email: "sucursal@cliente1.com",
      observations: "",
      signingMethods: {
        mobile: {
          qrCode: { active: false, code: "controljobs" },
          wifi: { active: false, ssid: "" },
          gps: { active: false, latitude: 37.3891, longitude: -5.9845, radius: 100 }
        },
        computer: {
          ip: { active: false, ipAddress: "" },
          wifi: { active: false, ssid: "" }
        },
        phone: {
          callerId: { active: false }
        }
      }
    })
  }

  const handleBack = () => {
    if (onBack) {
      onBack()
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
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center px-4 pt-2 pb-3 sm:px-3 gap-1">
          <h1 className="text-sm sm:text-base font-semibold text-foreground">
            Centro de trabajo
          </h1>
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
              Descripción
            </button>
            <button
              onClick={() => setActiveTab("methods")}
              className={`flex-shrink-0 px-6 py-1.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                activeTab === "methods"
                  ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                  : "border-transparent text-muted-foreground hover:text-[#662D91] hover:border-[#662D91]"
              }`}
            >
              Métodos de fichaje
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
