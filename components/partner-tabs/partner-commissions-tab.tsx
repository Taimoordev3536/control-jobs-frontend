"use client"

import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

export default function PartnerCommissionsTab() {
  const { t } = useTranslation()

  const columns: TabTableColumn[] = [
    { key: "date", label: t("date"), sortable: true },
    { key: "invoiceNo", label: t("invoiceNo"), sortable: true },
    { key: "concept", label: t("concept"), sortable: true },
    { key: "total", label: t("total"), sortable: true, align: "right" },
    { key: "paid", label: t("paid"), sortable: true, align: "center" },
  ]

  // Sample data - replace with actual data from API
  const data: any[] = []

  return <TabTableTemplate columns={columns} data={data} emptyMessage={t("noCommissionDataAvailable")} />
}
