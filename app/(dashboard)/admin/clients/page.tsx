"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

export default function AdminClientsPage() {
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()

  const { data: rawClients = [], isLoading } = useQuery<any[]>({
    queryKey: ["admin", "clients"],
    queryFn: async () => {
      const data = await apiFetch<{ data: any[] }>("/client/admin")
      return data.data || []
    },
    enabled: isAuthenticated,
  })

  // Mapping stays outside the cache so type labels re-translate on language switch.
  const clients = useMemo(
    () =>
      rawClients.map((c: any) => ({
        id: c.publicId || c.id?.toString() || "",
        name: c.name || "-",
        city: c.city || "-",
        province: c.province || "-",
        type: c.type === "company" ? t("company") : c.type === "particular" ? t("particular") : c.type || "-",
        employer: c.employer || "-",
        asset: c.active === true || c.active === "true",
      })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rawClients, t],
  )

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "city", label: t("city"), sortable: true },
    { key: "province", label: t("province"), sortable: true },
    { key: "type", label: t("type"), sortable: true, align: "left" as const },
    { key: "employer", label: t("employer"), sortable: true },
    {
      key: "asset",
      label: t("asset"),
      sortable: true,
      align: "center" as const,
      render: (value: any) => {
        const isActive = value === true
        return (
          <span className={`font-medium ${isActive ? "text-green-600" : "text-red-600"}`}>
            {isActive ? t("yeah") : t("no")}
          </span>
        )
      },
    },
  ]

  const actionButtons = [
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: t("filter"),
      type: "filter",
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(clients, columns, "clients.xlsx"),
      title: t("exportExcel"),
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(clients, columns, "clients.csv"),
      title: t("exportCsv"),
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(clients, columns, "clients.pdf"),
      title: t("exportPdf"),
      type: "pdf",
    },
  ]

  return (
    <DataListTemplate
      title={t("clientList")}
      data={clients}
      columns={columns}
      actionButtons={actionButtons}
      defaultSortColumn="name"
      defaultSortDirection="asc"
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noClientsFound")}
    />
  )
}
