"use client";

import DataListTemplate, {
  ExcelIcon,
  CsvIcon,
  PdfIcon,
} from "@/components/ui/data-list-template";
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export";
import { Plus, Filter } from "lucide-react";
import { useTranslation } from "@/hooks/use-translation";

export default function SurveysPage() {
  const { t } = useTranslation();

  // Define columns for surveys
  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "holder", label: t("holder"), sortable: true },
    { key: "job", label: t("job"), sortable: true },
    { key: "respondent", label: t("respondent"), sortable: true },
    {
      key: "worth",
      label: t("worth"),
      sortable: true,
      align: "right" as const,
    },
    { key: "Notification", label: t("notification"), sortable: true },
  ];

  // Define action buttons
  const actionButtons = [
    {
      icon: Plus, // First button (Add)
      onClick: () => console.log("Add survey clicked"),
      title: t("addSurvey"),
    },
     {
    icon: Filter,
    onClick: () => console.log("Filter clicked"),
    title: "filter", // ✅ fixed to match icon logic
  },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(dummyData, columns, "surveys.xlsx"),
      title: t("exportExcel"),
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(dummyData, columns, "surveys.csv"),
      title: t("exportCsv"),
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(dummyData, columns, "surveys.pdf"),
      title: t("exportPdf"),
    },
  ];

  // One row of dummy data
  const dummyData = [
    {
      date: "2023-10-15",
      holder: "John Doe",
      job: "Frontend Developer",
      respondent: "Jane Smith",
      worth: "$1,200",
      notification: "/",
    },
  ];

  return (
    <DataListTemplate
      title={t("surveys")}
      data={dummyData}
      columns={columns}
      actionButtons={actionButtons}
      emptyMessage={t("noDataAvailableInTable")}
      onRowClick={undefined}
    />
  );
}
