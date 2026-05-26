"use client"

import { useState, useEffect, useRef } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useBackendError } from "@/lib/backend-error"
import { useAuth } from "@/hooks/use-auth"
import GoogleAddressInput from "@/components/GoogleAddressInput"
import { normalizeFloorDoor } from "@/lib/utils/normalize-floor-door"

interface AddPartnerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onPartnerAdded?: (partner: any) => void
}

// Partner tier keys (language-neutral). Display labels come from tEnum().
const partnerTypeKeys = ["GOLD", "SILVER", "BRONZE", "AFFILIATE"] as const

const getPartnerTierId = (typeOfPartner: string): number => {
  switch (typeOfPartner) {
    case "GOLD":
      return 1
    case "SILVER":
      return 2
    case "BRONZE":
      return 3
    case "AFFILIATE":
      return 4
    default:
      return 0
  }
}

export default function AddPartnerModal({ open, onOpenChange, onPartnerAdded }: AddPartnerModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t, tEnum } = useTranslation()
  const translateBackendError = useBackendError()
  const { session, getUserRole } = useAuth()
  const [addressDisplay, setAddressDisplay] = useState("")
  const [formData, setFormData] = useState({
    name: "",
    address: "",
    street: "",
    streetNumber: "",
    floorDoor: "",
    city: "",
    province: "",
    country: "",
    postalCode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    landline: "",
    mobile: "",
    email: "",
    nif: "",
    typeOfPartner: "",
    commission: "",
    retention: "15",
    paymentMethod: "TRANSFER",
    accountIban: "",
    bicSwift: "",
    responsible: "",
    accessAccountStatus: "postpone",
    accessEmail: null as string | null,
  })

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    address: false,
    mobile: false,
    email: false,
    nif: false,
    typeOfPartner: false,
    commission: false,
    responsible: false,
  })

  // Create a ref for the scrollable container
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Scroll to top when currentStep changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTo({ top: 0, behavior: "smooth" })
    }
  }, [currentStep])

  const steps = [
    { number: 1, label: t("Id") },
    { number: 2, label: t("Billing") },
    { number: 3, label: t("Access") },
  ]

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const handleNext = () => {
    if (currentStep === 1) {
      const emailInvalid = !formData.email || !isValidEmail(formData.email)
      const errors = {
        name: !formData.name,
        address: !formData.address,
        mobile: !formData.mobile,
        email: emailInvalid,
      }
      setValidationErrors(errors)

      if (errors.name || errors.address || errors.mobile || errors.email) {
        return
      }
    }

    if (currentStep === 2) {
      const errors = {
        ...validationErrors,
        nif: !formData.nif,
        typeOfPartner: !formData.typeOfPartner,
        commission: !formData.commission,
      }
      setValidationErrors(errors)

      if (errors.nif || errors.typeOfPartner || errors.commission) {
        return
      }
    }

    if (currentStep < 3) {
      setCurrentStep(currentStep + 1)
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleCreate = async () => {
    setError(null)
    setIsLoading(true)
    try {
      if (getUserRole() !== "admin") {
        setError(t("onlyAdminCanAddPartner") || "Only admin can add a partner.")
        toast({
          title: t("onlyAdminCanAddPartner") || "Only admin can add a partner.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }
      const payload: { [key: string]: any } = {
        name: formData.name,
        address: formData.address,
        street: formData.street || undefined,
        streetNumber: formData.streetNumber || undefined,
        floorDoor: formData.floorDoor || undefined,
        postalCode: formData.postalCode || undefined,
        city: formData.city || undefined,
        province: formData.province || undefined,
        country: formData.country || undefined,
        latitude: formData.latitude ? Number(formData.latitude) : undefined,
        longitude: formData.longitude ? Number(formData.longitude) : undefined,
        landline: formData.landline,
        mobile: formData.mobile,
        email: formData.email,
        nif: formData.nif,
        typeOfPartner: formData.typeOfPartner,
        partnerTierId: getPartnerTierId(formData.typeOfPartner),
        commission: Number.parseFloat(formData.commission),
        retention: Number.parseFloat(formData.retention),
        paymentMethod: formData.paymentMethod,
        accountIban: formData.accountIban,
        bicSwift: formData.bicSwift,
        responsible: formData.responsible,
        accessAccountStatus: formData.accessAccountStatus,
      }
      if (formData.accessAccountStatus === "request") {
        payload.accessEmail = formData.accessEmail !== null ? formData.accessEmail : formData.email
      }
      const token = session?.accessToken
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create partner")
      }
      const result = await response.json()
      toast({
        title: t("Partner created successfully!"),
        description:
          formData.accessAccountStatus === "request"
            ? t("Credentials have been sent to the partner's email")
            : "",
        variant: "success",
      })
      if (typeof onPartnerAdded === "function" && result.data) {
        const newPartner = {
          id: result.data.id,
          name: result.data.name,
          tier: result.data.partnerTier?.name || result.data.typeOfPartner || "-",
          createdAt: result.data.createdAt ? new Date(result.data.createdAt).toLocaleDateString() : "-",
          employersCount: result.data.employersCount ?? 0,
          billing: "0 €",
        }
        onPartnerAdded(newPartner)
      }
      setTimeout(() => {
        onOpenChange(false)
        setCurrentStep(1)
        setFormData({
          name: "",
          address: "",
          street: "",
          streetNumber: "",
          floorDoor: "",
          city: "",
          province: "",
          country: "",
          postalCode: "",
          latitude: null,
          longitude: null,
          landline: "",
          mobile: "",
          email: "",
          nif: "",
          typeOfPartner: "",
          commission: "",
          retention: "15",
          paymentMethod: "TRANSFER",
          accountIban: "",
          bicSwift: "",
          responsible: "",
          accessAccountStatus: "postpone",
        })
        setAddressDisplay("")
        setValidationErrors({
          name: false,
          address: false,
          mobile: false,
          email: false,
          nif: false,
          typeOfPartner: false,
          commission: false,
          responsible: false,
        })
      }, 1000)
    } catch (err: any) {
      setError(err.message)
      toast({
        title: translateBackendError(err),
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (validationErrors[field as keyof typeof validationErrors] !== undefined) {
      setValidationErrors((prev) => ({ ...prev, [field]: false }))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-sm sm:max-w-md p-0 gap-0 max-h-[90vh] flex flex-col bg-background border-border mx-4"
        onPointerDownOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest(".pac-container")) {
            e.preventDefault()
          }
        }}
        onInteractOutside={(e) => {
          const target = e.target as HTMLElement
          if (target.closest(".pac-container")) {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader className="p-4 sm:p-6 pb-4 space-y-4">
          <div className="flex items-center justify-between relative">
            <div className="flex-1" />
            <div className="absolute left-1/2 transform -translate-x-1/2 mb-3">
              <DialogTitle className="text-lg font-semibold text-foreground text-center tracking-tight">
                {t("newPartner")}
              </DialogTitle>
            </div>
            <div className="flex-1 flex justify-end" />
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-6 mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.number <= currentStep ? "text-white" : "bg-muted text-muted-foreground"
                    }`}
                    style={step.number <= currentStep ? { backgroundColor: "#662D91" } : {}}
                  >
                    {step.number}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      step.number === currentStep ? "font-medium" : "text-muted-foreground"
                    }`}
                    style={step.number === currentStep ? { color: "#662D91" } : undefined}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 sm:w-16 h-0.5 mx-2 ${step.number < currentStep ? "" : "bg-muted"}`}
                    style={step.number < currentStep ? { backgroundColor: "#662D91" } : undefined}
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div
          ref={scrollContainerRef}
          className="px-4 sm:px-6 pb-8 flex-1 overflow-y-auto"
        >
          {/* Step 1: ID */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  {t("name")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  className={`mt-1 ${validationErrors.name ? "border-red-500" : ""}`}
                />
                {validationErrors.name && <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-medium text-foreground flex items-center gap-1">
                  {t("address")} <span className="text-red-500">*</span>
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
                  value={addressDisplay}
                  useFullAddress
                  onChange={(value, placeId, components) => {
                    setAddressDisplay(value)
                    if (components) {
                      const parts = [components.street, components.streetNumber].filter(Boolean)
                      let addressOnly: string
                      if (parts.length > 0) {
                        addressOnly = parts.join(", ")
                      } else {
                        let cleaned = value
                        for (const part of [components.postalCode, components.city, components.province, components.country].filter(Boolean)) {
                          cleaned = cleaned.replace(part, "")
                        }
                        addressOnly = cleaned.replace(/,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "").trim()
                      }
                      updateFormData("address", addressOnly || value)
                      updateFormData("street", components.street || "")
                      updateFormData("streetNumber", components.streetNumber || "")
                      updateFormData("floorDoor", normalizeFloorDoor(components.floorDoor))
                      updateFormData("city", components.city || "")
                      updateFormData("province", components.province || "")
                      updateFormData("country", components.country || "")
                      updateFormData("postalCode", components.postalCode || "")
                      updateFormData("latitude", components.latitude || null)
                      updateFormData("longitude", components.longitude || null)
                    } else {
                      const parts = value.split(",").map((p) => p.trim())
                      updateFormData("address", parts.slice(0, 2).filter(Boolean).join(", ") || value)
                      updateFormData("street", parts[0] || "")
                      updateFormData("streetNumber", parts[1] || "")
                      updateFormData("floorDoor", normalizeFloorDoor(parts[2]))
                      updateFormData("postalCode", parts[3] || "")
                      updateFormData("city", parts[4] || "")
                      updateFormData("province", parts[5] || "")
                      updateFormData("country", parts[6] || "")
                    }
                  }}
                  placeholder={t("addressPlaceholder")}
                  className={`mt-1 border p-2 w-full rounded text-sm ${validationErrors.address ? "border-red-500" : ""}`}
                />
                {validationErrors.address && <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="landline" className="text-sm font-medium text-foreground">
                  {t("landline")}
                </Label>
                <Input
                  id="landline"
                  value={formData.landline}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "")
                    updateFormData("landline", val)
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ej. 912345678"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="mobile" className="text-sm font-medium text-foreground">
                  {t("mobile")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, "")
                    updateFormData("mobile", val)
                  }}
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="Ej. 612345678"
                  className={`mt-1 ${validationErrors.mobile ? "border-red-500" : ""}`}
                />
                {validationErrors.mobile && <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("email")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className={`mt-1 ${validationErrors.email ? "border-red-500" : ""}`}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-500">
                    {!formData.email
                      ? (t("thisFieldIsRequired") || "Este campo es obligatorio.")
                      : (t("invalidEmailFormat") || "Formato de email inválido (xxxx@xxx.xx)")}
                  </p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleNext}
                  className="text-white px-6 w-full sm:w-auto"
                  style={{ backgroundColor: "#662D91" }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#551A80")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#662D91")}
                >
                  {t("next") || "Siguiente"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Billing */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nif" className="text-sm font-medium text-foreground">
                  {t("nif")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={(e) => updateFormData("nif", e.target.value)}
                  className={`mt-1 ${validationErrors.nif ? "border-red-500" : ""}`}
                />
                {validationErrors.nif && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired")}</p>
                )}
              </div>

              <div>
                <Label htmlFor="typeOfPartner" className="text-sm font-medium text-foreground">
                  {t("Type")} <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.typeOfPartner}
                  onValueChange={(value) => updateFormData("typeOfPartner", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("selectType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {partnerTypeKeys.map((key) => (
                      <SelectItem key={key} value={key}>
                        {tEnum("partnerType", key)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.typeOfPartner && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired")}</p>
                )}
              </div>

              <div>
                <Label htmlFor="commission" className="text-sm font-medium text-foreground">
                  {t("commission")} <span className="text-red-500">*</span>
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="commission"
                    value={formData.commission}
                    onChange={(e) => updateFormData("commission", e.target.value)}
                    className={`w-20 ${validationErrors.commission ? "border-red-500" : ""}`}
                  />
                  <span className="ml-2 text-muted-foreground">%</span>
                </div>
                {validationErrors.commission && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired")}</p>
                )}
              </div>

              <div>
                <Label htmlFor="retention" className="text-sm font-medium text-foreground">
                  {t("retention")}
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="retention"
                    value={formData.retention}
                    onChange={(e) => updateFormData("retention", e.target.value)}
                    className="w-20"
                  />
                  <span className="ml-2 text-muted-foreground">%</span>
                </div>
              </div>

              <div>
                <Label htmlFor="paymentMethod" className="text-sm font-medium text-foreground">
                  {t("paymentMethod")}
                </Label>
                <Select
                  value={formData.paymentMethod}
                  onValueChange={(value) => updateFormData("paymentMethod", value)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select a type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TRANSFER">{tEnum("paymentMethod", "TRANSFER")}</SelectItem>
                    <SelectItem value="DIRECT_DEBIT">{tEnum("paymentMethod", "DIRECT_DEBIT")}</SelectItem>
                    <SelectItem value="CARD">{tEnum("paymentMethod", "CARD")}</SelectItem>
                    <SelectItem value="PAYPAL">{tEnum("paymentMethod", "PAYPAL")}</SelectItem>
                    <SelectItem value="OTHERS">{tEnum("paymentMethod", "OTHERS")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="accountIban" className="text-sm font-medium text-foreground">
                  {t("accountIban")}
                </Label>
                <Input
                  id="accountIban"
                  value={formData.accountIban}
                  onChange={(e) => updateFormData("accountIban", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="bicSwift" className="text-sm font-medium text-foreground">
                  {t("bicSwift")}
                </Label>
                <Input
                  id="bicSwift"
                  value={formData.bicSwift}
                  onChange={(e) => updateFormData("bicSwift", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-4 gap-4">
                <Button onClick={handlePrevious} className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto">
                  {t("back") || "Atrás"}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
                >
                  {t("next") || "Siguiente"}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Access */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="responsible" className="text-sm font-medium text-foreground">
                  {t("responsible")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => updateFormData("responsible", e.target.value)}
                  className={`mt-1 ${validationErrors.responsible ? "border-red-500" : ""}`}
                  placeholder={t("namePlaceholder") || "nombre"}
                />
                {validationErrors.responsible && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "Este campo es obligatorio."}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("activationOfAccessAccount") || "Activation of access account?"}
                </Label>
                <RadioGroup
                  value={formData.accessAccountStatus}
                  onValueChange={(value: string) => updateFormData("accessAccountStatus", value)}
                  className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="postpone" id="postpone" />
                    <Label htmlFor="postpone" className="text-sm">
                      {t("postpone")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="request" id="request" />
                    <Label htmlFor="request" className="text-sm">
                      {t("requestAccess") || "Solicitar"}
                    </Label>
                    <TooltipProvider>
                      <Tooltip delayDuration={0}>
                        <TooltipTrigger asChild>
                          <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                            <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="right" align="center" sideOffset={6} className="max-w-[14rem] text-xs px-2 py-1">
                          {t("requestAccessTip") || "Se enviará un mail al partner para comunicar su cuenta de acceso a la aplicación y solicitar una contraseña."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </RadioGroup>
              </div>

              <div className={formData.accessAccountStatus !== "request" ? "invisible" : ""}>
                <div>
                  <Label htmlFor="accessEmailDisplay" className="text-sm font-medium text-foreground">
                    {t("email")}
                  </Label>
                  <Input
                    id="accessEmailDisplay"
                    value={formData.email}
                    readOnly
                    className="mt-1 bg-muted cursor-not-allowed"
                  />
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-4 gap-4">
                <Button onClick={handlePrevious} className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto">
                  {t("back") || "Atrás"}
                </Button>
                <Button
                  onClick={handleCreate}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
                  disabled={isLoading}
                >
                  {isLoading ? (t("creating") || "Creando...") : (t("create") || "Crear")}
                </Button>
              </div>
              {error && <p className="mt-2 text-sm text-red-500 text-center">{error}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}