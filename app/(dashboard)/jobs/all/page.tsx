"use client"

import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { LoadingSpinner } from "@/components/loading-spinner"
import WorkerDashboard from "@/components/dashboards/worker-dashboard/worker-dashboard-main"
import EmployerDashboard from "@/components/dashboards/employer-dashboard"
import ClientDashboard from "@/components/dashboards/client-dashboard"
import AdminDashboard from "@/components/dashboards/admin-dashboard"
import PartnerDashboard from "@/components/dashboards/partner-dashboard"

export default function RoleBasedDashboard() {
  const { session, isLoading, getUserRole } = useAuth()
  const [userRole, setUserRole] = useState<string>("")

  useEffect(() => {
    if (session) {
      const role = getUserRole()
      setUserRole(role)
    }
  }, [session, getUserRole])

  if (isLoading) {
    return <LoadingSpinner message="Loading dashboard..." />
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">Please log in to access your dashboard.</p>
        </div>
      </div>
    )
  }

  // Render dashboard based on user role
  switch (userRole.toLowerCase()) {
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
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Unknown Role</h2>
            <p className="text-gray-600">Your account role is not recognized. Please contact support.</p>
          </div>
        </div>
      )
  }
}







// import FreeLiveLocationTracker from '@/components/LocationTracker';

// export default function DemoPage() {
//   return (
//     <main>
//       <FreeLiveLocationTracker />
//     </main>
//   );
// }




// import AttendanceCheckin from "@/components/AttendanceCheckin"

// export default function AttendancePage() {
//   return (
//     <main className="min-h-screen flex items-center justify-center">
//       <AttendanceCheckin />
//     </main>
//   )
// }
