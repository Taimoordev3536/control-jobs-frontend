


"use client"

import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import AddWorkerModal from "@/components/add-worker-modal"
import { useRouter } from "next/navigation"
import { Plus, Filter } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useState, useEffect } from "react"
import { useAuth } from "@/hooks/use-auth"

export default function WorkersPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { session } = useAuth()

  const [workers, setWorkers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)

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
        console.log("Raw API response:", data)

        // Map backend fields to frontend expectations
        const mapped = (data.data || []).map((w: any) => {
          const mappedWorker = {
            id: w.id || w.workerId || w.worker_id,
            name: w.name || w.fullName || w.workerName || `Worker ${w.id}`,
            occupation: w.occupation || "",
            telephones: w.mobile || w.landline || "",
            population: w.address || "",
            postalCode: Math.floor(10000 + Math.random() * 90000).toString(),
            asset: w.asset ? t("yeah") : t("no"),
            ...w,
          }
          console.log("Mapped worker:", mappedWorker)
          return mappedWorker
        })
        console.log("Mapped workers:", mapped)
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
    { key: "telephones", label: t("telephones"), sortable: true },
    { key: "population", label: t("population"), sortable: true },
    { key: "postalCode", label: t("postalCode"), sortable: true },
    {
      key: "asset",
      label: t("asset"),
      sortable: true,
      render: (value: string) => (
        <span className={`font-medium ${value === t("yeah") ? "text-red-600" : "text-green-600"}`}>{value}</span>
      ),
    },
  ]

  // Define action buttons
  const actionButtons = [
    {
      icon: Plus,
      onClick: () => setShowAddModal(true),
      title: t("addWorker"),
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

  const handleRowClick = (worker: any) => {
    console.log("Full worker object received:", worker)
    console.log("Worker ID:", worker?.id)
    console.log("Worker ID type:", typeof worker?.id)

    let workerId = null

    // Handle different data structures
    if (typeof worker === "object" && worker !== null) {
      workerId = worker.id || worker.workerId || worker.worker_id
    } else if (typeof worker === "string" || typeof worker === "number") {
      workerId = worker
    }

    if (!workerId) {
      console.error("Worker ID is missing:", worker)
      return
    }

    console.log("Navigating with worker ID:", workerId)
    router.push(`/workers/${workerId}`)
  }

  return (
    <>
      <DataListTemplate
        title={t("listOfWorkers")}
        data={workers}
        columns={columns}
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        emptyMessage={isLoading ? t("loading") : t("noWorkersFound")}
        totalRecords={workers.length}
        currentPage={1}
        totalPages={1}
      />
      <AddWorkerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onWorkerAdded={(newWorker) => {
          setWorkers((prev) => [
            ...prev,
            {
              ...newWorker,
              population: newWorker.address || "",
              postalCode: Math.floor(10000 + Math.random() * 90000).toString(),
            },
          ])
          setShowAddModal(false)
        }}
      />
    </>
  )
}
