"use client"

import { useState, useEffect } from "react"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface ClientWorkerTabProps {
  clientId: string
}

export function ClientWorkerTab({ clientId }: ClientWorkerTabProps) {
  const { t } = useTranslation()
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Simulate loading - replace with actual API call when ready
    const timer = setTimeout(() => setIsLoading(false), 500)
    return () => clearTimeout(timer)
  }, [clientId])

  const columns: TabTableColumn[] = [
    { key: "name", label: t("name"), sortable: true },
    { key: "occupation", label: t("occupation"), sortable: true },
    { key: "mobile", label: t("mobile"), sortable: true },
    { key: "locality", label: t("locality"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true, align: "center" },
  ]

  // Mock data - empty as shown in screenshot
  const workers: any[] = []

  return (
    <TabTableTemplate columns={columns} data={workers} loading={isLoading} emptyMessage={t("noDataAvailableInTable")} />
  )
}
