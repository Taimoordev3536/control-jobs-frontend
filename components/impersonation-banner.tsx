"use client"

import { Eye, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"

export function ImpersonationBanner() {
  const { isImpersonating, user, exitImpersonation, impersonationContext } = useAuth()
  const { t } = useTranslation("impersonation")

  if (!isImpersonating) return null

  const displayName =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.name ||
    user?.email ||
    "User"

  const roleName = user?.role?.name || ""

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-[#662D91] text-white px-4 py-1.5 text-sm font-medium flex items-center justify-center gap-3 shadow-md" style={{ height: "var(--impersonation-banner-h, 34px)" }}>
      <Eye className="h-4 w-4 shrink-0 opacity-80" />
      <span className="opacity-90">
        {t("bannerText")}{" "}
        <strong className="opacity-100">{displayName}</strong>
        {roleName && (
          <span className="ml-1.5 inline-flex items-center rounded-full bg-white/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide">
            {roleName}
          </span>
        )}
      </span>
      <Button
        size="sm"
        variant="ghost"
        className="h-7 px-2.5 text-xs text-white hover:bg-white/20 hover:text-white border border-white/30 gap-1.5"
        onClick={exitImpersonation}
      >
        <LogOut className="h-3 w-3" />
        {t("bannerExit")}
      </Button>
    </div>
  )
}
