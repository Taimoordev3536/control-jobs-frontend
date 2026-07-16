"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useQueryClient } from "@tanstack/react-query"
import { useEffect, useState, useMemo } from "react"
import { toast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import { getSubUserContext, SubUserContext } from "@/lib/api/sub-users"
import { invalidateAccessTokenCache } from "@/lib/api"

// useAuth is mounted by ~114 components; without sharing, each mount fired
// its own /sub-users/context request. One in-flight/settled promise is
// shared by every consumer and reset when the session ends.
let sharedSubUserFetch: Promise<SubUserContext> | null = null

function fetchSubUserContextShared(): Promise<SubUserContext> {
  if (!sharedSubUserFetch) {
    sharedSubUserFetch = getSubUserContext().catch(() => {
      // Don't cache failures — allow the next mount to retry.
      sharedSubUserFetch = null
      return { isSubUser: false } as SubUserContext
    })
  }
  return sharedSubUserFetch
}

function clearSharedSubUserContext() {
  sharedSubUserFetch = null
}
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
  const queryClient = useQueryClient()
  const [isLoading, setIsLoading] = useState(false)
  const [subUser, setSubUser] = useState<SubUserContext>({ isSubUser: false })
  const { language, setLanguage, t } = useTranslation("login") // Explicitly set namespace to "login"

  const [hydrated, setHydrated] = useState(false)
  const [impersonating, setImpersonating] = useState(false)
  const [impersonationUser, setImpersonationUser] = useState<any>(null)
  const [impersonationCtx, setImpersonationCtx] = useState<ImpersonationContext>({ isImpersonating: false })

  useEffect(() => {
    setImpersonating(isImpersonationSession())
    setImpersonationUser(getStoredImpersonationUser())
    setImpersonationCtx(getStoredImpersonationContext() || { isImpersonating: false })
    setHydrated(true)
  }, [])

  useEffect(() => {
    // Skip sub-user context fetch for impersonation sessions
    if (impersonating) return

    if (status !== "authenticated") {
      clearSharedSubUserContext()
      setSubUser({ isSubUser: false })
      return
    }
    let cancelled = false
    fetchSubUserContextShared().then((ctx) => {
      if (!cancelled) setSubUser(ctx)
    })
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
        if (result.error.startsWith("EMAIL_NOT_VERIFIED:")) {
          const targetEmail = result.error.slice("EMAIL_NOT_VERIFIED:".length) || email
          router.push(`/check-your-email?email=${encodeURIComponent(targetEmail)}`)
          return false
        }
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

      // A previous account's token/data can survive in the same tab (the API
      // token is cached at module scope, React Query holds the old user's
      // lists). Clear both so the new session fetches with the new token
      // instead of the stale one — otherwise pages 404/500/empty until a full
      // page refresh resets the module cache.
      invalidateAccessTokenCache()
      queryClient.clear()

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
      // Drop the cached API token + all cached query data so the next login
      // (possibly a different account in the same tab) starts clean.
      invalidateAccessTokenCache()
      queryClient.clear()
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

  // Return a stable object so consumers (114 components) don't see a fresh
  // reference on every unrelated re-render; `language` is a dep because the
  // login/logout closures use t().
  return useMemo(() => {
    if (!hydrated) {
      return {
        user: undefined,
        session: undefined,
        isAuthenticated: false,
        isLoading: true,
        login,
        logout: () => {},
        getUserRole: () => null,
        hasRole: () => false,
        hasAnyRole: () => false,
        subUser: { isSubUser: false } as SubUserContext,
        isSubUser: false,
        canEdit: () => false,
        isImpersonating: false,
        impersonationContext: { isImpersonating: false } as ImpersonationContext,
        exitImpersonation: () => {},
      }
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, impersonating, impersonationUser, impersonationCtx, session, status, subUser, isLoading, language])
}