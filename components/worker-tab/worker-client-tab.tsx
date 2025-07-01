"use client"

import TabTableTemplate from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

export function WorkerClientTab() {
  const { t } = useTranslation()

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "responsible", label: t("responsible"), sortable: true },
    { key: "mobile", label: t("mobile"), sortable: true },
    { key: "locality", label: t("locality"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true },
  ]

  const data = [
    {
      id: 1,
      name: "CaixaBank, SA",
      responsible: "José Luis Laspalas",
      mobile: "694300300",
      locality: "Alcobendas",
      postalCode: "28001",
    },
  ]

  return <TabTableTemplate columns={columns} data={data} loading={false} emptyMessage={t("noCustomersAvailable")} />
}
