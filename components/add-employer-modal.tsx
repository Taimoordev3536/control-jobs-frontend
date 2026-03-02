"use client"

import { useState, useEffect, useRef } from "react" // Added useRef
import { X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface AddEmployerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onEmployerAdded?: (newEmployer: any) => void
}

export default function AddEmployerModal({ open, onOpenChange, onEmployerAdded }: AddEmployerModalProps) {
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
    accessEmail: "",
    class: "placeholder",
    address: "",
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

  const [partners, setPartners] = useState<{ name: string; id: number }[]>([])

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
          setPartners((data.data || []).map((p: any) => ({ name: p.name, id: p.id })))
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
      const errors = {
        name: !formData.name,
        address: !formData.address,
        mobile: !formData.mobile,
        email: !formData.email,
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
    setError(null)
    setIsLoading(true)
    try {
      const payload: any = {
        name: formData.name,
        taxId: formData.nif,
        address: formData.address,
        partnerId: Number.parseInt(formData.partner),
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
        accessEmail: formData.accessEmail || undefined,
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
        const selectedPartner = partners.find((p) => p.id === Number.parseInt(formData.partner))

        // Get the selected fee type name from the fees array
        const selectedFeeType = fees.find((f) => f.id === Number.parseInt(formData.fee))

        const newEmployer = {
          id: result.data.id,
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
      accessEmail: "",
      class: "placeholder",
      address: "",
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
      <DialogContent className="max-w-md p-0 gap-0 [&>button]:hidden h-[90vh] flex flex-col bg-background">
        <DialogHeader className="p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium text-foreground">{t("newEmployer")}</DialogTitle>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onOpenChange(false)}>
              <X className="h-4 w-4" />
            </Button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center justify-center mt-6 mb-4">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      step.number <= currentStep ? "bg-purple-600 text-white" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {step.number}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      step.number === currentStep ? "text-purple-600 font-medium" : "text-muted-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-16 h-0.5 mx-2 ${step.number < currentStep ? "bg-purple-600" : "bg-muted"}`} />
                )}
              </div>
            ))}
          </div>
        </DialogHeader>

        <div ref={scrollContainerRef} className="px-6 pb-8 flex-1 overflow-y-auto">
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
                <Label htmlFor="address" className="text-sm font-medium text-foreground">
                  {t("address")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateFormData("address", e.target.value)}
                  placeholder={t("addressPlaceholder")}
                  className={`mt-1 ${validationErrors.address ? "border-destructive" : ""}`}
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
                  onChange={(e) => updateFormData("landline", e.target.value)}
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
                  onChange={(e) => updateFormData("mobile", e.target.value)}
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
                  className={`mt-1 ${validationErrors.email ? "border-destructive" : ""}`}
                />
                {validationErrors.email && <p className="mt-1 text-sm text-destructive">{t("thisFieldIsRequired")}</p>}
              </div>

              <div className="flex justify-end pt-4">
                <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
                  {t("next")}
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
                <Select value={formData.partner} onValueChange={(value) => updateFormData("partner", value)}>
                  <SelectTrigger className="mt-1">
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

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevious} className="bg-neutral-500 hover:bg-neutral-600 text-white px-6">
                  {t("back")}
                </Button>
                <Button onClick={handleNext} className="bg-purple-600 hover:bg-purple-700 text-white px-6">
                  {t("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Access */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="responsible" className="text-sm font-medium text-foreground">
                  {t("responsible")}
                </Label>
                <Input
                  id="responsible"
                  value={formData.responsible}
                  onChange={(e) => updateFormData("responsible", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground">{t("activateAccessAccount")}</Label>
                <RadioGroup
                  value={formData.activateAccount}
                  onValueChange={(value) => updateFormData("activateAccount", value)}
                  className="flex space-x-4 mt-2"
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
                      {t("request")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.activateAccount === "request" && (
                <div>
                  <Label htmlFor="accessEmail" className="text-sm font-medium text-foreground">
                    {t("accessEmail")}
                  </Label>
                  <Input
                    id="accessEmail"
                    value={formData.accessEmail}
                    onChange={(e) => updateFormData("accessEmail", e.target.value)}
                    className="mt-1"
                    placeholder={formData.email}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">{t("accessEmailHelper") || "Leave empty to use the main email address"}</p>
                </div>
              )}

              <div className="flex justify-between pt-4">
                <Button onClick={handlePrevious} className="bg-neutral-500 hover:bg-neutral-600 text-white px-6">
                  {t("back")}
                </Button>
                <Button
                  onClick={handleCreate}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6"
                  disabled={isLoading}
                >
                  {isLoading ? t("creating") : t("create")}
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