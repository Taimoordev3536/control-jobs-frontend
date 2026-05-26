



"use client"

import { useState, useEffect, useRef } from "react"
import { Camera, Loader2, AlertCircle, RefreshCw, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { Info } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedLoader } from "@/components/animated-loader"
import GoogleAddressInput from "@/components/GoogleAddressInput"
import { normalizeFloorDoor } from "@/lib/utils/normalize-floor-door"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { usePaymentMethods } from "@/hooks/use-payment-methods"
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

interface EmployerData {
  id: number
  partnerId: string | number
  name: string
  taxId: string
  address: string
  street?: string
  streetNumber?: string
  floorDoor?: string
  postalCode?: string
  city?: string
  province?: string
  country?: string
  latitude?: number | null
  longitude?: number | null
  phone: string
  mobile: string | null
  landline: string
  typeId: number
  subTypeId: number
  discount: string
  paymentMethodId: number
  accountIban: string
  bicSwift: string
  probationPeriod: string
  trialDaysRemaining?: number
  responsible: string
  accessAccountStatus: string
  email: string | null
  logoUrl?: string | null
  logoPublicId?: string | null
  createdAt: string
  updatedAt: string
}

interface EmployerDataTabProps {
  employerId: string
  // When true, logo upload/delete hit /employers/me/logo so an employer-role
  // user can manage their own brand from "Mis Datos" without admin/partner
  // privileges. Defaults to the admin/partner :id-scoped endpoint.
  selfServiceLogo?: boolean
}

export default function EmployerDataTab({ employerId, selfServiceLogo = false }: EmployerDataTabProps) {
  const { t, language, tEnum } = useTranslation()
  const { session, isImpersonating, isSubUser, hasRole, hasAnyRole, canEdit } = useAuth()
  const isAdmin = String(session?.user?.role?.name || "").toLowerCase() === "admin"
  const ti = (key: string) => (impersonationTranslations as any)[language]?.[key] || key
  const router = useRouter()
  const { toast } = useToast()
  const translateBackendError = useBackendError()

  const [employerData, setEmployerData] = useState<EmployerData | null>(null)
  const [originalData, setOriginalData] = useState<EmployerData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [resetKey, setResetKey] = useState(0)
  const [isImpersonateLoading, setIsImpersonateLoading] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)
  const logoInputRef = useRef<HTMLInputElement | null>(null)

  const handleLogoSelect = () => logoInputRef.current?.click()

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast({ title: t("logoMustBePngOrJpeg") || "Logo must be PNG or JPEG", variant: "destructive" })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({ title: t("logoTooLarge") || "Logo must be 2 MB or smaller", variant: "destructive" })
      return
    }
    if (!session?.accessToken) return

    setIsUploadingLogo(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const path = selfServiceLogo ? "me/logo" : `${employerId}/logo`
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      const result = await res.json()
      setEmployerData((prev) =>
        prev
          ? { ...prev, logoUrl: result.data?.logoUrl || null, logoPublicId: result.data?.logoPublicId || null }
          : prev,
      )
      toast({ title: t("logoUpdated") || "Logo updated", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  const handleLogoDelete = async () => {
    if (!session?.accessToken || !employerData?.logoUrl) return
    setIsUploadingLogo(true)
    try {
      const path = selfServiceLogo ? "me/logo" : `${employerId}/logo`
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/${path}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      setEmployerData((prev) => (prev ? { ...prev, logoUrl: null, logoPublicId: null } : prev))
      toast({ title: t("logoRemoved") || "Logo removed", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsUploadingLogo(false)
    }
  }

  // Admin and Partner can impersonate employers.
  // Sub-users: only EDIT permission can impersonate; VIEW_ONLY is hidden.
  const canImpersonate = hasAnyRole(["admin", "partner"]) && canEdit() && !isImpersonating

  const handleLoginAs = async () => {
    if (!employerId) return
    setIsImpersonateLoading(true)
    try {
      const result = await impersonateUser("employer", employerId, session?.accessToken)
      window.open(`/impersonate?token=${result.token}`, "_blank")
      toast({ title: ti("toastSuccess"), variant: "success" })
    } catch (err: any) {
      toast({ title: ti("toastError"), description: err.message, variant: "destructive" })
    } finally {
      setIsImpersonateLoading(false)
    }
  }

  // Dropdown data
  const [partners, setPartners] = useState<
    { id: string | number; name: string; commission: number; isSystem: boolean }[]
  >([])
  const [employerTypes, setEmployerTypes] = useState<{ id: number; name: string }[]>([])

  const subTypeOptions = [
    { id: 1, name: tEnum("employerSubType", "INDIVIDUAL") },
    { id: 2, name: tEnum("employerSubType", "FREELANCER") },
    { id: 3, name: tEnum("employerSubType", "COMPANY") },
  ]

  const { methods: paymentMethodOptions } = usePaymentMethods({ selfServiceOnly: true })

  const paymentMethods = paymentMethodOptions.map((m) => ({
    id: m.id,
    name: tEnum("paymentMethod", m.name) || m.name,
  }))

  const selectedPartner = partners.find(
    (p) => String(p.id) === String(employerData?.partnerId),
  )
  const maxDiscount = selectedPartner
    ? selectedPartner.isSystem
      ? 100
      : selectedPartner.commission
    : null
  const discountValue = Number(employerData?.discount || 0)
  const discountExceedsCap =
    maxDiscount !== null && discountValue > maxDiscount

  const allowedFeeIds =
    Number(employerData?.subTypeId) === 1 ? [1] : [2, 3]
  const feeOptions = [
    { id: 1, key: "HOME" },
    { id: 2, key: "STATIC" },
    { id: 3, key: "REMOTE" },
  ].filter((f) => allowedFeeIds.includes(f.id))

  // Fetch employer data
  useEffect(() => {
    const fetchEmployerData = async () => {
      if (!session?.accessToken || !employerId) {
        setError("Invalid employer ID or no authentication")
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/${employerId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch employer data: ${response.status}`)
        }

        const result = await response.json()
        if (result.isSuccess && result.data) {
          const normalized = {
            ...result.data,
            probationPeriod:
              typeof result.data.trialDaysRemaining === "number"
                ? String(result.data.trialDaysRemaining)
                : result.data.probationPeriod || "0",
          }
          setEmployerData(normalized)
          setOriginalData(normalized)
        } else {
          throw new Error(result.message || "Failed to fetch employer data")
        }
      } catch (err) {
        console.error("Error fetching employer data:", err)
        setError(err instanceof Error ? err.message : "An error occurred")
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployerData()
  }, [employerId, session?.accessToken])

  // Fetch partners for dropdown
  useEffect(() => {
    const fetchPartners = async () => {
      if (!session?.accessToken) return
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (res.ok) {
          const data = await res.json()
          setPartners(
            (data.data || []).map((p: any) => ({
              id: p.publicId || p.id,
              name: p.name,
              commission: Number(p.commission ?? 0),
              isSystem: Boolean(p.isSystem),
            })),
          )
        }
      } catch {
        setPartners([])
      }
    }
    fetchPartners()
  }, [session?.accessToken])

  const handleInputChange = (field: keyof EmployerData, value: string | number | boolean | null) => {
    if (!employerData) return
    setEmployerData((prev) => (prev ? { ...prev, [field]: value } : null))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!employerData || !session?.accessToken) return

    const billingChanged =
      employerData.typeId !== originalData?.typeId ||
      employerData.subTypeId !== originalData?.subTypeId
    if (billingChanged) {
      const confirmed = window.confirm(
        t("confirmBillingPlanChange") ||
          "Cambiar la Clase o Tarifa actualizará el plan de facturación del empleador. ¿Continuar?",
      )
      if (!confirmed) return
    }

    setIsSaving(true)
    setError(null)

    try {
      // Only send fields the backend DTO accepts
      const updatePayload: Record<string, any> = {
        name: employerData.name,
        taxId: employerData.taxId,
        address: employerData.address,
        street: employerData.street,
        streetNumber: employerData.streetNumber,
        floorDoor: employerData.floorDoor,
        postalCode: employerData.postalCode,
        city: employerData.city,
        province: employerData.province,
        country: employerData.country,
        latitude: employerData.latitude ?? null,
        longitude: employerData.longitude ?? null,
        partnerId: employerData.partnerId,
        phone: employerData.phone,
        landline: employerData.landline,
        typeId: employerData.typeId,
        subTypeId: employerData.subTypeId,
        discount: employerData.discount ? Number(employerData.discount) : undefined,
        paymentMethodId: employerData.paymentMethodId,
        accountIban: employerData.accountIban,
        bicSwift: employerData.bicSwift,
        probationPeriod: employerData.probationPeriod,
        responsible: employerData.responsible,
        ...(employerData.email && employerData.email !== originalData?.email
          ? { user: { email: employerData.email } }
          : {}),
      }

      // Remove undefined values
      Object.keys(updatePayload).forEach((key) => {
        if (updatePayload[key] === undefined) delete updatePayload[key]
      })

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/${employerId}`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        const msg = errData.message || `Failed to save employer data: ${response.status}`
        if (msg === "Email already in use" || msg === "Email ya utilizado") {
          throw new Error(t("emailAlreadyInUse"))
        }
        throw new Error(msg)
      }

      const result = await response.json()
      if (result.isSuccess) {
        setHasChanges(false)
        setOriginalData(employerData)
        toast({
          title: t("employerUpdatedSuccessfully"),
          variant: "success",
        })
      } else {
        throw new Error(result.message || "Failed to save employer data")
      }
    } catch (err) {
      console.error("Error saving employer data:", err)
      toast({
        title: translateBackendError(err, "errorSavingEmployer"),
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!session?.accessToken) return

    setIsDeleting(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/${employerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete employer: ${response.status}`)
      }

      toast({
        title: t("employerDeletedSuccessfully"),
        variant: "success",
      })

      router.back()
    } catch (err) {
      console.error("Error deleting employer:", err)
      toast({
        title: translateBackendError(err, "errorDeletingEmployer"),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setShowDeleteDialog(false)
    }
  }

  const handleCancel = () => {
    if (originalData) {
      setEmployerData({ ...originalData })
      setHasChanges(false)
      setResetKey((k) => k + 1) // force-remount GoogleAddressInput
    }
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

  if (!employerData) {
    return (
      <div className="p-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{t("employerNotFound")}</AlertDescription>
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
      {/* Row 1: Nombre(35%)+NIF(15%) = 50% wrapper; C.C.C 15%, Responsable 22% */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(70% - 0.375rem)" }}>
            <Label htmlFor="name" className="text-xs font-medium text-foreground">
              {t("name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={employerData.name || ""}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(30% - 0.375rem)" }}>
            <Label htmlFor="taxId" className="text-xs font-medium text-foreground">
              NIF <span className="text-red-500">*</span>
            </Label>
            <Input
              id="taxId"
              value={employerData.taxId || ""}
              onChange={(e) => handleInputChange("taxId", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 15%" }}>
          <Label htmlFor="accountIban" className="text-xs font-medium text-foreground flex items-center gap-1">
            C.C.C {tip(t("cccTip"))}
          </Label>
          <Input
            id="accountIban"
            value={employerData.accountIban || ""}
            onChange={(e) => handleInputChange("accountIban", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 22%" }}>
          <Label htmlFor="responsible" className="text-xs font-medium text-foreground">
            {t("responsible")} <span className="text-red-500">*</span>
          </Label>
          <Input
            id="responsible"
            value={employerData.responsible || ""}
            onChange={(e) => handleInputChange("responsible", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 2: Dirección 50%, Piso/Puerta 12%, Código Postal 12%, Localidad 16% */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 50%" }}>
          <Label htmlFor="address" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("address")} <span className="text-red-500">*</span> {tip(t("addressTip"))}
          </Label>
          <GoogleAddressInput
            key={resetKey}
            value={employerData.address || ""}
            onChange={(value, placeId, components) => {
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
                handleInputChange("latitude", components.latitude || null)
                handleInputChange("longitude", components.longitude || null)
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
            value={employerData.floorDoor || ""}
            onChange={(e) => handleInputChange("floorDoor", e.target.value)}
            onBlur={(e) => handleInputChange("floorDoor", normalizeFloorDoor(e.target.value))}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label htmlFor="postalCode" className="text-xs font-medium text-foreground">
            {t("postalCode")}
          </Label>
          <Input
            id="postalCode"
            value={employerData.postalCode || ""}
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
            value={employerData.city || ""}
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
              value={employerData.province || ""}
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
              value={employerData.country || ""}
              onChange={(e) => handleInputChange("country", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Row 4: Teléfono(12%)+Móvil(12%)+Email(26%) = 50% wrapper; Login btn */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(24% - 0.5rem)" }}>
            <Label htmlFor="landline" className="text-xs font-medium text-foreground">
              {t("phone")}
            </Label>
            <Input
              id="landline"
              value={employerData.landline || ""}
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
              {t("mobile")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mobile"
              value={employerData.phone || ""}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleInputChange("phone", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(52% - 0.5rem)" }}>
            <Label htmlFor="email" className="text-xs font-medium text-foreground">
              {t("email")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={employerData.email || ""}
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
      </div>

      {/* Row 5: Profile image */}
      <div className="flex gap-3 items-end justify-end">
        <div className="flex flex-col items-center justify-center shrink-0">
          <div className="relative w-16 h-16 rounded-full border-2 border-muted flex items-center justify-center bg-muted/20 overflow-hidden">
            {isUploadingLogo ? (
              <Loader2 className="w-4 h-4 text-muted-foreground animate-spin" />
            ) : employerData.logoUrl ? (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={employerData.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                <button
                  type="button"
                  onClick={handleLogoDelete}
                  className="absolute top-0 right-0 bg-red-500 hover:bg-red-600 text-white rounded-full w-4 h-4 flex items-center justify-center"
                  aria-label={t("removeLogo") || "Remove logo"}
                  title={t("removeLogo") || "Remove logo"}
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </>
            ) : (
              <Camera className="w-4 h-4 text-muted-foreground" />
            )}
          </div>
          <input
            ref={logoInputRef}
            type="file"
            accept="image/png,image/jpeg"
            className="hidden"
            onChange={handleLogoChange}
          />
          <Button
            variant="outline"
            type="button"
            onClick={handleLogoSelect}
            disabled={isUploadingLogo}
            className="text-[10px] px-2 py-0 h-6 bg-transparent mt-1"
          >
            {employerData.logoUrl ? (t("changeLogo") || "Change") : (t("chooseFile") || "Choose file")}
          </Button>
        </div>
      </div>

      {/* Separator line */}
      <div className="border-t-2 border-border mt-4" />

      {/* Row 6: Billing fields */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 15%" }}>
          <Label className="text-xs font-medium text-foreground">Partner <span className="text-red-500">*</span></Label>
          <Select
            value={employerData.partnerId?.toString() || ""}
            onValueChange={(value) => handleInputChange("partnerId", value)}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue placeholder={t("selectPartner")} />
            </SelectTrigger>
            <SelectContent>
              {partners.map((p) => (
                <SelectItem key={p.id} value={p.id.toString()}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label className="text-xs font-medium text-foreground">{t("class")} <span className="text-red-500">*</span></Label>
          <Select
            value={employerData.subTypeId?.toString() || ""}
            onValueChange={(value) => {
              const newSubType = Number(value)
              const newAllowed = newSubType === 1 ? [1] : [2, 3]
              setEmployerData((prev) =>
                prev
                  ? {
                      ...prev,
                      subTypeId: newSubType,
                      typeId: newAllowed.includes(Number(prev.typeId))
                        ? prev.typeId
                        : (undefined as any),
                    }
                  : prev,
              )
              setHasChanges(true)
            }}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {subTypeOptions.map((opt) => (
                <SelectItem key={opt.id} value={opt.id.toString()}>
                  {opt.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label className="text-xs font-medium text-foreground">{t("fee")} <span className="text-red-500">*</span></Label>
          <Select
            value={employerData.typeId?.toString() || ""}
            onValueChange={(value) => handleInputChange("typeId", Number(value))}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {feeOptions.map((f) => (
                <SelectItem key={f.id} value={f.id.toString()}>
                  {tEnum("employerType", f.key)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label className="text-xs font-medium text-foreground">
            {t("discount")}
            {maxDiscount !== null && (
              <span className="ml-1 text-[10px] text-muted-foreground">(max {maxDiscount}%)</span>
            )}
          </Label>
          <Input
            value={employerData.discount || ""}
            onChange={(e) => handleInputChange("discount", e.target.value)}
            className={`h-9 text-xs bg-muted/30 border-input text-foreground ${discountExceedsCap ? "border-destructive" : ""}`}
            type="number"
            min="0"
            max="100"
          />
          {discountExceedsCap && (
            <p className="text-[10px] text-destructive">
              {t("discountExceedsCommission")}
            </p>
          )}
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label className="text-xs font-medium text-foreground">{t("trial")}</Label>
          <Input
            value={employerData.probationPeriod ?? ""}
            onChange={(e) => handleInputChange("probationPeriod", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
            type="number"
            min="0"
            max="365"
            readOnly={!isAdmin}
            disabled={!isAdmin}
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 15%" }}>
          <Label className="text-xs font-medium text-foreground">{t("paymentMethod")}</Label>
          <Select
            value={employerData.paymentMethodId?.toString() || ""}
            onValueChange={(value) => handleInputChange("paymentMethodId", Number(value))}
          >
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {paymentMethods.map((m) => (
                <SelectItem key={m.id} value={m.id.toString()}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 15%" }}>
          <Label className="text-xs font-medium text-foreground">BIC/SWIFT</Label>
          <Input
            value={employerData.bicSwift || ""}
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
          onClick={handleDelete}
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
            <AlertDialogTitle>{t("deleteEmployer")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDeleteEmployerDesc")}</AlertDialogDescription>
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
