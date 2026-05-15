"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useEffect, useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { getSubUserContext, SubUserContext } from "@/lib/api/sub-users"
import {
  isImpersonationSession,
  getStoredImpersonationToken,
  getStoredImpersonationUser,
  getStoredImpersonationContext,
  clearImpersonationSession,
  type ImpersonationContext,
} from "@/lib/api/impersonate"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [subUser, setSubUser] = useState<SubUserContext>({ isSubUser: false })
  const { language, setLanguage, t } = useTranslation("login") // Explicitly set namespace to "login"

  const [impersonating] = useState<boolean>(() =>
    typeof window === "undefined" ? false : isImpersonationSession(),
  )
  const [impersonationUser] = useState<any>(() =>
    typeof window === "undefined" ? null : getStoredImpersonationUser(),
  )
  const [impersonationCtx] = useState<ImpersonationContext>(() =>
    typeof window === "undefined"
      ? { isImpersonating: false }
      : getStoredImpersonationContext() || { isImpersonating: false },
  )

  useEffect(() => {
    // Skip sub-user context fetch for impersonation sessions
    if (impersonating) return

    if (status !== "authenticated") {
      setSubUser({ isSubUser: false })
      return
    }
    let cancelled = false
    getSubUserContext()
      .then((ctx) => { if (!cancelled) setSubUser(ctx) })
      .catch(() => { if (!cancelled) setSubUser({ isSubUser: false }) })
    return () => { cancelled = true }
  }, [status, impersonating])

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
      const refreshToken = session?.refreshToken
      if (refreshToken) {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/auth/logout`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refreshToken }),
          })
        } catch {
          /* best-effort; signOut still wipes the local session */
        }
      }
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

  const canEdit = () => {
    if (!subUser.isSubUser) return true
    return subUser.permission === "EDIT"
  }

  const exitImpersonation = () => {
    clearImpersonationSession()
    window.close()
  }

  // If this tab is an impersonation session, override session data
  if (impersonating && impersonationUser) {
    const impSession = {
      user: impersonationUser,
      accessToken: impersonationUser.accessToken || getStoredImpersonationToken(),
    }
    return {
      user: impersonationUser,
      session: impSession as any,
      isAuthenticated: true,
      isLoading: false,
      login,
      logout: exitImpersonation,
      getUserRole: () => {
        const roleName = impersonationUser.role?.name
        return roleName ? roleName.toLowerCase() : null
      },
      hasRole: (role: string) => {
        const roleName = impersonationUser.role?.name
        return roleName ? roleName.toLowerCase() === role.toLowerCase() : false
      },
      hasAnyRole: (roles: string[]) => {
        const roleName = impersonationUser.role?.name
        return roleName ? roles.some((r) => r.toLowerCase() === roleName.toLowerCase()) : false
      },
      subUser: { isSubUser: false } as SubUserContext,
      isSubUser: false,
      canEdit: () => true,
      isImpersonating: true,
      impersonationContext: impersonationCtx,
      exitImpersonation,
    }
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
    subUser,
    isSubUser: subUser.isSubUser,
    canEdit,
    isImpersonating: false,
    impersonationContext: { isImpersonating: false } as ImpersonationContext,
    exitImpersonation: () => {},
  }
}