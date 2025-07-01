


"use client"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Info, Calendar, Loader2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useParams } from "next/navigation"
import { useState, useEffect } from "react"

interface WorkerData {
  id: number
  code: string
  nif: string
  naf: string
  name: string
  lastName: string
  address: string
  number: string
  floor: string
  postalCode: string
  locality: string
  province: string
  country: string
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
  const workerId = params.id as string

  const [workerData, setWorkerData] = useState<WorkerData>({
    id: 0,
    code: "",
    nif: "",
    naf: "",
    name: "",
    lastName: "",
    address: "",
    number: "",
    floor: "",
    postalCode: "",
    locality: "",
    province: "",
    country: "",
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
        console.log("Worker API Response:", result)

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
            number: apiData.number || "",
            floor: apiData.floor || "",
            postalCode: apiData.postalCode || "",
            locality: apiData.locality || "",
            province: apiData.province || "",
            country: apiData.country || "",
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker/${workerId}`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(workerData),
      })

      if (!response.ok) {
        throw new Error(`Failed to save worker data: ${response.status}`)
      }

      const result = await response.json()

      if (result.isSuccess) {
        setOriginalData(workerData)
        setHasChanges(false)
        console.log("Worker data saved successfully")
      } else {
        throw new Error(result.developerError || "Failed to save worker data")
      }
    } catch (err) {
      console.error("Error saving worker data:", err)
      setError(err instanceof Error ? err.message : "Failed to save worker data")
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!session?.accessToken || !workerId) return

    if (!confirm("Are you sure you want to delete this worker?")) return

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

      const result = await response.json()

      if (result.isSuccess) {
        console.log("Worker deleted successfully")
        // Navigate back to workers list
        window.history.back()
      } else {
        throw new Error(result.developerError || "Failed to delete worker")
      }
    } catch (err) {
      console.error("Error deleting worker:", err)
      setError(err instanceof Error ? err.message : "Failed to delete worker")
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
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading worker data...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-red-600 mb-4">Error: {error}</p>
            <Button onClick={retryFetch} variant="outline">
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Worker Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Row 1: Code, NIF/NIE, NAF, Name/Pseudonym, Last names */}
        <div className="grid grid-cols-5 gap-6">
          <div className="space-y-1">
            <Label htmlFor="code" className="text-sm font-medium text-foreground flex items-center gap-1">
              {t("code")} <Info className="h-3 w-3 text-muted-foreground" />
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
              {t("naf")} <Info className="h-3 w-3 text-muted-foreground" />
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

        {/* Row 2: Address, No., Floor/Door, Postal Code */}
        <div className="grid grid-cols-4 gap-6">
          <div className="space-y-1">
            <Label htmlFor="address" className="text-sm font-medium text-foreground">
              {t("address")}
            </Label>
            <Input
              id="address"
              value={workerData.address}
              onChange={(e) => handleInputChange("address", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="number" className="text-sm font-medium text-foreground">
              {t("number")}
            </Label>
            <Input
              id="number"
              value={workerData.number}
              onChange={(e) => handleInputChange("number", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="floor" className="text-sm font-medium text-foreground">
              {t("floorDoor")}
            </Label>
            <Input
              id="floor"
              value={workerData.floor}
              onChange={(e) => handleInputChange("floor", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="postal" className="text-sm font-medium text-foreground">
              {t("postalCode")}
            </Label>
            <Input
              id="postal"
              value={workerData.postalCode}
              onChange={(e) => handleInputChange("postalCode", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
        </div>

        {/* Row 3: Locality, Province, Country */}
        <div className="grid grid-cols-3 gap-6">
          <div className="space-y-1">
            <Label htmlFor="locality" className="text-sm font-medium text-foreground">
              {t("locality")}
            </Label>
            <Input
              id="locality"
              value={workerData.locality}
              onChange={(e) => handleInputChange("locality", e.target.value)}
              className="h-9 text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="province" className="text-sm font-medium text-foreground">
              {t("province")}
            </Label>
            <Input
              id="province"
              value={workerData.province}
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
              value={workerData.country}
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
            className="min-h-[60px] text-sm bg-muted/30 border-input focus:border-purple-500 focus:ring-purple-500 resize-none"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between pt-4">
          <div className="flex gap-2">
            <Button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className="bg-purple-600 hover:bg-purple-700 text-white h-9 px-6"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                t("keep")
              )}
            </Button>
            <Button variant="secondary" className="h-9 px-6">
              {t("cancel")}
            </Button>
          </div>
          <Button onClick={handleDelete} className="bg-yellow-500 hover:bg-yellow-600 text-white h-9 px-6">
            {t("delete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
