"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/loading-spinner"

// Role-based configuration main pages — only one renders, so load on demand
// rather than shipping all five to every user.
const opts = { loading: () => <LoadingSpinner />, ssr: false }
const AdminConfigurationMainPage = dynamic(() => import("@/components/configuration/admin-configuration/mainPage"), opts)
const PartnerConfigurationMainPage = dynamic(() => import("@/components/configuration/partner-configuration/mainPage"), opts)
const EmployerConfigurationMainPage = dynamic(() => import("@/components/configuration/employer-configuration/mainPage"), opts)
const ClientConfigurationMainPage = dynamic(() => import("@/components/configuration/client-configuration/mainPage"), opts)
const WorkerConfigurationMainPage = dynamic(() => import("@/components/configuration/worker-configuration/mainPage"), opts)

export default function ConfigurationPage() {
  const { session, isLoading, getUserRole } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    if (session) {
      const role = getUserRole()
      setUserRole(role)
    } else {
      setUserRole(null)
    }
  }, [session, getUserRole])

  // Show loading while session loads OR while we have session but no role yet
  if (isLoading || (session && !userRole)) {
    return <LoadingSpinner message="Loading configuration..." />
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access configuration.</p>
        </div>
      </div>
    )
  }

  switch (userRole?.toLowerCase()) {
    case "admin":
      return <AdminConfigurationMainPage />
    case "partner":
      return <PartnerConfigurationMainPage />
    case "employer":
      return <EmployerConfigurationMainPage />
    case "client":
      return <ClientConfigurationMainPage />
    case "worker":
      return <WorkerConfigurationMainPage />
    default:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-foreground mb-2">Unknown Role</h2>
            <p className="text-muted-foreground">Your account role is not recognized. Please contact support.</p>
          </div>
        </div>
      )
  }
}
