"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  MapPin,
  Clock,
  Building,
  Navigation,
  Wifi,
  Globe,
  QrCode,
  PhoneCall,
  CheckCircle,
} from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

interface JobAssignment {
  id: number
  jobId: string
  title: string
  client: {
    id: number
    name: string
  }
  workCenter: {
    id: number
    name: string
    address: string
    coordinates: { lat: number; lng: number }
  }
  shift: {
    type: "morning" | "afternoon" | "evening"
    startTime?: string
    endTime?: string
    duration: string
    scheduleType: "fixed" | "flexible"
  }
  signingMethods: {
    qrCode?: boolean
    gps?: boolean
    wifi?: boolean
    ip?: boolean
    callerId?: boolean
  }
}

interface CheckInMethodsProps {
  job: JobAssignment
  onBack: () => void
  onMethodSelect: (method: string) => void
}

export function CheckInMethods({ job, onBack, onMethodSelect }: CheckInMethodsProps) {
  const { t } = useTranslation("worker-dashboard")

  const getCheckInMethodIcon = (method: string) => {
    switch (method) {
      case "gps":
        return <Navigation className="w-5 h-5" />
      case "wifi":
        return <Wifi className="w-5 h-5" />
      case "ip":
        return <Globe className="w-5 h-5" />
      case "qrCode":
        return <QrCode className="w-5 h-5" />
      case "callerId":
        return <PhoneCall className="w-5 h-5" />
      default:
        return <CheckCircle className="w-5 h-5" />
    }
  }

  const getMethodName = (method: string) => {
    switch (method) {
      case "gps":
        return t("gpsLocation")
      case "wifi":
        return t("wifiNetwork")
      case "ip":
        return t("ipAddress")
      case "qrCode":
        return t("qrCodeScanner")
      case "callerId":
        return t("callerId")
      default:
        return method
    }
  }

  const getMethodDescription = (method: string) => {
    switch (method) {
      case "gps":
        return t("verifyLocationGps")
      case "wifi":
        return t("connectWorkplaceWifi")
      case "ip":
        return t("verifyIpAddress")
      case "qrCode":
        return t("scanQrCode")
      case "callerId":
        return t("verifyPhoneNumber")
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{t("checkInTitle")}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{job.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
          <CardContent className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-3">{job.title}</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{job.workCenter.address}</span>
              </div>
              {job.shift.scheduleType === "fixed" && (
                <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm">
                    {job.shift.startTime} - {job.shift.endTime}
                  </span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Building className="w-4 h-4" />
                <span className="text-sm">{job.client.name}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">{t("chooseCheckInMethod")}</h2>
          <div className="space-y-3">
            {Object.entries(job.signingMethods).map(([method, enabled]) => {
              if (!enabled) return null

              return (
                <Card
                  key={method}
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800"
                  onClick={() => onMethodSelect(method)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center text-purple-600 dark:text-purple-400">
                        {getCheckInMethodIcon(method)}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">{getMethodName(method)}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{getMethodDescription(method)}</p>
                      </div>
                      <div className="text-gray-400">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
