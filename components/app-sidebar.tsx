"use client"

import { useTranslation } from "@/hooks/use-translation"

import BriefcaseIcon from "../icons/Menu/merchants.svg"
import EmployerIcon from "../icons/Menu/employer.svg"
import PartnerIcon from "../icons/Menu/Partners.svg"
import BillingIcon from "../icons/Menu/billing.svg"
import InvoicesIcon from "../icons/Menu/invoices.svg"
import ComisionesIcon from "../icons/Menu/commision.svg"
import RateIcon from "../icons/Menu/rates.svg"
import InformationIcon from "../icons/Menu/Informes.svg"
import UtilitiesIcon from "../icons/Menu/utilite.svg"
import InviteIcon from "../icons/Menu/Invite.svg"
import AidIcon from "../icons/Menu/aid.svg"
import JobsIcon from "../icons/Menu/Jobs.svg"
import ClientIcon from "../icons/Menu/clients.svg"
import WorkersIcon from "../icons/Menu/workers.svg"
import SurvayIcon from "../icons/Menu/surveys.svg"
import CJobs from "../icons/Logos/CJobs.svg";
import ContreolJobs from "../icons/Logos/ControlJobs.svg";
import {
  CreditCard,
  ChevronDown,
  ChevronUp,
  FileText,
  Share2,
  Users,
  Briefcase,
  UserCheck,
  DollarSign,
  Settings,
  FileBarChart,
  MessageSquare,
} from "lucide-react"
import { useState, useEffect } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/hooks/use-auth"

interface AppSidebarProps {
  collapsed: boolean
  isMobile: boolean
  mobileOpen: boolean
  closeSidebar?: () => void
}

export function AppSidebar({ collapsed, isMobile, mobileOpen, closeSidebar }: AppSidebarProps) {
  const { t } = useTranslation()
  const pathname = usePathname()
  const { getUserRole } = useAuth()
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const role = getUserRole()
    setUserRole(role)
  }, [getUserRole])

  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({
    jobs: true,
    merchants: true,
    billing: true,
    information: true,
    utilities: true,
    surveys: true,
  })

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }))
  }

  const isActive = (path: string) => pathname.startsWith(path)

  const getIcon = (iconKey: string) => {
    switch (iconKey) {
      case "control":
        return <Settings className="h-4 w-4" />
      case "consultations":
        return <MessageSquare className="h-4 w-4" />
      case "all":
        return <FileBarChart className="h-4 w-4" />
      case "occupation":
        return <Briefcase className="h-4 w-4" />
      case "surveys":
        return <SurvayIcon className="h-4 w-4" />
      case "signings-info":
        return <UserCheck className="h-4 w-4" />
      case "wages-info":
        return <DollarSign className="h-4 w-4" />
      case "services-info":
        return <Settings className="h-4 w-4" />
      case "clients":
        return <ClientIcon className="h-4 w-4" />
      case "workers":
        return <WorkersIcon className="h-4 w-4" />
      case "invoices-info":
        return <FileText className="h-4 w-4" />
      case "partners":
        return <PartnerIcon className="h-4 w-4" />
      case "employers":
        return <EmployerIcon className="h-4 w-4" />
      case "invoices":
        return <InvoicesIcon className="h-4 w-4" />
      case "commissions":
        return <ComisionesIcon className="h-4 w-4" />
      case "rates":
        return <RateIcon className="h-4 w-4" />
      case "employers-info":
      case "partners-info":
      case "commissions-info":
        return <InformationIcon className="h-4 w-4" />
      case "invite":
        return <InviteIcon className="h-4 w-4" />
      case "payments":
        return <CreditCard className="h-4 w-4" />
      case "export":
        return <Share2 className="h-4 w-4" />
      default:
        return <Users className="h-4 w-4" />
    }
  }

  const getMenuItems = () => {
    switch (userRole) {
      case "worker":
        return [
          {
            id: "jobs",
            title: t("jobs"),
            icon: () => <JobsIcon className="h-4 w-4" />,
            items: [
              { title: t("control"), href: "/jobs/control", iconKey: "control" },
              { title: t("consultations"), href: "/jobs/consultations", iconKey: "consultations" },
              { title: t("all"), href: "/jobs/all", iconKey: "all" },
            ],
          },
          {
            id: "occupation",
            title: t("occupation"),
            icon: () => <Briefcase className="h-4 w-4" />,
            href: "/occupation",
          },
          {
            id: "surveys",
            title: t("surveys"),
            icon: () => <SurvayIcon className="h-4 w-4" />,
            href: "/surveys",
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-4 w-4" />,
            items: [
              { title: t("signings"), href: "/information/signings-info", iconKey: "signings-info" },
              { title: t("wages"), href: "/information/wages-info", iconKey: "wages-info" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-4 w-4" />,
            href: "/aid",
          },
        ]

      case "client":
        return [
          {
            id: "jobs",
            title: t("jobs"),
            icon: () => <JobsIcon className="h-4 w-4" />,
            items: [
              { title: t("control"), href: "/jobs/control", iconKey: "control" },
              { title: t("all"), href: "/jobs/all", iconKey: "all" },
            ],
          },
          {
            id: "surveys",
            title: t("surveys"),
            icon: () => <SurvayIcon className="h-4 w-4" />,
            href: "/surveys",
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-4 w-4" />,
            items: [{ title: t("services"), href: "/information/services-info", iconKey: "services" }],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-4 w-4" />,
            href: "/aid",
          },
        ]

      case "employer":
        return [
          {
            id: "jobs",
            title: t("jobs"),
            icon: () => <JobsIcon className="h-4 w-4" />,
            items: [
              { title: t("control"), href: "/jobs/control", iconKey: "control" },
              { title: t("all"), href: "/jobs/all", iconKey: "all" },
            ],
          },
          {
            id: "clients",
            title: t("clients"),
            icon: () => <ClientIcon className="h-4 w-4" />,
            href: "/clients",
          },
          {
            id: "workers",
            title: t("workers"),
            icon: () => <WorkersIcon className="h-4 w-4" />,
            href: "/workers",
          },
          {
            id: "surveys",
            title: t("surveys"),
            icon: () => <SurvayIcon className="h-4 w-4" />,
            items: [
              { title: t("clients"), href: "/surveys/clients", iconKey: "clients" },
              { title: t("workers"), href: "/surveys/workers", iconKey: "workers" },
            ],
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-4 w-4" />,
            items: [
              { title: t("signings"), href: "/information/signings-info", iconKey: "signings-info" },
              { title: t("services"), href: "/information/services-info", iconKey: "services -info" },
              { title: t("invoices"), href: "/information/invoices-info", iconKey: "invoices" },
              { title: t("wages"), href: "/information/wages-info", iconKey: "wages-info" },
            ],
          },
          {
            id: "utilities",
            title: t("utilities"),
            icon: () => <UtilitiesIcon className="h-4 w-4" />,
            items: [
              { title: t("invite"), href: "/utilities/invite", iconKey: "invite" },
              { title: t("payments"), href: "/utilities/payments", iconKey: "payments" },
              { title: t("export"), href: "/utilities/export", iconKey: "export" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-4 w-4" />,
            href: "/aid",
          },
        ]

      case "partner":
        return [
          {
            id: "employers",
            title: t("employers"),
            icon: () => <EmployerIcon className="h-4 w-4" />,
            href: "/employers",
          },
          {
            id: "billing",
            title: t("billing"),
            icon: () => <BillingIcon className="h-4 w-4" />,
            items: [
              { title: t("invoices"), href: "/invoices", iconKey: "invoices" },
              { title: t("commissions"), href: "/commissions", iconKey: "commissions" },
              { title: t("rates"), href: "/rates", iconKey: "rates" },
            ],
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-4 w-4" />,
            items: [
              { title: t("employers"), href: "/information/employers-info", iconKey: "employers" },
              { title: t("commissions"), href: "/information/commissions-info", iconKey: "commissions" },
              { title: t("invoices"), href: "/information/invoices-info", iconKey: "invoices" },
            ],
          },
          {
            id: "utilities",
            title: t("utilities"),
            icon: () => <UtilitiesIcon className="h-4 w-4" />,
            items: [
              { title: t("invite"), href: "/utilities/invite", iconKey: "invite" },
              { title: t("export"), href: "/utilities/export", iconKey: "export" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-4 w-4" />,
            href: "/aid",
          },
        ]

      case "admin":
        return [
          {
            id: "merchants",
            title: t("merchants"),
            icon: () => <BriefcaseIcon className="h-4 w-4" />,
            items: [
              { title: t("partners"), href: "/partners", iconKey: "partners" },
              { title: t("employers"), href: "/employers", iconKey: "employers" },
            ],
          },
          {
            id: "billing",
            title: t("billing"),
            icon: () => <BillingIcon className="h-4 w-4" />,
            items: [
              { title: t("invoices"), href: "/invoices", iconKey: "invoices" },
              { title: t("commissions"), href: "/commissions", iconKey: "commissions" },
              { title: t("rates"), href: "/rates", iconKey: "rates" },
            ],
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-4 w-4" />,
            items: [
              { title: t("partners"), href: "/information/partners-info", iconKey: "partners" },
              { title: t("employers"), href: "/information/employers-info", iconKey: "employers" },
              { title: t("commissions"), href: "/information/commissions-info", iconKey: "commissions" },
              { title: t("invoices"), href: "/information/invoices-info", iconKey: "invoices" },
            ],
          },
          {
            id: "utilities",
            title: t("utilities"),
            icon: () => <UtilitiesIcon className="h-4 w-4" />,
            items: [
              { title: t("invite"), href: "/utilities/invite", iconKey: "invite" },
              { title: t("payments"), href: "/utilities/payments", iconKey: "payments" },
              { title: t("export"), href: "/utilities/export", iconKey: "export" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-4 w-4" />,
            href: "/aid",
          },
        ]
      default:
        return []
    }
  }

  const menuItems = getMenuItems()

  const handleMenuClick = (href: string) => {
    if (isMobile && closeSidebar) {
      closeSidebar()
    }
  }

  const sidebarClass = `sidebar ${collapsed ? "collapsed" : ""} ${isMobile ? (mobileOpen ? "mobile-open" : "") : ""}`

  return (
    <div className={sidebarClass}>
      <div className="sidebar-header">
        {collapsed ? (
          <div className="logo">
            <CJobs className="h-20 w-11" />
          </div>
        ) : (
          <div className="logo">
             <ContreolJobs className="h-72 w-48" />
          </div>
        )}
      </div>

      <div className="sidebar-content">
        {menuItems.map((item, index) => (
          <div key={item.id} className="sidebar-item-group">
            {item.items ? (
              <>
                <button
                  className={`sidebar-item ${
                    isActive(`/${item.id}`) || item.items.some((subItem) => isActive(subItem.href)) ? "active" : ""
                  }`}
                  onClick={() => !collapsed && toggleMenu(item.id)}
                >
                  <div className="sidebar-item-icon">
                    {typeof item.icon === "function" ? item.icon() : <item.icon className="h-4 w-4" />}
                  </div>
                  {!collapsed && (
                    <div className="sidebar-item-content">
                      <span>{item.title}</span>
                      {expandedMenus[item.id] ? (
                        <ChevronUp className="h-4 w-4 ml-auto" />
                      ) : (
                        <ChevronDown className="h-4 w-4 ml-auto" />
                      )}
                    </div>
                  )}
                </button>

                {/* Regular submenu for expanded sidebar */}
                {!collapsed && expandedMenus[item.id] && (
                  <div className="sidebar-submenu">
                    {item.items.map((subItem) => (
                      <Link
                        href={subItem.href}
                        key={subItem.href}
                        className={`sidebar-submenu-item ${isActive(subItem.href) ? "active" : ""}`}
                        onClick={() => handleMenuClick(subItem.href)}
                      >
                        {getIcon(subItem.iconKey)}
                        <span className="ml-3">{subItem.title}</span>
                      </Link>
                    ))}
                  </div>
                )}

                {/* Collapsed submenu - show icons below main menu when expanded */}
                {collapsed && expandedMenus[item.id] && (
                  <div className="collapsed-submenu flex flex-col items-center gap-1 mt-1">
                    {item.items.map((subItem) => (
                      <Link
                        href={subItem.href}
                        key={subItem.href}
                        className={`sidebar-item justify-center px-0 ${isActive(subItem.href) ? "active" : ""}`}
                        onClick={() => handleMenuClick(subItem.href)}
                        title={subItem.title}
                      >
                        <div className="sidebar-item-icon">{getIcon(subItem.iconKey)}</div>
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              item.href && (
                <Link
                  href={item.href}
                  className={`sidebar-item ${isActive(item.href) ? "active" : ""}`}
                  onClick={() => handleMenuClick(item.href)}
                >
                  <div className="sidebar-item-icon">
                    <item.icon className="h-4 w-4" />
                  </div>
                  {!collapsed && <div className="sidebar-item-content">{item.title}</div>}
                </Link>
              )
            )}

            {index !== menuItems.length - 1 && <div className="sidebar-divider" />}
          </div>
        ))}
      </div>

      {!collapsed && (
        <div className="sidebar-footer">
          <div>2025 © ControlJobs Tech, SL</div>
        </div>
      )}
    </div>
  )
}
