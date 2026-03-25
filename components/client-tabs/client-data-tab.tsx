



"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedLoader } from "@/components/animated-loader"
import { useToast } from "@/hooks/use-toast"
import GoogleAddressInput from "@/components/GoogleAddressInput"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
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

interface ClientDataTabProps {
  clientId: string
}

interface ClientData {
  id: number
  type: string
  status: string
  code: string
  taxId: string
  address: string
  street?: string
  streetNumber?: string
  floorDoor?: string
  postalCode?: string
  city?: string
  province?: string
  country?: string
  landline: string
  mobile: string
  observation: string
  responsible: string
  winterSchedule: string | null
  summerSchedule: string | null
  accessAccountStatus: string
  userId: number
  name: string
  email?: string
  latitude?: number | null
  longitude?: number | null
  active: boolean
}

export function ClientDataTab({ clientId }: ClientDataTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [originalData, setOriginalData] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const fetchClientData = async () => {
      if (!clientId || clientId === "undefined") {
        setError("Invalid client ID")
        setIsLoading(false)
        return
      }

      // Wait for session to be available (don't show error while auth is loading)
      if (!session?.accessToken) {
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch client data: ${response.status}`)
        }

        const result = await response.json()

        if (result.isSuccess && result.data) {
          const mapped = {
            ...result.data,
            active: result.data.active !== undefined ? result.data.active : true,
          }
          setClientData(mapped)
          setOriginalData(mapped)
        } else {
          throw new Error(result.message || "Failed to fetch client data")
        }
      } catch (err) {
        console.error("Error fetching client data:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchClientData()
  }, [clientId, session?.accessToken])

  const handleInputChange = (field: keyof ClientData, value: string | number | boolean | null) => {
    if (!clientData) return
    setClientData((prev) => (prev ? { ...prev, [field]: value } : null))
    setHasChanges(true)
  }

  const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  const handleSave = async () => {
    if (!clientData || !session?.accessToken) return

    // Validate required fields
    const missing: string[] = []
    if (!clientData.name?.trim()) missing.push(t("name"))
    if (!clientData.address?.trim()) missing.push(t("address"))
    if (!clientData.mobile?.trim()) missing.push(t("mobile"))
    if (!clientData.email?.trim() || !isValidEmail(clientData.email)) missing.push(t("email"))
    if (!clientData.type?.trim()) missing.push(t("type"))
    if (!clientData.responsible?.trim()) missing.push(t("responsible"))

    if (missing.length > 0) {
      toast({
        title: t("requiredFieldsMissing") || "Campos obligatorios",
        description: missing.join(", "),
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Send only updateable fields, exclude id/userId/publicId/email (non-DTO / read-only fields)
      const { id, userId, publicId, email, ...updatePayload } = clientData as any
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        throw new Error(`Failed to save client data: ${response.status}`)
      }

      const result = await response.json()

      if (result.isSuccess) {
        setHasChanges(false)
        setOriginalData(clientData)
        toast({
          title: t("clientUpdatedSuccessfully") || "Client updated successfully!",
          variant: "default",
        })
      } else {
        throw new Error(result.message || "Failed to save client data")
      }
    } catch (err) {
      console.error("Error saving client data:", err)
      setError(err instanceof Error ? err.message : "Failed to save client data")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!clientData || !session?.accessToken) return

    setIsDeleting(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete client: ${response.status}`)
      }

      toast({
        title: t("clientDeletedSuccessfully") || "Client deleted successfully!",
        variant: "default",
      })

      // Redirect back to clients list after successful deletion
      router.push("/clients")
    } catch (err) {
      console.error("Error deleting client:", err)
      setError(err instanceof Error ? err.message : "Failed to delete client")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    if (originalData) {
      setClientData({ ...originalData })
      setHasChanges(false)
    }
  }

  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    window.location.reload()
  }

  if (isLoading) {
    return (
      <AnimatedLoader size={32} className="p-8" />
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="outline" size="sm" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("retry") || "Retry"}
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (!clientData) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("clientNotFound") || "Client not found"}</AlertDescription>
        </Alert>
      </div>
    )
  }

  // dd/mm date input handler with strict validation as user types
  const handleDateInput = (field: keyof ClientData, value: string) => {
    const digits = value.replace(/[^\d]/g, "")

    // Max 4 digits (ddmm)
    if (digits.length > 4) return

    // Validate day digits as they're typed
    if (digits.length >= 1) {
      const d1 = parseInt(digits[0], 10)
      if (d1 > 3) return // first digit of day can only be 0-3
    }
    if (digits.length >= 2) {
      const day = parseInt(digits.substring(0, 2), 10)
      if (day < 1 || day > 31) return
    }

    // Validate month digits as they're typed
    if (digits.length >= 3) {
      const m1 = parseInt(digits[2], 10)
      if (m1 > 1) return // first digit of month can only be 0-1
    }
    if (digits.length >= 4) {
      const month = parseInt(digits.substring(2, 4), 10)
      if (month < 1 || month > 12) return
      // Validate days per month
      const day = parseInt(digits.substring(0, 2), 10)
      const maxDays: Record<number, number> = { 2: 29, 4: 30, 6: 30, 9: 30, 11: 30 }
      if (day > (maxDays[month] || 31)) return
    }

    // Format with slash: auto-insert after day
    let formatted = ""
    if (digits.length <= 2) {
      formatted = digits
    } else {
      formatted = digits.substring(0, 2) + "/" + digits.substring(2)
    }

    handleInputChange(field, formatted || null)
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

  // Dynamic NIF/CIF label based on type
  const nifLabel = clientData.type === "company" ? "CIF" : "NIF"

  return (
    <div className="overflow-x-auto">
    <div className="space-y-3 pt-1 px-2" style={{ minWidth: "900px" }}>
      {/* Row 1: Código(10%) + Nombre(50%) = 60% total incl. gap; Tipo 12%, NIF 15%, Activo 8% */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 60%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 16.67%" }}>
            <Label htmlFor="code" className="text-xs font-medium text-foreground flex items-center gap-1">
              {t("code")} {tip(t("clientCodeTip"))}
            </Label>
            <Input
              id="code"
              value={clientData.code || ""}
              onChange={(e) => handleInputChange("code", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "1 1 0%" }}>
            <Label htmlFor="name" className="text-xs font-medium text-foreground">
              {t("name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={clientData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label htmlFor="type" className="text-xs font-medium text-foreground">
            {t("type")} <span className="text-red-500">*</span>
          </Label>
          <Select value={clientData.type || ""} onValueChange={(value) => handleInputChange("type", value)}>
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particular">{t("particular")}</SelectItem>
              <SelectItem value="company">{t("company")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label htmlFor="nif" className="text-xs font-medium text-foreground">
            {nifLabel}
          </Label>
          <Input
            id="nif"
            value={clientData.taxId || ""}
            onChange={(e) => handleInputChange("taxId", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 8%" }}>
          <Label htmlFor="active" className="text-xs font-medium text-foreground">
            {t("active")}
          </Label>
          <Select
            value={clientData.active ? "yeah" : "no"}
            onValueChange={(value) => handleInputChange("active", value === "yeah")}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue />
            </SelectTrigger>
             <SelectContent className="min-w-0 w-[90px]">
              <SelectItem value="yeah">{t("yeah")}</SelectItem>
              <SelectItem value="no">{t("no")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Row 2: Dirección 60%, Piso/Puerta 12%, Código Postal 12%, Localidad 16% */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 60%" }}>
          <Label htmlFor="address" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("address")} <span className="text-red-500">*</span> {tip(t("clientAddressTip"))}
          </Label>
          <GoogleAddressInput
            value={clientData.address || ""}
            onChange={(value, placeId, components) => {
              if (components) {
                // Store only street + number in address field; other parts go to their own fields
                const parts = [components.street, components.streetNumber].filter(Boolean)
                let addressOnly: string
                if (parts.length > 0) {
                  addressOnly = parts.join(" ")
                } else {
                  // No street/number (Plus Codes, business names, etc.) — strip city/province/country/postalCode from the full address
                  let cleaned = value
                  for (const part of [components.postalCode, components.city, components.province, components.country].filter(Boolean)) {
                    cleaned = cleaned.replace(part, "")
                  }
                  addressOnly = cleaned.replace(/,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "").trim()
                }
                handleInputChange("address", addressOnly || value)
                if (components.street) handleInputChange("street", components.street)
                if (components.streetNumber) handleInputChange("streetNumber", components.streetNumber)
                if (components.floorDoor) handleInputChange("floorDoor", components.floorDoor)
                if (components.city) handleInputChange("city", components.city)
                if (components.province) handleInputChange("province", components.province)
                if (components.country) handleInputChange("country", components.country)
                if (components.postalCode) handleInputChange("postalCode", components.postalCode)
                if (components.latitude) handleInputChange("latitude", components.latitude)
                if (components.longitude) handleInputChange("longitude", components.longitude)
              } else {
                // Manual typing (no Google selection)
                handleInputChange("address", value)
              }
            }}
            className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-1 text-xs text-foreground ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label htmlFor="floorDoor" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("floorDoor")}
          </Label>
          <Input
            id="floorDoor"
            value={clientData.floorDoor || ""}
            onChange={(e) => handleInputChange("floorDoor", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label htmlFor="postalCode" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("postalCode")}
          </Label>
          <Input
            id="postalCode"
            value={clientData.postalCode || ""}
            onChange={(e) => {
              const val = e.target.value.replace(/[^0-9]/g, "")
              handleInputChange("postalCode", val)
            }}
            inputMode="numeric"
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 16%" }}>
          <Label htmlFor="city" className="text-xs font-medium text-foreground">
            {t("city")}
          </Label>
          <Input
            id="city"
            value={clientData.city || ""}
            onChange={(e) => handleInputChange("city", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 3: Provincia(30%) + País(30%) = 60% total incl. gap */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 60%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
            <Label htmlFor="province" className="text-xs font-medium text-foreground">
              {t("province")}
            </Label>
            <Input
              id="province"
              value={clientData.province || ""}
              onChange={(e) => handleInputChange("province", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
            <Label htmlFor="country" className="text-xs font-medium text-foreground">
              {t("country")}
            </Label>
            <Input
              id="country"
              value={clientData.country || ""}
              onChange={(e) => handleInputChange("country", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Row 4: Responsible(30%) + Teléfono(15%) + Móvil(15%) = 60% total incl. gaps; Email 24%, Usuarios button */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 60%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
            <Label htmlFor="responsible" className="text-xs font-medium text-foreground">
              {t("responsible")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="responsible"
              value={clientData.responsible || ""}
              onChange={(e) => handleInputChange("responsible", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(25% - 0.5625rem)" }}>
            <Label htmlFor="phone" className="text-xs font-medium text-foreground flex items-center gap-1">
              {t("phone")}
            </Label>
            <Input
              id="phone"
              value={clientData.landline || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleInputChange("landline", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(25% - 0.5625rem)" }}>
            <Label htmlFor="mobile" className="text-xs font-medium text-foreground flex items-center gap-1">
              {t("mobile")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mobile"
              value={clientData.mobile || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleInputChange("mobile", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 24%" }}>
          <Label htmlFor="email" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("email")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="email"
            type="email"
            value={clientData.email || ""}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="shrink-0">
          <Button className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-4 text-xs">{t("users")}</Button>
        </div>
      </div>

      {/* Row 5: Observations 60%, Periodo Horario de Verano default */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 60%" }}>
          <Label htmlFor="observations" className="text-xs font-medium text-foreground">
            {t("observations")}
          </Label>
          <Textarea
            id="observations"
            value={clientData.observation || ""}
            onChange={(e) => handleInputChange("observation", e.target.value)}
            className="min-h-[40px] w-full bg-muted/30 border-input text-foreground resize-none text-xs py-1.5"
          />
        </div>
        <div className="space-y-1 shrink-0">
          <Label className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("summerSchedulePeriod") || "Periodo Horario de Verano"} {tip(t("clientSummerScheduleTip"))}
          </Label>
          <div className="flex items-center gap-2">
            <Input
              placeholder="dd/mm"
              value={clientData.winterSchedule || ""}
              onChange={(e) => handleDateInput("winterSchedule", e.target.value)}
              className="h-9 w-20 text-xs bg-muted/30 border-input text-foreground text-center"
              maxLength={5}
            />
            <Input
              placeholder="dd/mm"
              value={clientData.summerSchedule || ""}
              onChange={(e) => handleDateInput("summerSchedule", e.target.value)}
              className="h-9 w-20 text-xs bg-muted/30 border-input text-foreground text-center"
              maxLength={5}
            />
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteClient")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDeleteClientDesc")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t("delete")}
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
            {isSaving ? t("saving") || "Saving..." : t("keep")}
          </Button>
          <Button onClick={handleCancel} className="h-9 bg-neutral-500 hover:bg-neutral-600 text-white px-5 text-xs">
            {t("cancel")}
          </Button>
        </div>
        <Button onClick={handleDelete} disabled={isDeleting} className="h-9 bg-yellow-500 hover:bg-yellow-600 text-white px-5 text-xs">
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          {t("delete")}
        </Button>
      </div>
    </div>
    </div>
  )
}
