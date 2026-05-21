"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signOut } from "next-auth/react"
import { Loader2, Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import GoogleAddressInput from "@/components/GoogleAddressInput"

interface VerifiedToken {
  description: string
  type?: "company" | "particular"
  employerId: number
  employerName: string
}

export default function ClientInviteSignup({
  token,
  verified,
}: {
  token: string
  verified: VerifiedToken
}) {
  const { t, tEnum } = useTranslation()
  const { toast } = useToast()
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [form, setForm] = useState({
    name: "",
    type: (verified.type ?? "") as "company" | "particular" | "",
    code: "",
    taxId: "",
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
    responsible: "",
    observation: "",
    password: "",
    confirmPassword: "",
  })

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))
  const [addressDisplay, setAddressDisplay] = useState("")

  const next = () => {
    if (step === 1) {
      if (!form.name)
        return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.address)
        return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.mobile)
        return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        return toast({
          title: t("invalidEmail") || "Please enter a valid email",
          variant: "destructive",
        })
      }
      setStep(2)
    } else if (step === 2) {
      if (!form.type)
        return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.taxId)
        return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      setStep(3)
    }
  }

  const submit = async () => {
    if (form.password.length < 8) {
      return toast({
        title: t("passwordTooShort") || "Password must be 8+ chars",
        variant: "destructive",
      })
    }
    if (form.password !== form.confirmPassword) {
      return toast({
        title: t("passwordsDontMatch") || "Passwords don't match",
        variant: "destructive",
      })
    }
    setSubmitting(true)
    try {
      const body = {
        token,
        password: form.password,
        name: form.name,
        email: form.email,
        type: form.type,
        taxId: form.taxId,
        address: form.address,
        street: form.street,
        streetNumber: form.streetNumber,
        floorDoor: form.floorDoor,
        postalCode: form.postalCode,
        city: form.city,
        province: form.province,
        country: form.country,
        latitude: form.latitude,
        longitude: form.longitude,
        landline: form.landline,
        mobile: form.mobile,
        responsible: form.responsible,
        observation: form.observation,
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/client-invitations/accept`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        },
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || "Failed to create account")
      }
      toast({
        title: t("accountCreated") || "Account created!",
        variant: "success" as any,
      })
      await signOut({ redirect: false })
      router.push(`/check-your-email?email=${encodeURIComponent(form.email)}`)
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border rounded-lg shadow-sm">
      <div className="px-6 pt-6 pb-2 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {t("completeRegistration") || "Complete your registration"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t("invitedBy") || "Invited by"}:{" "}
          <span className="font-medium text-foreground">
            {verified.employerName}
          </span>
        </p>
      </div>

      <div className="flex items-center justify-center mt-3 mb-4">
        {[1, 2, 3].map((n, idx) => (
          <div key={n} className="flex items-center">
            <div
              className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                n <= step ? "text-white" : "bg-muted text-muted-foreground"
              }`}
              style={n <= step ? { backgroundColor: "#662D91" } : {}}
            >
              {n}
            </div>
            {idx < 2 && (
              <div
                className={`w-12 h-0.5 mx-2 ${n < step ? "" : "bg-muted"}`}
                style={n < step ? { backgroundColor: "#662D91" } : undefined}
              />
            )}
          </div>
        ))}
      </div>

      <div className="px-6 pb-6 space-y-3">
        {step === 1 && (
          <>
            <div>
              <Label className="text-xs">{t("name")} *</Label>
              <Input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">{t("address")} *</Label>
              <GoogleAddressInput
                value={addressDisplay}
                useFullAddress
                onChange={(value, _placeId, components) => {
                  setAddressDisplay(value)
                  if (components) {
                    const parts = [components.street, components.streetNumber].filter(Boolean)
                    const addressOnly = parts.length > 0 ? parts.join(", ") : value
                    update("address", addressOnly || value)
                    update("street", components.street || "")
                    update("streetNumber", components.streetNumber || "")
                    update("floorDoor", (components.floorDoor || "").toUpperCase())
                    update("city", components.city || "")
                    update("province", components.province || "")
                    update("country", components.country || "")
                    update("postalCode", components.postalCode || "")
                    update("latitude", components.latitude || null)
                    update("longitude", components.longitude || null)
                  } else {
                    const parts = value.split(",").map((p) => p.trim())
                    update("address", parts.slice(0, 2).filter(Boolean).join(", ") || value)
                    update("street", parts[0] || "")
                    update("streetNumber", parts[1] || "")
                    update("floorDoor", (parts[2] || "").toUpperCase())
                    update("postalCode", parts[3] || "")
                    update("city", parts[4] || "")
                    update("province", parts[5] || "")
                    update("country", parts[6] || "")
                  }
                }}
                placeholder={t("addressPlaceholder")}
                className="mt-1 border p-2 w-full rounded text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">{t("landline")}</Label>
              <Input
                value={form.landline}
                onChange={(e) => update("landline", e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">{t("mobile")} *</Label>
              <Input
                value={form.mobile}
                onChange={(e) => update("mobile", e.target.value.replace(/[^0-9]/g, ""))}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">{t("email")} *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => update("email", e.target.value)}
                placeholder="you@company.com"
                className="mt-1 h-9 text-xs"
                autoComplete="email"
              />
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <div>
              <Label className="text-xs">{t("type") || "Tipo"} *</Label>
              <Select value={form.type} disabled>
                <SelectTrigger className="mt-1 h-9 text-xs bg-muted cursor-not-allowed">
                  <SelectValue placeholder={t("selectType") || "Seleccionar tipo"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">
                    {tEnum("clientType", "company") || "Empresa"}
                  </SelectItem>
                  <SelectItem value="particular">
                    {tEnum("clientType", "particular") || "Particular"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">{t("nif") || "NIF/CIF"} *</Label>
              <Input
                value={form.taxId}
                onChange={(e) => update("taxId", e.target.value)}
                className="mt-1 h-9 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs">{t("responsible") || "Responsable"}</Label>
              <Input
                value={form.responsible}
                onChange={(e) => update("responsible", e.target.value)}
                className="mt-1 h-9 text-xs"
                autoComplete="off"
              />
            </div>
          </>
        )}

        {step === 3 && (
          <>
            <div>
              <Label className="text-xs">{t("email")}</Label>
              <div className="mt-1 px-3 py-2 rounded-md border border-input bg-muted text-xs text-muted-foreground select-none pointer-events-none">
                {form.email}
              </div>
            </div>
            <div>
              <Label className="text-xs">{t("password") || "Password"} *</Label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <Input
                  type={showPassword ? "text" : "password"}
                  value={form.password}
                  onChange={(e) => update("password", e.target.value)}
                  className="h-9 text-xs pl-9 pr-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                >
                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
            <div>
              <Label className="text-xs">
                {t("confirmPassword") || "Confirm password"} *
              </Label>
              <div className="relative mt-1">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-3.5 w-3.5 text-muted-foreground" />
                </span>
                <Input
                  type={showConfirmPassword ? "text" : "password"}
                  value={form.confirmPassword}
                  onChange={(e) => update("confirmPassword", e.target.value)}
                  className="h-9 text-xs pl-9 pr-9"
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground"
                >
                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                </button>
              </div>
            </div>
          </>
        )}

        <div className="flex justify-between gap-2 pt-4">
          {step > 1 ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="h-9 text-xs"
            >
              {t("back")}
            </Button>
          ) : (
            <span />
          )}
          {step < 3 ? (
            <Button
              size="sm"
              onClick={next}
              className="h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {t("next")}
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={submit}
              disabled={submitting}
              className="h-9 text-xs bg-purple-600 hover:bg-purple-700 text-white"
            >
              {submitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
              ) : null}
              {t("create")}
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
