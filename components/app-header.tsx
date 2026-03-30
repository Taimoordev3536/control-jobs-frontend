"use client"

import { Menu, MoreVertical, QrCode } from "lucide-react"
import ContactIcon from "../icons/Header/Contact.svg"
import MessageIcon from "../icons/Header/Message.svg"
import NotificationIcon from "../icons/Header/Notification.svg"
import SuggestionIcon from "../icons/Header/Sugestions.svg"
import WebIcon from "../icons/Header/Web.svg"

import { ThemeSwitcher } from "./theme-switcher"
import { UserDropdown } from "./user-dropdown"
import { useTranslation } from "@/hooks/use-translation"
import { LanguageSwitcher } from "./language-switcher"
import { useAuth } from "@/hooks/use-auth"
import { useEffect, useRef, useState } from "react"
import { useNotifications } from "@/components/providers/notification-provider"
import { X } from "lucide-react"
import { ClientTodayMergedQrDisplay } from "./dashboards/client-dashboard/client-today-merged-qr-display"

interface AppHeaderProps {
  collapsed: boolean
  toggleSidebar: () => void
}

export function AppHeader({ collapsed, toggleSidebar }: AppHeaderProps) {
  const { t } = useTranslation()
  const { session, getUserRole } = useAuth()
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const { unreadCount, items, markAllRead, dismiss } = useNotifications()
  const [notifOpen, setNotifOpen] = useState(false)
  const [todayQrOpen, setTodayQrOpen] = useState(false)
  const notifRef = useRef<HTMLDivElement | null>(null)
  const userRole = getUserRole()

  // Close notifications dropdown on outside click or Escape
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!notifOpen) return
      const target = e.target as Node
      if (notifRef.current && !notifRef.current.contains(target)) {
        setNotifOpen(false)
      }
    }
    const onKey = (e: KeyboardEvent) => {
      if (!notifOpen) return
      if (e.key === "Escape") setNotifOpen(false)
    }
    document.addEventListener("mousedown", onDocClick)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDocClick)
      document.removeEventListener("keydown", onKey)
    }
  }, [notifOpen])

  return (
    <header className={`header ${collapsed ? "header-collapsed" : "header-expanded"}`}>
      <div className="flex items-center gap-4">
        <button className="toggle-button ml-2" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="header-icons flex items-center gap-3 relative">
        {/* Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-3">
          <div className="relative" ref={notifRef}>
            <button
              className="header-icon-button relative"
              onClick={() => {
                const next = !notifOpen
                setNotifOpen(next)
                if (next) markAllRead()
              }}
            >
              <NotificationIcon className="h-5 w-5" />
              <span className="tooltip">{t("notification")}</span>
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
            {notifOpen && (
              <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-card border border-border z-50">
                <div className="px-3 py-2 border-b border-border font-medium text-foreground">
                  {t("notification")}
                </div>
                <div className="max-h-96 overflow-auto">
                  {(items && items.length > 0 ? items.slice(0, 10) : []).map((a) => (
                    <div key={a.localId || `${a.type}-${a.jobId}-${a.createdAt}`} className="px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground relative pr-8">
                      <button
                        className="absolute right-2 top-2 p-1 rounded hover:bg-muted"
                        aria-label="close notification"
                          onClick={async () => {
                            if (a.id) {
                              try {
                                const token = session?.accessToken
                                await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/alerts/${a.publicId || a.id}`, {
                                  method: 'DELETE',
                                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                                })
                              } catch {}
                            }
                            dismiss(a.localId || "")
                          }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                      <div className="font-semibold">
                        {a.type === "CHECK_IN" ? t("workerCheckedIn") : t("workerCheckedOut")}
                      </div>
                      <div className="text-muted-foreground">{a.message}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{new Date(a.createdAt).toLocaleString()}</div>
                    </div>
                  ))}
                  {(!items || items.length === 0) && (
                    <div className="px-3 py-6 text-sm text-muted-foreground text-center">{t("noNotifications")}</div>
                  )}
                </div>
              </div>
            )}
          </div>
          {userRole === 'client' && (
            <button 
              className="header-icon-button"
              onClick={() => setTodayQrOpen(true)}
            >
              <QrCode className="h-5 w-5" />
              <span className="tooltip">{t("todayQr") || "Today's QR"}</span>
            </button>
          )}
          <button className="header-icon-button">
            <MessageIcon className="h-5 w-5" />
            <span className="tooltip">{t("messages")}</span>
          </button>
          <button className="header-icon-button">
            <ContactIcon className="h-5 w-5" />
            <span className="tooltip">{t("contact")}</span>
          </button>
          <button className="header-icon-button">
            <SuggestionIcon className="h-5 w-5" />
            <span className="tooltip">{t("suggestions")}</span>
          </button>
          <button className="header-icon-button">
            <WebIcon className="h-5 w-5" />
            <span className="tooltip">{t("Web")}</span>
          </button>
        </div>

        {/* Three Dots Button on Mobile */}
        <div className="sm:hidden relative">
          <button onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)} className="header-icon-button">
            <MoreVertical className="h-5 w-5" />
          </button>
          {mobileDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-card rounded shadow-lg p-2 z-50 border border-border">
              <button className="header-icon-button block w-full text-left">
                <NotificationIcon className="h-5 w-5 inline-block mr-2" />
                {t("notification")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <MessageIcon className="h-5 w-5 inline-block mr-2" />
                {t("messages")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <ContactIcon className="h-5 w-5 inline-block mr-2" />
                {t("contact")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <SuggestionIcon className="h-5 w-5 inline-block mr-2" />
                {t("suggestions")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <WebIcon className="h-5 w-5 inline-block mr-2" />
                {t("Web")}
              </button>
            </div>
          )}
        </div>

        {/* Always Visible Items */}
        <ThemeSwitcher />
        <LanguageSwitcher />
        <div className="h-10 w-0.5 bg-muted" />
        <UserDropdown />
      </div>

      {/* Today's Merged QR Dialog */}
      <ClientTodayMergedQrDisplay open={todayQrOpen} onOpenChange={setTodayQrOpen} />
    </header>
  )
}
