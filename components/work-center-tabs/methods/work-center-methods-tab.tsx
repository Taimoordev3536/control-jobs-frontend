"use client"

import { useState } from "react"
import { Smartphone, Monitor, QrCode, MapPin, Globe } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { QrCodeDialog } from "@/components/work-center-tabs/methods/dialogs/qr-code-dialog"
import { GpsDialog } from "@/components/work-center-tabs/methods/dialogs/gps-dialog"
import { IpDialog } from "@/components/work-center-tabs/methods/dialogs/ip-dialog"

interface WorkCenter {
  id: number
  publicId?: string
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
  const [ipDialogOpen, setIpDialogOpen] = useState(false)

  const methods = workCenter.signingMethods || {}

  return (
    <div className="space-y-6 p-4">
      {/* Mobile Device */}
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#6B21A8]/10 to-[#6B21A8]/5 rounded-2xl border border-[#6B21A8]/20">
              <Smartphone className="w-10 h-10 text-[#6B21A8]" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setQrDialogOpen(true)}
                className="flex items-center gap-2 px-5 py-6 rounded-xl border-2 hover:border-[#6B21A8] hover:bg-[#6B21A8]/5 transition-all"
              >
                <QrCode className="w-5 h-5" /> Código QR
              </Button>
              <Button
                variant="outline"
                onClick={() => setIpDialogOpen(true)}
                className="flex items-center gap-2 px-5 py-6 rounded-xl border-2 hover:border-[#6B21A8] hover:bg-[#6B21A8]/5 transition-all"
              >
                <Globe className="w-5 h-5" /> IP
              </Button>
              <Button
                variant="outline"
                onClick={() => setGpsDialogOpen(true)}
                className="flex items-center gap-2 px-5 py-6 rounded-xl border-2 hover:border-[#6B21A8] hover:bg-[#6B21A8]/5 transition-all"
              >
                <MapPin className="w-5 h-5" /> GPS
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Computer Device */}
      <Card className="border-0 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-r from-white to-gray-50 dark:from-gray-900 dark:to-gray-800">
        <CardContent className="p-8">
          <div className="flex items-center gap-6">
            <div className="flex items-center justify-center w-20 h-20 bg-gradient-to-br from-[#6B21A8]/10 to-[#6B21A8]/5 rounded-2xl border border-[#6B21A8]/20">
              <Monitor className="w-10 h-10 text-[#6B21A8]" />
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                onClick={() => setIpDialogOpen(true)}
                className="flex items-center gap-2 px-5 py-6 rounded-xl border-2 hover:border-[#6B21A8] hover:bg-[#6B21A8]/5 transition-all"
              >
                <Globe className="w-5 h-5" /> IP
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
        onUpdate={onUpdate}
      />
      <IpDialog
        open={ipDialogOpen}
        onOpenChange={setIpDialogOpen}
        workCenterId={workCenter.publicId || String(workCenter.id)}
        ipData={methods.computer?.ip}
        onUpdate={onUpdate}
      />
    </div>
  )
}
