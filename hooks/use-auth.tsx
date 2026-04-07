"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const { language, setLanguage, t } = useTranslation("login") // Explicitly set namespace to "login"

  const login = async (email: string, password: string) => {
    setIsLoading(true)
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        toast({
          title: t("loginErrorTitle"),
          description: t("loginErrorDescription"),
          variant: "destructive",
        })
        return false
      }

      toast({
        title: t("loginSuccessTitle"),
        description: t("loginSuccessDescription"),
        variant: "success",
      })

      // Redirect to dashboard after successful login
      router.push("/dashboard")
      return true
    } catch (error) {
      toast({
        title: t("loginErrorTitle"),
        description: t("loginErrorDescription"),
        variant: "destructive",
      })
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const logout = async () => {
    try {
      await signOut({ redirect: false })
      toast({
        title: t("logoutTitle"),
        description: t("logoutDescription"),
        variant: "success",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: t("loginErrorTitle"),
        description: t("loginErrorDescription"),
        variant: "destructive",
      })
    }
  }

  const getUserRole = () => {
    // Return null if no session or role - don't default to worker
    if (!session?.user?.role?.name) return null
    return session.user.role.name.toLowerCase()
  }

  const hasRole = (role: string) => {
    const userRole = getUserRole()
    return userRole ? userRole === role.toLowerCase() : false
  }

  const hasAnyRole = (roles: string[]) => {
    const userRole = getUserRole()
    return userRole ? roles.some((role) => role.toLowerCase() === userRole) : false
  }

  return {
    user: session?.user,
    session,
    isAuthenticated: status === "authenticated",
    isLoading: status === "loading" || isLoading,
    login,
    logout,
    getUserRole,
    hasRole,
    hasAnyRole,
  }
}