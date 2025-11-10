
"use client"

import { useState, useEffect } from "react"
import { Plus, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddEmployerModal from "@/components/add-employer-modal"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface Employer {
  id: number
  name: string
  class: string
  fee: string
  lack: string
  partner: string
  billing: string
}

export default function EmployersPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { session } = useAuth()
  const [employers, setEmployers] = useState<Employer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  useEffect(() => {
    const fetchEmployers = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)
      try {
        let url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/employers`
        // If user is partner, filter by partnerId
        if (session?.user?.role?.name?.toLowerCase() === "partner" && session.user.partnerId) {
          url += `?partnerId=${session.user.partnerId}`
        }
        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) throw new Error("Failed to fetch employers")
        const data = await res.json()
        const mapped = (data.data || []).map((e: any) => ({
          id: e.id,
          name: e.name,
          class: e.class,
          type: e.type,
          fee: e.fee,
          lack: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "-",
          partner: e.partnerName || "-",
          billing: e.billing || "0 €",
        }))
        setEmployers(mapped)
      } catch (err) {
        setEmployers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchEmployers()
  }, [session?.accessToken, session?.user?.role?.name, session?.user?.partnerId])

  const handleRowClick = (employerId: number) => {
    router.push(`/employers/${employerId}`)
  }

  // Callback to handle new employer addition - adds to the beginning of the list
  const handleEmployerAdded = (newEmployer: Employer) => {
    setEmployers((prev) => [newEmployer, ...prev])
  }

  // Define columns for employers
  const columns = [
    {
      key: "name",
      label: t("name"),
      sortable: true,
    },
    {
      key: "class",
      label: t("class"),
      sortable: true,
    },
    {
      key: "type", // Show employer type name in Fee column
      label: t("fee"),
      sortable: true,
    },
    {
      key: "partner",
      label: t("partner"),
      sortable: true,
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
    onClick: () => setShowAddModal(true),
    title: t("addEmployer"),
    type: "add", // Add this line
  },
  {
    icon: Filter,
    onClick: () => console.log("Filter clicked"),
    title: t("filter"),
    type: "filter", // Add this line
  },
  {
    icon: ExcelIcon,
    onClick: () => exportToXLSX(employers, columns, "employers.xlsx"),
    title: t("exportExcel"),
    type: "excel", // Add this line
  },
  {
    icon: CsvIcon,
    onClick: () => exportToCSV(employers, columns, "employers.csv"),
    title: t("exportCsv"),
    type: "csv", // Add this line
  },
  {
    icon: PdfIcon,
    onClick: () => exportToPDF(employers, columns, "employers.pdf"),
    title: t("exportPdf"),
    type: "pdf", // Add this line
  },
]

  return (
    <>
      <DataListTemplate
        title={t("listOfEmployers")}
        data={employers}
        columns={columns}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        emptyMessage={t("noEmployersFound")}
      />

      <AddEmployerModal open={showAddModal} onOpenChange={setShowAddModal} onEmployerAdded={handleEmployerAdded} />
    </>
  )
}
