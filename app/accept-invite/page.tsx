"use client"

import type React from "react"
import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { acceptInvite } from "@/lib/api/sub-users"
import { AuthLanguageToggle } from "@/components/auth-language-toggle"
import ContreolJobs from "../../icons/Logos/ControlJobs.svg"
import EmployerInviteSignup from "@/components/employer-invite-signup"
import WorkerInviteSignup from "@/components/worker-invite-signup"
import ClientInviteSignup from "@/components/client-invite-signup"

// Decode the JWT payload (no signature check — just to read the type).
// Backend re-verifies properly on submission.
function decodeJwtPayload(token: string): any | null {
  try {
    const part = token.split(".")[1]
    if (!part) return null
    const padded = part.replace(/-/g, "+").replace(/_/g, "/")
    const json = atob(padded + "===".slice((padded.length + 3) % 4))
    return JSON.parse(json)
  } catch {
    return null
  }
}

interface VerifiedToken {
  description: string
  partnerId: number
  partnerName: string
  discountPercent: number
  trialDays: number
}

interface VerifiedTargetToken {
  description: string
  employerId: number
  employerName: string
}

const TARGET_INVITE_TYPES = new Set([
  "employer-invite",
  "worker-invite",
  "client-invite",
])

function AcceptInviteForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""
  const { t } = useTranslation("sub-user")

  // Detect token type so we can render the right form.
  const decoded = token ? decodeJwtPayload(token) : null
  const tokenType: string | undefined = decoded?.type

  // For *-invite tokens, verify with backend first to get inviter name + offer details.
  const [employerVerified, setEmployerVerified] = useState<VerifiedToken | null>(null)
  const [workerVerified, setWorkerVerified] = useState<VerifiedTargetToken | null>(null)
  const [clientVerified, setClientVerified] = useState<VerifiedTargetToken | null>(null)
  const [verifyError, setVerifyError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(
    tokenType ? TARGET_INVITE_TYPES.has(tokenType) : false,
  )

  useEffect(() => {
    if (!tokenType || !TARGET_INVITE_TYPES.has(tokenType)) return
    const apiPath =
      tokenType === "employer-invite"
        ? "employer-invitations"
        : tokenType === "worker-invite"
          ? "worker-invitations"
          : "client-invitations"
    ;(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/${apiPath}/verify?token=${encodeURIComponent(token)}`,
        )
        const json = await res.json()
        if (!res.ok || !json?.data?.valid) {
          setVerifyError(json?.data?.reason || "invalid")
          return
        }
        if (tokenType === "employer-invite") setEmployerVerified(json.data)
        else if (tokenType === "worker-invite") setWorkerVerified(json.data)
        else setClientVerified(json.data)
      } catch (e: any) {
        setVerifyError(e.message || "network_error")
      } finally {
        setVerifying(false)
      }
    })()
  }, [tokenType, token])

  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast({ title: t("toastMissingToken"), variant: "destructive" })
      return
    }
    if (!firstName.trim() || !lastName.trim()) {
      toast({ title: t("toastNameRequired") || "First and last name are required", variant: "destructive" })
      return
    }
    if (!isValidEmail(email)) {
      toast({ title: t("toastInvalidEmail") || "Enter a valid email", variant: "destructive" })
      return
    }
    if (password.length < 8) {
      toast({ title: t("toastPasswordTooShort"), variant: "destructive" })
      return
    }
    if (password !== confirm) {
      toast({ title: t("toastPasswordsDontMatch"), variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      await acceptInvite({ token, password, firstName: firstName.trim(), lastName: lastName.trim(), email: email.trim() })
      toast({ title: t("toastPasswordSet"), description: t("toastPasswordSetDesc"), variant: "success" })
      router.push("/login")
    } catch (e: any) {
      toast({ title: t("toastAcceptFailed"), description: e.message, variant: "destructive" })
      setBusy(false)
    }
  }

  if (busy) {
    return <LoadingSpinner />
  }

  // ─────────────── *-invite branches (employer / worker / client) ───────────────
  if (tokenType && TARGET_INVITE_TYPES.has(tokenType)) {
    if (verifying) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background">
          <LoadingSpinner />
        </div>
      )
    }
    const verified =
      tokenType === "employer-invite"
        ? employerVerified
        : tokenType === "worker-invite"
          ? workerVerified
          : clientVerified
    if (verifyError || !verified) {
      const reasonKey =
        verifyError === "expired"
          ? "invitationExpired"
          : verifyError === "already_used"
            ? "invitationAlreadyUsed"
            : verifyError === "revoked"
              ? "invitationRevoked"
              : "invitationInvalid"
      return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-background p-6">
          <ContreolJobs className="h-20 w-48 mb-4" />
          <Card className="w-full max-w-md border border-border bg-card">
            <CardHeader className="text-center">
              <CardTitle className="text-lg">{t(reasonKey) || "Invitation invalid"}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-center text-muted-foreground">
                {t("invitationInvalidDesc") ||
                  "This invitation link is no longer valid. Please ask the sender to issue a new one."}
              </p>
            </CardContent>
          </Card>
          <div className="mt-4">
            <AuthLanguageToggle />
          </div>
        </div>
      )
    }
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
        <ContreolJobs className="h-16 w-40 mb-3" />
        {tokenType === "employer-invite" && (
          <EmployerInviteSignup token={token} verified={employerVerified!} />
        )}
        {tokenType === "worker-invite" && (
          <WorkerInviteSignup token={token} verified={workerVerified!} />
        )}
        {tokenType === "client-invite" && (
          <ClientInviteSignup token={token} verified={clientVerified!} />
        )}
        <div className="mt-4">
          <AuthLanguageToggle />
        </div>
      </div>
    )
  }
  // ───────────── End *-invite branches ─────────────

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <ContreolJobs className="h-20 w-48 mb-4" />

      <Card className="w-full max-w-md border border-border bg-card mt-0">
        <CardHeader className="text-center">
          <CardTitle className="text-lg text-card-foreground">{t("acceptTitle")}</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {t("acceptSubtitle")}
          </p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                id="firstName"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full bg-background border-input text-foreground"
                placeholder={t("firstNamePlaceholder") || "First name"}
                required
                autoComplete="given-name"
              />
              <Input
                id="lastName"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full bg-background border-input text-foreground"
                placeholder={t("lastNamePlaceholder") || "Last name"}
                required
                autoComplete="family-name"
              />
            </div>

            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border-input text-foreground"
              placeholder={t("emailPlaceholder") || "Email"}
              required
              autoComplete="email"
            />

            <div className="grid gap-2">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-background border-input text-foreground pl-10 pr-10"
                  placeholder={t("newPasswordPlaceholder")}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-5 w-5 text-gray-400" />
                </span>
                <Input
                  id="confirm"
                  type={showConfirm ? "text" : "password"}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full bg-background border-input text-foreground pl-10 pr-10"
                  placeholder={t("confirmPasswordPlaceholder")}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm((s) => !s)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                >
                  {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t("passwordHint")}</p>
            </div>

            <Button
              type="submit"
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={busy}
            >
              {busy ? t("setPasswordSaving") : t("setPasswordButton")}
            </Button>
          </form>

          <div className="mt-4 text-center">
            <AuthLanguageToggle />
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AcceptInviteForm />
    </Suspense>
  )
}
