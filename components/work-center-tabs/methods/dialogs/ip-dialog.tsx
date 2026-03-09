"use client"

import { useState } from "react"
import { X } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"

interface IpDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: string
  ipData?: { active: boolean; ipAddress: string }
  onUpdate: () => void
}

export function IpDialog({ open, onOpenChange, workCenterId, ipData, onUpdate }: IpDialogProps) {
  const { session } = useAuth()
  const [ipAddress, setIpAddress] = useState(ipData?.ipAddress || "")
  const [active, setActive] = useState(ipData?.active || false)
  const [isSaving, setIsSaving] = useState(false)

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
        alert("Error al guardar la dirección IP")
      }
    } catch (error) {
      console.error("Error saving IP address:", error)
      alert("Error al guardar la dirección IP")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">IP</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* IP Address Input */}
          <div className="space-y-2">
            <Label htmlFor="ipAddress">Dirección IP:</Label>
            <Input
              id="ipAddress"
              value={ipAddress}
              onChange={(e) => setIpAddress(e.target.value)}
              placeholder="192.168.1.1"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <Label className="text-base font-medium">Activar:</Label>
            <button
              type="button"
              onClick={() => setActive(!active)}
              className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B21A8] focus:ring-offset-2 ${
                active ? "bg-[#6B21A8]" : "bg-gray-300"
              }`}
            >
              <span
                className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform ${
                  active ? "translate-x-9" : "translate-x-1"
                }`}
              />
              <span className={`absolute text-xs font-medium transition-opacity ${
                active ? "left-2 text-white opacity-100" : "left-2 opacity-0"
              }`}>
                Sí
              </span>
              <span className={`absolute text-xs font-medium transition-opacity ${
                !active ? "right-2 text-gray-600 opacity-100" : "right-2 opacity-0"
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
              Guardar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
