"use client"

import { Menu, MoreVertical, QrCode, Megaphone } from "lucide-react"
import SupportHeaderIcon from "../icons/new_icons/Soporte.svg"
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
import { useRouter } from "next/navigation"
import { useNotifications } from "@/components/providers/notification-provider"
import { useChat } from "@/components/providers/chat-provider"
import { X } from "lucide-react"
import { formatLocalDateTime } from "@/lib/datetime"
import { ClientTodayMergedQrDisplay } from "./dashboards/client-dashboard/client-today-merged-qr-display"
import { SupportMessageDialog } from "./support-message-dialog"

interface AppHeaderProps {
  collapsed: boolean
  toggleSidebar: () => void
  style?: React.CSSProperties
}

export function AppHeader({ collapsed, toggleSidebar, style }: AppHeaderProps) {
  const { t } = useTranslation()
  const { session, getUserRole } = useAuth()
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)
  const { unreadCount, items, markAllRead, dismiss } = useNotifications()
  const { unreadCount: chatUnread } = useChat()
  const router = useRouter()
  const [notifOpen, setNotifOpen] = useState(false)

  const MANUAL_ATTENDANCE_TYPES = new Set([
    "MANUAL_ATTENDANCE_REQUESTED",
    "MANUAL_ATTENDANCE_APPROVED",
    "MANUAL_ATTENDANCE_REJECTED",
    "MANUAL_ATTENDANCE_CANCELLED",
  ])

  const getNotifTitle = (type: string) => {
    switch (type) {
      case "CHECK_IN": return t("workerCheckedIn")
      case "CHECK_OUT": return t("workerCheckedOut")
      case "MANUAL_ATTENDANCE_REQUESTED": return t("manualAttendanceRequested") || "Manual attendance requested"
      case "MANUAL_ATTENDANCE_APPROVED": return t("manualAttendanceApproved") || "Manual attendance approved"
      case "MANUAL_ATTENDANCE_REJECTED": return t("manualAttendanceRejected") || "Manual attendance rejected"
      case "MANUAL_ATTENDANCE_CANCELLED": return t("manualAttendanceCancelled") || "Manual attendance cancelled"
      case "RATE_CHANGE_SCHEDULED": return t("rateChangeScheduledTitle") || "Tariff change scheduled"
      case "RATE_CHANGE_CANCELLED": return t("rateChangeCancelledTitle") || "Tariff change cancelled"
      case "SUPPORT_REQUEST": return t("supportRequest") || "Support request"
      case "SUPPORT_REPLY": return t("supportReply") || "Support reply"
      case "SUGGESTION": return t("suggestion") || "Suggestion"
      default: return t("notification")
    }
  }

  const handleNotifClick = (type: string) => {
    if (MANUAL_ATTENDANCE_TYPES.has(type)) {
      setNotifOpen(false)
      router.push("/jobs/manual-requests")
      return
    }
    if (type === "RATE_CHANGE_SCHEDULED" || type === "RATE_CHANGE_CANCELLED") {
      setNotifOpen(false)
      // Partners see the live rate plans on /rates; employers manage their
      // own subscription on /billing. Both pages surface the pending change.
      router.push(userRole === "partner" ? "/rates" : "/billing")
    }
    if (type === "SUPPORT_REQUEST") {
      setNotifOpen(false)
      router.push("/support/tickets")
      return
    }
    if (type === "SUGGESTION") {
      setNotifOpen(false)
      router.push("/support/suggestions")
      return
    }
  }
  const [todayQrOpen, setTodayQrOpen] = useState(false)
  const [supportOpen, setSupportOpen] = useState(false)
  const [suggestionOpen, setSuggestionOpen] = useState(false)
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
    <header className={`header ${collapsed ? "header-collapsed" : "header-expanded"}`} style={style}>
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
              <div className="absolute right-0 mt-2 w-80 rounded-md shadow-lg bg-card border border-border z-[100]">
                <div className="px-3 py-2 border-b border-border font-medium text-foreground">
                  {t("notification")}
                </div>
                <div className="max-h-96 overflow-auto">
                  {(items && items.length > 0 ? items.slice(0, 10) : []).map((a) => {
                    const clickable = MANUAL_ATTENDANCE_TYPES.has(a.type)
                    return (
                    <div
                      key={a.localId || `${a.type}-${a.jobId}-${a.createdAt}`}
                      className={`px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground relative pr-8 ${clickable ? "cursor-pointer" : ""}`}
                      role={clickable ? "button" : undefined}
                      tabIndex={clickable ? 0 : undefined}
                      onClick={() => handleNotifClick(a.type)}
                      onKeyDown={(e) => {
                        if (clickable && (e.key === "Enter" || e.key === " ")) {
                          e.preventDefault()
                          handleNotifClick(a.type)
                        }
                      }}
                    >
                      <button
                        className="absolute right-2 top-2 p-1 rounded hover:bg-muted"
                        aria-label="close notification"
                          onClick={async (e) => {
                            e.stopPropagation()
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
                        {a.type === "ANNOUNCEMENT"
                          ? a.meta?.subject || t("announcement")
                          : getNotifTitle(a.type)}
                      </div>
                      <div className="text-muted-foreground">{a.message}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{formatLocalDateTime(a.createdAt)}</div>
                    </div>
                    )
                  })}
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
          <button
            className="header-icon-button relative"
            onClick={() => router.push("/messages")}
          >
            <MessageIcon className="h-5 w-5" />
            <span className="tooltip">{t("messages")}</span>
            {chatUnread > 0 && (
              <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center">
                {chatUnread}
              </span>
            )}
          </button>
          {(userRole === "employer" || userRole === "partner" || userRole === "admin" || userRole === "worker" || userRole === "client") && (
            <button
              className="header-icon-button"
              onClick={() => router.push("/announcements")}
            >
              <Megaphone className="h-5 w-5" />
              <span className="tooltip">{t("announcements")}</span>
            </button>
          )}
          <button className="header-icon-button" onClick={() => setSupportOpen(true)}>
            <SupportHeaderIcon className="h-5 w-5" />
            <span className="tooltip">{t("support")}</span>
          </button>
          <button className="header-icon-button" onClick={() => setSuggestionOpen(true)}>
            <SuggestionIcon className="h-5 w-5" />
            <span className="tooltip">{t("suggestions")}</span>
          </button>
          <button className="header-icon-button" onClick={() => window.open("https://controljobs.com", "_blank")}>
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
            <div className="absolute right-0 mt-2 bg-card rounded shadow-lg p-2 z-[100] border border-border">
              <button className="header-icon-button block w-full text-left">
                <NotificationIcon className="h-5 w-5 inline-block mr-2" />
                {t("notification")}
              </button>
              <button
                className="header-icon-button block w-full text-left"
                onClick={() => {
                  setMobileDropdownOpen(false)
                  router.push("/messages")
                }}
              >
                <MessageIcon className="h-5 w-5 inline-block mr-2" />
                {t("messages")}
                {chatUnread > 0 && (
                  <span className="ml-2 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] text-white">
                    {chatUnread}
                  </span>
                )}
              </button>
              {(userRole === "employer" || userRole === "partner" || userRole === "admin" || userRole === "worker" || userRole === "client") && (
                <button
                  className="header-icon-button block w-full text-left"
                  onClick={() => {
                    setMobileDropdownOpen(false)
                    router.push("/announcements")
                  }}
                >
                  <Megaphone className="h-5 w-5 inline-block mr-2" />
                  {t("announcements")}
                </button>
              )}
              <button
                className="header-icon-button block w-full text-left"
                onClick={() => {
                  setMobileDropdownOpen(false)
                  setSupportOpen(true)
                }}
              >
                <SupportHeaderIcon className="h-5 w-5 inline-block mr-2" />
                {t("support")}
              </button>
              <button
                className="header-icon-button block w-full text-left"
                onClick={() => {
                  setMobileDropdownOpen(false)
                  setSuggestionOpen(true)
                }}
              >
                <SuggestionIcon className="h-5 w-5 inline-block mr-2" />
                {t("suggestions")}
              </button>
              <button
                className="header-icon-button block w-full text-left"
                onClick={() => window.open("https://controljobs.com", "_blank")}
              >
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

      <SupportMessageDialog
        open={supportOpen}
        onOpenChange={setSupportOpen}
        title={t("support")}
        description={t("supportRequestDescription") || "Describe the issue and our team will get back to you."}
        endpoint="/support/tickets"
        successMessage={t("supportRequestSubmitted") || "Support request submitted"}
      />
      <SupportMessageDialog
        open={suggestionOpen}
        onOpenChange={setSuggestionOpen}
        title={t("suggestions")}
        description={t("suggestionDescription") || "Share your suggestion to help us improve."}
        endpoint="/support/suggestions"
        successMessage={t("suggestionSubmitted") || "Suggestion submitted"}
      />
    </header>
  )
}
