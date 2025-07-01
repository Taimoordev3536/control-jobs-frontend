"use client"

import { Menu, } from "lucide-react"
import ContactIcon from "../icons/Header/Contact.svg"
import MessageIcon from "../icons/Header/Message.svg"
import NotificationIcon from "../icons/Header/Notification.svg"
import SuggestionIcon from "../icons/Header/Sugestions.svg"
import WebIcon from "../icons/Header/Web.svg"

import { ThemeSwitcher } from "./theme-switcher"
import { UserDropdown } from "./user-dropdown"
import { useTranslation } from "@/hooks/use-translation"
import { LanguageSwitcher } from "./language-switcher"

interface AppHeaderProps {
  collapsed: boolean
  toggleSidebar: () => void
}

export function AppHeader({ collapsed, toggleSidebar }: AppHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className={`header ${collapsed ? "header-collapsed" : "header-expanded"}`}>
      <div className="flex items-center gap-4">
        <button className="toggle-button" onClick={toggleSidebar}>
          <Menu className="h-5 w-5" />
        </button>
      </div>
      <div className="header-icons">
        <button className="header-icon-button">
          <NotificationIcon className="h-5 w-5" />
          <span className="tooltip">Notifications</span>
        </button>
        <button className="header-icon-button">
          <MessageIcon className="h-5 w-5" />
          <span className="tooltip">Messages</span>
        </button>
        <button className="header-icon-button">
          <ContactIcon className="h-5 w-5" />
          {/* <ContactIcon className="h-5 w-5 text-black dark:text-white" /> */}
          <span className="tooltip">Contact</span>
        </button>
         <button className="header-icon-button">
          <SuggestionIcon className="h-5 w-5" />
          <span className="tooltip">Suggestions</span>
        </button>
        <button className="header-icon-button">
          <WebIcon className="h-5 w-5" />
          <span className="tooltip">Web</span>
        </button>
          <ThemeSwitcher />
          <LanguageSwitcher />
          <div className="h-10 w-0.5 bg-muted" /> {/* vertical line */}
         <UserDropdown />
      </div>
    </header>
  )
}
