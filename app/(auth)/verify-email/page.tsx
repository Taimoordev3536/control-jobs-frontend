"use client"

import { Suspense, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { CheckCircle2, XCircle, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import ContreolJobs from "../../../icons/Logos/ControlJobs.svg"

type Status = "verifying" | "success" | "expired" | "invalid"

function VerifyEmailInner() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""

  const [status, setStatus] = useState<Status>("verifying")
  const [email, setEmail] = useState<string | null>(null)
  const [resending, setResending] = useState(false)
  const ran = useRef(false)

  useEffect(() => {
    if (ran.current) return
    ran.current = true
    if (!token) {
      setStatus("invalid")
      return
    }
    ;(async () => {
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/verify-email?token=${encodeURIComponent(token)}`,
        )
        const json = await res.json().catch(() => null)
        if (res.ok && json?.isSuccess) {
          setStatus("success")
          setEmail(json?.data?.email || null)
          return
        }
        const msg = String(json?.message || "").toLowerCase()
        setStatus(msg.includes("expire") ? "expired" : "invalid")
      } catch {
        setStatus("invalid")
      }
    })()
  }, [token])

  const resend = async () => {
    if (!email) {
      toast({ title: "Enter your email on the login page to resend", variant: "destructive" })
      return
    }
    setResending(true)
    try {
      await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/resend-verification`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      toast({ title: "Verification email sent", description: `Check your inbox at ${email}`, variant: "success" })
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
          <CardTitle className="text-lg">
            {status === "verifying" && "Verifying your email..."}
            {status === "success" && "Email verified"}
            {status === "expired" && "Verification link expired"}
            {status === "invalid" && "Invalid verification link"}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === "verifying" && (
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 mx-auto text-green-600" />
              <p className="text-sm text-muted-foreground">
                {email ? `${email} is now verified.` : "Your email has been confirmed."} You can now sign in.
              </p>
              <Button
                onClick={() => router.push("/login")}
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Go to login
              </Button>
            </>
          )}
          {(status === "expired" || status === "invalid") && (
            <>
              <XCircle className="h-12 w-12 mx-auto text-red-600" />
              <p className="text-sm text-muted-foreground">
                {status === "expired"
                  ? "This link has expired. Request a new verification email below."
                  : "This link is invalid or has already been used."}
              </p>
              {status === "expired" && (
                <Button
                  onClick={resend}
                  disabled={resending || !email}
                  variant="outline"
                  className="w-full"
                >
                  {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Resend verification email
                </Button>
              )}
              <Link href="/login" className="block text-sm text-primary hover:underline">
                Back to login
              </Link>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default function VerifyEmailPage() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <VerifyEmailInner />
    </Suspense>
  )
}
