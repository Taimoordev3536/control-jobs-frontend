"use client"

import { useAuth } from "@/hooks/use-auth"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import { LoadingSpinner } from "@/components/loading-spinner"

export default function Home() {
  const { isAuthenticated, isLoading, getUserRole } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.push("/login")
      } else {
        // Redirect based on user role
        const userRole = getUserRole()
        const defaultRoutes: Record<string, string> = {
          admin: "/partners",
          partner: "/employers",
          employer: "/jobs/control",
          client: "/jobs/control",
          worker: "/jobs/control",
        }

        router.push(defaultRoutes[userRole] || "/jobs/control")
      }
    }
  }, [isAuthenticated, isLoading, getUserRole, router])

  if (isLoading) {
    return <LoadingSpinner message="Loading..." />
  }

  return null
}
