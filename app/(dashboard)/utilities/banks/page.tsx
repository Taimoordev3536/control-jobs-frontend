"use client"

import { useTranslation } from "@/hooks/use-translation"

export default function BanksPage() {
  const { t } = useTranslation()
  return (
    <div className="w-full p-6 bg-background min-h-screen">
      <h1 className="text-2xl font-semibold text-foreground mb-2">{t("banks") || "Bancos"}</h1>
      <p className="text-sm text-muted-foreground">{t("comingSoon") || "This section is under development."}</p>
    </div>
  )
}
