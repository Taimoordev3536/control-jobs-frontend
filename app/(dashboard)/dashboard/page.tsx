"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/loading-spinner"

// Exactly one of these ever renders, but static imports put all five in the
// /dashboard bundle — so an admin downloaded the worker's QR scanner and
// selfie capture. Loaded on demand instead, per role.
const opts = { loading: () => <LoadingSpinner />, ssr: false }
const WorkerDashboard = dynamic(() => import("@/components/dashboards/worker-dashboard/worker-dashboard-main"), opts)
const EmployerDashboard = dynamic(() => import("@/components/dashboards/employer-dashboard/employer-dashboard"), opts)
const ClientDashboard = dynamic(() => import("@/components/dashboards/client-dashboard/client-dashboard-main"), opts)
const AdminDashboard = dynamic(() => import("@/components/dashboards/admin-dashboard"), opts)
const PartnerDashboard = dynamic(() => import("@/components/dashboards/partner-dashboard"), opts)

export default function RoleBasedDashboard() {
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

  // Show loading spinner while session is loading OR while we don't have a role yet
  if (isLoading || (session && !userRole)) {
    return <LoadingSpinner />
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  // Render dashboard based on user role
  switch (userRole?.toLowerCase()) {
    case "worker":
      return <WorkerDashboard />
    case "employer":
      return <EmployerDashboard />
    case "client":
      return <ClientDashboard />
    case "admin":
      return <AdminDashboard />
    case "partner":
      return <PartnerDashboard />
    default:
      return (
        <div className="min-h-screen bg-background flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unknown Role</h2>
            <p className="text-gray-600">Your account role is not recognized. Please contact support.</p>
          </div>
        </div>
      )
  }
}

