"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddWorkerModal from "@/components/add-worker-modal"
import { useRouter } from "next/navigation"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

export default function WorkersPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { session } = useAuth()

  const [workers, setWorkers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

  // Map backend worker data to table row format
  const mapWorker = (w: any) => ({
    id: w.id?.toString() || w.workerId?.toString() || "",
    name: w.name || w.fullName || w.workerName || "-",
    occupation: w.occupation || "-",
    telephones: [w.landline, w.mobile].filter(Boolean).join(" | ") || "-",
    population: w.locality || w.city || w.address || "-",
    postalCode: w.postalCode || "-",
    asset: w.asset === "yeah" || w.asset === true ? t("yeah") : t("no"),
  })

  useEffect(() => {
    const fetchWorkers = async () => {
      if (!session?.accessToken) return
      setIsLoading(true)
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/worker`, {
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        })
        if (!res.ok) throw new Error("Failed to fetch workers")
        const data = await res.json()
        const mapped = (data.data || []).map(mapWorker)
        setWorkers(mapped)
      } catch (err) {
        console.error("Error fetching workers:", err)
        setWorkers([])
      } finally {
        setIsLoading(false)
      }
    }
    fetchWorkers()
  }, [session?.accessToken])

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "occupation", label: t("occupation"), sortable: true },
    { key: "telephones", label: t("telephones"), sortable: true, align: "center" as const },
    { key: "population", label: t("population"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true },
    {
      key: "asset",
      label: t("asset"),
      sortable: true,
      align: "center" as const,
      render: (value: string) => (
        <span className={`font-medium ${value === t("yeah") ? "text-green-600" : "text-red-600"}`}>{value}</span>
      ),
    },
  ]

  // Define action buttons with type property
  const actionButtons = [
    {
      icon: Plus,
      onClick: () => setShowAddModal(true),
      title: t("addWorker"),
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
      onClick: () => exportToXLSX(workers, columns, "workers.xlsx"),
      title: t("exportExcel"),
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(workers, columns, "workers.csv"),
      title: t("exportCsv"),
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(workers, columns, "workers.pdf"),
      title: t("exportPdf"),
      type: "pdf",
    },
  ]

  const handleRowClick = (worker: any) => {
    const workerId = worker?.id || worker

    if (workerId && workerId !== "") {
      router.push(`/workers/${workerId}`)
    } else {
      console.error("Worker ID is missing:", worker)
    }
  }

  return (
    <>
      <DataListTemplate
        title={t("listOfWorkers")}
        data={workers}
        columns={columns}
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noWorkersFound")}
      />
      <AddWorkerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onWorkerAdded={(newWorker) => {
          setWorkers((prev) => [mapWorker(newWorker), ...prev])
          setShowAddModal(false)
        }}
      />
    </>
  )
}