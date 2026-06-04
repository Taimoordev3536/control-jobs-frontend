"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import DateInput from "@/components/ui/date-input"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedLoader } from "@/components/animated-loader"
import GoogleAddressInput, { AddressComponents } from "@/components/GoogleAddressInput"
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
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useParams, useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { useToast } from "@/hooks/use-toast"
import { impersonateUser } from "@/lib/api/impersonate"
import impersonationTranslations from "@/lib/translations/impersonation"
import { InlineImageUploader } from "@/components/inline-image-uploader"

interface WorkerData {
  id: number
  code: string
  nif: string
  naf: string
  name: string
  lastName: string
  address: string
  street: string
  streetNumber: string
  floorDoor: string
  postalCode: string
  city: string
  province: string
  country: string
  latitude: string
  longitude: string
  landline: string
  mobile: string
  email: string
  occupation: string
  sex: string
  birthday: string
  active: boolean
  observation: string
  logoUrl?: string
}

export function WorkerDataTab({ selfService = false }: { selfService?: boolean } = {}) {
  const meMode = selfService
  const { t, language, tEnum } = useTranslation()
  const { session, isImpersonating, isSubUser, hasRole, canEdit } = useAuth()
  const ti = (key: string) => (impersonationTranslations as any)[language]?.[key] || key
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const workerId = params.id as string
  const [isImpersonateLoading, setIsImpersonateLoading] = useState(false)

  // Employer can impersonate their own workers.
  // Sub-users: only EDIT permission can impersonate; VIEW_ONLY is hidden.
  const canImpersonate = hasRole("employer") && canEdit() && !isImpersonating

  const handleLoginAs = async () => {
    if (!workerId) return
    setIsImpersonateLoading(true)
    try {
      const result = await impersonateUser("worker", workerId, session?.accessToken)
      window.open(`/impersonate?token=${result.token}`, "_blank")
      toast({ title: ti("toastSuccess"), variant: "success" })
    } catch (err: any) {
      toast({ title: ti("toastError"), description: err.message, variant: "destructive" })
    } finally {
      setIsImpersonateLoading(false)
    }
  }

  const [workerData, setWorkerData] = useState<WorkerData>({
    id: 0,
    code: "",
    nif: "",
    naf: "",
    name: "",
    lastName: "",
    address: "",
    street: "",
    streetNumber: "",
    floorDoor: "",
    postalCode: "",
    city: "",
    province: "",
    country: "",
    latitude: "",
    longitude: "",
    landline: "",
    mobile: "",
    email: "",
    occupation: "",
    sex: "man",
    birthday: "",
    active: true,
    observation: "",
  })

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [originalData, setOriginalData] = useState<WorkerData | null>(null)

  useEffect(() => {
    const fetchWorkerData = async () => {
      if (!session?.accessToken || (!workerId && !meMode)) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${meMode ? "me" : workerId}`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })

        if (!response.ok) {
          throw new Error(`Failed to fetch worker data: ${response.status}`)
        }

        const result = await response.json()

        if (result.isSuccess && result.data) {
          const apiData = result.data
          const mappedData: WorkerData = {
            id: apiData.id || 0,
            code: apiData.code || "",
            nif: apiData.nif || "",
            naf: apiData.naf || "",
            name: apiData.name || "",
            lastName: apiData.lastName || "",
            address: apiData.address || "",
            street: apiData.street || "",
            streetNumber: apiData.streetNumber || "",
            floorDoor: apiData.floorDoor || "",
            postalCode: apiData.postalCode || "",
            city: apiData.city || "",
            province: apiData.province || "",
            country: apiData.country || "",
            latitude: apiData.latitude || "",
            longitude: apiData.longitude || "",
            landline: apiData.landline || "",
            mobile: apiData.mobile || "",
            email: apiData.email || "",
            occupation: apiData.occupation || "",
            sex: apiData.sex || "man",
            birthday: apiData.birthday ? apiData.birthday.split("T")[0] : "",
            active: apiData.active !== undefined ? apiData.active : true,
            observation: apiData.observation || "",
            logoUrl: apiData.logoUrl || "",
          }

          setWorkerData(mappedData)
          setOriginalData(mappedData)
        } else {
          throw new Error(result.developerError || "Failed to load worker data")
        }
      } catch (err) {
        console.error("Error fetching worker data:", err)
        setError(err instanceof Error ? err.message : "Failed to load worker data")
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkerData()
  }, [session?.accessToken, workerId])

  const handleInputChange = (field: keyof WorkerData, value: string | boolean) => {
    setWorkerData((prev) => {
      const updated = { ...prev, [field]: value }
      setHasChanges(JSON.stringify(updated) !== JSON.stringify(originalData))
      return updated
    })
  }

  const handleSave = async () => {
    if (!session?.accessToken || (!workerId && !meMode)) return

    // Validate required fields
    const missing: string[] = []
    if (!workerData.name?.trim()) missing.push(t("name"))
    if (!workerData.address?.trim()) missing.push(t("address"))
    if (!workerData.mobile?.trim()) missing.push(t("mobile"))
    if (!workerData.email?.trim()) missing.push(t("email"))

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
      // Send only updateable fields, exclude id
      const { id, logoUrl: _logoUrl, ...rest } = workerData
      const updatePayload: Record<string, any> = {
        ...rest,
        latitude: rest.latitude ? parseFloat(rest.latitude) : null,
        longitude: rest.longitude ? parseFloat(rest.longitude) : null,
      }
      if (meMode) {
        delete updatePayload.code
        delete updatePayload.active
      }
      // Remove empty strings for fields with strict validation
      if (!updatePayload.email) delete updatePayload.email
      if (!updatePayload.accessEmail) delete updatePayload.accessEmail
      if (!updatePayload.birthday) delete updatePayload.birthday
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${meMode ? "me" : workerId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatePayload),
      })

      if (!response.ok) {
        throw new Error(`Failed to save worker data: ${response.status}`)
      }

      const result = await response.json()

      if (result.isSuccess) {
        setOriginalData(workerData)
        setHasChanges(false)
        toast({
          title: t("workerUpdatedSuccessfully") || "Worker updated successfully!",
          variant: "success",
        })
      } else {
        throw new Error(result.developerError || "Failed to save worker data")
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save worker data")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = () => {
    setShowDeleteDialog(true)
  }

  const handleConfirmDelete = async () => {
    if (!session?.accessToken || !workerId) return

    setIsDeleting(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${workerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })

      if (!response.ok) {
        throw new Error(`Failed to delete worker: ${response.status}`)
      }

      toast({
        title: t("workerDeletedSuccessfully") || "Worker deleted successfully!",
        variant: "success",
      })

      router.push("/workers")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete worker")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleCancel = () => {
    if (originalData) {
      setWorkerData({ ...originalData })
      setHasChanges(false)
    }
  }

  const retryFetch = () => {
    setError(null)
    setIsLoading(true)
    // Re-trigger the useEffect
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
            <Button variant="outline" size="sm" onClick={retryFetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {t("retry") || "Retry"}
            </Button>
          </AlertDescription>
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
      {/* Row 1: Código(10%) + Nombre(40%) = 50%; NAF 12%, NIF/NIE 15%, Occupation 14%, Activo 8% */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 20%" }}>
            <Label htmlFor="code" className="text-xs font-medium text-foreground flex items-center gap-1">
              {t("code")} {tip(t("workerCodeTip"))}
            </Label>
            <Input
              id="code"
              value={workerData.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
              disabled={meMode}
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "1 1 0%" }}>
            <Label htmlFor="name" className="text-xs font-medium text-foreground">
              {t("name")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="name"
              value={workerData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label htmlFor="naf" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("naf")} {tip(t("workerNafTip"))}
          </Label>
          <Input
            id="naf"
            value={workerData.naf}
            onChange={(e) => handleInputChange("naf", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 12%" }}>
          <Label htmlFor="nif" className="text-xs font-medium text-foreground">
            {t("nifNie")}
          </Label>
          <Input
            id="nif"
            value={workerData.nif}
            onChange={(e) => handleInputChange("nif", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 14%" }}>
          <Label htmlFor="occupation" className="text-xs font-medium text-foreground">
            {t("occupation")}
          </Label>
          <Input
            id="occupation"
            value={workerData.occupation}
            onChange={(e) => handleInputChange("occupation", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 8%" }}>
          <Label htmlFor="active" className="text-xs font-medium text-foreground">
            {t("active")}
          </Label>
          <Select
            value={workerData.active ? "yeah" : "no"}
            onValueChange={(value) => handleInputChange("active", value === "yeah")}
            disabled={meMode}
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

      {/* Row 2: Dirección 50%, Piso/Puerta 12%, Código Postal 12%, Localidad 16% */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 50%" }}>
          <Label htmlFor="address" className="text-xs font-medium text-foreground flex items-center gap-1">
            {t("address")} <span className="text-red-500">*</span> {tip(t("addressTip"))}
          </Label>
          <GoogleAddressInput
            value={workerData.address || ""}
            onChange={(value: string, placeId?: string, components?: AddressComponents) => {
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
                if (components.street) handleInputChange("street", components.street)
                if (components.streetNumber) handleInputChange("streetNumber", components.streetNumber)
                if (components.floorDoor) handleInputChange("floorDoor", normalizeFloorDoor(components.floorDoor))
                if (components.city) handleInputChange("city", components.city)
                if (components.province) handleInputChange("province", components.province)
                if (components.country) handleInputChange("country", components.country)
                if (components.postalCode) handleInputChange("postalCode", components.postalCode)
                if (components.latitude) handleInputChange("latitude", `${components.latitude}`)
                if (components.longitude) handleInputChange("longitude", `${components.longitude}`)
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
            value={workerData.floorDoor || ""}
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
            value={workerData.postalCode || ""}
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
            value={workerData.city || ""}
            onChange={(e) => handleInputChange("city", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 3: Provincia(25%) + País(25%) = 50% */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(50% - 0.375rem)" }}>
            <Label htmlFor="province" className="text-xs font-medium text-foreground">
              {t("province")}
            </Label>
            <Input
              id="province"
              value={workerData.province || ""}
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
              value={workerData.country || ""}
              onChange={(e) => handleInputChange("country", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
        </div>
      </div>

      {/* Row 4: Teléfono(13%)+Móvil(13%)+Email(24%) = 50%; Sex 13%, F.Birth 13% */}
      <div className="flex gap-3 items-end">
        <div className="flex gap-3 items-end min-w-0" style={{ flex: "0 0 50%" }}>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(26% - 0.5rem)" }}>
            <Label htmlFor="phone" className="text-xs font-medium text-foreground">
              {t("phone")}
            </Label>
            <Input
              id="phone"
              value={workerData.landline}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleInputChange("landline", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "0 0 calc(26% - 0.5rem)" }}>
            <Label htmlFor="mobile" className="text-xs font-medium text-foreground">
              {t("mobile")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="mobile"
              value={workerData.mobile}
              onChange={(e) => {
                const val = e.target.value.replace(/[^0-9]/g, "")
                handleInputChange("mobile", val)
              }}
              inputMode="numeric"
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          <div className="space-y-1 min-w-0" style={{ flex: "1 1 0%" }}>
            <Label htmlFor="email" className="text-xs font-medium text-foreground">
              {t("email")} <span className="text-red-500">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={workerData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="h-9 text-xs bg-muted/30 border-input text-foreground"
            />
          </div>
          {canImpersonate && (
            <div className="shrink-0 flex items-end">
              <Button
                className="h-9 bg-green-600 hover:bg-green-700 text-white px-4 text-xs"
                onClick={handleLoginAs}
                disabled={isImpersonateLoading}
              >
                {isImpersonateLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("login")}
              </Button>
            </div>
          )}
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 13%" }}>
          <Label htmlFor="sex" className="text-xs font-medium text-foreground">
            {t("sex")}
          </Label>
          <Select value={workerData.sex} onValueChange={(value) => handleInputChange("sex", value)}>
            <SelectTrigger className="h-9 text-xs bg-muted/30 border-input text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="min-w-0 w-[150px]">
              <SelectItem value="man">{tEnum("gender", "MALE")}</SelectItem>
              <SelectItem value="woman">{tEnum("gender", "FEMALE")}</SelectItem>
              <SelectItem value="other">{tEnum("gender", "OTHER")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 13%" }}>
          <Label htmlFor="birth" className="text-xs font-medium text-foreground">
            {t("birthDate")}
          </Label>
          <DateInput
            id="birth"
            value={workerData.birthday}
            onChange={(e) => handleInputChange("birthday", e.target.value)}
            className="h-9 text-xs bg-muted/30 border-input text-foreground"
            allowPastDates
          />
        </div>
        {meMode && (
          <InlineImageUploader
            initialUrl={workerData.logoUrl ?? null}
            uploadPath="/worker/me/logo"
            accessToken={session?.accessToken}
            label={t("profile")}
          />
        )}
      </div>

      {/* Row 5: Observaciones 60% */}
      <div className="flex gap-3 items-end">
        <div className="space-y-1 min-w-0" style={{ flex: "0 0 60%" }}>
          <Label htmlFor="observations" className="text-xs font-medium text-foreground">
            {t("observations")}
          </Label>
          <Textarea
            id="observations"
            value={workerData.observation}
            onChange={(e) => handleInputChange("observation", e.target.value)}
            className="min-h-[40px] w-full bg-muted/30 border-input text-foreground resize-none text-xs py-1.5"
          />
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmDeleteWorker")}</AlertDialogTitle>
            <AlertDialogDescription>{t("confirmDeleteWorkerDesc")}</AlertDialogDescription>
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
        {!meMode && (
          <Button onClick={handleDelete} disabled={isDeleting} className="h-9 bg-yellow-500 hover:bg-yellow-600 text-white px-5 text-xs">
            {isDeleting ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
            {t("delete")}
          </Button>
        )}
      </div>
    </div>
    </div>
  )
}
