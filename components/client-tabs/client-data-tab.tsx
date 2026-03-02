



"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Calendar, Loader2, Save, AlertCircle, RefreshCw } from "lucide-react"
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
      if (!session?.accessToken || !clientId || clientId === "undefined") {
        setError("Invalid client ID or no authentication")
        setIsLoading(false)
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

  const handleSave = async () => {
    if (!clientData || !session?.accessToken) return

    setIsSaving(true)
    setError(null)

    try {
      // Send only updateable fields, exclude id/userId
      const { id, userId, ...updatePayload } = clientData
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

  return (
    <div className="space-y-4 pt-1 px-2">
      {/* Row 1: Name, Responsible, Type, Code, NIF */}
      <div className="grid grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-sm font-medium text-foreground">
            {t("name")}
          </Label>
          <Input
            id="name"
            value={clientData.name || ""}
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
            value={clientData.responsible || ""}
            onChange={(e) => handleInputChange("responsible", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="type" className="text-sm font-medium text-foreground">
            {t("type")}
          </Label>
          <Select value={clientData.type || ""} onValueChange={(value) => handleInputChange("type", value)}>
            <SelectTrigger className="h-10 bg-muted/30 border-input text-foreground">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="particular">{t("particular")}</SelectItem>
              <SelectItem value="company">{t("company")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="code" className="text-sm font-medium text-foreground flex items-center gap-1">
            {t("code")}
            <Info className="h-3 w-3 text-muted-foreground" />
          </Label>
          <Input
            id="code"
            value={clientData.code || ""}
            onChange={(e) => handleInputChange("code", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="nif" className="text-sm font-medium text-foreground">
            {t("nif")}
          </Label>
          <Input
            id="nif"
            value={clientData.taxId || ""}
            onChange={(e) => handleInputChange("taxId", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 2: Address (full width) */}
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
            value={clientData.address || ""}
            onChange={(value, placeId, components) => {
              handleInputChange("address", value)
              if (components) {
                if (components.street) handleInputChange("street", components.street)
                if (components.streetNumber) handleInputChange("streetNumber", components.streetNumber)
                if (components.floorDoor) handleInputChange("floorDoor", components.floorDoor)
                if (components.city) handleInputChange("city", components.city)
                if (components.province) handleInputChange("province", components.province)
                if (components.country) handleInputChange("country", components.country)
                if (components.postalCode) handleInputChange("postalCode", components.postalCode)
                if (components.latitude) handleInputChange("latitude", components.latitude)
                if (components.longitude) handleInputChange("longitude", components.longitude)
              }
            }}
            className="flex h-10 w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-weight-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>
      </div>

      {/* Row 2b: No., Floor/Door, Postal Code */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="streetNumber" className="text-sm font-medium text-foreground">
            {t("number")}
          </Label>
          <Input
            id="streetNumber"
            value={clientData.streetNumber || ""}
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
            value={clientData.floorDoor || ""}
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
            value={clientData.postalCode || ""}
            onChange={(e) => handleInputChange("postalCode", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 3: City, Province, Country */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city" className="text-sm font-medium text-foreground">
            {t("city")}
          </Label>
          <Input
            id="city"
            value={clientData.city || ""}
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
            value={clientData.province || ""}
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
            value={clientData.country || ""}
            onChange={(e) => handleInputChange("country", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
      </div>

      {/* Row 4: Phone, Mobile, E-mail, Winter schedule, Summer time */}
      <div className="grid grid-cols-5 gap-4">
        <div className="space-y-2">
          <Label htmlFor="phone" className="text-sm font-medium text-foreground">
            {t("phone")}
          </Label>
          <Input
            id="phone"
            value={clientData.landline || ""}
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
            value={clientData.mobile || ""}
            onChange={(e) => handleInputChange("mobile", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-sm font-medium text-foreground">
            {t("email")}
          </Label>
          <Input
            id="email"
            type="email"
            value={clientData.email || ""}
            onChange={(e) => handleInputChange("email", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-1">
            {t("winterSchedule")}
            <Info className="h-3 w-3 text-muted-foreground" />
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={clientData.winterSchedule || ""}
              onChange={(e) => handleInputChange("winterSchedule", e.target.value)}
              className="h-10 bg-muted/30 border-input text-foreground pr-10"
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium text-foreground flex items-center gap-1">
            {t("summerTime")}
            <Info className="h-3 w-3 text-muted-foreground" />
          </Label>
          <div className="relative">
            <Input
              type="date"
              value={clientData.summerSchedule || ""}
              onChange={(e) => handleInputChange("summerSchedule", e.target.value)}
              className="h-10 bg-muted/30 border-input text-foreground pr-10"
            />
            <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Active + Observations + Users */}
      <div className="space-y-2">
        <div className="flex items-end gap-4">
          <div className="space-y-2 shrink-0">
            <Label htmlFor="active" className="text-sm font-medium text-foreground">
              {t("active")}
            </Label>
            <Select
              value={clientData.active ? "yeah" : "no"}
              onValueChange={(value) => handleInputChange("active", value === "yeah")}
            >
              <SelectTrigger className="h-10 w-36 bg-muted/30 border-input text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="yeah">{t("yeah")}</SelectItem>
                <SelectItem value="no">{t("no")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 max-w-[70%] space-y-2">
            <Label htmlFor="observations" className="text-sm font-medium text-foreground">
              {t("observations")}
            </Label>
            <Textarea
              id="observations"
              value={clientData.observation || ""}
              onChange={(e) => handleInputChange("observation", e.target.value)}
              className="min-h-[50px] w-full bg-muted/30 border-input text-foreground resize-none text-sm py-2"
              placeholder="Enter observations..."
            />
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 shrink-0 self-end">{t("users")}</Button>
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

      {/* Bottom Action Buttons */}
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
          <Button onClick={() => router.push("/clients")} className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 py-2">
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
