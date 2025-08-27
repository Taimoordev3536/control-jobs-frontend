"use client"

import { useTranslation } from "@/hooks/use-translation"

import BriefcaseIcon from "../icons/Menu/merchants.svg"
import EmployerIcon from "../icons/Menu/employer.svg"
import PartnerIcon from "../icons/Menu/Partners.svg"
import BillingIcon from "../icons/Menu/billing.svg"
import InvoicesIcon from "../icons/Menu/invoices.svg"
import ComisionesIcon from "../icons/new/Comisiones.svg"
import RateIcon from "../icons/new/Tarifas.svg"
import InformationIcon from "../icons/Menu/Informes.svg"
import UtilitiesIcon from "../icons/Menu/utilite.svg"
import InviteIcon from "../icons/Menu/Invite.svg"
import AidIcon from "../icons/Menu/aid.svg"
import JobsIcon from "../icons/Menu/Jobs.svg"
import ClientIcon from "../icons/Menu/clients.svg"
import WorkersIcon from "../icons/Menu/workers.svg"
import SurvayIcon from "../icons/Menu/surveys.svg"
import PaymentIcon from "../icons/new/pagos.svg"
import ImportIcon from "../icons/new/importar.svg"
import ControlIcon from "../icons/new/control.svg"
import TodosIcon from "../icons/new/todos.svg"
import SigningsInfoIcon from "../icons/new/fichajes.svg"
import ServicesInfoIcon from "../icons/new/servicios.svg"
import SalaryInfoIcon from "../icons/new/salaries.svg"
import ConsultIcon from "../icons/new/consultas.svg"
import OcupacionIcon from "../icons/new/ocupacion.svg"
import CJobs from "../icons/new/logo_min.svg";
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

  // Initialize all menus as collapsed except the first one
  const [expandedMenus, setExpandedMenus] = useState<Record<string, boolean>>({})

  useEffect(() => {
    const menuItems = getMenuItems()
    if (menuItems.length > 0) {
      setExpandedMenus({
        [menuItems[0].id]: true, // Expand the first menu by default
      })
    }
  }, [userRole])

  const toggleMenu = (menu: string) => {
    setExpandedMenus((prev) => ({
      ...prev,
      [menu]: !prev[menu],
    }))
  }

  const isActive = (path: string) => {
    const menuItems = getMenuItems()
    if (menuItems.length > 0 && pathname === "/" && path === menuItems[0].items?.[0]?.href) {
      return true // Mark first sub-option of first menu as active on initial load
    }
    return pathname.startsWith(path)
  }

  const getIcon = (iconKey: string) => {
    switch (iconKey) {
      case "control":
        return <ControlIcon className="h-5 w-5" />
      case "consultations":
        return <ConsultIcon className="h-5 w-5" />
      case "all":
        return <TodosIcon className="h-5 w-5" />
      case "occupation":
        return <Briefcase className="h-5 w-5" />
      case "surveys":
        return <SurvayIcon className="h-5 w-5" />
      case "signings-info":
        return <SigningsInfoIcon className="h-5 w-5" />
      case "wages-info":
        return <SalaryInfoIcon className="h-5 w-5" />
      case "services-info":
        return <ServicesInfoIcon className="h-5 w-5" />
      case "clients":
        return <ClientIcon className="h-5 w-5" />
      case "workers":
        return <WorkersIcon className="h-5 w-5" />
      case "invoices-info":
        return <FileText className="h-5 w-5" />
      case "partners":
        return <PartnerIcon className="h-5 w-5" />
      case "employers":
        return <EmployerIcon className="h-5 w-5" />
      case "invoices":
        return <InvoicesIcon className="h-5 w-5" />
      case "commissions":
        return <ComisionesIcon className="h-5 w-5" />
      case "rates":
        return <RateIcon className="h-5 w-5" />
      case "employers-info":
      case "partners-info":
      case "commissions-info":
        return <InformationIcon className="h-5 w-5" />
      case "invite":
        return <InviteIcon className="h-5 w-5" />
      case "payments":
        return <PaymentIcon className="h-5 w-5" />
      case "import":
        return <ImportIcon className="h-6 w-6" />
      default:
        return <Users className="h-5 w-5" />
    }
  }

  const getMenuItems = () => {
    switch (userRole) {
      case "worker":
        return [
          {
            id: "jobs",
            title: t("jobs"),
            icon: () => <JobsIcon className="h-5 w-5" />,
            items: [
              { title: t("control"), href: "/jobs/control", iconKey: "control" },
              { title: t("consultations"), href: "/jobs/consultations", iconKey: "consultations" },
              { title: t("all"), href: "/jobs/all", iconKey: "all" },
            ],
          },
          {
            id: "occupation",
            title: t("occupation"),
            icon: () => <OcupacionIcon className="h-5 w-5" />,
            href: "/occupation",
          },
          {
            id: "surveys",
            title: t("surveys"),
            icon: () => <SurvayIcon className="h-5 w-5" />,
            href: "/surveys",
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-5 w-5" />,
            items: [
              { title: t("signings"), href: "/information/signings-info", iconKey: "signings-info" },
              { title: t("wages"), href: "/information/wages-info", iconKey: "wages-info" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-5 w-5" />,
            href: "/aid",
          },
        ]

      case "client":
        return [
          {
            id: "jobs",
            title: t("jobs"),
            icon: () => <JobsIcon className="h-5 w-5" />,
            items: [
              { title: t("control"), href: "/jobs/control", iconKey: "control" },
              { title: t("all"), href: "/jobs/all", iconKey: "all" },
            ],
          },
          {
            id: "surveys",
            title: t("surveys"),
            icon: () => <SurvayIcon className="h-5 w-5" />,
            href: "/surveys",
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-5 w-5" />,
            items: [{ title: t("services"), href: "/information/services-info", iconKey: "services" }],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-5 w-5" />,
            href: "/aid",
          },
        ]

      case "employer":
        return [
          {
            id: "jobs",
            title: t("jobs"),
            icon: () => <JobsIcon className="h-5 w-5" />,
            items: [
              { title: t("control"), href: "/jobs/control", iconKey: "control" },
              { title: t("all"), href: "/jobs/all", iconKey: "all" },
            ],
          },
          {
            id: "clients",
            title: t("clients"),
            icon: () => <ClientIcon className="h-5 w-5" />,
            href: "/clients",
          },
          {
            id: "workers",
            title: t("workers"),
            icon: () => <WorkersIcon className="h-5 w-5" />,
            href: "/workers",
          },
          {
            id: "surveys",
            title: t("surveys"),
            icon: () => <SurvayIcon className="h-5 w-5" />,
            items: [
              { title: t("clients"), href: "/surveys/clients", iconKey: "clients" },
              { title: t("workers"), href: "/surveys/workers", iconKey: "workers" },
            ],
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-5 w-5" />,
            items: [
              { title: t("signings"), href: "/information/signings-info", iconKey: "signings-info" },
              { title: t("services"), href: "/information/services-info", iconKey: "services-info" },
              { title: t("invoices"), href: "/information/invoices-info", iconKey: "invoices" },
              { title: t("wages"), href: "/information/wages-info", iconKey: "wages-info" },
            ],
          },
          {
            id: "utilities",
            title: t("utilities"),
            icon: () => <UtilitiesIcon className="h-5 w-5" />,
            items: [
              { title: t("import"), href: "/utilities/import", iconKey: "import" },
              { title: t("invite"), href: "/utilities/invite", iconKey: "invite" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-5 w-5" />,
            href: "/aid",
          },
        ]

      case "partner":
        return [
          {
            id: "employers",
            title: t("employers"),
            icon: () => <EmployerIcon className="h-5 w-5" />,
            href: "/employers",
          },
          {
            id: "billing",
            title: t("billing"),
            icon: () => <BillingIcon className="h-5 w-5" />,
            items: [
              { title: t("commissions"), href: "/commissions", iconKey: "commissions" },
              { title: t("invoices"), href: "/invoices", iconKey: "invoices" },
              { title: t("rates"), href: "/rates", iconKey: "rates" },
            ],
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-5 w-5" />,
            items: [
              { title: t("employers"), href: "/information/employers-info", iconKey: "employers" },
              { title: t("commissions"), href: "/information/commissions-info", iconKey: "commissions" },
              { title: t("invoices"), href: "/information/invoices-info", iconKey: "invoices" },
            ],
          },
          {
            id: "utilities",
            title: t("utilities"),
            icon: () => <UtilitiesIcon className="h-5 w-5" />,
            items: [
              { title: t("import"), href: "/utilities/import", iconKey: "import" },
              { title: t("invite"), href: "/utilities/invite", iconKey: "invite" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-5 w-5" />,
            href: "/aid",
          },
        ]

      case "admin":
        return [
          {
            id: "merchants",
            title: t("merchants"),
            icon: () => <BriefcaseIcon className="h-5 w-5" />,
            items: [
              { title: t("partners"), href: "/partners", iconKey: "partners" },
              { title: t("employers"), href: "/employers", iconKey: "employers" },
            ],
          },
          {
            id: "billing",
            title: t("billing"),
            icon: () => <BillingIcon className="h-5 w-5" />,
            items: [
              { title: t("invoices"), href: "/invoices", iconKey: "invoices" },
              { title: t("commissions"), href: "/commissions", iconKey: "commissions" },
              { title: t("rates"), href: "/rates", iconKey: "rates" },
            ],
          },
          {
            id: "information",
            title: t("information"),
            icon: () => <InformationIcon className="h-5 w-5" />,
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
            icon: () => <UtilitiesIcon className="h-5 w-5" />,
            items: [
              { title: t("payments"), href: "/utilities/payments", iconKey: "payments" },
              { title: t("pages"), href: "/utilities/payments", iconKey: "payments" },
              { title: t("import"), href: "/utilities/import", iconKey: "import" },
              { title: t("invite"), href: "/utilities/invite", iconKey: "invite" },
            ],
          },
          {
            id: "aid",
            title: t("aid"),
            icon: () => <AidIcon className="h-5 w-5" />,
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
            <ContreolJobs className="h-64 w-40" />
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
        <div className="sidebar-footer font-bold">
          2025 © <span className="text-[#662D91]">ControlJobs Tech,S.L</span>
        </div>
      )}
    </div>
  )
}