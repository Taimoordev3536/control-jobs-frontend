"use client"

import { useState } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import GoogleAddressInput, { AddressComponents } from "@/components/GoogleAddressInput"

interface AddClientModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onClientAdded?: (client: any) => void
}

export default function AddClientModal({ open, onOpenChange, onClientAdded }: AddClientModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()
  const { session, getUserRole } = useAuth()

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    street: "",
    streetNumber: "",
    city: "",
    province: "",
    country: "",
    postalCode: "",
    latitude: null as number | null,
    longitude: null as number | null,
    landline: "",
    mobile: "",
    email: "",
    type: "",
    code: "",
    taxId: "",
    observation: "",
    responsible: "",
    accessAccountStatus: "postpone",
    accessEmail: null as string | null,
  })

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    address: false,
    mobile: false,
    email: false,
    type: false,
    responsible: false,
    accessEmail: false,
  })

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const steps = [
    { number: 1, label: t("identification") || "Identificación" },
    { number: 2, label: t("others") || "Otros" },
    { number: 3, label: t("access") || "Acceso" },
  ]

  const handleNext = () => {
    if (currentStep === 1) {
      const emailInvalid = !formData.email || !isValidEmail(formData.email)
      const errors = {
        name: !formData.name,
        address: !formData.address,
        mobile: !formData.mobile,
        email: emailInvalid,
        type: false,
        responsible: false,
      }
      setValidationErrors(errors)

      if (errors.name || errors.address || errors.mobile || errors.email) {
        return
      }
    }

    if (currentStep === 2) {
      const errors = {
        name: false,
        address: false,
        mobile: false,
        email: false,
        type: !formData.type,
        responsible: false,
      }
      setValidationErrors(errors)

      if (errors.type) {
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
    // Validate responsible on step 3
    if (!formData.responsible) {
      setValidationErrors((prev) => ({ ...prev, responsible: true }))
      return
    }
    setValidationErrors((prev) => ({ ...prev, responsible: false }))

    // Validate accessEmail format when access is requested
    if (formData.accessAccountStatus === "request") {
      const emailToCheck = formData.accessEmail !== null ? formData.accessEmail : formData.email
      if (!emailToCheck || !isValidEmail(emailToCheck)) {
        setValidationErrors((prev) => ({ ...prev, accessEmail: true }))
        return
      }
    }
    setValidationErrors((prev) => ({ ...prev, accessEmail: false }))
    setError(null)
    setIsLoading(true)
    try {
      // Only allow admin and partners to add clients
      const userRole = getUserRole()
      if (userRole !== "employer") {
        setError(t("onlyEmployerCanAddClient") || "Only employer can add a client.")
        toast({
          title: t("onlyEmployerCanAddClient") || "Only employer can add a client.",
          variant: "destructive",
        })
        setIsLoading(false)
        return
      }

      const payload = {
        name: formData.name,
        address: formData.address,
        street: formData.street,
        streetNumber: formData.streetNumber,
        city: formData.city,
        province: formData.province,
        country: formData.country,
        postalCode: formData.postalCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        landline: formData.landline,
        mobile: formData.mobile,
        email: formData.email,
        type: formData.type,
        code: formData.code,
        taxId: formData.taxId,
        observation: formData.observation,
        responsible: formData.responsible,
        accessAccountStatus: formData.accessAccountStatus,
        ...(formData.accessAccountStatus === "request" && { accessEmail: formData.accessEmail !== null ? formData.accessEmail : formData.email }),
      }

      const token = session?.accessToken
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create client")
      }

      const result = await response.json()
      toast({
        title: t("clientCreatedSuccessfully") || "Client created successfully!",
        description: "",
        variant: "default",
      })

      // Map backend client to frontend fields with proper data
      if (typeof onClientAdded === "function" && result.data) {
        const clientData = result.data.client || result.data
        const newClient = {
          publicId: clientData.publicId || clientData.id,
          name: clientData.name || formData.name,
          city: clientData.city || formData.city || "",
          type: formData.type,
          responsible: clientData.responsible || formData.responsible || "",
          landline: clientData.landline || formData.landline || "",
          mobile: clientData.mobile || formData.mobile || "",
          active: clientData.active !== undefined ? clientData.active : true,
        }

        console.log("Adding new client to list:", newClient)
        onClientAdded(newClient)
      }

      // Delay closing modal to allow toast to show
      setTimeout(() => {
        onOpenChange(false)
        setCurrentStep(1)
        setFormData({
          name: "",
          address: "",
          street: "",
          streetNumber: "",
          city: "",
          province: "",
          country: "",
          postalCode: "",
          latitude: null,
          longitude: null,
          landline: "",
          mobile: "",
          email: "",
          type: "",
          code: "",
          taxId: "",
          observation: "",
          responsible: "",
          accessAccountStatus: "postpone",
          accessEmail: null,
        })
        setValidationErrors({
          name: false,
          address: false,
          mobile: false,
          email: false,
          type: false,
          responsible: false,
        })
      }, 1000)
    } catch (err: any) {
      setError(err.message)
      toast({
        title: err.message || t("unexpectedError"),
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
          // Prevent dialog from closing when clicking Google Places autocomplete suggestions
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
                {t("newCustomer") || "Nuevo cliente"}
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
                      step.number <= currentStep
                        ? "text-white"
                        : "bg-muted text-muted-foreground"
                    }`}
                    style={
                      step.number <= currentStep
                        ? { backgroundColor: "#662D91" }
                        : {}
                    }
                  >
                    {step.number}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      step.number === currentStep
                        ? "font-medium"
                        : "text-muted-foreground"
                    }`}
                    style={
                      step.number === currentStep
                        ? { color: "#662D91" }
                        : undefined
                    }
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 sm:w-16 h-0.5 mx-2 ${
                      step.number < currentStep ? "" : "bg-muted"
                    }`}
                    style={
                      step.number < currentStep
                        ? { backgroundColor: "#662D91" }
                        : undefined
                    }
                  />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-8 flex-1 overflow-y-auto">
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
                {validationErrors.name && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "Este campo es obligatorio."}</p>
                )}
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
                  value={formData.address}
                  onChange={(value, placeId, components) => {
                    if (components) {
                      // Store only street + number in address field; other parts go to their own fields
                      const parts = [components.street, components.streetNumber].filter(Boolean)
                      let addressOnly: string
                      if (parts.length > 0) {
                        addressOnly = parts.join(", ")
                      } else {
                        // No street/number (Plus Codes, business names, etc.) — strip city/province/country/postalCode from the full address
                        let cleaned = value
                        for (const part of [components.postalCode, components.city, components.province, components.country].filter(Boolean)) {
                          cleaned = cleaned.replace(part, "")
                        }
                        addressOnly = cleaned.replace(/,\s*,/g, ",").replace(/^[\s,]+|[\s,]+$/g, "").trim()
                      }
                      updateFormData("address", addressOnly || value)
                      if (components.street) updateFormData("street", components.street)
                      if (components.streetNumber) updateFormData("streetNumber", components.streetNumber)
                      if (components.floorDoor) updateFormData("floorDoor", components.floorDoor)
                      if (components.city) updateFormData("city", components.city)
                      if (components.province) updateFormData("province", components.province)
                      if (components.country) updateFormData("country", components.country)
                      if (components.postalCode) updateFormData("postalCode", components.postalCode)
                      if (components.latitude) updateFormData("latitude", components.latitude)
                      if (components.longitude) updateFormData("longitude", components.longitude)
                    } else {
                      // Manual typing (no Google selection)
                      updateFormData("address", value)
                    }
                  }}
                  placeholder="Calle, Número, Ciudad..."
                  className={`mt-1 border p-2 w-full rounded text-sm ${validationErrors.address ? "border-red-500" : ""}`}
                />
                {validationErrors.address && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "Este campo es obligatorio."}</p>
                )}
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
                {validationErrors.mobile && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "Este campo es obligatorio."}</p>
                )}
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

          {/* Step 2: Others */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("Type") || "type"} <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.type} onValueChange={(value) => updateFormData("type", value)}>
                  <SelectTrigger className={`mt-1 ${validationErrors.type ? "border-red-500" : ""}`}>
                    <SelectValue placeholder={t("selectType") || "Seleccionar tipo"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="company">{t("company")}</SelectItem>
                    <SelectItem value="particular">{t("particular")}</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.type && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "Este campo es obligatorio."}</p>
                )}
              </div>

              <div>
                <Label htmlFor="code" className="text-sm font-medium text-foreground flex items-center gap-1">
                  {t("code")}
                  <TooltipProvider>
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex items-center p-0" tabIndex={-1}>
                          <Info tabIndex={-1} className="w-3 h-3 text-muted-foreground cursor-help" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="right" align="center" sideOffset={6} className="max-w-fit text-xs px-2 py-1">
                        {t("erpCustomerCodeTip")}
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => updateFormData("code", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="nif" className="text-sm font-medium text-foreground">
                  {formData.type === "company" ? "CIF" : "NIF"}
                </Label>
                <Input
                  id="taxId"
                  value={formData.taxId}
                  onChange={(e) => updateFormData("taxId", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="observation" className="text-sm font-medium text-foreground">
                  {t("observations") || "Observations"}
                </Label>
                <Textarea
                  id="observation"
                  value={formData.observation}
                  onChange={(e) => updateFormData("observation", e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-4 gap-4">
                <Button
                  onClick={handlePrevious}
                  className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto"
                >
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
                    <RadioGroupItem
                      value="postpone"
                      id="postpone"
                    />
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
                          {t("requestAccessTip") || "Se enviará un mail al cliente para comunicar su cuenta de acceso a la aplicación y solicitar una contraseña."}
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
                    value={formData.accessEmail !== null ? formData.accessEmail : formData.email}
                    onChange={(e) => updateFormData('accessEmail', e.target.value)}
                    className={`mt-1 ${validationErrors.accessEmail ? "border-red-500" : ""}`}
                    placeholder={formData.email}
                  />
                  {validationErrors.accessEmail && (
                    <p className="mt-1 text-sm text-red-500">
                      {t("invalidEmailFormat") || "Formato incorrecto"}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-4 gap-4">
                <Button
                  onClick={handlePrevious}
                  className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto"
                >
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
