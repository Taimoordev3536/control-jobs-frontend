"use client"

import { useMemo } from "react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import { Plus, Filter, Printer, Landmark } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { apiFetch } from "@/lib/api"
import { formatLocalDate } from "@/lib/datetime"

const eur = (n: number) => `${(n || 0).toFixed(2).replace(".", ",")} €`

export default function CommissionsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const { session, hasRole, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const isAdmin = hasRole("admin")

  const { data = [], isLoading } = useQuery<any[]>({
    queryKey: ["commissions", "list"],
    queryFn: async () => {
      const j = await apiFetch<{ data: any[] }>("/commissions")
      return Array.isArray(j?.data) ? j.data : []
    },
    enabled: isAuthenticated,
  })

  const { data: companyName = "ControlJobs" } = useQuery<string>({
    queryKey: ["commissions", "company-name"],
    queryFn: async () => {
      const j = await apiFetch<any>("/commissions/context")
      return (j?.data || j)?.company?.name || "ControlJobs"
    },
    enabled: isAuthenticated && !isAdmin,
  })

  const statusMeta = (v: string) =>
    ({
      PENDING: { label: t("pending") || "Pendiente", color: "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300" },
      PAID: { label: t("paid") || "Pagada", color: "bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300" },
      CANCELLED: { label: t("cancelled") || "Cancelada", color: "bg-gray-200 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
    } as Record<string, { label: string; color: string }>)[v] || { label: v, color: "bg-muted text-muted-foreground" }

  const rows = useMemo(
    () =>
      data.map((a) => ({
        id: a.id,
        fecha: formatLocalDate(a.issueDate),
        number: a.autofacturaNumber,
        partner: isAdmin ? a.partnerName || "—" : companyName,
        total: eur(a.total),
        status: a.status,
      })),
    [data, isAdmin, companyName],
  )

  const columns = [
    { key: "fecha", label: t("date") || "Fecha", sortable: true, align: "center" as const, width: "130px" },
    { key: "number", label: isAdmin ? t("selfInvoiceNo") || "Nº Autofactura" : t("invoiceNo") || "Nº Factura", sortable: true, align: "center" as const, width: "180px" },
    { key: "partner", label: isAdmin ? t("partner") || "Partner" : t("denomination") || "Denominación", sortable: true, align: "left" as const },
    { key: "total", label: t("total") || "Total", sortable: true, align: "center" as const, width: "120px" },
    {
      key: "status",
      label: t("status") || "Estado",
      sortable: true,
      align: "center" as const,
      width: "120px",
      render: (v: string) => {
        const m = statusMeta(v)
        return <span className={`px-2 py-0.5 rounded text-xs font-medium ${m.color}`}>{m.label}</span>
      },
    },
  ]

  const actionButtons = [
    ...(isAdmin ? [{ icon: Plus, onClick: () => router.push("/commissions/new"), title: t("add") || "Add", type: "add" as any }] : []),
    { icon: Filter, onClick: () => {}, title: t("filter"), type: "filter" as any },
    { icon: ExcelIcon, onClick: () => exportToXLSX(rows, columns, "comisiones.xlsx"), title: t("exportExcel") || "Export Excel", type: "excel" as any },
    { icon: CsvIcon, onClick: () => exportToCSV(rows, columns, "comisiones.csv"), title: t("exportCsv") || "Export CSV", type: "csv" as any },
    { icon: PdfIcon, onClick: () => exportToPDF(rows, columns, "comisiones.pdf"), title: t("exportPdf") || "Export PDF", type: "pdf" as any },
  ]

  const downloadBatch = async (path: string, filename: string, rows: any[]) => {
    if (!rows.length) { toast({ title: t("selectAtLeastOne") || "Select at least one", variant: "destructive" }); return }
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${path}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.accessToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ publicIds: rows.map((r) => r.id) }),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const url = URL.createObjectURL(await res.blob())
      window.open(url, "_blank", "noopener,noreferrer")
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const printColumn = { key: "print", icon: Printer, title: t("printSelected") || "Imprimir seleccionadas", onAction: (sel: any[]) => downloadBatch("/commissions/bulk-pdf", "autofacturas.pdf", sel) }
  const bankColumn = { key: "bank", icon: Landmark, title: t("issuePaymentBatch") || "Órdenes de pago al banco", canSelect: (row: any) => row.status === "PENDING", onAction: (sel: any[]) => downloadBatch("/commissions/bank-batch", "ordenes-pago.pdf", sel) }
  // Partners keep print, but not the bank payment-batch column (spec p9).
  const selectionColumns = isAdmin ? [printColumn, bankColumn] : [printColumn]

  return (
    <DataListTemplate
      title={t("commissionsList") || "Lista de Comisiones"}
      data={rows}
      columns={columns}
      actionButtons={actionButtons}
      isLoading={isLoading}
      emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noCommissions") || "No commissions yet"}
      onRowClick={(row: any) => router.push(`/commissions/${row.id}`)}
      getRowId={(r: any) => r.id}
      selectionColumns={selectionColumns}
    />
  )
}
