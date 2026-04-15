"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"

interface IpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: string
  ipData?: { active: boolean; ipAddress: string }
  onUpdate: () => void
}

export function IpDialog({ open, onOpenChange, workCenterId, ipData, onUpdate }: IpDialogProps) {
  const { session } = useAuth()
  const { t } = useTranslation()
  const translateBackendError = useBackendError()
  const [ipAddress, setIpAddress] = useState(ipData?.ipAddress || "")
  const [active, setActive] = useState(ipData?.active || false)
  const [isSaving, setIsSaving] = useState(false)
  const [detectedIp, setDetectedIp] = useState("")

  // Detect public IP to show as placeholder suggestion
  useEffect(() => {
    if (open) {
      fetch("/api/detect-ip")
        .then(res => res.json())
        .then(data => {
          if (data.ip) setDetectedIp(data.ip)
        })
        .catch(() => {})
    }
  }, [open])

  const handleSave = async () => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/signing-methods/ip`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            active,
            ipAddress,
          }),
        }
      )

      if (response.ok) {
        onUpdate()
        onOpenChange(false)
      } else {
        const err = await response.json().catch(() => ({}))
        toast({ title: translateBackendError(err, "ipSaveError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error saving IP config:", error)
      toast({ title: t("ipSaveError"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">{t("publicIp")}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* IP Address Input */}
          <div className="space-y-2">
            <Label htmlFor="ipAddress">{t("ipAddress")}</Label>
            <Input
              id="ipAddress"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder={`P. Ej.: ${detectedIp || "88.71.10.189"}`}
            />
            <p className="text-xs text-muted-foreground">{t("publicIpHint")}</p>
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-2">
            <Label className="text-sm font-medium">{t("activate")}</Label>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B21A8] focus:ring-offset-2 ${
                active ? "bg-[#6B21A8]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                  active ? "translate-x-7" : "translate-x-0.5"
                }`}
              />
              <span className={`absolute text-[10px] font-medium transition-opacity ${
                active ? "left-1.5 text-white opacity-100" : "left-1.5 opacity-0"
              }`}>
                {t("yes")}
              </span>
              <span className={`absolute text-[10px] font-medium transition-opacity ${
                !active ? "right-1.5 text-gray-600 opacity-100" : "right-1.5 opacity-0"
              }`}>
                No
              </span>
            </button>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-[#6B21A8] hover:bg-[#581C87] text-white"
            >
              {t("keep")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
