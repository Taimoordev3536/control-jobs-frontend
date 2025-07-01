"use client"

import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

export default function PartnerEmployersTab() {
  const { t } = useTranslation()

  const columns: TabTableColumn[] = [
    { key: "name", label: t("name"), sortable: true },
    { key: "class", label: t("class"), sortable: true },
    { key: "fee", label: t("fee"), sortable: true, align: "right" },
    { key: "disc", label: t("discount"), sortable: true, align: "center" },
    { key: "highDate", label: t("highDate"), sortable: true },
    { key: "billing", label: t("billing"), sortable: true },
  ]

  // Sample data - replace with actual data from API
  const data: any[] = []

  return <TabTableTemplate columns={columns} data={data} emptyMessage={t("noEmployerDataAvailable")} />
}
