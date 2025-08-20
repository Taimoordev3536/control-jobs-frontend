"use client"

import { Menu, MoreVertical } from "lucide-react"
import ContactIcon from "../icons/Header/Contact.svg"
import MessageIcon from "../icons/Header/Message.svg"
import NotificationIcon from "../icons/Header/Notification.svg"
import SuggestionIcon from "../icons/Header/Sugestions.svg"
import WebIcon from "../icons/Header/Web.svg"

import { ThemeSwitcher } from "./theme-switcher"
import { UserDropdown } from "./user-dropdown"
import { useTranslation } from "@/hooks/use-translation"
import { LanguageSwitcher } from "./language-switcher"
import { useState } from "react"

interface AppHeaderProps {
  collapsed: boolean
  toggleSidebar: () => void
}

export function AppHeader({ collapsed, toggleSidebar }: AppHeaderProps) {
  const { t } = useTranslation()
  const [mobileDropdownOpen, setMobileDropdownOpen] = useState(false)

  return (
    <header className={`header ${collapsed ? "header-collapsed" : "header-expanded"}`}>
      <div className="flex items-center gap-4">
        <button className="toggle-button" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </button>
      </div>

      <div className="header-icons flex items-center gap-3 relative">
        {/* Hidden on mobile */}
        <div className="hidden sm:flex items-center gap-3">
          <button className="header-icon-button">
            <NotificationIcon className="h-6 w-6" />
            <span className="tooltip">{t("notification")}</span>
          </button>
          <button className="header-icon-button">
            <MessageIcon className="h-6 w-6" />
            <span className="tooltip">{t("messages")}</span>
          </button>
          <button className="header-icon-button">
            <ContactIcon className="h-6 w-6" />
            <span className="tooltip">{t("contact")}</span>
          </button>
          <button className="header-icon-button">
            <SuggestionIcon className="h-6 w-6" />
            <span className="tooltip">{t("suggestions")}</span>
          </button>
          <button className="header-icon-button">
            <WebIcon className="h-6 w-6" />
            <span className="tooltip">{t("Web")}</span>
          </button>
        </div>

        {/* Three Dots Button on Mobile */}
        <div className="sm:hidden relative">
          <button onClick={() => setMobileDropdownOpen(!mobileDropdownOpen)} className="header-icon-button">
            <MoreVertical className="h-6 w-6" />
          </button>
          {mobileDropdownOpen && (
            <div className="absolute right-0 mt-2 bg-white dark:bg-gray-800 rounded shadow-lg p-2 z-50">
              <button className="header-icon-button block w-full text-left">
                <NotificationIcon className="h-7 w-7 inline-block mr-2" />
                {t("notification")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <MessageIcon className="h-6 w-6 inline-block mr-2" />
                {t("messages")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <ContactIcon className="h-6 w-6 inline-block mr-2" />
                {t("contact")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <SuggestionIcon className="h-6 w-6 inline-block mr-2" />
                {t("suggestions")}
              </button>
              <button className="header-icon-button block w-full text-left">
                <WebIcon className="h-6 w-6 inline-block mr-2" />
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
    </header>
  )
}
