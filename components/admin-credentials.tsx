"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AnimatedLoader } from "@/components/animated-loader"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"

function PasswordField({
  id,
  label,
  value,
  onChange,
}: {
  id: string
  label: string
  value: string
  onChange: (v: string) => void
}) {
  const [show, setShow] = useState(false)
  return (
    <div className="space-y-1">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 text-xs bg-muted/30 border-input text-foreground pr-10"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
          tabIndex={-1}
        >
          {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  )
}

export function AdminCredentials() {
  const { t } = useTranslation()
  const { session, logout } = useAuth()
  const { toast } = useToast()
  const translateBackendError = useBackendError()

  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [savingPassword, setSavingPassword] = useState(false)

  const [emailCurrentPassword, setEmailCurrentPassword] = useState("")
  const [newEmail, setNewEmail] = useState("")
  const [savingEmail, setSavingEmail] = useState(false)

  const post = async (path: string, body: Record<string, unknown>) => {
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session?.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err.message || `Error ${res.status}`)
    }
  }

  const handleChangePassword = async () => {
    if (!session?.accessToken) return
    if (newPassword !== confirmPassword) {
      toast({ title: t("passwordsDoNotMatch") || "Passwords do not match", variant: "destructive" })
      return
    }
    setSavingPassword(true)
    try {
      await post("/users/admin/me/change-password", { currentPassword, newPassword })
      toast({
        title: t("passwordChanged") || "Password changed",
        description: t("pleaseLoginAgain") || "Please log in again with your new credentials.",
        variant: "success",
      })
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
      setTimeout(() => logout(), 1500)
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setSavingPassword(false)
    }
  }

  const handleChangeEmail = async () => {
    if (!session?.accessToken) return
    setSavingEmail(true)
    try {
      await post("/users/admin/me/change-email", { currentPassword: emailCurrentPassword, newEmail })
      toast({
        title: t("emailChanged") || "Email changed",
        description: t("pleaseLoginAgain") || "Please log in again with your new credentials.",
        variant: "success",
      })
      setEmailCurrentPassword("")
      setNewEmail("")
      setTimeout(() => logout(), 1500)
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setSavingEmail(false)
    }
  }

  const fieldClass = "h-9 text-xs bg-muted/30 border-input text-foreground"
  const labelClass = "text-xs font-medium text-foreground"

  return (
    <div className="space-y-6 pt-2 px-2 max-w-xl">
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("changePassword") || "Change password"}</h3>
        <PasswordField id="curPwd" label={t("currentPassword") || "Current password"} value={currentPassword} onChange={setCurrentPassword} />
        <PasswordField id="newPwd" label={t("newPassword") || "New password"} value={newPassword} onChange={setNewPassword} />
        <PasswordField id="confPwd" label={t("confirmPassword") || "Confirm new password"} value={confirmPassword} onChange={setConfirmPassword} />
        <Button
          type="button"
          onClick={handleChangePassword}
          disabled={savingPassword || !currentPassword || !newPassword || !confirmPassword}
          className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-5 text-xs flex items-center gap-2"
        >
          {savingPassword ? <AnimatedLoader size={16} /> : null}
          {t("changePassword") || "Change password"}
        </Button>
      </div>

      <div className="border-t border-border" />

      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-foreground">{t("changeEmail") || "Change email"}</h3>
        <PasswordField id="emailCurPwd" label={t("currentPassword") || "Current password"} value={emailCurrentPassword} onChange={setEmailCurrentPassword} />
        <div className="space-y-1">
          <Label htmlFor="newEmail" className={labelClass}>{t("newEmail") || "New email"}</Label>
          <Input id="newEmail" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className={fieldClass} />
        </div>
        <Button
          type="button"
          onClick={handleChangeEmail}
          disabled={savingEmail || !emailCurrentPassword || !newEmail}
          className="h-9 bg-purple-600 hover:bg-purple-700 text-white px-5 text-xs flex items-center gap-2"
        >
          {savingEmail ? <AnimatedLoader size={16} /> : null}
          {t("changeEmail") || "Change email"}
        </Button>
      </div>
    </div>
  )
}
