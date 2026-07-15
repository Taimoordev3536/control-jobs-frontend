"use client"

import { Languages } from "lucide-react"

import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { cn } from "@/lib/utils"

// Language toggle for the unauthenticated pages (login, register, invite
// signup, email verification). The header's LanguageSwitcher depends on
// dashboard-only chrome, so it can't be reused here.
export function AuthLanguageToggle({ className }: { className?: string }) {
  const { language, setLanguage, t } = useTranslation()

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setLanguage(language === "en" ? "es" : "en")}
      className={cn("text-sm text-muted-foreground", className)}
    >
      <Languages className="h-4 w-4 mr-2" />
      {t("switchToLabel")} {language === "en" ? "Español" : "English"}
    </Button>
  )
}
