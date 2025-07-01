"use client"

// import { TabTableTemplate, type TabTableColumn } from "@/components/ui/tab-table-template"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface ClientWorkCenterTabProps {
  clientId: string
}

export function ClientWorkCenterTab({ clientId }: ClientWorkCenterTabProps) {
  const { t } = useTranslation()

  const columns: TabTableColumn[] = [
    { key: "denomination", label: t("denomination"), sortable: true },
    { key: "address", label: t("address"), sortable: true },
    { key: "locality", label: t("locality"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true, align: "center" },
  ]

  // Mock data - empty as shown in screenshot
  const workCenters: any[] = []

  return (
    <TabTableTemplate columns={columns} data={workCenters} loading={false} emptyMessage={t("noDataAvailableInTable")} />
  )
}
