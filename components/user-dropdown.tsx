"use client"

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import ConfigurationIcon from "@/icons/User/Configuration.svg"
import PerfileIcon from "@/icons/User/Perfile.svg"
import UsersIcon from "@/icons/User/users.svg"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { LogOut, CreditCard, DollarSign } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function UserDropdown() {
  const { t } = useTranslation()
  const { user, logout, getUserRole } = useAuth()
  const userRole = getUserRole()

  const getDropdownItems = () => {
    switch (userRole) {
      case "worker":
        return [
          { label: t("mydata"), href: "/mydata", icon: PerfileIcon },
          { label: t("configuration"), href: "/configuration", icon: ConfigurationIcon },
          { label: t("wages"), href: "/wages", icon: DollarSign }, // TODO: Replace with SVG if available
        ]

      case "client":
        return [
          { label: t("mydata"), href: "/mydata", icon: PerfileIcon },
          { label: t("configuration"), href: "/configuration", icon: ConfigurationIcon },
          { label: t("users"), href: "/users", icon: UsersIcon },
        ]

      case "employer":
        return [
          { label: t("mydata"), href: "/mydata", icon: PerfileIcon },
          { label: t("configuration"), href: "/configuration", icon: ConfigurationIcon },
          { label: t("billing"), href: "/billing", icon: CreditCard }, // TODO: Replace with SVG if available
          { label: t("wages"), href: "/wages", icon: DollarSign }, // TODO: Replace with SVG if available
          { label: t("users"), href: "/users", icon: UsersIcon },
        ]

      case "partner":
        return [
          { label: t("mydata"), href: "/mydata", icon: PerfileIcon },
          { label: t("configuration"), href: "/configuration", icon: ConfigurationIcon },
          { label: t("users"), href: "/users", icon: UsersIcon },
        ]

      case "admin":
      default:
        return [
          { label: t("mydata"), href: "/mydata", icon: PerfileIcon },
          { label: t("configuration"), href: "/configuration", icon: ConfigurationIcon },
          { label: t("users"), href: "/users", icon: UsersIcon },
        ]
    }
  }

  const dropdownItems = getDropdownItems()

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`
    }
    if (user?.name) {
      const names = user.name.split(" ")
      return names.length > 1 ? `${names[0][0]}${names[1][0]}` : names[0][0]
    }
    return user?.email?.[0]?.toUpperCase() || "U"
  }

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`
    }
    return user?.name || user?.email || "User"
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarImage src="/placeholder.svg" alt={getDisplayName()} />
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* User info block */}
        <div className="flex flex-col items-center py-4 border-b border-border">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center mb-2">
            <Image
              src="/placeholder.svg"
              alt={getDisplayName()}
              width={80}
              height={80}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium">{getDisplayName()}</p>
            <p className="text-xs text-muted-foreground">{user?.email}</p>
            <p className="text-xs text-muted-foreground capitalize">{userRole}</p>
          </div>
        </div>

        <DropdownMenuSeparator />

        {dropdownItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            <Link href={item.href}>
              <item.icon className="mr-2 h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-red-600 focus:text-red-600 cursor-pointer" onClick={logout}>
          <LogOut className="mr-2 h-4 w-4" />
          <span>{t("logout")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
