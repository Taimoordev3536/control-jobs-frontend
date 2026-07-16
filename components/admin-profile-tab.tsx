"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { Loader2, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useSession } from "next-auth/react"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { InlineImageUploader } from "@/components/inline-image-uploader"
import GoogleAddressInput from "@/components/GoogleAddressInput"
import { normalizeFloorDoor } from "@/lib/utils/normalize-floor-door"
import { AnimatedLoader } from "@/components/animated-loader"

interface AdminData {
  nif: string
  name: string
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
  landline: string
  mobile: string
  email: string
  logoUrl: string | null
}

const emptyAdminData: AdminData = {
  nif: "",
  name: "",
  responsible: "",
  address: "",
  street: "",
  streetNumber: "",
  floorDoor: "",
  postalCode: "",
  city: "",
  province: "",
  country: "",
  latitude: null,
  longitude: null,
  landline: "",
  mobile: "",
  email: "",
  logoUrl: null,
}

export function AdminProfileTab() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { update: updateSession } = useSession()
  const { toast } = useToast()
  const translateBackendError = useBackendError()

  const [adminData, setAdminData] = useState<AdminData>(emptyAdminData)
  const [originalData, setOriginalData] = useState<AdminData>(emptyAdminData)
  const [isSaving, setIsSaving] = useState(false)
  const [resetKey, setResetKey] = useState(0)

  const { data: fetchedAdmin, isLoading } = useQuery<AdminData | null>({
    queryKey: ["users", "admin", "me"],
    enabled: !!session?.accessToken,
    queryFn: async () => {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/admin/me`, {
        headers: { Authorization: `Bearer ${session!.accessToken}` },
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      const json = await res.json()
      const d = json?.data
      if (!d) return null
      return {
        nif: d.nif || "",
        name: d.name || "",
        responsible: d.responsible || "",
        address: d.address || "",
        street: d.street || "",
        streetNumber: d.streetNumber || "",
        floorDoor: d.floorDoor || "",
        postalCode: d.postalCode || "",
        city: d.city || "",
        province: d.province || "",
        country: d.country || "",
        latitude: d.latitude != null ? Number(d.latitude) : null,
        longitude: d.longitude != null ? Number(d.longitude) : null,
        landline: d.landline || "",
        mobile: d.mobile || "",
        email: d.email || "",
        logoUrl: d.logoUrl ?? null,
      }
    },
  })

  // Seed the editable form + reset baseline once loaded (no invalidation ->
  // edits are never clobbered by a refetch).
  useEffect(() => {
    if (fetchedAdmin) {
      setAdminData(fetchedAdmin)
      setOriginalData(fetchedAdmin)
    }
  }, [fetchedAdmin])

  const handleInputChange = (field: keyof AdminData, value: string | number | null) => {
    setAdminData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    if (!session?.accessToken) return
    setIsSaving(true)
    try {
      const payload = {
        name: adminData.name,
        email: adminData.email,
        nif: adminData.nif,
        responsible: adminData.responsible,
        address: adminData.address,
        street: adminData.street || undefined,
        streetNumber: adminData.streetNumber || undefined,
        floorDoor: adminData.floorDoor || undefined,
        postalCode: adminData.postalCode || undefined,
        city: adminData.city || undefined,
        province: adminData.province || undefined,
        country: adminData.country || undefined,
        latitude: adminData.latitude ?? undefined,
        longitude: adminData.longitude ?? undefined,
        landline: adminData.landline,
        mobile: adminData.mobile,
      }
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/users/admin/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      setOriginalData(adminData)
      // Refresh the session name so the header/avatar reflect it immediately.
      await updateSession({ name: adminData.name })
      toast({ title: t("profileUpdatedSuccessfully"), variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setAdminData(originalData)
    setResetKey((k) => k + 1)
  }

  if (isLoading) {
    return <AnimatedLoader size={32} className="p-8" />
  }

  const tip = (text: string) => (
    <TooltipProvider>
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>
          <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
            <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[18rem] text-xs px-2 py-1">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  return (
    <div className="overflow-x-auto">
      <div className="space-y-3 pt-1 px-2" style={{ minWidth: "900px" }}>
        <div className="flex gap-3 items-end">
          <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(30% - 0.375rem)" }}>
              <Label htmlFor="adminNif" className="text-xs font-medium text-foreground">
                {t("nif")}
              </Label>
              <Input
                id="adminNif"
                value={adminData.nif}
                onChange={(e) => handleInputChange("nif", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(70% - 0.375rem)" }}>
              <Label htmlFor="adminName" className="text-xs font-medium text-foreground">
                {t("name")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminName"
                value={adminData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 25%" }}>
            <Label htmlFor="adminResponsible" className="text-xs font-medium text-foreground">
              {t("responsible")}
            </Label>
            <Input
              id="adminResponsible"
              value={adminData.responsible}
              onChange={(e) => handleInputChange("responsible", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 50%" }}>
            <Label htmlFor="adminAddress" className="text-xs font-medium text-foreground flex items-center gap-1">
              {t("address")} {tip(t("addressTip"))}
            </Label>
            <GoogleAddressInput
              key={resetKey}
              value={adminData.address || ""}
              onChange={(value, _placeId, components) => {
                if (components) {
                  const parts = [components.street, components.streetNumber].filter(Boolean)
                  let addressOnly: string
                  if (parts.length > 0) {
                    addressOnly = parts.join(" ")
                  } else {
                    let cleaned = value
                    for (const part of [components.postalCode, components.city, components.province, components.country].filter(Boolean)) {
                      cleaned = cleaned.replace(part, "")
                    }
                    addressOnly = cleaned.replace(/,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "").trim()
                  }
                  handleInputChange("address", addressOnly || value)
                  handleInputChange("street", components.street || "")
                  handleInputChange("streetNumber", components.streetNumber || "")
                  handleInputChange("floorDoor", normalizeFloorDoor(components.floorDoor))
                  handleInputChange("city", components.city || "")
                  handleInputChange("province", components.province || "")
                  handleInputChange("country", components.country || "")
                  handleInputChange("postalCode", components.postalCode || "")
                  handleInputChange("latitude", components.latitude ?? null)
                  handleInputChange("longitude", components.longitude ?? null)
                } else {
                  handleInputChange("address", value)
                }
              }}
              className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
            <Label htmlFor="adminFloorDoor" className="text-xs font-medium text-foreground">
              {t("floorDoor")}
            </Label>
            <Input
              id="adminFloorDoor"
              value={adminData.floorDoor || ""}
              onChange={(e) => handleInputChange("floorDoor", e.target.value)}
              onBlur={(e) => handleInputChange("floorDoor", normalizeFloorDoor(e.target.value))}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
            <Label htmlFor="adminPostalCode" className="text-xs font-medium text-foreground">
              {t("postalCode")}
            </Label>
            <Input
              id="adminPostalCode"
              value={adminData.postalCode || ""}
              onChange={(e) => handleInputChange("postalCode", e.target.value.replace(/[^0-9]/g, ""))}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 16%" }}>
            <Label htmlFor="adminCity" className="text-xs font-medium text-foreground">
              {t("city")}
            </Label>
            <Input
              id="adminCity"
              value={adminData.city || ""}
              onChange={(e) => handleInputChange("city", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
              <Label htmlFor="adminProvince" className="text-xs font-medium text-foreground">
                {t("province")}
              </Label>
              <Input
                id="adminProvince"
                value={adminData.province || ""}
                onChange={(e) => handleInputChange("province", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
              <Label htmlFor="adminCountry" className="text-xs font-medium text-foreground">
                {t("country")}
              </Label>
              <Input
                id="adminCountry"
                value={adminData.country || ""}
                onChange={(e) => handleInputChange("country", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
          </div>
        </div>

        <div className="flex gap-3 items-end">
          <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(24% - 0.5rem)" }}>
              <Label htmlFor="adminLandline" className="text-xs font-medium text-foreground">
                {t("phone")}
              </Label>
              <Input
                id="adminLandline"
                value={adminData.landline}
                onChange={(e) => handleInputChange("landline", e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(24% - 0.5rem)" }}>
              <Label htmlFor="adminMobile" className="text-xs font-medium text-foreground">
                {t("mobile")}
              </Label>
              <Input
                id="adminMobile"
                value={adminData.mobile}
                onChange={(e) => handleInputChange("mobile", e.target.value.replace(/[^0-9]/g, ""))}
                inputMode="numeric"
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(52% - 0.5rem)" }}>
              <Label htmlFor="adminEmail" className="text-xs font-medium text-foreground">
                {t("email")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="adminEmail"
                type="email"
                value={adminData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
          </div>
          <InlineImageUploader
            initialUrl={adminData.logoUrl}
            uploadPath="/users/admin/me/logo"
            accessToken={session?.accessToken}
            label={t("profile")}
          />
        </div>

        <div className="border-t-2 border-border mt-4" />
        <div className="flex items-center gap-3 px-2 py-3">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-5 text-xs flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
            {isSaving ? t("saving") || "Saving..." : t("keep")}
          </Button>
          <Button
            type="button"
            onClick={handleCancel}
            className="h-9 bg-neutral-500 hover:bg-neutral-600 text-white px-5 text-xs"
          >
            {t("cancel")}
          </Button>
        </div>
      </div>
    </div>
  )
}
