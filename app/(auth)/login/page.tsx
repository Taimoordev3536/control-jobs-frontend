"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import ContreolJobs from "../../../icons/Logos/ControlJobs.svg"
import { useTranslation } from "@/hooks/use-translation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const { login, isLoading } = useAuth()
  const { data: session } = useSession()
  const router = useRouter()
  const [showPassword, setShowPassword] = useState(false)
  const { t, language, setLanguage } = useTranslation("login")

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      const userRole = session.user?.role?.name?.toLowerCase()
      const defaultRoutes: Record<string, string> = {
        admin: "/dashboard",
        partner: "/dashboard",
        employer: "/dashboard",
        client: "/dashboard",
        worker: "/dashboard",
      }
      router.push(defaultRoutes[userRole || "worker"] || "/dashboard")
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    await login(email, password)
  }

  const toggleLanguage = () => {
    setLanguage(language === "en" ? "es" : "en")
  }

  if (isLoading) {
    return <LoadingSpinner message="Signing you in..." />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      <ContreolJobs className="h-20 w-48 mb-4" />

      <Card className="w-full max-w-md border border-border bg-card mt-0">
        <CardHeader className="text-center">
          <CardTitle className="text-lg text-card-foreground">{t("pageTitle")}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
            <div className="grid gap-2">
              {/* <Label htmlFor="email" className="text-card-foreground">
                {t("emailLabel")}
              </Label> */}
              <div className="relative w-full">
                <span className="absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-5 w-5 text-gray-400" />
                </span>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-background border-input text-foreground pl-10"
                  placeholder={t("emailLabel")}
                  required
                />
              </div>
            </div>

            <div className="grid gap-2">
              {/* <Label htmlFor="password" className="text-card-foreground">
                {t("passwordLabel")}
              </Label> */}
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
                  placeholder={t("passwordLabel")}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember" className="text-sm font-normal text-card-foreground">
                {t("rememberMeLabel")}
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : t("signInButton")}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              {t("forgotPasswordLink")}
            </Link>
            <p className="text-sm text-muted-foreground">
              {t("createAccountLink", { href: "/register" })}{" "}
              <Link href="/register" className="text-primary hover:text-primary/80 hover:underline">
                {t("createAccountLink")}
              </Link>
            </p>
          </div>

          {/* Language Toggle Button */}
          <div className="mt-4 text-center">
            <Button
              variant="outline"
              onClick={toggleLanguage}
              className="text-sm text-muted-foreground"
            >
              {t("switchToLabel")} {language === "en" ? "Español" : "English"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}