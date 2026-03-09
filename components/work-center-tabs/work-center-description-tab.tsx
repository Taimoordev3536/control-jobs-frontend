"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
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

  const handleSave = async () => {
    if (!session?.accessToken) return

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

  return (
    <>
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-6">

            {/* Row 1: Denominación and Responsable */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="denomination" className="text-sm font-medium text-foreground">
                  {t("denomination") || "Denominación"}
                </Label>
                <Input
                  id="denomination"
                  value={formData.denomination}
                  onChange={(e) => handleChange("denomination", e.target.value)}
                  placeholder="Ej. Centro Principal"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="responsible" className="text-sm font-medium text-foreground">
                  {t("responsible") || "Responsable"}
                </Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => handleChange("responsible", e.target.value)}
                  placeholder="Ej. Juan Pérez"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
            </div>

            {/* Row 2: Address (Google Autocomplete - full width) */}
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="address" className="text-sm font-medium text-foreground flex items-center gap-1">
                  {t("address") || "Dirección"}
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[14rem] text-xs px-2 py-1">
                        {t("addressTip") || "Empieza a escribir para buscar una dirección"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <div className="flex gap-2">
                  <div className="flex-1">
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
                      className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    />
                  </div>
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => setShowLocationPicker(true)}
                          className="flex items-center justify-center h-10 w-10 rounded-md border border-input bg-muted/30 hover:bg-muted/60 transition shrink-0"
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

                {/* Location picker map dialog */}
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
            </div>

            {/* Row 2b: Nº, Piso/Puerta, Cod. Postal */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="streetNumber" className="text-sm font-medium text-foreground">
                  {t("number") || "Nº"}
                </Label>
                <Input
                  id="streetNumber"
                  value={formData.streetNumber}
                  onChange={(e) => handleChange("streetNumber", e.target.value)}
                  placeholder="Ej. 25"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="floorDoor" className="text-sm font-medium text-foreground">
                  {t("floorDoor") || "Piso/Puerta"}
                </Label>
                <Input
                  id="floorDoor"
                  value={formData.floorDoor}
                  onChange={(e) => handleChange("floorDoor", e.target.value)}
                  placeholder="Ej. 5º"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="postalCode" className="text-sm font-medium text-foreground">
                  {t("postalCode") || "Cod. Postal"}
                </Label>
                <Input
                  id="postalCode"
                  value={formData.postalCode}
                  onChange={(e) => handleChange("postalCode", e.target.value)}
                  placeholder="Ej. 41001"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
            </div>

            {/* Row 3: Ciudad, Provincia, País */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="city" className="text-sm font-medium text-foreground">
                  {t("city") || "Localidad"}
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => handleChange("city", e.target.value)}
                  placeholder="Ej. Sevilla"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="province" className="text-sm font-medium text-foreground">
                  {t("province") || "Provincia"}
                </Label>
                <Input
                  id="province"
                  value={formData.province}
                  onChange={(e) => handleChange("province", e.target.value)}
                  placeholder="Ej. Sevilla"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="country" className="text-sm font-medium text-foreground">
                  {t("country") || "País"}
                </Label>
                <Input
                  id="country"
                  value={formData.country}
                  onChange={(e) => handleChange("country", e.target.value)}
                  placeholder="Ej. España"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
            </div>

            {/* Row 4: Latitude & Longitude (read-only, auto-filled by Google Places) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude" className="text-sm font-medium text-foreground flex items-center gap-1">
                  {t("latitude") || "Latitud"}
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[16rem] text-xs px-2 py-1">
                        {t("latLngTip") || "Se rellena automáticamente al seleccionar una dirección de Google"}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="latitude"
                  value={formData.latitude ?? ""}
                  readOnly
                  placeholder="Auto-filled by address"
                  className="h-10 bg-muted/50 border-input text-muted-foreground cursor-default"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude" className="text-sm font-medium text-foreground">
                  {t("longitude") || "Longitud"}
                </Label>
                <Input
                  id="longitude"
                  value={formData.longitude ?? ""}
                  readOnly
                  placeholder="Auto-filled by address"
                  className="h-10 bg-muted/50 border-input text-muted-foreground cursor-default"
                />
              </div>
            </div>

            {/* Row 5: Teléfono, Movil, Email */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-sm font-medium text-foreground">
                  {t("phone") || "Teléfono"}
                </Label>
                <Input
                  id="phone"
                  value={formData.phone}
                  onChange={(e) => handleChange("phone", e.target.value)}
                  placeholder="Ej. 954 123 456"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="mobile" className="text-sm font-medium text-foreground">
                  {t("mobile") || "Móvil"}
                </Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => handleChange("mobile", e.target.value)}
                  placeholder="Ej. +34 600 123 456"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("email") || "Email"}
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  placeholder="Ej. contacto@empresa.com"
                  className="h-10 bg-muted/30 border-input text-foreground"
                />
              </div>
            </div>

            {/* Row 6: Observaciones */}
            <div className="space-y-2">
              <Label htmlFor="observations" className="text-sm font-medium text-foreground">
                {t("observations") || "Observaciones"}
              </Label>
              <Textarea
                id="observations"
                value={formData.observations}
                onChange={(e) => handleChange("observations", e.target.value)}
                placeholder="Ej. Instrucciones especiales, notas adicionales..."
                rows={4}
                className="resize-none bg-muted/30 border-input text-foreground"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-4 mt-2 px-4 py-4 bg-gray-100 dark:bg-gray-800/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {isSaving ? (t("saving") || "Guardando...") : (t("keep") || "Guardar")}
                </Button>
                <Button
                  onClick={() => router.back()}
                  disabled={isSaving}
                  className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 py-2"
                >
                  {t("cancel") || "Cancelar"}
                </Button>
              </div>
              <Button
                onClick={() => setShowDeleteDialog(true)}
                disabled={isDeleting}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2"
              >
                {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                {t("delete") || "Eliminar"}
              </Button>
            </div>

          </div>
        </CardContent>
      </Card>

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
    </>
  )
}
