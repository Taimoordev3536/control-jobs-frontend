"use client"

import { Suspense, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { Mail, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { LoadingSpinner } from "@/components/loading-spinner"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { AuthLanguageToggle } from "@/components/auth-language-toggle"
import ContreolJobs from "../../../icons/Logos/ControlJobs.svg"

function CheckYourEmailInner() {
  const params = useSearchParams()
  const email = params.get("email") || ""
  const { data: session } = useSession()
  const { t } = useTranslation()
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
      toast({ title: t("checkEmailToastSentTitle"), description: `${t("checkEmailToastSentDesc")} ${email}`, variant: "success" })
    } catch (e: any) {
      toast({ title: t("checkEmailToastFailedTitle"), description: e?.message, variant: "destructive" })
    } finally {
      setResending(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4">
      <ContreolJobs className="h-20 w-48 mb-4" />
      {session?.user && (
        <p className="w-full max-w-md mb-3 text-center text-xs text-muted-foreground">
          {t("partnerSessionWarning")}
        </p>
      )}
      <Card className="w-full max-w-md border border-border bg-card">
        <CardHeader className="text-center">
          <Mail className="h-12 w-12 mx-auto text-primary mb-2" />
          <CardTitle className="text-lg">{t("checkEmailTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            {t("checkEmailDescBefore")}{" "}
            <span className="font-medium text-foreground">{email || t("checkEmailYourAddress")}</span>
            {t("checkEmailDescAfter")}
          </p>
          <p className="text-xs text-muted-foreground">
            {t("checkEmailValidity")}
          </p>
          <Button
            onClick={resend}
            disabled={resending || !email || sent}
            variant="outline"
            className="w-full"
          >
            {resending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {sent ? t("checkEmailSent") : t("checkEmailResend")}
          </Button>
          <Link href="/login" className="block text-sm text-primary hover:underline">
            {t("checkEmailBackToLogin")}
          </Link>

          <AuthLanguageToggle />
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
