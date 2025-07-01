"use client"

import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

export function WorkerMessageTab() {
  const { t } = useTranslation()

  const columns = [
    { key: "message", label: t("message"), sortable: true },
    { key: "date", label: t("date"), sortable: true },
  ]

  const data: any[] = []

  return <TabTableTemplate columns={columns} data={data} loading={false} emptyMessage={t("noMessagesAvailable")} />
}
