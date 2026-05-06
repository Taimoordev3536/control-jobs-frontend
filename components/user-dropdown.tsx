"use client"

import { useEffect, useRef, useState } from "react"
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
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"
import { logoEndpointsFor } from "@/lib/logo-endpoints"
import { LogOut, CreditCard, DollarSign, Plus, Loader2 } from "lucide-react"
import Image from "next/image"
import Link from "next/link"

export function UserDropdown() {
  const { t } = useTranslation()
  const { user, session, logout, getUserRole, isSubUser } = useAuth()
  const { toast } = useToast()
  const translateBackendError = useBackendError()
  const userRole = getUserRole()
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const endpoints = logoEndpointsFor(userRole)
  const canUploadLogo = !!endpoints

  // Fetch the active user's avatar (per-role: employer logo, partner logo,
  // client logo, worker photo, admin photo) for both the navbar trigger and
  // the dropdown header. Listens to a global event so a /mydata or +button
  // upload reflects immediately without a page reload.
  useEffect(() => {
    if (!endpoints || !session?.accessToken) {
      setLogoUrl(null)
      return
    }
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoints.read}`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (!res.ok) return
        const result = await res.json()
        if (!cancelled) setLogoUrl(result?.data?.logoUrl ?? null)
      } catch {
        // swallow — no logo just means we render initials/placeholder
      }
    }
    load()
    const onLogoChanged = (e: Event) => {
      const next = (e as CustomEvent<{ logoUrl: string | null }>).detail?.logoUrl ?? null
      setLogoUrl(next)
    }
    window.addEventListener("employer-logo-changed", onLogoChanged as EventListener)
    return () => {
      cancelled = true
      window.removeEventListener("employer-logo-changed", onLogoChanged as EventListener)
    }
  }, [endpoints?.read, session?.accessToken])

  const onPickFile = (e: React.MouseEvent) => {
    // Prevent the dropdown from treating this as an item click that would
    // close the menu before the file picker opens.
    e.preventDefault()
    e.stopPropagation()
    fileInputRef.current?.click()
  }

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !session?.accessToken || !endpoints) return

    if (!["image/png", "image/jpeg", "image/jpg"].includes(file.type)) {
      toast({
        title: t("logoMustBePngOrJpeg") || "Logo must be PNG or JPEG",
        variant: "destructive",
      })
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: t("logoTooLarge") || "Logo must be 2 MB or smaller",
        variant: "destructive",
      })
      return
    }

    setIsUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoints.logo}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.accessToken}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      const result = await res.json()
      const newUrl = result?.data?.logoUrl ?? null
      setLogoUrl(newUrl)
      window.dispatchEvent(
        new CustomEvent("employer-logo-changed", { detail: { logoUrl: newUrl } }),
      )
      toast({ title: t("logoUpdated") || "Logo updated", variant: "success" })
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setIsUploading(false)
    }
  }

  const getDropdownItems = () => {
    const items = buildItems()
    // Sub-users can't manage other users; impersonators *can* — they need to see who has
    // access to the impersonated account (e.g. Client dashboard "Users" option).
    if (isSubUser) {
      return items.filter((i) => i.href !== "/users")
    }
    return items
  }

  const buildItems = () => {
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
          // Billing entry now points at the canonical invoices list. The
          // /billing stub page is intentionally bypassed — the sidebar's
          // Billing expandable was removed so this dropdown link is the
          // sole employer-facing entry into invoices.
          { label: t("billing"), href: "/invoices", icon: CreditCard },
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
            {logoUrl ? <AvatarImage src={logoUrl} alt={getDisplayName()} className="object-contain" /> : null}
            <AvatarFallback>{getInitials()}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-56" align="end" forceMount>
        {/* User info block */}
        <div className="flex flex-col items-center py-4 border-b border-border">
          <div className="relative mb-2">
            <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex items-center justify-center">
              {isUploading ? (
                <Loader2 className="w-6 h-6 text-muted-foreground animate-spin" />
              ) : logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt={getDisplayName()}
                  className="w-full h-full object-contain p-2"
                />
              ) : (
                <Image
                  src="/placeholder.svg"
                  alt={getDisplayName()}
                  width={80}
                  height={80}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            {canUploadLogo && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={onFileChange}
                />
                <button
                  type="button"
                  onClick={onPickFile}
                  disabled={isUploading}
                  aria-label={
                    logoUrl
                      ? (t("changeLogo") || "Change logo")
                      : (t("addLogo") || "Add logo")
                  }
                  title={
                    logoUrl
                      ? (t("changeLogo") || "Change logo")
                      : (t("addLogo") || "Add logo")
                  }
                  className="absolute bottom-0 right-0 h-7 w-7 rounded-full bg-[#6B21A8] hover:bg-[#5b1d91] text-white flex items-center justify-center shadow-md ring-2 ring-white dark:ring-gray-900 transition-colors disabled:opacity-60"
                >
                  <Plus className="h-4 w-4" strokeWidth={3} />
                </button>
              </>
            )}
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
