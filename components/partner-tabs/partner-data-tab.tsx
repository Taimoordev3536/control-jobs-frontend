"use client"

import { useState, useEffect } from "react"
import { Camera, Loader2, AlertCircle, RefreshCw, Info } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedLoader } from "@/components/animated-loader"
import { Label } from "@/components/ui/label"
import GoogleAddressInput from "@/components/GoogleAddressInput"
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

interface PartnerData {
  id: number
  taxId: string
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
  typeOfPartner: string
  commission: string | number
  retention: string | number
  paymentMethod: string
  accountIban: string
  bicSwift: string
  partnerTierId: number
}

interface PartnerDataTabProps {
  partnerId: string
  onNameChange?: (name: string) => void
}

const partnerTypeKeys: Array<{ value: string; tierId: number }> = [
  { value: "GOLD", tierId: 1 },
  { value: "SILVER", tierId: 2 },
  { value: "BRONZE", tierId: 3 },
  { value: "AFFILIATE", tierId: 4 },
]

const paymentMethodKeys = ["TRANSFER", "DIRECT_DEBIT", "CARD", "PAYPAL", "OTHERS"] as const

const getTierId = (typeOfPartner: string): number => {
  const found = partnerTypeKeys.find((p) => p.value === typeOfPartner)
  return found?.tierId ?? 0
}

export default function PartnerDataTab({ partnerId, onNameChange }: PartnerDataTabProps) {
  const { t, language, tEnum } = useTranslation()
  const { session, isImpersonating, isSubUser, hasRole, canEdit } = useAuth()
  const ti = (key: string) => (impersonationTranslations as any)[language]?.[key] || key
  const router = useRouter()
  const { toast } = useToast()
  const translateBackendError = useBackendError()

  const [partnerData, setPartnerData] = useState<PartnerData | null>(null)
  const [originalData, setOriginalData] = useState<PartnerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [isImpersonateLoading, setIsImpersonateLoading] = useState(false)

  // Admin can impersonate partners.
  // Sub-users: only EDIT permission can impersonate; VIEW_ONLY is hidden.
  const canImpersonate = hasRole("admin") && canEdit() && !isImpersonating

  const handleLoginAs = async () => {
    if (!partnerId) return
    setIsImpersonateLoading(true)
    try {
      const result = await impersonateUser("partner", partnerId, session?.accessToken)
      window.open(`/impersonate?token=${result.token}`, "_blank")
      toast({ title: ti("toastSuccess"), variant: "success" })
    } catch (err: any) {
      toast({ title: ti("toastError"), description: err.message, variant: "destructive" })
    } finally {
      setIsImpersonateLoading(false)
    }
  }

  // Fetch partner data
  useEffect(() => {
    const fetchPartnerData = async () => {
      if (!session?.accessToken || !partnerId) {
        setError("Invalid partner ID or no authentication")
        setIsLoading(false)
        return
      }
      setIsLoading(true)
      setError(null)
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners/${partnerId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!response.ok) throw new Error(`Failed to fetch partner data: ${response.status}`)
        const result = await response.json()
        if (result.isSuccess && result.data) {
          const d = result.data
          const mapped: PartnerData = {
            id: d.id,
            taxId: d.taxId || "",
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
            typeOfPartner: d.typeOfPartner || "",
            commission: d.commission ?? "",
            retention: d.retention ?? "",
            paymentMethod: d.paymentMethod || "",
            accountIban: d.accountIban || "",
            bicSwift: d.bicSwift || "",
            partnerTierId: d.partnerTier?.id ?? d.partnerTierId ?? 0,
          }
          setPartnerData(mapped)
          setOriginalData(mapped)
          onNameChange?.(mapped.name)
        } else {
          throw new Error(result.message || "Failed to fetch partner data")
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }
    fetchPartnerData()
  }, [partnerId, session?.accessToken])

  const handleInputChange = (field: keyof PartnerData, value: string | number | null) => {
    if (!partnerData) return
    setPartnerData((prev) => (prev ? { ...prev, [field]: value } : null))
    setHasChanges(true)
  }

  const handleTypeChange = (value: string) => {
    const tierId = getTierId(value)
    setPartnerData((prev) => (prev ? { ...prev, typeOfPartner: value, partnerTierId: tierId } : null))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!partnerData || !session?.accessToken) return
    setIsSaving(true)
    setError(null)
    try {
      const updatePayload: Record<string, any> = {
        name: partnerData.name,
        address: partnerData.address,
        street: partnerData.street || undefined,
        streetNumber: partnerData.streetNumber || undefined,
        floorDoor: partnerData.floorDoor || undefined,
        postalCode: partnerData.postalCode || undefined,
        city: partnerData.city || undefined,
        province: partnerData.province || undefined,
        country: partnerData.country || undefined,
        latitude: partnerData.latitude ?? undefined,
        longitude: partnerData.longitude ?? undefined,
        landline: partnerData.landline,
        mobile: partnerData.mobile,
        email: partnerData.email,
        nif: partnerData.taxId,
        responsible: partnerData.responsible,
        typeOfPartner: partnerData.typeOfPartner,
        commission: partnerData.commission !== "" ? Number(partnerData.commission) : undefined,
        retention: partnerData.retention !== "" ? Number(partnerData.retention) : undefined,
        paymentMethod: partnerData.paymentMethod,
        accountIban: partnerData.accountIban,
        bicSwift: partnerData.bicSwift,
        partnerTierId: partnerData.partnerTierId || undefined,
      }
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined) delete updatePayload[key]
      })
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners/${partnerId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      })
      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        throw new Error(errData.message || `Failed to save partner data: ${response.status}`)
      }
      const result = await response.json()
      if (result.isSuccess) {
        setHasChanges(false)
        setOriginalData(partnerData)
        onNameChange?.(partnerData.name)
        toast({ title: t("partnerUpdatedSuccessfully") || "Partner updated successfully", variant: "success" })
      } else {
        throw new Error(result.message || "Failed to save partner data")
      }
    } catch (err) {
      toast({
        title: translateBackendError(err, "errorSavingPartner"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleConfirmDelete = async () => {
    if (!session?.accessToken) return
    setIsDeleting(true)
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners/${partnerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!response.ok) throw new Error(`Failed to delete partner: ${response.status}`)
      toast({ title: t("partnerDeletedSuccessfully") || "Partner deleted successfully", variant: "success" })
      router.push("/partners")
    } catch (err) {
      toast({
        title: translateBackendError(err, "errorDeletingPartner"),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCancel = () => {
    if (originalData) {
      setPartnerData({ ...originalData })
      setHasChanges(false)
      setResetKey((k) => k + 1)
    }
    router.push("/partners")
  }

  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    window.location.reload()
  }

  if (isLoading) {
    return <AnimatedLoader size={32} className="p-8" />
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

  if (!partnerData) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("partnerNotFound") || "Partner not found"}</AlertDescription>
        </Alert>
      </div>
    )
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
      {/* Row 1: NIF(15%)+Nombre(35%) = 50% wrapper; Responsable 25% */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(30% - 0.375rem)" }}>
            <Label htmlFor="taxId" className="text-xs font-medium text-foreground">
              {t("nif")}
            </Label>
            <Input
              id="taxId"
              value={partnerData.taxId}
              onChange={(e) => handleInputChange("taxId", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(70% - 0.375rem)" }}>
            <Label htmlFor="name" className="text-xs font-medium text-foreground">
              {t("name")}
            </Label>
            <Input
              id="name"
              value={partnerData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 25%" }}>
          <Label htmlFor="responsible" className="text-xs font-medium text-foreground">
            {t("responsible")}
          </Label>
          <Input
            id="responsible"
            value={partnerData.responsible}
            onChange={(e) => handleInputChange("responsible", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 2: Dirección 50%, Piso/Puerta 12%, Código Postal 12%, Localidad 16% */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 50%" }}>
          <Label htmlFor="address" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("address")} {tip(t("addressTip"))}
          </Label>
          <GoogleAddressInput
            key={resetKey}
            value={partnerData.address || ""}
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
                handleInputChange("floorDoor", components.floorDoor || "")
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
          <Label htmlFor="floorDoor" className="text-xs font-medium text-foreground">
            {t("floorDoor")}
          </Label>
          <Input
            id="floorDoor"
            value={partnerData.floorDoor || ""}
            onChange={(e) => handleInputChange("floorDoor", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label htmlFor="postalCode" className="text-xs font-medium text-foreground">
            {t("postalCode")}
          </Label>
          <Input
            id="postalCode"
            value={partnerData.postalCode || ""}
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
            value={partnerData.city || ""}
            onChange={(e) => handleInputChange("city", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 3: Provincia(25%) + País(25%) = 50% wrapper */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
            <Label htmlFor="province" className="text-xs font-medium text-foreground">
              {t("province")}
            </Label>
            <Input
              id="province"
              value={partnerData.province || ""}
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
              value={partnerData.country || ""}
              onChange={(e) => handleInputChange("country", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Row 4: Teléfono(12%)+Móvil(12%)+Email(26%) = 50% wrapper; Login btn; Profile image minimized */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(24% - 0.5rem)" }}>
            <Label htmlFor="landline" className="text-xs font-medium text-foreground">
              {t("phone")}
            </Label>
            <Input
              id="landline"
              value={partnerData.landline}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleInputChange("landline", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(24% - 0.5rem)" }}>
            <Label htmlFor="mobile" className="text-xs font-medium text-foreground">
              {t("mobile")}
            </Label>
            <Input
              id="mobile"
              value={partnerData.mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleInputChange("mobile", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(52% - 0.5rem)" }}>
            <Label htmlFor="email" className="text-xs font-medium text-foreground">
              {t("email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={partnerData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
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
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="w-16 h-16 rounded-full border-2 border-muted flex items-center justify-center bg-muted/20">
            <Camera className="w-4 h-4 text-muted-foreground" />
          </div>
          <Button variant="outline" className="text-[10px] px-2 py-0 h-6 bg-transparent mt-1">
            {t("chooseFile") || "Choose file"}
          </Button>
        </div>
      </div>

      {/* Separator line */}
      <div className="border-t-2 border-border mt-4" />

      {/* Row 5: Billing fields */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label className="text-xs font-medium text-foreground">{t("type")}</Label>
          <Select value={partnerData.typeOfPartner} onValueChange={handleTypeChange}>
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue placeholder={t("selectType")} />
            </SelectTrigger>
            <SelectContent>
              {partnerTypeKeys.map((pt) => (
                <SelectItem key={pt.value} value={pt.value}>
                  {tEnum("partnerType", pt.value)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label className="text-xs font-medium text-foreground">{t("commission")}</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={partnerData.commission}
              onChange={(e) => handleInputChange("commission", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
              min="0"
              max="100"
            />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label className="text-xs font-medium text-foreground">{t("retention")}</Label>
          <div className="flex items-center gap-1">
            <Input
              type="number"
              value={partnerData.retention}
              onChange={(e) => handleInputChange("retention", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
              min="0"
              max="100"
            />
            <span className="text-muted-foreground text-xs">%</span>
          </div>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 15%" }}>
          <Label className="text-xs font-medium text-foreground">{t("paymentMethod")}</Label>
          <Select value={partnerData.paymentMethod} onValueChange={(v) => handleInputChange("paymentMethod", v)}>
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue placeholder={t("selectPaymentMethod")} />
            </SelectTrigger>
            <SelectContent>
              {paymentMethodKeys.map((m) => (
                <SelectItem key={m} value={m}>
                  {tEnum("paymentMethod", m)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 15%" }}>
          <Label className="text-xs font-medium text-foreground">{t("accountIban")}</Label>
          <Input
            value={partnerData.accountIban}
            onChange={(e) => handleInputChange("accountIban", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 15%" }}>
          <Label className="text-xs font-medium text-foreground">BIC/SWIFT</Label>
          <Input
            value={partnerData.bicSwift}
            onChange={(e) => handleInputChange("bicSwift", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Separator line */}
      <div className="border-t-2 border-border mt-4" />

      {/* Action Buttons */}
      <div className="flex items-center justify-between px-2 py-3">
        <div className="flex items-center gap-3">
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
        <Button
          type="button"
          onClick={() => setShowDeleteDialog(true)}
          disabled={isDeleting}
          className="h-9 bg-yellow-500 hover:bg-yellow-600 text-white px-5 text-xs"
        >
          {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
          {t("delete")}
        </Button>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deletePartner") || "Delete Partner"}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeletePartnerDesc") ||
                "Are you sure you want to delete this partner? This action cannot be undone."}
            </AlertDialogDescription>
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
    </div>
    </div>
  )
}

