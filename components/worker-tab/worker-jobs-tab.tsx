"use client"

import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

export function WorkerJobsTab() {
  const { t } = useTranslation()

  const columns = [
    { key: "holder", label: t("holder"), sortable: true },
    { key: "denomination", label: t("denomination"), sortable: true },
    { key: "workCenter", label: t("workCenter"), sortable: true },
  ]

  const data = [
    {
      id: 1,
      holder: "CaixaBank, SA",
      denomination: "Collections",
      workCenter: "Branch 1",
    },
  ]

  return <TabTableTemplate columns={columns} data={data} loading={false} emptyMessage={t("noJobsAvailable")} />
}
