"use client"

import { useState } from "react"
import { Smartphone, Laptop, QrCode, MapPin, Globe, LockKeyholeOpen } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { useTranslation } from "@/hooks/use-translation"
import { QrCodeDialog } from "@/components/work-center-tabs/methods/dialogs/qr-code-dialog"
import { GpsDialog } from "@/components/work-center-tabs/methods/dialogs/gps-dialog"
import { IpDialog } from "@/components/work-center-tabs/methods/dialogs/ip-dialog"

interface WorkCenter {
  id: number
  publicId?: string
  latitude?: number | null
  longitude?: number | null
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

interface WorkCenterMethodsTabProps {
  workCenter: WorkCenter
  onUpdate: () => void
}

export function WorkCenterMethodsTab({ workCenter, onUpdate }: WorkCenterMethodsTabProps) {
  const [qrDialogOpen, setQrDialogOpen] = useState(false)
  const [gpsDialogOpen, setGpsDialogOpen] = useState(false)
  const [mobileIpDialogOpen, setMobileIpDialogOpen] = useState(false)
  const [computerIpDialogOpen, setComputerIpDialogOpen] = useState(false)
  const { t } = useTranslation()

  const methods = workCenter.signingMethods || {}

  const isMobileIpActive = methods.computer?.ip?.active || false
  const isMobileGpsActive = methods.mobile?.gps?.active || false
  const isMobileQrActive = methods.mobile?.qrCode?.active || false
  const isComputerIpActive = methods.computer?.ip?.active || false

  const activeStyle = "border-[#6B21A8] bg-[#6B21A8]/5 text-[#6B21A8]"
  const inactiveStyle = "hover:border-[#6B21A8] hover:bg-[#6B21A8]/5"

  return (
    <div className="space-y-6 p-4">
      {/* Smartphone/Tablet Device */}
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#6B21A8]/10 to-[#6B21A8]/5 rounded-2xl border border-[#6B21A8]/20 cursor-default">
                    <Smartphone className="w-10 h-10 text-[#6B21A8]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="text-xs">
                  {t("signingMethodTipsMobile")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex flex-wrap gap-3">
              {/* Web — always active (informational, no dialog) */}
              <Button
                variant="outline"
                className={`flex items-center gap-2 px-5 py-6 rounded-xl border-2 cursor-default ${activeStyle}`}
              >
                <LockKeyholeOpen className="w-5 h-5 text-[#6B21A8]" /> Web
              </Button>
              <Button
                variant="outline"
                onClick={() => setMobileIpDialogOpen(true)}
                className={`flex items-center gap-2 px-5 py-6 rounded-xl border-2 transition-all ${isMobileIpActive ? activeStyle : inactiveStyle}`}
              >
                <Globe className={`w-5 h-5 ${isMobileIpActive ? "text-[#6B21A8]" : ""}`} /> IP
              </Button>
              <Button
                variant="outline"
                onClick={() => setGpsDialogOpen(true)}
                className={`flex items-center gap-2 px-5 py-6 rounded-xl border-2 transition-all ${isMobileGpsActive ? activeStyle : inactiveStyle}`}
              >
                <MapPin className={`w-5 h-5 ${isMobileGpsActive ? "text-[#6B21A8]" : ""}`} /> GPS
              </Button>
              <Button
                variant="outline"
                onClick={() => setQrDialogOpen(true)}
                className={`flex items-center gap-2 px-5 py-6 rounded-xl border-2 transition-all ${isMobileQrActive ? activeStyle : inactiveStyle}`}
              >
                <QrCode className={`w-5 h-5 ${isMobileQrActive ? "text-[#6B21A8]" : ""}`} /> Código QR
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PC/Notebook Device */}
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#6B21A8]/10 to-[#6B21A8]/5 rounded-2xl border border-[#6B21A8]/20 cursor-default">
                    <Laptop className="w-10 h-10 text-[#6B21A8]" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="bottom" sideOffset={6} className="text-xs">
                  {t("signingMethodTipsDesktop")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className="flex flex-wrap gap-3">
              {/* Web — always active (informational, no dialog) */}
              <Button
                variant="outline"
                className={`flex items-center gap-2 px-5 py-6 rounded-xl border-2 cursor-default ${activeStyle}`}
              >
                <LockKeyholeOpen className="w-5 h-5 text-[#6B21A8]" /> Web
              </Button>
              <Button
                variant="outline"
                onClick={() => setComputerIpDialogOpen(true)}
                className={`flex items-center gap-2 px-5 py-6 rounded-xl border-2 transition-all ${isComputerIpActive ? activeStyle : inactiveStyle}`}
              >
                <Globe className={`w-5 h-5 ${isComputerIpActive ? "text-[#6B21A8]" : ""}`} /> IP
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialogs */}
      <QrCodeDialog
        open={qrDialogOpen}
        onOpenChange={setQrDialogOpen}
        workCenterId={workCenter.publicId || String(workCenter.id)}
        qrData={methods.mobile?.qrCode}
        onUpdate={onUpdate}
      />
      <GpsDialog
        open={gpsDialogOpen}
        onOpenChange={setGpsDialogOpen}
        workCenterId={workCenter.publicId || String(workCenter.id)}
        gpsData={methods.mobile?.gps}
        defaultLatitude={Number(workCenter.latitude) || undefined}
        defaultLongitude={Number(workCenter.longitude) || undefined}
        onUpdate={onUpdate}
      />
      {/* Mobile IP Dialog */}
      <IpDialog
        open={mobileIpDialogOpen}
        onOpenChange={setMobileIpDialogOpen}
        workCenterId={workCenter.publicId || String(workCenter.id)}
        ipData={methods.computer?.ip}
        onUpdate={onUpdate}
      />
      {/* Computer IP Dialog */}
      <IpDialog
        open={computerIpDialogOpen}
        onOpenChange={setComputerIpDialogOpen}
        workCenterId={workCenter.publicId || String(workCenter.id)}
        ipData={methods.computer?.ip}
        onUpdate={onUpdate}
      />
    </div>
  )
}
