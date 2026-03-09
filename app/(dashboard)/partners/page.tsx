"use client"

import { useState, useEffect } from "react"
import { Plus, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddPartnerModal from "@/components/add-partner-modal"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

export default function PartnersList() {
  const { t } = useTranslation()
  const router = useRouter()
  const { session } = useAuth()
  const [partners, setPartners] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false)

  useEffect(() => {
    const fetchPartners = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) throw new Error("Failed to fetch partners")
        const data = await res.json()
        const mapped = (data.data || []).map((p: any) => ({
          id: p.publicId || p.id,
          name: p.name,
          tier: p.partnerTier?.name || p.typeOfPartner || "-",
          createdAt: p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "-",
          employersCount: p.employersCount ?? 0,
          billing: "0 €", // Replace with real value if available
          _createdAtRaw: p.createdAt || "", // for sorting
        }))
        // Sort by createdAt descending
        mapped.sort((a, b) => (b._createdAtRaw > a._createdAtRaw ? 1 : b._createdAtRaw < a._createdAtRaw ? -1 : 0))
        setPartners(mapped)
      } catch (err) {
        setPartners([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchPartners()
  }, [session?.accessToken])

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
    setPartners((prev) => [newPartner, ...prev])
  }

  return (
    <>
      <DataListTemplate
        title={t("listOfPartners")}
        data={partners}
        columns={columns}
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noPartnersFound")}
      />

      <AddPartnerModal open={isAddPartnerModalOpen} onOpenChange={setIsAddPartnerModalOpen} onPartnerAdded={handlePartnerAdded} />
    </>
  )
}
