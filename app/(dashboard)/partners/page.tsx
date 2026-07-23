"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Plus, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddPartnerModal from "@/components/add-partner-modal"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDate } from "@/lib/datetime"
import { ShowInactiveToggle } from "@/components/ui/show-inactive-toggle"

export default function PartnersList() {
  const { t } = useTranslation()
  const router = useRouter()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const { data: allPartners = [], isLoading } = useQuery<any[]>({
    queryKey: ["partners", "list"],
    queryFn: async () => {
      const data = await apiFetch<{ data: any[] }>("/partners")
      const mapped = (data.data || []).map((p: any) => ({
        id: p.publicId || p.id,
        name: p.name,
        tier: p.partnerTier?.name || p.typeOfPartner || "-",
        createdAt: p.createdAt ? formatLocalDate(p.createdAt) : "-",
        employersCount: p.employersCount ?? 0,
        billing: "0 €", // Replace with real value if available
        asset: p.active !== false,
        _createdAtRaw: p.createdAt || "", // for sorting
      }))
      mapped.sort((a, b) => (b._createdAtRaw > a._createdAtRaw ? 1 : b._createdAtRaw < a._createdAtRaw ? -1 : 0))
      return mapped
    },
    enabled: isAuthenticated,
  })

  const inactiveCount = allPartners.filter((p) => !p.asset).length
  // Two views, never mixed: the toggle swaps active for inactive. Every row in
  // view then has the same status, so no status column is needed.
  const partners = allPartners.filter((p) => (showInactive ? !p.asset : p.asset))

  const handleRowClick = (row: any) => {
    const name = row?.name || ""
    router.push(`/partners/${row.id}${name ? `?name=${encodeURIComponent(name)}` : ""}`)
  }

  // Define columns for partners
  const columns = [
    {
      key: "name",
      label: t("name"),
      sortable: true,
    },
    {
      key: "tier",
      label: t("Type"),
      sortable: true,
    },
    {
      key: "createdAt",
      label: t("registered_at"),
      sortable: true,
    },
    {
      key: "employersCount",
      label: t("employers"),
      sortable: true,
      align: "center" as const,
    },
    {
      key: "billing",
      label: t("billing"),
      sortable: true,
      align: "right" as const,
    },
  ]

  // Define action buttons
  const actionButtons = [
    {
      icon: Plus,
      onClick: () => setIsAddPartnerModalOpen(true),
      title: t("addPartner"),
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
      onClick: () => exportToXLSX(partners, columns, "partners.xlsx"),
      title: t("exportExcel"),
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(partners, columns, "partners.csv"),
      title: t("exportCsv"),
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(partners, columns, "partners.pdf"),
      title: t("exportPdf"),
      type: "pdf",
    },
  ]


  // Callback to handle new partner addition
  const handlePartnerAdded = (newPartner: any) => {
    queryClient.setQueryData(["partners", "list"], (prev: any[] = []) => [newPartner, ...prev])
    queryClient.invalidateQueries({ queryKey: ["partners", "list"] })
  }

  return (
    <>
      <DataListTemplate
        title={t("listOfPartners")}
        data={partners}
        columns={columns}
        toolbarExtra={
          <ShowInactiveToggle
            checked={showInactive}
            onCheckedChange={setShowInactive}
            count={inactiveCount}
          />
        }
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noPartnersFound")}
      />

      <AddPartnerModal open={isAddPartnerModalOpen} onOpenChange={setIsAddPartnerModalOpen} onPartnerAdded={handlePartnerAdded} />
    </>
  )
}
