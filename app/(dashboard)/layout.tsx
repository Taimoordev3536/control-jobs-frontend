"use client"

import type React from "react"
import { AppHeader } from "@/components/app-header"
import { AppSidebar } from "@/components/app-sidebar"
import { useState, useEffect } from "react"
import { NotificationProvider } from "@/components/providers/notification-provider"
import { ChatProvider } from "@/components/providers/chat-provider"
import { ImpersonationBanner } from "@/components/impersonation-banner"
import { useAuth } from "@/hooks/use-auth"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const { isImpersonating } = useAuth()

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

  // When impersonation banner is visible, shift fixed elements down
  const bannerOffset = isImpersonating ? "var(--impersonation-banner-h)" : "0px"

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{ "--impersonation-banner-h": "34px" } as React.CSSProperties}
    >
      <ImpersonationBanner />
      {/* Mobile overlay */}
      {isMobile && <div className={`sidebar-overlay ${mobileOpen ? "active" : ""}`} onClick={closeSidebar} />}

      <AppSidebar
        collapsed={collapsed}
        isMobile={isMobile}
        mobileOpen={mobileOpen}
        closeSidebar={closeSidebar}
        style={isImpersonating ? { top: bannerOffset, height: `calc(100vh - var(--impersonation-banner-h))` } : undefined}
      />
      <NotificationProvider>
        <ChatProvider>
          <AppHeader collapsed={collapsed} toggleSidebar={toggleSidebar} style={{ top: bannerOffset }} />
          <div
            className={`main-content ${collapsed ? "main-content-collapsed" : ""} ${isMobile ? "!ml-0" : ""}`}
            style={{ marginTop: isImpersonating ? "calc(60px + var(--impersonation-banner-h))" : undefined }}
          >
            {children}
          </div>
        </ChatProvider>
      </NotificationProvider>
    </div>
  )
}
