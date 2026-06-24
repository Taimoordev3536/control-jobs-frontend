"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect, useCallback } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

export default function AdminClientsPage() {
  const { t } = useTranslation()
  const { session } = useAuth()

  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const mapClient = (c: any) => ({
    id: c.publicId || c.id?.toString() || "",
    name: c.name || "-",
    city: c.city || "-",
    province: c.province || "-",
    type: c.type === "company" ? t("company") : c.type === "particular" ? t("particular") : c.type || "-",
    employer: c.employer || "-",
    asset: c.active === true || c.active === "true",
  })

  const fetchClients = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client/admin`, {
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
      })
      if (!res.ok) throw new Error("Failed to fetch clients")
      const data = await res.json()
      setClients((data.data || []).map(mapClient))
    } catch (err) {
      console.error("Error fetching clients:", err)
      setClients([])
    } finally {
      setIsLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

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
