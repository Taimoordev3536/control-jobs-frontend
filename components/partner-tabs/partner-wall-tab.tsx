"use client"

import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

export default function PartnerWallTab() {
  const { t } = useTranslation()

  const columns: TabTableColumn[] = [
    { key: "name", label: t("name"), sortable: true },
    {
      key: "message",
      label: t("message"),
      sortable: false,
      render: (value: string) => (
        <div className="max-w-xs truncate" title={value}>
          {value}
        </div>
      ),
    },
    { key: "date", label: t("date"), sortable: true },
  ]

  // Sample data - replace with actual data from API
  const data: any[] = []

  return <TabTableTemplate columns={columns} data={data} emptyMessage={t("noWallMessagesAvailable")} />
}
