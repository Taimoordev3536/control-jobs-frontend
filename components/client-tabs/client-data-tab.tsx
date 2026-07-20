



"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useSession } from "next-auth/react"
import { useState, useEffect, useRef } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useBackendError } from "@/lib/backend-error"
import { useRouter } from "next/navigation"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedLoader } from "@/components/animated-loader"
import { useToast } from "@/hooks/use-toast"
import GoogleAddressInput from "@/components/GoogleAddressInput"
import { normalizeFloorDoor } from "@/lib/utils/normalize-floor-door"
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
import { impersonateUser } from "@/lib/api/impersonate"
import impersonationTranslations from "@/lib/translations/impersonation"
import { InlineImageUploader } from "@/components/inline-image-uploader"

interface ClientDataTabProps {
  clientId: string
  selfService?: boolean
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
  // Summer period boundaries (DD/MM) — drives job creation summer schedule
  // window. Mirrors SeasonalSchedule.startDate / endDate on the job side.
  summerStartDate: string | null
  summerEndDate: string | null
  accessAccountStatus: string
  userId: number
  name: string
  email?: string
  latitude?: number | null
  longitude?: number | null
  active: boolean
  bankIban?: string
  bankSwift?: string
  bankHolder?: string
}

export function ClientDataTab({ clientId, selfService = false }: ClientDataTabProps) {
  const meMode = selfService
  const { t, language } = useTranslation()
  const { session, isImpersonating, isSubUser, hasRole, canEdit } = useAuth()
  const { update: updateSession } = useSession()
  const ti = (key: string) => (impersonationTranslations as any)[language]?.[key] || key
  const router = useRouter()
  const { toast } = useToast()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [originalData, setOriginalData] = useState<ClientData | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeactivating, setIsDeactivating] = useState(false)
  const [showDeactivateDialog, setShowDeactivateDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [isImpersonateLoading, setIsImpersonateLoading] = useState(false)
  const queryClient = useQueryClient()
  const translateBackendError = useBackendError()

  // Employer can impersonate their own clients.
  // Sub-users: only EDIT permission can impersonate; VIEW_ONLY is hidden.
  const canImpersonate = hasRole("employer") && canEdit() && !isImpersonating

  const handleLoginAs = async () => {
    if (!clientId) return
    setIsImpersonateLoading(true)
    try {
      const result = await impersonateUser("client", clientId, session?.accessToken)
      window.open(`/impersonate?token=${result.token}`, "_blank")
      toast({ title: ti("toastSuccess"), variant: "success" })
    } catch (err: any) {
      toast({ title: ti("toastError"), description: err.message, variant: "destructive" })
    } finally {
      setIsImpersonateLoading(false)
    }
  }

  const invalidId = !meMode && (!clientId || clientId === "undefined")

  const { data: fetchedClient, isLoading, isError, error: queryError, refetch } = useQuery<ClientData>({
    queryKey: ["client", meMode ? "me" : clientId, "data"],
    enabled: !!session?.accessToken && !invalidId,
    queryFn: async () => {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${meMode ? "me" : clientId}`, {
        headers: {
          Authorization: `Bearer ${session!.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) throw new Error(`Failed to fetch client data: ${response.status}`)
      const result = await response.json()
      if (!(result.isSuccess && result.data)) throw new Error(result.message || "Failed to fetch client data")
      // Normalize the address into the canonical "Street, Number" format.
      // Older client rows may have stored address without the comma; rebuild
      // from structured street/streetNumber columns when both are available.
      const normalizeAddress = (data: any): string => {
        const street = (data.street || "").toString().trim()
        const number = (data.streetNumber || "").toString().trim()
        if (street && number) return `${street}, ${number}`
        if (street) return street
        if (number) return number
        return data.address || ""
      }
      return {
        ...result.data,
        address: normalizeAddress(result.data),
        active: result.data.active !== undefined ? result.data.active : true,
      }
    },
  })

  // Seed the editable form + reset baseline once the record loads. Nothing
  // invalidates this query, so edits are never clobbered by a refetch.
  useEffect(() => {
    if (fetchedClient) {
      setClientData(fetchedClient)
      setOriginalData(fetchedClient)
    }
  }, [fetchedClient])

  const readError = invalidId
    ? "Invalid client ID"
    : isError
      ? (queryError instanceof Error ? queryError.message : "An error occurred")
      : null
  const displayError = error || readError

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

    // Summer period must be both-or-neither: empty pair means "no summer
    // window" (job will use normal/winter shifts year-round); a single
    // populated field is invalid.
    const hasStart = !!clientData.summerStartDate?.trim()
    const hasEnd = !!clientData.summerEndDate?.trim()
    if (hasStart !== hasEnd) {
      toast({
        title:
          t("summerPeriodBothOrNeither") ||
          "Both period dates must be entered or both left empty.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      // `active` is owned by the Deactivate/Reactivate action, never this form.
      const { id, userId, publicId, email, logoPublicId, logoUrl, createdAt, updatedAt, active, ...updatePayload } = clientData as any
      if (meMode) {
        delete (updatePayload as any).type
      }
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${meMode ? "me" : clientId}`, {
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
        // Self-service edit of one's own profile: refresh the session name so
        // the header/avatar reflect it immediately (skip when impersonating).
        if (meMode && !isImpersonating) {
          await updateSession({ name: clientData.name })
        }
        toast({
          title: t("clientUpdatedSuccessfully") || "Client updated successfully!",
          variant: "success",
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

  const handleConfirmToggleActive = async () => {
    if (!clientData || !clientId) return
    const next = !clientData.active

    setIsDeactivating(true)

    try {
      await apiFetch(`/client/${clientId}/${next ? "activate" : "deactivate"}`, {
        method: "PATCH",
      })

      setClientData((prev) => (prev ? { ...prev, active: next } : prev))
      setOriginalData((prev) => (prev ? { ...prev, active: next } : prev))
      queryClient.invalidateQueries({ queryKey: ["clients"] })
      queryClient.invalidateQueries({ queryKey: ["client", clientId, "data"] })

      toast({
        title: t(next ? "clientReactivatedSuccessfully" : "clientDeactivatedSuccessfully"),
        variant: "success",
      })
    } catch (err) {
      toast({
        title: translateBackendError(
          err,
          next ? "errorReactivatingClient" : "errorDeactivatingClient",
        ),
        variant: "destructive",
      })
    } finally {
      setIsDeactivating(false)
      setShowDeactivateDialog(false)
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
    refetch()
  }

  if (isLoading && !invalidId) {
    return (
      <AnimatedLoader size={32} className="p-8" />
    )
  }

  if (displayError) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{displayError}</span>
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
          <Select value={clientData.type || ""} onValueChange={(value) => handleInputChange("type", value)} disabled={meMode}>
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
        {/* Read-only: status is owned by the Deactivate/Reactivate button below,
            which also controls whether the client can log in. */}
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 8%" }}>
          <Label className="text-xs font-medium text-foreground">{t("active")}</Label>
          <div
            className={`flex h-9 items-center text-xs font-medium ${
              clientData.active ? "text-green-600" : "text-red-600"
            }`}
          >
            {clientData.active ? t("yeah") : t("no")}
          </div>
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
                // Store only street + number in address field; other parts go to their own fields.
                // Required format: "Street, Number" — always with a comma between the street name
                // and the number (per the address field spec).
                let addressOnly: string
                if (components.street && components.streetNumber) {
                  addressOnly = `${components.street}, ${components.streetNumber}`
                } else if (components.street) {
                  addressOnly = components.street
                } else if (components.streetNumber) {
                  addressOnly = components.streetNumber
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
                if (components.floorDoor) handleInputChange("floorDoor", normalizeFloorDoor(components.floorDoor))
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
            onBlur={(e) => handleInputChange("floorDoor", normalizeFloorDoor(e.target.value))}
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
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 21%" }}>
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
        {canImpersonate && (
          <div className="shrink-0">
            <Button
              className="h-9 bg-green-600 hover:bg-green-700 text-white px-4 text-xs"
              onClick={handleLoginAs}
              disabled={isImpersonateLoading}
            >
              {isImpersonateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Login as"}
            </Button>
          </div>
        )}
        <InlineImageUploader
          initialUrl={(clientData as any).logoUrl ?? null}
          uploadPath={meMode ? "/client/me/logo" : `/client/${clientId}/logo`}
          accessToken={session?.accessToken}
          label={t("profile")}
          onChange={(u) => setClientData((prev) => (prev ? ({ ...prev, logoUrl: u } as any) : prev))}
        />
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
          <div className="flex items-end gap-2">
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                {t("start") || "Start"}
              </span>
              <Input
                placeholder="dd/mm"
                value={clientData.summerStartDate || ""}
                onChange={(e) => handleDateInput("summerStartDate", e.target.value)}
                className="h-9 w-20 text-xs bg-muted/30 border-input text-foreground text-center"
                maxLength={5}
              />
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-muted-foreground leading-none mb-0.5">
                {t("end") || "End"}
              </span>
              <Input
                placeholder="dd/mm"
                value={clientData.summerEndDate || ""}
                onChange={(e) => handleDateInput("summerEndDate", e.target.value)}
                className="h-9 w-20 text-xs bg-muted/30 border-input text-foreground text-center"
                maxLength={5}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Row 6: Datos bancarios (cuenta de cobro) */}
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "1 1 40%" }}>
          <Label htmlFor="bankIban" className="text-xs font-medium text-foreground">{t("iban") || "IBAN"}</Label>
          <Input id="bankIban" value={clientData.bankIban || ""} onChange={(e) => handleInputChange("bankIban", e.target.value)} placeholder="ES.." className="h-9 text-xs bg-muted/30 border-input text-foreground" />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "1 1 30%" }}>
          <Label htmlFor="bankHolder" className="text-xs font-medium text-foreground">{t("accountHolder") || "Titular"}</Label>
          <Input id="bankHolder" value={clientData.bankHolder || ""} onChange={(e) => handleInputChange("bankHolder", e.target.value)} className="h-9 text-xs bg-muted/30 border-input text-foreground" />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "1 1 20%" }}>
          <Label htmlFor="bankSwift" className="text-xs font-medium text-foreground">{t("swiftBic") || "SWIFT / BIC"}</Label>
          <Input id="bankSwift" value={clientData.bankSwift || ""} onChange={(e) => handleInputChange("bankSwift", e.target.value)} className="h-9 text-xs bg-muted/30 border-input text-foreground" />
        </div>
      </div>

      <AlertDialog open={showDeactivateDialog} onOpenChange={setShowDeactivateDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(clientData.active ? "confirmDeactivateClient" : "confirmReactivateClient")}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                clientData.active
                  ? "confirmDeactivateClientDesc"
                  : "confirmReactivateClientDesc",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeactivating}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmToggleActive}
              disabled={isDeactivating}
              className={
                clientData.active
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {isDeactivating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {t(clientData.active ? "deactivate" : "reactivate")}
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
        {!meMode && (
          <Button
            onClick={() => setShowDeactivateDialog(true)}
            disabled={isDeactivating}
            className={`h-9 text-white px-5 text-xs ${
              clientData.active
                ? "bg-yellow-500 hover:bg-yellow-600"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isDeactivating ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {t(clientData.active ? "deactivate" : "reactivate")}
          </Button>
        )}
      </div>
    </div>
    </div>
  )
}
