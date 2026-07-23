"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddWorkerModal from "@/components/add-worker-modal"
import { useRouter } from "next/navigation"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState } from "react"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { ShowInactiveToggle } from "@/components/ui/show-inactive-toggle"

// Map backend worker data to table row format
const mapWorker = (w: any) => ({
  id: w.publicId || w.id?.toString() || w.workerId?.toString() || "",
  name: w.name || w.fullName || w.workerName || "-",
  occupation: w.occupation || "-",
  telephones: w.mobile || "-",
  population: w.locality || w.city || w.address || "-",
  postalCode: w.postalCode || "-",
  asset: w.asset !== undefined ? (w.asset === "yeah" || w.asset === true) : (w.active === true || w.active === "true"),
})

export default function WorkersPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { isAuthenticated } = useAuth()
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const { data: allWorkers = [], isLoading } = useQuery({
    queryKey: ["workers"],
    queryFn: async () => {
      const body = await apiFetch("/worker")
      return (body?.data || []).map(mapWorker)
    },
    enabled: isAuthenticated,
  })

  const inactiveCount = allWorkers.filter((w: any) => !w.asset).length
  // Two views, never mixed: the toggle swaps active for inactive. Every row in
  // view then has the same status, so no status column is needed.
  const workers = allWorkers.filter((w: any) => (showInactive ? !w.asset : w.asset))

  const columns = [
    { key: "name", label: t("name"), sortable: true },
    { key: "occupation", label: t("occupation"), sortable: true },
    { key: "telephones", label: t("mobile"), sortable: true, align: "center" as const },
    { key: "population", label: t("population"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true },
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
      const name = worker?.name || ""
      router.push(`/workers/${workerId}${name ? `?name=${encodeURIComponent(name)}` : ""}`)
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
        toolbarExtra={
          <ShowInactiveToggle
            checked={showInactive}
            onCheckedChange={setShowInactive}
            count={inactiveCount}
          />
        }
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        defaultSortColumn="name"
        defaultSortDirection="asc"
        emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noWorkersFound")}
      />
      <AddWorkerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onWorkerAdded={(newWorker) => {
          queryClient.setQueryData(["workers"], (prev: any[] = []) => [mapWorker(newWorker), ...prev])
          queryClient.invalidateQueries({ queryKey: ["workers"] })
          setShowAddModal(false)
        }}
      />
    </>
  )
}
