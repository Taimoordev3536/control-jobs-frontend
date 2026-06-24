"use client"

import { useTranslation } from "@/hooks/use-translation"

export default function SupportBackupPage() {
  const { t } = useTranslation()
  return (
    <div className="w-full p-6">
      <h1 className="page-title">{t("backup")}</h1>
    </div>
  )
}
