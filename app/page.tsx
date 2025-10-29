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
        // Redirect to dashboard for all authenticated users
        router.push("/dashboard")
      }
    }
  }, [isAuthenticated, isLoading, getUserRole, router])

  if (isLoading) {
    return <LoadingSpinner />
  }

  return null
}
