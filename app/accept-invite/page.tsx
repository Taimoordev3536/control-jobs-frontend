"use client"

import { Suspense, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { acceptInvite } from "@/lib/api/sub-users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "@/hooks/use-toast"

function AcceptInviteForm() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""

  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    if (!token) {
      toast({ title: "Missing invite token", variant: "destructive" })
      return
    }
    if (password.length < 8) {
      toast({ title: "Password must be at least 8 characters", variant: "destructive" })
      return
    }
    if (password !== confirm) {
      toast({ title: "Passwords do not match", variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      await acceptInvite(token, password)
      toast({ title: "Password set", description: "You can now log in." })
      router.push("/login")
    } catch (e: any) {
      toast({ title: "Failed to accept invite", description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center p-6">
      <h1 className="text-2xl font-semibold">Accept invitation</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Set a password to activate your account.
      </p>
      <div className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>New password</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Confirm password</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        </div>
        <Button className="w-full" onClick={submit} disabled={busy}>
          {busy ? "Saving…" : "Set password"}
        </Button>
      </div>
    </div>
  )
}

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={<div className="p-6">Loading…</div>}>
      <AcceptInviteForm />
    </Suspense>
  )
}
