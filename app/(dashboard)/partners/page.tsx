"use client"

import { useState, useEffect } from "react"
import { Plus, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import AddPartnerModal from "@/components/add-partner-modal"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

export default function PartnersList() {
  const { t } = useTranslation()
  const router = useRouter()
  const { session } = useAuth()
  const [partners, setPartners] = useState<any[]>([])
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false)

  useEffect(() => {
    const fetchPartners = async () => {
      if (!session?.accessToken) return
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
          id: p.id,
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
      }
    }
    fetchPartners()
  }, [session?.accessToken])

  const handleRowClick = (partnerId: number) => {
    router.push(`/partners/${partnerId}`)
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
    },
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: "filter",
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
        emptyMessage="No partners found"
      />

      <AddPartnerModal open={isAddPartnerModalOpen} onOpenChange={setIsAddPartnerModalOpen} onPartnerAdded={handlePartnerAdded} />
    </>
  )
}
