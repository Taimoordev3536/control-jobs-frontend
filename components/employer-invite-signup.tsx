"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import GoogleAddressInput from "@/components/GoogleAddressInput"

interface VerifiedToken {
  description: string
  partnerId: number
  partnerName: string
  discountPercent: number
  trialDays: number
}

interface MatchedPlan {
  monthlyFixed: number
  perWorkCenter: number
  perWorker: number
}

const fmt = (n: number) => `${n.toFixed(2).replace(".", ",")} €`

export default function EmployerInviteSignup({
  token,
  verified: rawVerified,
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
  const [matchedPlan, setMatchedPlan] = useState<MatchedPlan | null>(null)

  // The backend serializes numeric (decimal) columns as strings; coerce so
  // arithmetic & comparisons don't surprise downstream code.
  const verified = {
    ...rawVerified,
    discountPercent: Number(rawVerified.discountPercent) || 0,
    trialDays: Number(rawVerified.trialDays) || 0,
    partnerId: Number(rawVerified.partnerId) || 0,
  }

  // Trial > 0 hides payment method per spec
  const trialActive = verified.trialDays > 0

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
    email: "",                             // editable — recipient picks their address
    class: "" as "INDIVIDUAL" | "COMPANY" | "FREELANCER" | "",
    fee: "",                               // tarifa typeId
    discount: String(verified.discountPercent || 0),  // locked display, value comes from token server-side
    paymentMethod: "1",
    accountIban: "",
    bicSwift: "",
    responsible: "",
    password: "",
    confirmPassword: "",
  })

  const update = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }))

  // Tarifa options conditional on Clase (same rules as the admin modal)
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

  // Live estimación box — fetch matching rate plan when both Clase + Tarifa picked
  useEffect(() => {
    const subTypeId =
      form.class === "INDIVIDUAL" ? 1 : form.class === "FREELANCER" ? 2 : form.class === "COMPANY" ? 3 : null
    const typeId = form.fee ? Number(form.fee) : null
    if (!subTypeId || !typeId) {
      setMatchedPlan(null)
      return
    }
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/rate-plans/match?subTypeId=${subTypeId}&typeId=${typeId}`,
        )
        if (!res.ok) {
          if (!cancelled) setMatchedPlan(null)
          return
        }
        const json = await res.json()
        if (cancelled) return
        const data = json?.data
        if (!data) {
          setMatchedPlan(null)
          return
        }
        setMatchedPlan({
          monthlyFixed: Number(data.monthlyFixed),
          perWorkCenter: Number(data.perWorkCenter),
          perWorker: Number(data.perWorker),
        })
      } catch {
        if (!cancelled) setMatchedPlan(null)
      }
    })()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.class, form.fee])

  const next = () => {
    if (step === 1) {
      if (!form.class) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.name) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.address) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.mobile) return toast({ title: t("thisFieldIsRequired"), variant: "destructive" })
      if (!form.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
        return toast({
          title: t("invalidEmail") || "Please enter a valid email",
          variant: "destructive",
        })
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
      return toast({ title: t("passwordTooShort") || "Password must be 8+ chars", variant: "destructive" })
    }
    if (form.password !== form.confirmPassword) {
      return toast({ title: t("passwordsDontMatch") || "Passwords don't match", variant: "destructive" })
    }
    setSubmitting(true)
    try {
      const subTypeId =
        form.class === "COMPANY" ? 3 : form.class === "FREELANCER" ? 2 : 1
      const body = {
        token,
        password: form.password,
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
        fee: 0,
        discount: Number(form.discount) || 0,
        paymentMethodId: trialActive ? 5 : Number(form.paymentMethod),
        accountIban: form.accountIban || "",
        bicSwift: form.bicSwift || "",
        responsible: form.responsible,
        email: form.email,
      }
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations/accept`,
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
      toast({ title: t("accountCreated") || "Account created!", variant: "success" as any })
      router.push("/login")
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="w-full max-w-md mx-auto bg-card border border-border rounded-lg shadow-sm">
      {/* Header */}
      <div className="px-6 pt-6 pb-2 text-center">
        <h2 className="text-lg font-semibold text-foreground">
          {t("completeRegistration") || "Complete your registration"}
        </h2>
        <p className="text-xs text-muted-foreground mt-1">
          {t("invitedBy") || "Invited by"}:{" "}
          <span className="font-medium text-foreground">{verified.partnerName}</span>
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
                value={form.address}
                onChange={(value, _placeId, components) => {
                  if (components) {
                    const parts = [components.street, components.streetNumber].filter(Boolean)
                    const addressOnly = parts.length > 0 ? parts.join(", ") : value
                    update("address", addressOnly || value)
                    update("street", components.street || "")
                    update("streetNumber", components.streetNumber || "")
                    update("floorDoor", components.floorDoor || "")
                    update("city", components.city || "")
                    update("province", components.province || "")
                    update("country", components.country || "")
                    update("postalCode", components.postalCode || "")
                    update("latitude", components.latitude || null)
                    update("longitude", components.longitude || null)
                  } else {
                    update("address", value)
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
            {/* Partner — read-only display, locked from token */}
            <div>
              <Label className="text-xs">{t("partner")}</Label>
              <div className="mt-1 px-3 py-2 rounded-md border border-input bg-muted text-xs text-foreground select-none pointer-events-none">
                {verified.partnerName}
              </div>
            </div>

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

            {matchedPlan && (
              <div className="rounded-md border border-purple-200 bg-purple-50 dark:bg-purple-950/30 dark:border-purple-900 p-3 text-xs">
                <div className="font-medium text-foreground mb-2">{t("monthlyEstimate")}</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>{t("fixedFee")}:</span>
                    <span className="font-medium">{fmt(matchedPlan.monthlyFixed)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("perWorkCenter")}:</span>
                    <span className="font-medium">{fmt(matchedPlan.perWorkCenter)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{t("perWorker")}:</span>
                    <span className="font-medium">{fmt(matchedPlan.perWorker)}</span>
                  </div>
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground">{t("monthlyEstimateNote")}</p>
              </div>
            )}

            {/* Dto. % — hidden entirely if 0; otherwise read-only (locked from token) */}
            {verified.discountPercent > 0 && (
              <div>
                <Label className="text-xs">{t("discount")}</Label>
                <div className="flex items-center mt-1">
                  <div className="w-20 h-9 px-3 flex items-center rounded-md border border-input bg-muted text-xs text-foreground select-none pointer-events-none">
                    {verified.discountPercent}
                  </div>
                  <span className="ml-2 text-xs text-muted-foreground">%</span>
                </div>
              </div>
            )}

            {/* Método de pago — hidden if trial active (per Image #14 spec) */}
            {!trialActive && (
              <div>
                <Label className="text-xs">{t("paymentMethod")}</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => update("paymentMethod", v)}>
                  <SelectTrigger className="mt-1 h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">{tEnum("paymentMethod", "TRANSFER")}</SelectItem>
                    <SelectItem value="2">{tEnum("paymentMethod", "DIRECT_DEBIT")}</SelectItem>
                    <SelectItem value="3">{tEnum("paymentMethod", "CARD")}</SelectItem>
                    <SelectItem value="4">{tEnum("paymentMethod", "PAYPAL")}</SelectItem>
                    <SelectItem value="5">{tEnum("paymentMethod", "OTHERS")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
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
              />
            </div>

            <div>
              <Label className="text-xs">{t("email")}</Label>
              <div className="mt-1 px-3 py-2 rounded-md border border-input bg-muted text-xs text-muted-foreground select-none pointer-events-none">
                {form.email}
              </div>
            </div>

            <div>
              <Label className="text-xs">{t("probationPeriod")}</Label>
              <div className="flex items-center gap-2 mt-1">
                <div className="px-3 py-2 rounded-md border border-input bg-muted text-xs text-foreground select-none pointer-events-none w-20 text-center">
                  {verified.trialDays}
                </div>
                <span className="text-xs text-muted-foreground">{t("days")}</span>
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
              <Label className="text-xs">{t("confirmPassword") || "Confirm password"} *</Label>
              <Input
                type={showPassword ? "text" : "password"}
                value={form.confirmPassword}
                onChange={(e) => update("confirmPassword", e.target.value)}
                className="h-9 text-xs mt-1"
              />
            </div>
          </>
        )}

        {/* Footer buttons */}
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
    </div>
  )
}
