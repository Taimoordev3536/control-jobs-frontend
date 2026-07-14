"use client"

import { useState, useEffect } from "react"
import { Plus, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import AddWorkCenterModal from "@/components/add-work-center-modal"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDate } from "@/lib/datetime"

interface ClientWorkCenterTabProps {
  clientId: string
}

export function ClientWorkCenterTab({ clientId }: ClientWorkCenterTabProps) {
  const { t } = useTranslation()
  const router = useRouter()
  const { session } = useAuth()

  const [workCenters, setWorkCenters] = useState<any[]>([])
  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchWorkCenters = async () => {
      if (!session?.accessToken || !clientId) return
      setIsLoading(true)
      try {
        // Use new unified endpoint with clientId filter
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers?clientId=${clientId}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          }
        )

        if (!res.ok) throw new Error("Failed to fetch work centers")
        const data = await res.json()
        const mapped = (data.data || []).map((w: any) => ({
          id: w.publicId || w.id,
          code: w.code || "",
          denomination: w.name || w.denomination || "-",
          address: w.address || "-",
          locality: w.locality || w.city || "-",
          postalCode: w.postalCode || w.zip || "-",
          employees: w.employeesCount ?? (Array.isArray(w.employees) ? w.employees.length : 0),
          established: w.establishedAt ? formatLocalDate(w.establishedAt) : "-",
          _establishedRaw: w.establishedAt || "",
        }))

        // Sort by established (most recent first)
        mapped.sort((a: any, b: any) => (b._establishedRaw > a._establishedRaw ? 1 : b._establishedRaw < a._establishedRaw ? -1 : 0))
        setWorkCenters(mapped)
      } catch (err) {
        setWorkCenters([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkCenters()
  }, [session?.accessToken, clientId])

  const handleRowClick = (row: any) => {
    console.log("Work center row clicked:", row)
    console.log("Navigating to:", `/work-centers/${row.id}`)
    router.push(`/work-centers/${row.id}`)
  }

  const columns: any[] = [
    {
      key: "denomination",
      label: t("denomination"),
      sortable: true,
      render: (value: any, row: any) => (
        <div className="flex flex-col">
          <span className="text-sm font-medium text-foreground">{value}</span>
          {row.code ? (
            <span className="text-xs text-muted-foreground">{row.code}</span>
          ) : null}
        </div>
      ),
    },
    { key: "address", label: t("address"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true, align: "center" as const },
    { key: "locality", label: t("city"), sortable: true },

  ]

  const actionButtons = [
    {
      icon: Plus,
      onClick: () => setIsAddOpen(true),
      title: t("addWorkCenter") || t("add"),
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
      onClick: () => console.log("Export Excel clicked"),
      title: t("exportExcel"),
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => console.log("Export CSV clicked"),
      title: t("exportCsv"),
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => console.log("Export PDF clicked"),
      title: t("exportPdf"),
      type: "pdf",
    },
  ]

  return (
    <>
      <DataListTemplate
        title={t("workCenters")}
        data={workCenters}
        columns={columns}
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noDataAvailableInTable")}
      />

      <AddWorkCenterModal
        open={isAddOpen}
        onOpenChange={(open) => setIsAddOpen(open)}
        onWorkCenterAdded={(wc: any) => {
          // Prepend new work center to list for immediate visibility
          setWorkCenters((prev) => [
            {
              id: wc.id,
              code: wc.code || "",
              denomination: wc.name || wc.denomination || "",
              address: wc.address || "-",
              locality: wc.locality || wc.city || "-",
              postalCode: wc.postalCode || "-",
              employees: wc.employeesCount ?? 0,
              established: wc.createdAt ? formatLocalDate(wc.createdAt) : "-",
              _establishedRaw: wc.createdAt || "",
            },
            ...prev,
          ])
        }}
      />
    </>
  )
}
