"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { useRouter } from "next/navigation"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useMemo } from "react"
import AddClientModal from "@/components/add-client-modal"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"

export default function ClientsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)

  // Cache holds raw rows; mapping stays outside so type labels re-translate
  // when the language changes.
  const { data: rawClients = [], isLoading } = useQuery({
    queryKey: ["clients"],
    queryFn: async () => {
      const body = await apiFetch("/client")
      return body?.data || []
    },
    enabled: isAuthenticated,
  })

  const mapClient = (c: any) => ({
    id: c.publicId || c.id?.toString() || c.clientId?.toString() || "",
    name: c.name || "-",
    city: c.city || "-",
    type: c.type === "company" ? t("company") : c.type === "particular" ? t("particular") : c.type || "-",
    responsible: c.responsible || "-",
    mobile: c.mobile || "-",
    asset: c.active === true || c.active === "true",
  })

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const clients = useMemo(() => rawClients.map(mapClient), [rawClients, t])

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "city", label: t("city"), sortable: true },
    { key: "type", label: t("type"), sortable: true, align: "left" as const },
    { key: "responsible", label: t("responsible"), sortable: true },
    { key: "mobile", label: t("mobile"), sortable: false, align: "center" as const },
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

  // Define action buttons with type property
  const actionButtons = [
    {
      icon: Plus,
      onClick: () => setShowAddModal(true),
      title: t("addClient"),
      type: "add",
    },
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

  const handleRowClick = (client: any) => {
    // The DataListTemplate passes the full row object, so we need to extract the ID
    const clientId = client?.id || client
    console.log("Navigating to client ID:", clientId)

    if (clientId && clientId !== "") {
      const name = client?.name || ""
      router.push(`/clients/${clientId}${name ? `?name=${encodeURIComponent(name)}` : ""}`)
    } else {
      console.error("Client ID is missing:", client)
    }
  }

  return (
    <>
      <DataListTemplate
        title={t("clientList")}
        data={clients}
        columns={columns}
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noClientsFound")}
      />

      <AddClientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onClientAdded={(newClient) => {
          queryClient.setQueryData(["clients"], (prev: any[] = []) => [newClient, ...prev])
          queryClient.invalidateQueries({ queryKey: ["clients"] })
          setShowAddModal(false)
        }}
      />
    </>
  )
}
