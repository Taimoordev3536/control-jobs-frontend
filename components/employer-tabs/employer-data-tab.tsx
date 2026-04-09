



"use client"

import { useState, useEffect } from "react"
import { Camera, Loader2, AlertCircle, RefreshCw } from "lucide-react"
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
  fee: string
  discount: string
  paymentMethodId: number
  accountIban: string
  bicSwift: string
  probationPeriod: string
  responsible: string
  accessAccountStatus: string
  email: string | null
  createdAt: string
  updatedAt: string
}

interface EmployerDataTabProps {
  employerId: string
}

export default function EmployerDataTab({ employerId }: EmployerDataTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
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

  // Dropdown data
  const [partners, setPartners] = useState<{ id: string | number; name: string }[]>([])
  const [employerTypes, setEmployerTypes] = useState<{ id: number; name: string }[]>([])

  const subTypeOptions = [
    { id: 1, name: t("individual") || "Individual" },
    { id: 2, name: t("freelancer") || "Freelancer" },
    { id: 3, name: t("company") || "Company" },
  ]

  const paymentMethods = [
    { id: 1, name: t("Transfer") || "Transfer" },
    { id: 2, name: t("Direct Debit") || "Direct Debit" },
    { id: 3, name: t("Card") || "Card" },
    { id: 4, name: t("PayPal") || "PayPal" },
    { id: 5, name: t("Others") || "Others" },
  ]

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
          setEmployerData(result.data)
          setOriginalData(result.data)
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
          setPartners((data.data || []).map((p: any) => ({ id: p.publicId || p.id, name: p.name })))
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
        fee: employerData.fee ? Number(employerData.fee) : undefined,
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
                handleInputChange("floorDoor", components.floorDoor || "")
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

      {/* Row 4: Teléfono(12%)+Móvil(12%)+Email(26%) = 50% wrapper; Users btn, Login btn */}
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
        <div className="shrink-0">
          <Button className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-4 text-xs">{t("users")}</Button>
        </div>
        <div className="shrink-0">
          <Button className="h-9 bg-green-600 hover:bg-green-700 text-white px-4 text-xs">{t("login")}</Button>
        </div>
      </div>

      {/* Row 5: Observaciones 50%, Profile image minimized */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 50%" }}>
          <Label htmlFor="observations" className="text-xs font-medium text-foreground">
            {t("observations")}
          </Label>
          <Textarea
            id="observations"
            value={employerData.probationPeriod || ""}
            onChange={(e) => handleInputChange("probationPeriod", e.target.value)}
            className="min-h-[40px] w-full bg-muted/30 border-input text-foreground resize-none text-xs py-1.5"
          />
        </div>
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
            onValueChange={(value) => handleInputChange("subTypeId", Number(value))}
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
          <Label className="text-xs font-medium text-foreground">{t("Fee")} <span className="text-red-500">*</span></Label>
          <Input
            value={employerData.fee || ""}
            onChange={(e) => handleInputChange("fee", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 10%" }}>
          <Label className="text-xs font-medium text-foreground">{t("discount")}</Label>
          <Input
            value={employerData.discount || ""}
            onChange={(e) => handleInputChange("discount", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
            type="number"
            min="0"
            max="100"
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
