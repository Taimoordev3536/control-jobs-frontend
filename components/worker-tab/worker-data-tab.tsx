"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Calendar, Loader2, AlertCircle, RefreshCw } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AnimatedLoader } from "@/components/animated-loader"
import GoogleAddressInput, { AddressComponents } from "@/components/GoogleAddressInput"
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
}

export function WorkerDataTab() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const workerId = params.id as string

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
      if (!session?.accessToken || !workerId) return

      setIsLoading(true)
      setError(null)

      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${workerId}`, {
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
    if (!session?.accessToken || !workerId) return

    setIsSaving(true)
    setError(null)

    try {
      // Send only updateable fields, exclude id
      const { id, ...rest } = workerData
      const updatePayload: Record<string, any> = {
        ...rest,
        latitude: rest.latitude ? parseFloat(rest.latitude) : null,
        longitude: rest.longitude ? parseFloat(rest.longitude) : null,
      }
      // Remove empty strings for fields with strict validation
      if (!updatePayload.email) delete updatePayload.email
      if (!updatePayload.accessEmail) delete updatePayload.accessEmail
      if (!updatePayload.birthday) delete updatePayload.birthday
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${workerId}`, {
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
          variant: "default",
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
        variant: "default",
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

  return (
    <div className="space-y-4 pt-1 px-2">
        {/* Row 1: Code, NIF/NIE, NAF, Name/Pseudonym, Last names */}
        <div className="grid grid-cols-5 gap-6">
          <div className="space-y-1">
            <Label htmlFor="code" className="text-sm font-medium text-foreground flex items-center gap-1">
              {t("code")}
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                      <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[14rem] text-xs px-2 py-1 whitespace-pre-line">
                    {`${t("workerCodeTip")}`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="code"
              value={workerData.code}
              onChange={(e) => handleInputChange("code", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="nif" className="text-sm font-medium text-foreground">
              {t("nifNie")}
            </Label>
            <Input
              id="nif"
              value={workerData.nif}
              onChange={(e) => handleInputChange("nif", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="naf" className="text-sm font-medium text-foreground flex items-center gap-1">
              {t("naf")}
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                      <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[14rem] text-xs px-2 py-1 whitespace-pre-line">
                    {`${t("workerNafTip")}`}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </Label>
            <Input
              id="naf"
              value={workerData.naf}
              onChange={(e) => handleInputChange("naf", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="name" className="text-sm font-medium text-foreground">
              {t("name")}
            </Label>
            <Input
              id="name"
              value={workerData.name}
              onChange={(e) => handleInputChange("name", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="lastname" className="text-sm font-medium text-foreground">
              {t("lastNames")}
            </Label>
            <Input
              id="lastname"
              value={workerData.lastName}
              onChange={(e) => handleInputChange("lastName", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Row 2: Address (full width) */}
        <div className="grid grid-cols-1 gap-4">
          <div className="space-y-1">
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
              value={workerData.address || ""}
              onChange={(value: string, placeId?: string, components?: AddressComponents) => {
                handleInputChange("address", value)
                if (components) {
                  if (components.street) handleInputChange("street", components.street)
                  if (components.streetNumber) handleInputChange("streetNumber", components.streetNumber)
                  if (components.floorDoor) handleInputChange("floorDoor", components.floorDoor)
                  if (components.city) handleInputChange("city", components.city)
                  if (components.province) handleInputChange("province", components.province)
                  if (components.country) handleInputChange("country", components.country)
                  if (components.postalCode) handleInputChange("postalCode", components.postalCode)
                  if (components.latitude) handleInputChange("latitude", `${components.latitude}`)
                  if (components.longitude) handleInputChange("longitude", `${components.longitude}`)
                }
              }}
              className="flex h-9 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-weight-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
        </div>

        {/* Row 2b: No., Floor/Door, Postal Code */}
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <Label htmlFor="streetNumber" className="text-sm font-medium text-foreground">
              {t("number")}
            </Label>
            <Input
              id="streetNumber"
              value={workerData.streetNumber || ""}
              onChange={(e) => handleInputChange("streetNumber", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="floorDoor" className="text-sm font-medium text-foreground">
              {t("floorDoor")}
            </Label>
            <Input
              id="floorDoor"
              value={workerData.floorDoor || ""}
              onChange={(e) => handleInputChange("floorDoor", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="postalCode" className="text-sm font-medium text-foreground">
              {t("postalCode")}
            </Label>
            <Input
              id="postalCode"
              value={workerData.postalCode || ""}
              onChange={(e) => handleInputChange("postalCode", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Row 3: City, Province, Country */}
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <Label htmlFor="city" className="text-sm font-medium text-foreground">
              {t("city")}
            </Label>
            <Input
              id="city"
              value={workerData.city || ""}
              onChange={(e) => handleInputChange("city", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="province" className="text-sm font-medium text-foreground">
              {t("province")}
            </Label>
            <Input
              id="province"
              value={workerData.province || ""}
              onChange={(e) => handleInputChange("province", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="country" className="text-sm font-medium text-foreground">
              {t("country")}
            </Label>
            <Input
              id="country"
              value={workerData.country || ""}
              onChange={(e) => handleInputChange("country", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Row 4: Phone, Mobile, E-mail, Occupation */}
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-1">
            <Label htmlFor="phone" className="text-sm font-medium text-foreground">
              {t("phone")}
            </Label>
            <Input
              id="phone"
              value={workerData.landline}
              onChange={(e) => handleInputChange("landline", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="mobile" className="text-sm font-medium text-foreground">
              {t("mobile")}
            </Label>
            <Input
              id="mobile"
              value={workerData.mobile}
              onChange={(e) => handleInputChange("mobile", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("email")}
            </Label>
            <Input
              id="email"
              type="email"
              value={workerData.email}
              onChange={(e) => handleInputChange("email", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="occupation" className="text-sm font-medium text-foreground">
              {t("occupation")}
            </Label>
            <Input
              id="occupation"
              value={workerData.occupation}
              onChange={(e) => handleInputChange("occupation", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Row 5: Sex, F. Birth, Active */}
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <Label htmlFor="sex" className="text-sm font-medium text-foreground">
              {t("sex")}
            </Label>
            <Select value={workerData.sex} onValueChange={(value) => handleInputChange("sex", value)}>
              <SelectTrigger className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="man">{t("man")}</SelectItem>
                <SelectItem value="woman">{t("woman")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label htmlFor="birth" className="text-sm font-medium text-foreground">
              {t("birthDate")}
            </Label>
            <div className="relative">
              <Input
                id="birth"
                type="date"
                value={workerData.birthday}
                onChange={(e) => handleInputChange("birthday", e.target.value)}
                className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500 pr-8"
              />
              <Calendar className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="active" className="text-sm font-medium text-foreground">
              {t("active")}
            </Label>
            <Select
              value={workerData.active ? "yeah" : "no"}
              onValueChange={(value) => handleInputChange("active", value === "yeah")}
            >
              <SelectTrigger className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yeah">{t("yeah")}</SelectItem>
                <SelectItem value="no">{t("no")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Observations */}
        <div className="space-y-1">
          <Label htmlFor="observations" className="text-sm font-medium text-foreground">
            {t("observations")}
          </Label>
          <Textarea
            id="observations"
            value={workerData.observation}
            onChange={(e) => handleInputChange("observation", e.target.value)}
            className="min-h-[50px] max-w-[70%] text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500 resize-none"
          />
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

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-6 mt-6 px-4 py-4 bg-gray-100 dark:bg-gray-800/50 rounded-b-lg">
          <div className="flex items-center gap-3">
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 flex items-center gap-2"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isSaving ? t("saving") || "Saving..." : t("keep")}
            </Button>
            <Button onClick={() => router.push("/workers")} className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 py-2">
              {t("cancel")}
            </Button>
          </div>
          <Button onClick={handleDelete} disabled={isDeleting} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2">
            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {t("delete")}
          </Button>
        </div>
    </div>
  )
}
