"use client"

import type React from "react"
import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Loader2, Eye, EyeOff, Lock } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import GoogleAddressInput from "@/components/GoogleAddressInput"
import { normalizeFloorDoor } from "@/lib/utils/normalize-floor-door"
import { AuthLanguageToggle } from "@/components/auth-language-toggle"
import ContreolJobs from "../../../icons/Logos/ControlJobs.svg"

export default function RegisterPage() {
  const router = useRouter()
  const { data: session } = useSession()
  const { t, tEnum } = useTranslation()
  const { toast } = useToast()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Already logged in — bounce
  useEffect(() => {
    if (session?.user?.role?.name) router.push("/dashboard")
  }, [session, router])

  const [form, setForm] = useState({
    name: "",
    nif: "",
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
    class: "" as "INDIVIDUAL" | "COMPANY" | "FREELANCER" | "",
    fee: "",
    responsible: "",
    password: "",
    confirmPassword: "",
    website: "", // honeypot — never set this in UI; bots fill it
  })

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))
  const [addressDisplay, setAddressDisplay] = useState("")

  const allFees = [
    { id: 1, key: "HOME" },
    { id: 2, key: "STATIC" },
    { id: 3, key: "REMOTE" },
  ]
  const allowedFeeKeys =
    form.class === "INDIVIDUAL"
      ? ["HOME"]
      : form.class === "COMPANY" || form.class === "FREELANCER"
        ? ["STATIC", "REMOTE"]
        : []
  const fees = allFees
    .filter((f) => allowedFeeKeys.includes(f.key))
    .map((f) => ({ id: f.id, name: tEnum("employerType", f.key) }))

  useEffect(() => {
    if (form.fee && !fees.some((f) => f.id.toString() === form.fee)) {
      setForm((p) => ({ ...p, fee: "" }))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.class])

  const next = () => {
    if (step === 1) {
      if (!form.class) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.name) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.address) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.mobile) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        return toast({ title: t("invalidEmail") || "Invalid email", variant: "destructive" })
      }
      setStep(2)
    } else if (step === 2) {
      if (!form.fee) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.nif) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      setStep(3)
    }
  }

  const submit = async () => {
    if (!form.responsible) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
    if (form.password.length < 8) {
      return toast({ title: t("passwordTooShort") || "Password too short", variant: "destructive" })
    }
    if (form.password !== form.confirmPassword) {
      return toast({ title: t("passwordsDontMatch") || "Passwords don't match", variant: "destructive" })
    }
    setSubmitting(true)
    try {
      const subTypeId =
        form.class === "COMPANY" ? 3 : form.class === "FREELANCER" ? 2 : 1
      const body = {
        name: form.name,
        taxId: form.nif,
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
        phone: form.mobile,
        mobile: form.mobile,
        landline: form.landline,
        typeId: Number(form.fee),
        subTypeId,
        email: form.email,
        password: form.password,
        responsible: form.responsible,
        website: form.website, // honeypot
      }
      const { apiFetch } = await import("@/lib/api")
      await apiFetch("/employer-invitations/self-register", {
        method: "POST",
        body,
        unauthenticated: true,
      })
      toast({
        title: t("accountCreated") || "Account created!",
        variant: "success" as any,
      })
      router.push(`/check-your-email?email=${encodeURIComponent(form.email)}`)
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background py-8 px-4">
      <ContreolJobs className="h-16 w-40 mb-4" />

      <div className="w-full max-w-md bg-card border border-border rounded-lg shadow-sm">
        <div className="px-6 pt-6 pb-2 text-center">
          <h2 className="text-lg font-semibold text-foreground">
            {t("createYourAccount") || "Create your account"}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            {t("registerSubtitle") ||
              "Sign up and try ControlJobs free for up to 15 days. No credit card needed."}
          </p>
        </div>

        {/* Step indicator */}
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
                <Label className="text-xs">{t("class")} *</Label>
                <Select value={form.class} onValueChange={(v) => update("class", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder={t("selectClass")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">{tEnum("employerSubType", "INDIVIDUAL")}</SelectItem>
                    <SelectItem value="COMPANY">{tEnum("employerSubType", "COMPANY")}</SelectItem>
                    <SelectItem value="FREELANCER">{tEnum("employerSubType", "FREELANCER")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

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
                      update("floorDoor", normalizeFloorDoor(components.floorDoor))
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
                      update("floorDoor", normalizeFloorDoor(parts[2]))
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
                  placeholder="ejemplo@correo.com"
                  className="mt-1 h-9 text-xs"
                />
              </div>

              {/* Honeypot — visually hidden so bots fill it but humans don't */}
              <div
                aria-hidden
                style={{ position: "absolute", left: "-9999px", top: "-9999px" }}
              >
                <label>Website</label>
                <input
                  type="text"
                  tabIndex={-1}
                  autoComplete="off"
                  value={form.website}
                  onChange={(e) => update("website", e.target.value)}
                />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <Label className="text-xs">{t("nif")} *</Label>
                <Input
                  value={form.nif}
                  onChange={(e) => update("nif", e.target.value)}
                  className="mt-1 h-9 text-xs"
                />
              </div>

              <div>
                <Label className="text-xs">{t("fee")} *</Label>
                <Select value={form.fee} onValueChange={(v) => update("fee", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue placeholder={t("selectFeeType")} />
                  </SelectTrigger>
                  <SelectContent>
                    {fees.map((f) => (
                      <SelectItem key={f.id} value={f.id.toString()}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </>
          )}

          {step === 3 && (
            <>
              <div>
                <Label className="text-xs">{t("responsible")} *</Label>
                <Input
                  value={form.responsible}
                  onChange={(e) => update("responsible", e.target.value)}
                  placeholder={t("namePlaceholder")}
                  className="mt-1 h-9 text-xs"
                  autoComplete="off"
                />
              </div>

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
                    {showPassword ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                  </button>
                </div>
              </div>

              <div>
                <Label className="text-xs">{t("confirmPassword") || "Confirm password"} *</Label>
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
                    {showConfirmPassword ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
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
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                {t("create")}
              </Button>
            )}
          </div>
        </div>

        <div className="px-6 pb-6 text-center text-xs text-muted-foreground">
          {t("alreadyHaveAccount") || "Already have an account?"}{" "}
          <Link href="/login" className="text-primary hover:underline">
            {t("signIn") || "Sign in"}
          </Link>
        </div>
      </div>

      <div className="mt-4">
        <AuthLanguageToggle className="text-xs" />
      </div>
    </div>
  )
}
