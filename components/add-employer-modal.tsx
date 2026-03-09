"use client"

import { useState, useEffect, useRef } from "react"
import { Info } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import GoogleAddressInput from "@/components/GoogleAddressInput"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface AddEmployerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmployerAdded?: (newEmployer: any) => void
  defaultPartnerId?: string
}

export default function AddEmployerModal({ open, onOpenChange, onEmployerAdded, defaultPartnerId }: AddEmployerModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const { t } = useTranslation()
  const { session } = useAuth()

  const [formData, setFormData] = useState({
    name: "",
    nif: "",
    partner: "",
    fee: "",
    discount: "",
    paymentMethod: "5", // Default to Transfer
    responsible: "",
    activateAccount: "postpone",
    accessEmail: null as string | null,
    class: "placeholder",
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
  })

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    address: false,
    mobile: false,
    email: false,
    partner: false,
    fee: false,
    nif: false,
    class: false,
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

  const [partners, setPartners] = useState<{ name: string; id: string | number }[]>([])

  // Pre-select partner when defaultPartnerId is provided
  useEffect(() => {
    if (defaultPartnerId && open) {
      setFormData((prev) => ({ ...prev, partner: defaultPartnerId }))
    }
  }, [defaultPartnerId, open])

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
          setPartners((data.data || []).map((p: any) => ({ name: p.name, id: p.publicId || p.id })))
        }
      } catch (e) {
        setPartners([])
      }
    }
    fetchPartners()
  }, [session?.accessToken])

  const fees = [
    { name: "Home", id: 1 },
    { name: "Static", id: 2 },
    { name: "Remote", id: 3 },
  ]

  const paymentMethods = [
    { name: t("Transfer"), id: 1 },
    { name: t("Direct Debit"), id: 2 },
    { name: t("Card"), id: 3 },
    { name: t("PayPal"), id: 4 },
    { name: t("Others"), id: 5 },
  ]

  const handleNext = () => {
    if (currentStep === 1) {
      const emailInvalid = !formData.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
      const errors = {
        name: !formData.name,
        address: !formData.address,
        mobile: !formData.mobile,
        email: emailInvalid,
        class: !(formData.class && formData.class !== "placeholder"),
      }
      setValidationErrors(errors)
      if (Object.values(errors).some((error) => error)) return
    } else if (currentStep === 2) {
      const errors = {
        partner: !formData.partner,
        fee: !formData.fee,
        nif: !formData.nif,
      }
      setValidationErrors((prev) => ({ ...prev, ...errors }))
      if (Object.values(errors).some((error) => error)) return
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
    const errors = {
      responsible: !formData.responsible,
    }
    if (errors.responsible) {
      setValidationErrors((prev) => ({ ...prev, ...errors }))
      return
    }
    setError(null)
    setIsLoading(true)
    try {
      const payload: any = {
        name: formData.name,
        taxId: formData.nif,
        address: formData.address,
        street: formData.street,
        streetNumber: formData.streetNumber,
        floorDoor: formData.floorDoor,
        city: formData.city,
        province: formData.province,
        country: formData.country,
        postalCode: formData.postalCode,
        latitude: formData.latitude,
        longitude: formData.longitude,
        partnerId: formData.partner,
        phone: formData.mobile,
        landline: formData.landline,
        typeId: Number.parseInt(formData.fee),
        subTypeId: formData.class === "company" ? 3 : 1,
        fee: Number.parseFloat(formData.fee) || 0,
        discount: Number.parseFloat(formData.discount) || 0,
        paymentMethodId: Number.parseInt(formData.paymentMethod),
        accountIban: formData.accountIban || "",
        bicSwift: formData.bicSwift || "",
        probationPeriod: formData.probationPeriod || "",
        responsible: formData.responsible,
        accessAccountStatus: formData.activateAccount,
        accessEmail: formData.accessEmail !== null ? formData.accessEmail : formData.email,
        user: {
          email: formData.email,
        },
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employers`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.accessToken ? { Authorization: `Bearer ${session.accessToken}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create employer")
      }

      const result = await response.json()

      // Show success toast
      toast({
        title: t("Employer Created successfully!"),
        variant: "default",
      })

      // Map backend employer to frontend fields and add to list
      if (typeof onEmployerAdded === "function" && result.data) {
        // Get the selected partner name from the partners array
        const selectedPartner = partners.find((p) => String(p.id) === formData.partner)

        // Get the selected fee type name from the fees array
        const selectedFeeType = fees.find((f) => f.id === Number.parseInt(formData.fee))

        const newEmployer = {
          id: result.data.publicId || result.data.id,
          name: result.data.name || formData.name,
          class:
            formData.class === "company"
              ? t("company")
              : formData.class === "self-employed"
              ? t("self-employed")
              : t("individual"),
          type: selectedFeeType?.name || formData.fee,
          fee: selectedFeeType?.name || formData.fee,
          lack: new Date().toLocaleDateString(), // Use current date since it was just created
          partner: selectedPartner?.name || "-",
          billing: "0 €",
        }

        console.log("Adding new employer to list:", newEmployer) // Debug log
        onEmployerAdded(newEmployer)
      }

      // Delay closing modal to allow toast to show and list to update
      setTimeout(() => {
        onOpenChange(false)
        resetForm()
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

  const resetForm = () => {
    setFormData({
      name: "",
      nif: "",
      partner: "",
      fee: "",
      discount: "",
      paymentMethod: "5",
      responsible: "",
      activateAccount: "postpone",
      accessEmail: null,
      class: "placeholder",
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
    })
    setCurrentStep(1)
    setValidationErrors({
      name: false,
      address: false,
      mobile: false,
      email: false,
      partner: false,
      fee: false,
      nif: false,
      class: false,
      responsible: false,
    })
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
                {t("newEmployer")}
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

        <div ref={scrollContainerRef} className="px-4 sm:px-6 pb-8 flex-1 overflow-y-auto">
          {/* Step 1: ID */}
          {currentStep === 1 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="class" className="text-sm font-medium text-foreground">
                  {t("class")} <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.class} onValueChange={(value) => updateFormData("class", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("selectClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="placeholder">{t("selectClass")}</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                    <SelectItem value="self-employed">Self-Employed</SelectItem>
                    <SelectItem value="company">Company</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.class && (
                  <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>
                )}
              </div>

              <div>
                <Label htmlFor="name" className="text-sm font-medium text-foreground">
                  {t("name")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => updateFormData("name", e.target.value)}
                  className={`mt-1 ${validationErrors.name ? "border-destructive" : ""}`}
                />
                {validationErrors.name && <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-medium text-foreground flex items-center gap-1">
                  {t("address")} <span className="text-destructive">*</span>
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
                    updateFormData("address", value)
                    if (components) {
                      updateFormData("street", components.street || "")
                      updateFormData("streetNumber", components.streetNumber || "")
                      updateFormData("floorDoor", components.floorDoor || "")
                      updateFormData("city", components.city || "")
                      updateFormData("province", components.province || "")
                      updateFormData("country", components.country || "")
                      updateFormData("postalCode", components.postalCode || "")
                      updateFormData("latitude", components.latitude || null)
                      updateFormData("longitude", components.longitude || null)
                    }
                  }}
                  placeholder="Calle, Número, Ciudad..."
                  className={`mt-1 border p-2 w-full rounded text-sm ${validationErrors.address ? "border-destructive" : ""}`}
                />
                {validationErrors.address && <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>}
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
                  {t("mobile")} <span className="text-destructive">*</span>
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
                  className={`mt-1 ${validationErrors.mobile ? "border-destructive" : ""}`}
                />
                {validationErrors.mobile && <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="email" className="text-sm font-medium text-foreground">
                  {t("email")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  placeholder="ejemplo@correo.com"
                  className={`mt-1 ${validationErrors.email ? "border-destructive" : ""}`}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-destructive">
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
            <div className="space-y-3">
              <div>
                <Label htmlFor="partner" className="text-sm font-medium text-foreground">
                  {t("partner")} <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.partner}
                  onValueChange={(value) => updateFormData("partner", value)}
                  disabled={!!defaultPartnerId}
                >
                  <SelectTrigger className={`mt-1 ${defaultPartnerId ? "opacity-70" : ""}`}>
                    <SelectValue placeholder={t("selectPartner")} />
                  </SelectTrigger>
                  <SelectContent>
                    {partners.map((partner) => (
                      <SelectItem key={partner.id} value={partner.id.toString()}>
                        {partner.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.partner && <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="nif" className="text-sm font-medium text-foreground">
                  {t("nif")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={(e) => updateFormData("nif", e.target.value)}
                  className={`mt-1 ${validationErrors.nif ? "border-destructive" : ""}`}
                />
                {validationErrors.nif && <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="fee" className="text-sm font-medium text-foreground">
                  {t("fee")} <span className="text-destructive">*</span>
                </Label>
                <Select value={formData.fee} onValueChange={(value) => updateFormData("fee", value)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder={t("selectFeeType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {fees.map((fee) => (
                      <SelectItem key={fee.id} value={fee.id.toString()}>
                        {fee.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {validationErrors.fee && <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>}
              </div>

              <div>
                <Label htmlFor="discount" className="text-sm font-medium text-foreground">
                  {t("discount")}
                </Label>
                <div className="flex items-center mt-1">
                  <Input
                    id="discount"
                    value={formData.discount}
                    onChange={(e) => updateFormData("discount", e.target.value)}
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
                    <SelectValue placeholder={t("selectPaymentMethod")} />
                  </SelectTrigger>
                  <SelectContent>
                    {paymentMethods.map((method) => (
                      <SelectItem key={method.id} value={method.id.toString()}>
                        {method.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-4 gap-4">
                <Button onClick={handlePrevious} className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto">
                  {t("back") || "Atrás"}
                </Button>
                <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto">
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
                  {t("responsible")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => updateFormData("responsible", e.target.value)}
                  className={`mt-1 ${validationErrors.responsible ? "border-destructive" : ""}`}
                  placeholder={t("namePlaceholder") || "nombre"}
                />
                {validationErrors.responsible && (
                  <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired") || "Este campo es obligatorio."}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("activationOfAccessAccount") || "Activation of access account?"}
                </Label>
                <RadioGroup
                  value={formData.activateAccount}
                  onValueChange={(value) => updateFormData("activateAccount", value)}
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
                          {t("requestAccessTip") || "Se enviará un mail al empleador para comunicar su cuenta de acceso a la aplicación y solicitar una contraseña."}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                </RadioGroup>
              </div>

              <div className={formData.activateAccount !== "request" ? "invisible" : ""}>
                <div>
                  <Label htmlFor="accessEmailDisplay" className="text-sm font-medium text-foreground">
                    {t("email")}
                  </Label>
                  <Input
                    id="accessEmailDisplay"
                    value={formData.accessEmail !== null ? formData.accessEmail : formData.email}
                    onChange={(e) => updateFormData("accessEmail", e.target.value)}
                    className="mt-1"
                    placeholder={formData.email}
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
              {error && <p className="mt-2 text-sm text-destructive text-center">{error}</p>}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}