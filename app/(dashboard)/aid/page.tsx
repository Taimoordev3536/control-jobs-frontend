"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export default function AidPage() {
  const { t } = useTranslation()

  const helpTopics = [
    {
      id: 1,
      index: "0",
      issue: `${t("questionTest")} 1 ${t("admin")}`,
    },
    {
      id: 2,
      index: "1",
      issue: `${t("questionTest")} 2 ${t("partner")}`,
    },
    {
      id: 3,
      index: "0",
      issue: `${t("questionTest")} 1 ${t("employer")}`,
    },
  ]

  const columns = [
    {
      key: "index",
      label: t("index"),
      sortable: true,
      align: "center" as const,
    },
    {
      key: "issue",
      label: t("issue"),
      sortable: true,
    },
  ]

   // Define action buttons
   const actionButtons = [
     {
       icon: Plus,
       onClick: () => console.log("Add Aid clicked"),
        title: t("addAid"),
     },
       {
    icon: Filter,
    onClick: () => console.log("Filter clicked"),
    title: "filter", // ✅ fixed to match icon logic
  },
     {
       icon: ExcelIcon,
       onClick: () => console.log("Export Excel clicked"),
       title: t("exportExcel"),
     },
     {
       icon: CsvIcon,
       onClick: () => console.log("Export CSV clicked"),
       title: t("exportCsv"),
     },
     {
       icon: PdfIcon,
       onClick: () => console.log("Export PDF clicked"),
       title: t("exportPdf"),
     },
   ]

  const handleRowClick = (id: number) => {
    console.log("Navigate to help topic:", id)
    // Navigate to help topic detail page
  }

  return (
    <DataListTemplate
      title={t("aidCenter")}
      data={helpTopics}
      columns={columns}
      actionButtons={actionButtons}
      onRowClick={handleRowClick}
      totalRecords={3}
      emptyMessage={t("noHelpTopicsAvailable")}
    />
  )
}
