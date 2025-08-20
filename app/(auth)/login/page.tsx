"use client"

import type React from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import Link from "next/link"
import { useState,useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/loading-spinner"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import ContreolJobs from "../../../icons/Logos/ControlJobs.svg";


export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const { login, isLoading } = useAuth()
  const { data: session } = useSession()
  const router = useRouter()
   const [showPassword, setShowPassword] = useState(false); 

  // Redirect if already authenticated
  useEffect(() => {
    if (session) {
      const userRole = session.user?.role?.name?.toLowerCase()
      const defaultRoutes: Record<string, string> = {
        admin: "/partners",
        partner: "/employers",
        employer: "/jobs/control",
        client: "/jobs/control",
        worker: "/jobs/control",
      }
      router.push(defaultRoutes[userRole || "worker"] || "/jobs/control")
    }
  }, [session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) return

    await login(email, password)
  }

  if (isLoading) {
    return <LoadingSpinner message="Signing you in..." />
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background">
      {/* <div className="mb-0">
      
      </div> */}
        <ContreolJobs className="h-20 w-48" />

      <Card className="w-full max-w-md border border-border bg-card mt-0">
        <CardHeader className="text-center">
          <CardTitle className="text-lg text-card-foreground">Access</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="grid gap-4">
<div className="grid gap-2">
  <Label htmlFor="email" className="text-card-foreground">
    {/* E-mail */}
  </Label>

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
      placeholder="E-mail"
      required
    />
  </div>
</div>

<div className="grid gap-2">
  <Label htmlFor="password" className="text-card-foreground">
    {/* Password */}
  </Label>

  <div className="relative w-full">
    {/* Left Icon */}
    <span className="absolute inset-y-0 left-0 flex items-center pl-3">
      <Lock className="h-5 w-5 text-gray-400" />
    </span>

    <Input
      id="password"
      type={showPassword ? "text" : "password"}
      value={password}
      onChange={(e) => setPassword(e.target.value)}
      className="w-full bg-background border-input text-foreground pl-10 pr-10"
      placeholder="Password"
      required
    />

    {/* Right Icon (eye toggle) */}
    <button
      type="button"
      onClick={() => setShowPassword(!showPassword)}
      className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-400"
    >
      {showPassword ? (
        <EyeOff className="h-5 w-5" />
      ) : (
        <Eye className="h-5 w-5" />
      )}
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
                Remember user
              </Label>
            </div>
            <Button
              type="submit"
              className="w-full mt-2 bg-primary text-primary-foreground hover:bg-primary/90"
              disabled={isLoading}
            >
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-2">
            <Link
              href="/forgot-password"
              className="text-sm text-muted-foreground hover:text-foreground hover:underline"
            >
              I forgot my password
            </Link>
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link href="/register" className="text-primary hover:text-primary/80 hover:underline">
                Create an account
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
