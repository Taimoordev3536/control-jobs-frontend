



"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Info, Calendar, Loader2, Save, AlertCircle, RefreshCw } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

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
  landline: string
  mobile: string
  observation: string
  responsible: string
  winterSchedule: string | null
  summerSchedule: string | null
  accessAccountStatus: string
  userId: number
  name: string
  locality?: string
  province?: string
  country?: string
  email?: string
  postalCode?: string
  floorDoor?: string
  number?: string
}

export function ClientDataTab({ clientId }: ClientDataTabProps) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const [clientData, setClientData] = useState<ClientData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
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
          setClientData(result.data)
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

  const handleInputChange = (field: keyof ClientData, value: string) => {
    if (!clientData) return
    setClientData((prev) => (prev ? { ...prev, [field]: value } : null))
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!clientData || !session?.accessToken) return

    setIsSaving(true)
    setError(null)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/${clientId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(clientData),
      })

      if (!response.ok) {
        throw new Error(`Failed to save client data: ${response.status}`)
      }

      const result = await response.json()

      if (result.isSuccess) {
        setHasChanges(false)
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

  const handleDelete = async () => {
    if (!clientData || !session?.accessToken) return

    if (!confirm(t("confirmDelete") || "Are you sure you want to delete this client?")) {
      return
    }

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

      // Redirect back to clients list after successful deletion
      window.location.href = "/clients"
    } catch (err) {
      console.error("Error deleting client:", err)
      setError(err instanceof Error ? err.message : "Failed to delete client")
    }
  }

  const handleRetry = () => {
    setError(null)
    setIsLoading(true)
    window.location.reload()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span className="text-lg">{t("loading") || "Loading..."}</span>
        </div>
      </div>
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
    <div className="space-y-6 p-4">
      {/* Row 1: Code, NIF, Name, Responsible, Type */}
      <div className="grid grid-cols-5 gap-4">
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
      </div>

      {/* Row 2: Address, No., Floor/Door, Postal Code */}
      <div className="grid grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="address" className="text-sm font-medium text-foreground">
            {t("address")}
          </Label>
          <Input
            id="address"
            value={clientData.address || ""}
            onChange={(e) => handleInputChange("address", e.target.value)}
            className="h-10 bg-muted/30 border-input text-foreground"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="no" className="text-sm font-medium text-foreground">
            {t("number")}
          </Label>
          <Input
            id="no"
            value={clientData.number || ""}
            onChange={(e) => handleInputChange("number", e.target.value)}
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

      {/* Row 3: Locality, Province, Country */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label htmlFor="locality" className="text-sm font-medium text-foreground">
            {t("locality")}
          </Label>
          <Input
            id="locality"
            value={clientData.locality || ""}
            onChange={(e) => handleInputChange("locality", e.target.value)}
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

      {/* Observations section with Users button */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="observations" className="text-sm font-medium text-foreground">
            {t("observations")}
          </Label>
          <Button className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2">{t("users")}</Button>
        </div>
        <Textarea
          id="observations"
          value={clientData.observation || ""}
          onChange={(e) => handleInputChange("observation", e.target.value)}
          className="min-h-[80px] bg-muted/30 border-input text-foreground resize-none"
          placeholder="Enter observations..."
        />
      </div>

      {/* Bottom Action Buttons */}
      <div className="flex items-center justify-between pt-6">
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-2 flex items-center gap-2"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {isSaving ? t("saving") || "Saving..." : t("keep")}
          </Button>
          <Button variant="outline" className="border-input text-foreground hover:bg-muted/50 px-6 py-2 bg-transparent">
            {t("cancel")}
          </Button>
        </div>
        <Button onClick={handleDelete} className="bg-yellow-500 hover:bg-yellow-600 text-white px-6 py-2">
          {t("delete")}
        </Button>
      </div>
    </div>
  )
}
