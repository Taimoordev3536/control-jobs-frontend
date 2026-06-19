"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AlertCircle, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { AnimatedLoader } from "@/components/animated-loader"
import {
  storeImpersonationSession,
  getImpersonationContext,
} from "@/lib/api/impersonate"
import ContreolJobs from "../../icons/Logos/ControlJobs.svg"

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL

function ImpersonateHandler() {
  const params = useSearchParams()
  const router = useRouter()
  const token = params.get("token") || ""
  const [error, setError] = useState<string | null>(null)
  const [retrying, setRetrying] = useState(false)

  const bootstrap = async () => {
    setError(null)
    try {
      if (!token) {
        setError("noToken")
        return
      }

      // 1. Fetch user profile with the impersonation token
      const profileRes = await fetch(`${API_BASE}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })
      const profileBody = await profileRes.json().catch(() => ({}))
      if (!profileRes.ok || !profileBody?.isSuccess) {
        setError("profile")
        return
      }

      // 2. Fetch impersonation context
      const impCtx = await getImpersonationContext(token)
      if (!impCtx.isImpersonating) {
        setError("invalidToken")
        return
      }

      // 3. Build user session data (same shape as NextAuth session.user)
      const user = profileBody.data
      const sessionUser = {
        id: user.id?.toString(),
        publicId: user.publicId,
        email: user.email,
        name: user.name,
        firstName: user.firstName,
        lastName: user.lastName,
        roleId: user.roleId,
        partnerId: user.partnerId || null,
        employer: user.employer || null,
        role: user.role,
        accessToken: token,
      }

      // 4. Store in sessionStorage (tab-scoped)
      storeImpersonationSession(token, sessionUser, impCtx)

      // 5. Redirect to dashboard
      router.replace("/dashboard")
    } catch (err: any) {
      setError("generic")
    }
  }

  useEffect(() => {
    bootstrap()
  }, [token])

  const handleRetry = async () => {
    setRetrying(true)
    await bootstrap()
    setRetrying(false)
  }

  if (error) {
    const messages: Record<string, { title: string; desc: string }> = {
      noToken: {
        title: "Impersonation Failed",
        desc: "No impersonation token was provided.",
      },
      invalidToken: {
        title: "Impersonation Failed",
        desc: "The impersonation token is invalid or has expired.",
      },
      profile: {
        title: "Impersonation Failed",
        desc: "Could not load the target user profile.",
      },
      generic: {
        title: "Impersonation Failed",
        desc: "Something went wrong while setting up the session.",
      },
    }
    const msg = messages[error] || messages.generic

    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background">
        <ContreolJobs className="h-20 w-48 mb-4" />
        <Card className="w-full max-w-md border border-border bg-card">
          <CardHeader className="text-center pb-3">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-lg text-card-foreground">
              {msg.title}
            </CardTitle>
            <p className="mt-1 text-sm text-muted-foreground">{msg.desc}</p>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {error !== "noToken" && (
              <Button
                onClick={handleRetry}
                disabled={retrying}
                className="w-full bg-[#662D91] hover:bg-[#552478] text-white"
              >
                {retrying ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                Try again
              </Button>
            )}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.close()}
            >
              Close this tab
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <ContreolJobs className="h-20 w-48 mb-6" />
      <Card className="w-full max-w-sm border border-border bg-card">
        <CardContent className="flex flex-col items-center py-8 gap-4">
          <AnimatedLoader size={40} />
          <div className="text-center">
            <p className="text-sm font-medium text-card-foreground">
              Setting up session...
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Preparing the impersonated dashboard
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function ImpersonatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col items-center justify-center bg-background">
          <AnimatedLoader size={40} />
        </div>
      }
    >
      <ImpersonateHandler />
    </Suspense>
  )
}
