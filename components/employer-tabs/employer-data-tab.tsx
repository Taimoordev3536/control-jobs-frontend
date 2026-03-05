



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
  partnerId: number
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
  const [partners, setPartners] = useState<{ id: number; name: string }[]>([])
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
          setPartners((data.data || []).map((p: any) => ({ id: p.id, name: p.name })))
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
        throw new Error(errData.message || `Failed to save employer data: ${response.status}`)
      }

      const result = await response.json()
      if (result.isSuccess) {
        setHasChanges(false)
        setOriginalData(employerData)
        toast({
          title: t("employerUpdatedSuccessfully"),
          variant: "default",
        })
      } else {
        throw new Error(result.message || "Failed to save employer data")
      }
    } catch (err) {
      console.error("Error saving employer data:", err)
      toast({
        title: err instanceof Error ? err.message : "Failed to save employer data",
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
        variant: "default",
      })

      router.back()
    } catch (err) {
      console.error("Error deleting employer:", err)
      toast({
        title: err instanceof Error ? err.message : "Failed to delete employer",
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

  return (
    <div className="space-y-4 pt-1 px-2">
      {/* Row 1: NIF, C.C.C, Name, Responsible */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="taxId" className="text-sm font-medium text-foreground">
            NIF
          </Label>
          <Input
            id="taxId"
            value={employerData.taxId || ""}
            onChange={(e) => handleInputChange("taxId", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountIban" className="text-sm font-medium text-foreground flex items-center gap-1">
            C.C.C
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                    <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[14rem] text-xs px-2 py-1">
                  {t("cccTip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <Input
            id="accountIban"
            value={employerData.accountIban || ""}
            onChange={(e) => handleInputChange("accountIban", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            {t("name")}
          </Label>
          <Input
            id="name"
            value={employerData.name || ""}
            onChange={(e) => handleInputChange("name", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="responsible" className="text-sm font-medium text-foreground">
            {t("responsible")}
          </Label>
          <Input
            id="responsible"
            value={employerData.responsible || ""}
            onChange={(e) => handleInputChange("responsible", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 2: Address (Google Autocomplete - full width) */}
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium text-foreground flex items-center gap-1">
            {t("address")}
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                    <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[14rem] text-xs px-2 py-1">
                  {t("addressTip")}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </Label>
          <GoogleAddressInput
            key={resetKey}
            value={employerData.address || ""}
            onChange={(value, placeId, components) => {
              handleInputChange("address", value)
              if (components) {
                handleInputChange("street", components.street || "")
                handleInputChange("streetNumber", components.streetNumber || "")
                handleInputChange("floorDoor", components.floorDoor || "")
                handleInputChange("city", components.city || "")
                handleInputChange("province", components.province || "")
                handleInputChange("country", components.country || "")
                handleInputChange("postalCode", components.postalCode || "")
                handleInputChange("latitude", components.latitude || null)
                handleInputChange("longitude", components.longitude || null)
              }
            }}
            className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-weight-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Row 2b: No., Floor/Door, Postal Code */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="streetNumber" className="text-sm font-medium text-foreground">
            {t("number")}
          </Label>
          <Input
            id="streetNumber"
            value={employerData.streetNumber || ""}
            onChange={(e) => handleInputChange("streetNumber", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="floorDoor" className="text-sm font-medium text-foreground">
            {t("floorDoor")}
          </Label>
          <Input
            id="floorDoor"
            value={employerData.floorDoor || ""}
            onChange={(e) => handleInputChange("floorDoor", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="postalCode" className="text-sm font-medium text-foreground">
            {t("postalCode")}
          </Label>
          <Input
            id="postalCode"
            value={employerData.postalCode || ""}
            onChange={(e) => handleInputChange("postalCode", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 3: City, Province, Country */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium text-foreground">
            {t("city")}
          </Label>
          <Input
            id="city"
            value={employerData.city || ""}
            onChange={(e) => handleInputChange("city", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="province" className="text-sm font-medium text-foreground">
            {t("province")}
          </Label>
          <Input
            id="province"
            value={employerData.province || ""}
            onChange={(e) => handleInputChange("province", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country" className="text-sm font-medium text-foreground">
            {t("country")}
          </Label>
          <Input
            id="country"
            value={employerData.country || ""}
            onChange={(e) => handleInputChange("country", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 4: Phone, Mobile, E-mail + Users/Login buttons */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
        <div className="space-y-2">
          <Label htmlFor="landline" className="text-sm font-medium text-foreground">
            {t("phone")}
          </Label>
          <Input
            id="landline"
            value={employerData.landline || ""}
            onChange={(e) => handleInputChange("landline", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="mobile" className="text-sm font-medium text-foreground">
            {t("mobile")}
          </Label>
          <Input
            id="mobile"
            value={employerData.phone || ""}
            onChange={(e) => handleInputChange("phone", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="flex gap-2 items-end">
          <div className="flex-1 space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              E-mail
            </Label>
            <Input
              id="email"
              type="email"
              value={employerData.email || ""}
              className="h-10 bg-muted/30 border-input text-foreground"
              placeholder={t("email")}
              readOnly
            />
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white px-4 h-10">{t("users")}</Button>
          <Button className="bg-green-600 hover:bg-green-700 text-white px-4 h-10">{t("login")}</Button>
        </div>
      </div>

      {/* Bottom Section - Observations and Profile Image */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="observations" className="text-sm font-medium text-foreground">
            {t("observations")}
          </Label>
          <Textarea
            id="observations"
            value={employerData.probationPeriod || ""}
            onChange={(e) => handleInputChange("probationPeriod", e.target.value)}
            className="min-h-[120px] bg-muted/30 border-input text-foreground resize-none"
          />
        </div>
        <div className="flex flex-col items-center justify-center">
          <div className="w-32 h-32 rounded-full border-4 border-muted flex items-center justify-center mb-4 bg-muted/20">
            <Camera className="w-8 h-8 text-muted-foreground" />
          </div>
          <Button variant="outline" className="text-sm px-4 bg-transparent">
            Choose file | No file chosen
          </Button>
        </div>
      </div>

      {/* Bottom Billing Section */}
      <div className="border-t border-border pt-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 mb-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">Partner</Label>
            <Select
              value={employerData.partnerId?.toString() || ""}
              onValueChange={(value) => handleInputChange("partnerId", Number(value))}
            >
              <SelectTrigger className="h-10 bg-muted/30 border-input text-foreground">
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("class")}</Label>
            <Select
              value={employerData.subTypeId?.toString() || ""}
              onValueChange={(value) => handleInputChange("subTypeId", Number(value))}
            >
              <SelectTrigger className="h-10 bg-muted/30 border-input text-foreground">
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("Fee")}</Label>
            <Input
              value={employerData.fee || ""}
              onChange={(e) => handleInputChange("fee", e.target.value)}
              className="h-10 bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("discount")}</Label>
            <Input
              value={employerData.discount || ""}
              onChange={(e) => handleInputChange("discount", e.target.value)}
              className="h-10 bg-muted/30 border-input text-foreground"
              type="number"
              min="0"
              max="100"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">{t("paymentMethod")}</Label>
            <Select
              value={employerData.paymentMethodId?.toString() || ""}
              onValueChange={(value) => handleInputChange("paymentMethodId", Number(value))}
            >
              <SelectTrigger className="h-10 bg-muted/30 border-input text-foreground">
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
          <div className="space-y-2">
            <Label className="text-sm font-medium text-foreground">BIC/SWIFT</Label>
            <Input
              value={employerData.bicSwift || ""}
              onChange={(e) => handleInputChange("bicSwift", e.target.value)}
              className="h-10 bg-muted/30 border-input text-foreground"
              placeholder="Enter BIC/SWIFT code"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-between px-4 py-4 bg-gray-100 dark:bg-gray-800/50 rounded-b-lg">
          <div className="flex items-center gap-3">
            <Button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? t("saving") || "Saving..." : t("keep")}
            </Button>
            <Button
              type="button"
              onClick={() => router.push("/employers")}
              className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 py-2"
            >
              {t("cancel")}
            </Button>
          </div>
          <Button
            type="button"
            onClick={handleDelete}
            disabled={isDeleting}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2"
          >
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("delete")}
          </Button>
        </div>
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
  )
}
