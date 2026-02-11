"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { useRouter } from "next/navigation"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import AddClientModal from "@/components/add-client-modal"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

export default function ClientsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { session } = useAuth()

  const [showAddModal, setShowAddModal] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  // Map backend client data to table row format
  const mapClient = (c: any) => ({
    id: c.id?.toString() || c.clientId?.toString() || "",
    name: c.name || "-",
    locality: c.address || c.locality || "-",
    type: c.type || "-",
    responsible: c.responsible || "-",
    telephones: [c.landline, c.mobile, c.phone].filter(Boolean).join(" | ") || "-",
    asset: c.asset !== undefined ? (c.asset ? "Yes" : "No") : "No",
  })

  useEffect(() => {
    const fetchClients = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/client`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) throw new Error("Failed to fetch clients")
        const data = await res.json()
        const mappedClients = (data.data || []).map(mapClient)
        setClients(mappedClients)
      } catch (err) {
        console.error("Error fetching clients:", err)
        setClients([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchClients()
  }, [session?.accessToken])

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "locality", label: t("locality"), sortable: true },
    { key: "type", label: t("type"), sortable: true, align: "center" as const },
    { key: "responsible", label: t("responsible"), sortable: true },
    { key: "telephones", label: t("telephones"), sortable: false },
    {
      key: "asset",
      label: t("asset"),
      sortable: true,
      align: "center" as const,
      render: (value: string) => (
        <span className={`font-medium ${value === "Yes" ? "text-green-600" : "text-red-600"}`}>{value}</span>
      ),
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
      router.push(`/clients/${clientId}`)
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
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noClientsFound")}
      />

      <AddClientModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onClientAdded={(newClient) => {
          setClients((prev) => [mapClient(newClient), ...prev])
          setShowAddModal(false)
        }}
      />
    </>
  )
}