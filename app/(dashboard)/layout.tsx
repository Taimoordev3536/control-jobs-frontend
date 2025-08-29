"use client"

import type React from "react"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { useState, useEffect } from "react"
import { NotificationProvider } from "@/components/providers/notification-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  const toggleSidebar = () => {
    if (isMobile) {
      setMobileOpen(!mobileOpen)
    } else {
      setCollapsed(!collapsed)
    }
  }

  const closeSidebar = () => {
    if (isMobile) {
      setMobileOpen(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      {/* Mobile overlay */}
      {isMobile && <div className={`sidebar-overlay ${mobileOpen ? "active" : ""}`} onClick={closeSidebar} />}

      <AppSidebar collapsed={collapsed} isMobile={isMobile} mobileOpen={mobileOpen} closeSidebar={closeSidebar} />
      <NotificationProvider>
        <AppHeader collapsed={collapsed} toggleSidebar={toggleSidebar} />
        <div className={`main-content ${collapsed ? "main-content-collapsed" : ""} ${isMobile ? "!ml-0" : ""}`}>
          {children}
        </div>
      </NotificationProvider>
    </div>
  )
}
