"use client"

import { useSession, signIn, signOut } from "next-auth/react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import { toast } from "@/hooks/use-toast"

export function useAuth() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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
          title: "Login Failed",
          description: "Invalid email or password",
          variant: "destructive",
        })
        return false
      }

      toast({
        title: "Login Successful",
        description: "Welcome back!",
      })

      // Redirect based on user role
      const userRole = session?.user?.role?.name?.toLowerCase()
      const defaultRoutes: Record<string, string> = {
        admin: "/partners",
        partner: "/employers",
        employer: "/jobs/control",
        client: "/jobs/control",
        worker: "/jobs/control",
      }

      router.push(defaultRoutes[userRole || "worker"] || "/jobs/control")
      return true
    } catch (error) {
      toast({
        title: "Login Error",
        description: "An unexpected error occurred",
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
        title: "Logged Out",
        description: "You have been successfully logged out",
      })
      router.push("/login")
    } catch (error) {
      toast({
        title: "Logout Error",
        description: "An error occurred during logout",
        variant: "destructive",
      })
    }
  }

  const getUserRole = () => {
    return session?.user?.role?.name?.toLowerCase() || "worker"
  }

  const hasRole = (role: string) => {
    return getUserRole() === role.toLowerCase()
  }

  const hasAnyRole = (roles: string[]) => {
    const userRole = getUserRole()
    return roles.some((role) => role.toLowerCase() === userRole)
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
