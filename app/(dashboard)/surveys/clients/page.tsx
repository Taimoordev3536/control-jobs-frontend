"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"

export default function SurveysClientsPage() {
  const { t } = useTranslation()
  // Define columns for surveys
  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "holder", label: t("holder"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "respondent", label: t("respondent"), sortable: true },
    { key: "worth", label: t("worth"), sortable: true, align: "right" as const },
    { key: "Notification", label: t("notification"), sortable: true },
  ]

  // Define action buttons
  const actionButtons = [
    {
      icon: Plus,
      onClick: () => console.log("Add worker clicked"),
      title: t("addClient"),
    },
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: "filter",
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(dummyData, columns, "surveys-clients.xlsx"),
      title: t("exportExcel"),
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(dummyData, columns, "surveys-clients.csv"),
      title: t("exportCsv"),
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(dummyData, columns, "surveys-clients.pdf"),
      title: t("exportPdf"),
    },
  ]

  // One row of dummy data
  const dummyData = [
    {
      date: "2023-10-15",
      holder: "John Doe",
      job: "Frontend Developer",
      respondent: "Jane Smith",
      worth: "$1,200",
      notification: t("no"),
    },
  ]

  return (
    <DataListTemplate
      title={t("clients")}
      data={dummyData}
      columns={columns}
      actionButtons={actionButtons}
      emptyMessage={t("noDataAvailableInTable")}
      onRowClick={undefined}
    />
  )
}
