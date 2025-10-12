// import { DataTable } from "@/components/data-table"

// export default function ConfigurationPage() {


//   return (
//     <div>
//       <h1 className="page-title">Configuration</h1>
//     </div>
//   )
// }


"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/loading-spinner"

// Role-based configuration main pages
import AdminConfigurationMainPage from "@/components/configuration/admin-configuration/mainPage"
import PartnerConfigurationMainPage from "@/components/configuration/partner-configuration/mainPage"
import EmployerConfigurationMainPage from "@/components/configuration/employer-configuration/mainPage"
import ClientConfigurationMainPage from "@/components/configuration/client-configuration/mainPage"
import WorkerConfigurationMainPage from "@/components/configuration/worker-configuration/mainPage"

export default function ConfigurationPage() {
  const { session, isLoading, getUserRole } = useAuth()
  const [userRole, setUserRole] = useState<string>("")

  useEffect(() => {
    if (session) {
      const role = getUserRole()
      setUserRole(role)
    }
  }, [session, getUserRole])

  if (isLoading) {
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

  switch (userRole.toLowerCase()) {
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
