"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { Mail, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import ContreolJobs from "../../../icons/Logos/ControlJobs.svg"

function CheckYourEmailInner() {
  const params = useSearchParams()
  const email = params.get("email") || ""
  const [resending, setResending] = useState(false)
  const [sent, setSent] = useState(false)

  const resend = async () => {
    if (!email) return
    setResending(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      setSent(true)
      toast({ title: "Email sent", description: `Sent a new link to ${email}`, variant: "success" })
    } catch (e: any) {
      toast({ title: "Failed to send", description: e?.message, variant: "destructive" })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <ContreolJobs className="h-20 w-48 mb-4" />
      <Card className="w-full max-w-md border border-border bg-card">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle className="text-lg">Check your email</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            We sent a confirmation link to{" "}
            <span className="font-medium text-foreground">{email || "your email address"}</span>.
            Click the link in that email to activate your account.
          </p>
          <p className="text-xs text-muted-foreground">
            The link is valid for 24 hours. Didn't get it? Check your spam folder, then try resending.
          </p>
          <Button
            onClick={resend}
            disabled={resending || !email || sent}
            variant="outline"
            className="w-full"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {sent ? "Email sent" : "Resend verification email"}
          </Button>
          <Link href="/login" className="block text-sm text-primary hover:underline">
            Back to login
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}

export default function CheckYourEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <CheckYourEmailInner />
    </Suspense>
  )
}
