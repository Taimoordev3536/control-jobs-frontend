"use client"

import { useState } from "react"
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

interface AddWorkerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onWorkerAdded?: (worker: any) => void
}

export default function AddWorkerModal({ open, onOpenChange, onWorkerAdded }: AddWorkerModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { t } = useTranslation()
  const { session, getUserRole } = useAuth()

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    landline: "",
    mobile: "",
    email: "",
    code: "",
    nif: "",
    naf: "",
    occupation: "",
    gender: "",
    birthday: "",
    accessAccountStatus: "postpone",
  accessEmail: "",
  })

  const [validationErrors, setValidationErrors] = useState({
    name: false,
    address: false,
    mobile: false,
    email: false,
    occupation: false,
    gender: false,
    code: false,
    birthday: false,
  })

  const steps = [
    { number: 1, label: t("Id") },
    { number: 2, label: t("Others") },
    { number: 3, label: t("Access") },
  ]

  const handleNext = () => {
    if (currentStep === 1) {
      const errors = {
        name: !formData.name,
        address: !formData.address,
        mobile: !formData.mobile,
        email: !formData.email,
        occupation: false,
        gender: false,
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
        occupation: !formData.occupation,
        gender: !formData.gender,
        code: !formData.code,
        birthday: !formData.birthday,
      }
      setValidationErrors(errors)

      if (errors.occupation || errors.gender || errors.code || errors.birthday) {
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
      // Only allow admin and partners to add workers
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
        landline: formData.landline,
        mobile: formData.mobile,
        email: formData.email,
        code: formData.code,
        nif: formData.nif,
        naf: formData.naf,
        occupation: formData.occupation,
        gender: formData.gender,
        birthday: formData.birthday,
        accessAccountStatus: formData.accessAccountStatus,
  ...(formData.accessAccountStatus === 'request' && { accessEmail: formData.accessEmail || formData.email }),
      }

      const token = session?.accessToken
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.message || "Failed to create worker")
      }

      const result = await response.json()
      toast({
        title: t("Worker created successfully!"),
        description: "",
        variant: "default",
      })

      // Map backend worker to frontend fields with proper data
      if (typeof onWorkerAdded === "function" && result.data) {
        const genderMap = {
          "1": t("man") || "Man",
          "2": t("woman") || "Woman",
          "3": t("other") || "Other",
        }

        const newWorker = {
          id: result.data.id,
          name: result.data.name || formData.name,
          occupation: result.data.occupation || formData.occupation || "-",
          telephones:
            [result.data.landline || formData.landline, result.data.mobile || formData.mobile]
              .filter(Boolean)
              .join(" | ") || "-",
          population: (result.data.address || formData.address)?.split(",").pop()?.trim() || "-",
          postalCode: Math.floor(10000 + Math.random() * 90000).toString(),
          asset: result.data.accessAccountStatus === "active" ? t("yeah") : t("no"),
          gender: genderMap[formData.gender as keyof typeof genderMap] || "-",
          birthday: formData.birthday || "-",
        }

        console.log("Adding new worker to list:", newWorker)
        onWorkerAdded(newWorker)
      }

      // Delay closing modal to allow toast to show
      setTimeout(() => {
        onOpenChange(false)
        setCurrentStep(1)
        setFormData({
          name: "",
          address: "",
          landline: "",
          mobile: "",
          email: "",
          code: "",
          nif: "",
          naf: "",
          occupation: "",
          gender: "",
          birthday: "",
          accessAccountStatus: "postpone",
          accessEmail: "",
        })
        setValidationErrors({
          name: false,
          address: false,
          mobile: false,
          email: false,
          occupation: false,
          gender: false,
          code: false,
          birthday: false,
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
      <DialogContent className="max-w-sm sm:max-w-md p-0 gap-0 [&>button]:hidden h-[90vh] flex flex-col bg-background border-border mx-4">
        <DialogHeader className="p-4 sm:p-6 pb-4">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-lg font-medium text-foreground">{t("newWorker") || "New Worker"}</DialogTitle>
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
                  <div
                    className={`w-12 sm:w-16 h-0.5 mx-2 ${step.number < currentStep ? "bg-purple-600" : "bg-muted"}`}
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
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
                )}
              </div>

              <div>
                <Label htmlFor="address" className="text-sm font-medium text-foreground">
                  {t("address")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => updateFormData("address", e.target.value)}
                  placeholder="Street, Number, Town..."
                  className={`mt-1 ${validationErrors.address ? "border-red-500" : ""}`}
                />
                {validationErrors.address && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
                )}
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
                  {t("mobile")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="mobile"
                  value={formData.mobile}
                  onChange={(e) => updateFormData("mobile", e.target.value)}
                  className={`mt-1 ${validationErrors.mobile ? "border-red-500" : ""}`}
                />
                {validationErrors.mobile && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
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
                  className={`mt-1 ${validationErrors.email ? "border-red-500" : ""}`}
                />
                {validationErrors.email && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
                )}
              </div>

              <div className="flex justify-end pt-4">
                <Button
                  onClick={handleNext}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Others */}
          {currentStep === 2 && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="code" className="text-sm font-medium text-foreground">
                  {t("code")}
                </Label>
                <Input
                  id="code"
                  value={formData.code}
                  onChange={(e) => updateFormData("code", e.target.value)}
                  className="mt-1"
                />
                {validationErrors.code && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
                )}
              </div>

              <div>
                <Label htmlFor="nif" className="text-sm font-medium text-foreground">
                  NIF
                </Label>
                <Input
                  id="nif"
                  value={formData.nif}
                  onChange={(e) => updateFormData("nif", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="naf" className="text-sm font-medium text-foreground">
                  NAF
                </Label>
                <Input
                  id="naf"
                  value={formData.naf}
                  onChange={(e) => updateFormData("naf", e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="occupation" className="text-sm font-medium text-foreground">
                  {t("occupation")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="occupation"
                  value={formData.occupation}
                  onChange={(e) => updateFormData("occupation", e.target.value)}
                  className={`mt-1 ${validationErrors.occupation ? "border-red-500" : ""}`}
                />
                {validationErrors.occupation && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
                )}
              </div>

              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("sex")} <span className="text-red-500">*</span>
                </Label>
                <Select value={formData.gender} onValueChange={(value) => updateFormData("gender", value)}>
                  <SelectTrigger className={`mt-1 ${validationErrors.gender ? "border-red-500" : ""}`}>
                    <SelectValue placeholder={t("selectGender") || "Select gender"} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{t("man") || "Man"}</SelectItem>
                    <SelectItem value="2">{t("woman") || "Woman"}</SelectItem>
                    <SelectItem value="3">{t("other") || "Other"}</SelectItem>
                  </SelectContent>
                </Select>
                {validationErrors.gender && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
                )}
              </div>

              <div>
                <Label htmlFor="birthday" className="text-sm font-medium text-foreground">
                  {t("birthdate")}
                </Label>
                <Input
                  id="birthday"
                  type="date"
                  value={formData.birthday}
                  onChange={(e) => updateFormData("birthday", e.target.value)}
                  className="mt-1"
                />
                {validationErrors.birthday && (
                  <p className="mt-1 text-sm text-red-500">{t("thisFieldIsRequired") || "This field is required."}</p>
                )}
              </div>

              <div className="flex flex-col sm:flex-row justify-between pt-4 gap-4">
                <Button onClick={handlePrevious} variant="outline" className="px-6 w-full sm:w-auto bg-transparent">
                  {t("back")}
                </Button>
                <Button
                  onClick={handleNext}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
                >
                  {t("next")}
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Access */}
          {currentStep === 3 && (
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-foreground">
                  {t("activationOfAccessAccount") || "Activation of access account?"}
                </Label>
                <RadioGroup
                  defaultValue={formData.accessAccountStatus}
                  onValueChange={(value: "postpone" | "request") => updateFormData("accessAccountStatus", value)}
                  className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 mt-2"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="postpone"
                      id="postpone"
                      checked={formData.accessAccountStatus === "postpone"}
                    />
                    <Label htmlFor="postpone" className="text-sm">
                      {t("postpone")}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="request" id="request" checked={formData.accessAccountStatus === "request"} />
                    <Label htmlFor="request" className="text-sm">
                      {t("request")}
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {formData.accessAccountStatus === "request" && (
                <div>
                  <Label htmlFor="accessEmailDisplay" className="text-sm font-medium text-foreground">
                    {t("email")}
                  </Label>
                  <Input
                    id="accessEmailDisplay"
                    value={formData.accessEmail || formData.email}
                    onChange={(e) => updateFormData('accessEmail', e.target.value)}
                    className="mt-1"
                    placeholder={formData.email}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("accessEmailHelper") || "Access credentials will be sent to this email"}
                  </p>
                </div>
              )}

              <div className="flex flex-col sm:flex-row justify-between pt-4 gap-4">
                <Button variant="outline" onClick={handlePrevious} className="px-6 w-full sm:w-auto bg-transparent">
                  {t("back")}
                </Button>
                <Button
                  onClick={handleCreate}
                  className="bg-purple-600 hover:bg-purple-700 text-white px-6 w-full sm:w-auto"
                  disabled={isLoading}
                >
                  {isLoading ? t("creating") : t("create")}
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
