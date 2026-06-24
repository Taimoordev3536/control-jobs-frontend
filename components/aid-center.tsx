"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export default function AidCenter() {
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

  const actionButtons = [
    {
      icon: Plus,
      onClick: () => console.log("Add Aid clicked"),
      title: t("addAid"),
    },
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: "filter",
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(helpTopics, columns, "aid.xlsx"),
      title: t("exportExcel"),
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(helpTopics, columns, "aid.csv"),
      title: t("exportCsv"),
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(helpTopics, columns, "aid.pdf"),
      title: t("exportPdf"),
    },
  ]

  const handleRowClick = (id: number) => {
    console.log("Navigate to help topic:", id)
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
