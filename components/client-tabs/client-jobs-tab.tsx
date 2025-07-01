"use client"

// import { TabTableTemplate, type TabTableColumn } from "@/components/ui/tab-table-template"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface ClientJobsTabProps {
  clientId: string
}

export function ClientJobsTab({ clientId }: ClientJobsTabProps) {
  const { t } = useTranslation()

  const columns: TabTableColumn[] = [
    { key: "denomination", label: t("denomination"), sortable: true },
    { key: "workCenters", label: t("workCenters"), sortable: true },
    { key: "workers", label: t("workers"), sortable: true },
  ]

  // Mock data - empty as shown in screenshot
  const jobs: any[] = []

  return <TabTableTemplate columns={columns} data={jobs} loading={false} emptyMessage={t("noDataAvailableInTable")} />
}
