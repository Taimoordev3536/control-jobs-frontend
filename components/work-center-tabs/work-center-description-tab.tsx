"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Info, Loader2, MapPin } from "lucide-react"
import { LocationPickerDialog } from "@/components/LocationPickerDialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import GoogleAddressInput, { AddressComponents } from "@/components/GoogleAddressInput"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"

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
}

interface WorkCenterDescriptionTabProps {
  workCenter: WorkCenter
  onUpdate: () => void
}

function buildFormData(wc: WorkCenter) {
  return {
    denomination: wc.denomination || "",
    responsible: wc.responsible || "",
    address: wc.address || "",
    street: wc.street || "",
    streetNumber: wc.streetNumber || "",
    floorDoor: wc.floorDoor || "",
    postalCode: wc.postalCode || "",
    city: wc.city || "",
    province: wc.province || "",
    country: wc.country || "",
    latitude: wc.latitude ?? null as number | null,
    longitude: wc.longitude ?? null as number | null,
    phone: wc.phone || "",
    mobile: wc.mobile || "",
    email: wc.email || "",
    observations: wc.observations || "",
  }
}

export function WorkCenterDescriptionTab({ workCenter, onUpdate }: WorkCenterDescriptionTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const [formData, setFormData] = useState(() => buildFormData(workCenter))
  const [originalData, setOriginalData] = useState(() => buildFormData(workCenter))
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showLocationPicker, setShowLocationPicker] = useState(false)

  // Re-sync formData when parent re-fetches and passes a fresh workCenter prop
  useEffect(() => {
    const fresh = buildFormData(workCenter)
    setFormData(fresh)
    setOriginalData(fresh)
    setHasChanges(false)
  }, [workCenter])

  const handleChange = (field: string, value: any) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalData))
      return updated
    })
  }

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSave = async () => {
    if (!session?.accessToken) return

    // Validate required fields
    const missing: string[] = []
    if (!formData.denomination?.trim()) missing.push(t("denomination") || "Denominación")
    if (!formData.responsible?.trim()) missing.push(t("responsible") || "Responsable")
    if (!formData.address?.trim()) missing.push(t("address") || "Dirección")
    if (!formData.mobile?.trim()) missing.push(t("mobile") || "Móvil")
    if (!formData.email?.trim() || !isValidEmail(formData.email)) missing.push(t("email") || "Email")

    if (missing.length > 0) {
      toast({
        title: t("requiredFieldsMissing") || "Campos obligatorios",
        description: missing.join(", "),
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const backendData: Record<string, any> = {
        name: formData.denomination,
        contactName: formData.responsible,
        address: formData.address,
        street: formData.street,
        streetNumber: formData.streetNumber,
        floor: formData.floorDoor,       // floorDoor -> floor (backend column)
        locality: formData.city,          // city -> locality (backend column)
        province: formData.province,
        country: formData.country,
        postalCode: formData.postalCode,
        contactPhone: formData.mobile,
        landline: formData.phone,
        observations: formData.observations,
      }

      // Only include email if non-empty (empty string fails @IsEmail validation)
      if (formData.email) backendData.contactEmail = formData.email

      // Parse coordinates — TypeORM returns decimal columns as strings from the DB
      const lat = formData.latitude != null ? parseFloat(String(formData.latitude)) : null
      const lng = formData.longitude != null ? parseFloat(String(formData.longitude)) : null
      if (lat != null && !isNaN(lat)) backendData.latitude = lat
      if (lng != null && !isNaN(lng)) backendData.longitude = lng

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenter.publicId || workCenter.id}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(backendData),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || `Error ${response.status}`)
      }

      setHasChanges(false)
      onUpdate() // re-fetches from API → triggers useEffect above to resync formData
      toast({
        title: t("workCenterUpdatedSuccessfully") || "Centro de trabajo actualizado correctamente",
        variant: "default",
      })
    } catch (error) {
      console.error("Error saving work center:", error)
      toast({
        title: t("errorUpdatingWorkCenter") || "Error al actualizar el centro de trabajo",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({ ...originalData })
    setHasChanges(false)
  }

  const handleConfirmDelete = async () => {
    if (!session?.accessToken) return

    setIsDeleting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenter.publicId || workCenter.id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || `Error ${response.status}`)
      }

      toast({
        title: t("workCenterDeletedSuccessfully") || "Centro de trabajo eliminado correctamente",
        variant: "default",
      })
      router.back()
    } catch (error) {
      console.error("Error deleting work center:", error)
      toast({
        title: t("errorDeletingWorkCenter") || "Error al eliminar el centro de trabajo",
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  // Helper to render a tooltip icon
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
    <>
      <div className="overflow-x-auto">
      <div className="space-y-3 pt-1 px-2" style={{ minWidth: "900px" }}>

        {/* Row 1: Denomination(35%) + Responsible(13%) = 48%; Teléfono 13%, Móvil 13%, Email 20% */}
        <div className="flex gap-3 items-end">
          <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 48%" }}>
            <div className="space-y-1 min-w-0" style={{ flex: "35 1 0%" }}>
              <Label htmlFor="denomination" className="text-xs font-medium text-foreground">
                {t("denomination") || "Denominación"} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="denomination"
                value={formData.denomination}
                onChange={(e) => handleChange("denomination", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
            <div className="space-y-1 min-w-0" style={{ flex: "13 1 0%" }}>
              <Label htmlFor="responsible" className="text-xs font-medium text-foreground">
                {t("responsible") || "Responsable"} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="responsible"
                value={formData.responsible}
                onChange={(e) => handleChange("responsible", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 13%" }}>
            <Label htmlFor="phone" className="text-xs font-medium text-foreground">
              {t("phone") || "Teléfono"}
            </Label>
            <Input
              id="phone"
              value={formData.phone}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleChange("phone", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 13%" }}>
            <Label htmlFor="mobile" className="text-xs font-medium text-foreground">
              {t("mobile") || "Móvil"} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mobile"
              value={formData.mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleChange("mobile", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 22%" }}>
            <Label htmlFor="email" className="text-xs font-medium text-foreground">
              {t("email") || "Email"} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>

        {/* Row 2: Dirección 48%, Piso/Puerta 12%, Código Postal 12%, Localidad 16% */}
        <div className="flex gap-3 items-end">
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 48%" }}>
            <Label htmlFor="address" className="text-xs font-medium text-foreground flex items-center gap-1">
              {t("address") || "Dirección"} <span className="text-red-500">*</span> {tip(t("addressTip") || "Empieza a escribir para buscar una dirección")}
            </Label>
            <div className="relative">
              <GoogleAddressInput
                value={formData.address}
                onChange={(value: string, placeId?: string, components?: AddressComponents) => {
                  handleChange("address", value)
                  if (components) {
                    handleChange("street", components.street || "")
                    handleChange("streetNumber", components.streetNumber || "")
                    handleChange("city", components.city || "")
                    handleChange("province", components.province || "")
                    handleChange("country", components.country || "")
                    handleChange("postalCode", components.postalCode || "")
                    handleChange("latitude", components.latitude ?? null)
                    handleChange("longitude", components.longitude ?? null)
                  }
                }}
                className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 pr-9 py-1 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      onClick={() => setShowLocationPicker(true)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 flex items-center justify-center h-7 w-7 rounded-md bg-gray-200 dark:bg-gray-700 hover:bg-white hover:border hover:border-[#662D91] dark:hover:bg-white transition"
                    >
                      <MapPin className="h-4 w-4 text-[#6B21A8]" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    {t("pickLocationFromMap") || "Seleccionar ubicación en el mapa"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <LocationPickerDialog
              open={showLocationPicker}
              onOpenChange={setShowLocationPicker}
              initialLat={formData.latitude}
              initialLng={formData.longitude}
              onLocationSelect={(formattedAddress, components) => {
                handleChange("address", formattedAddress)
                handleChange("street", components.street || "")
                handleChange("streetNumber", components.streetNumber || "")
                handleChange("city", components.city || "")
                handleChange("province", components.province || "")
                handleChange("country", components.country || "")
                handleChange("postalCode", components.postalCode || "")
                handleChange("latitude", components.latitude ?? null)
                handleChange("longitude", components.longitude ?? null)
              }}
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 13%" }}>
            <Label htmlFor="floorDoor" className="text-xs font-medium text-foreground">
              {t("floorDoor") || "Piso/Puerta"}
            </Label>
            <Input
              id="floorDoor"
              value={formData.floorDoor}
              onChange={(e) => handleChange("floorDoor", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
            <Label htmlFor="postalCode" className="text-xs font-medium text-foreground">
              {t("postalCode") || "Código Postal"}
            </Label>
            <Input
              id="postalCode"
              value={formData.postalCode}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleChange("postalCode", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 16%" }}>
            <Label htmlFor="city" className="text-xs font-medium text-foreground">
              {t("city") || "Localidad"}
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>

        {/* Row 3: Provincia(24%) + País(24%) = 48%; Latitude 15%, Longitude 15% */}
        <div className="flex gap-3 items-end">
          <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 48%" }}>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
              <Label htmlFor="province" className="text-xs font-medium text-foreground">
                {t("province") || "Provincia"}
              </Label>
              <Input
                id="province"
                value={formData.province}
                onChange={(e) => handleChange("province", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
            <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
              <Label htmlFor="country" className="text-xs font-medium text-foreground">
                {t("country") || "País"}
              </Label>
              <Input
                id="country"
                value={formData.country}
                onChange={(e) => handleChange("country", e.target.value)}
                className="h-9 text-xs bg-muted/30 border-input text-foreground"
              />
            </div>
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 13%" }}>
            <Label htmlFor="latitude" className="text-xs font-medium text-foreground flex items-center gap-1">
              {t("latitude") || "Latitud"} {tip(t("latLngTip") || "Se rellena automáticamente al seleccionar una dirección de Google")}
            </Label>
            <Input
              id="latitude"
              value={formData.latitude ?? ""}
              readOnly
              className="h-9 text-xs bg-muted/50 border-input text-muted-foreground cursor-default"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 13%" }}>
            <Label htmlFor="longitude" className="text-xs font-medium text-foreground">
              {t("longitude") || "Longitud"}
            </Label>
            <Input
              id="longitude"
              value={formData.longitude ?? ""}
              readOnly
              className="h-9 text-xs bg-muted/50 border-input text-muted-foreground cursor-default"
            />
          </div>
        </div>

        {/* Row 4: Observaciones */}
        <div className="space-y-1">
          <Label htmlFor="observations" className="text-xs font-medium text-foreground">
            {t("observations") || "Observaciones"}
          </Label>
          <Textarea
            id="observations"
            value={formData.observations}
            onChange={(e) => handleChange("observations", e.target.value)}
            className="min-h-[40px] w-full bg-muted/30 border-input text-foreground resize-none text-xs py-1.5"
          />
        </div>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>
                {t("confirmDeleteWorkCenter") || "¿Eliminar centro de trabajo?"}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {t("confirmDeleteWorkCenterDesc") || "Esta acción no se puede deshacer. El centro de trabajo será eliminado permanentemente."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>
                {t("cancel") || "Cancelar"}
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("delete") || "Eliminar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Bottom Action Buttons - separated by line */}
        <div className="border-t-2 border-border mt-4" />
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-5 text-xs flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              {isSaving ? (t("saving") || "Guardando...") : (t("keep") || "Guardar")}
            </Button>
            <Button onClick={handleCancel} className="h-9 bg-neutral-500 hover:bg-neutral-600 text-white px-5 text-xs">
              {t("cancel") || "Cancelar"}
            </Button>
          </div>
          <Button
            onClick={() => setShowDeleteDialog(true)}
            disabled={isDeleting}
            className="h-9 bg-yellow-500 hover:bg-yellow-600 text-white px-5 text-xs"
          >
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {t("delete") || "Eliminar"}
          </Button>
        </div>

      </div>
      </div>
    </>
  )
}
