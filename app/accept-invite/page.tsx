"use client"

import type React from "react"
import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Lock, Eye, EyeOff } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { acceptInvite } from "@/lib/api/sub-users"
import ContreolJobs from "../../icons/Logos/ControlJobs.svg"

function AcceptInviteForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""
  const { t } = useTranslation("sub-user")

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token) {
      toast({ title: t("toastMissingToken"), variant: "destructive" })
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
      await acceptInvite(token, password)
      toast({ title: t("toastPasswordSet"), description: t("toastPasswordSetDesc") })
      router.push("/login")
    } catch (e: any) {
      toast({ title: t("toastAcceptFailed"), description: e.message, variant: "destructive" })
      setBusy(false)
    }
  }

  if (busy) {
    return <LoadingSpinner />
  }

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
