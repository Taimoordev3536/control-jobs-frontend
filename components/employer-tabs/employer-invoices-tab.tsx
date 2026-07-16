"use client"

import { useState, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import { TrendingUp } from "lucide-react"
import AddIcon1 from "@/icons/Controles/add1.svg"
import AddIcon2 from "@/icons/Controles/add2.svg"
import FilterIcon1 from "@/icons/Controles/filter1.svg"
import FilterIcon2 from "@/icons/Controles/filter2.svg"
import EmployerBillingTab from "@/components/employer-tabs/employer-billing-tab"
import AddInvoicesModal from "@/components/add-invoices-modal"
import { apiFetch } from "@/lib/api"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"

interface EmployerInvoicesTabProps {
  employerId: string
}

const isoToDmy = (iso?: string | null) => {
  if (!iso) return ""
  const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso)
}
const money = (n: any) => `${(Number(n) || 0).toFixed(2).replace(".", ",")} €`

const STATUS_BADGE: Record<string, string> = {
  PENDING: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  OVERDUE: "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400",
  PAID: "bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-400",
  CANCELLED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
  REFUNDED: "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400",
}

export default function EmployerInvoicesTab({ employerId }: EmployerInvoicesTabProps) {
  const { t, tEnum } = useTranslation()
  const { hasRole } = useAuth()
  const canCreate = hasRole("admin")
  const router = useRouter()
  const queryClient = useQueryClient()
  const [filtersVisible, setFiltersVisible] = useState(false)
  const [estimationOpen, setEstimationOpen] = useState(false)
  const [addOpen, setAddOpen] = useState(false)

  const invoicesKey = ["employer", employerId, "invoices"]
  const { data: rows = [], isLoading: loading } = useQuery<any[]>({
    queryKey: invoicesKey,
    queryFn: async () => {
      const j = await apiFetch<{ data: any[] }>(`/invoices?employerId=${encodeURIComponent(employerId)}&pageSize=100`)
      return j.data || []
    },
    enabled: !!employerId,
  })
  const fetchInvoices = () => queryClient.invalidateQueries({ queryKey: invoicesKey })

  const columns: TabTableColumn[] = [
    { key: "invoiceNumber", label: t("invoiceNo"), sortable: true },
    { key: "issueDate", label: t("date"), sortable: true, render: (v) => isoToDmy(v) },
    {
      key: "period",
      label: t("period"),
      render: (_v, r) => `${isoToDmy(r.periodStart)} - ${isoToDmy(r.periodEnd)}`,
    },
    { key: "total", label: t("total"), align: "right", sortable: true, render: (v) => money(v) },
    {
      key: "status",
      label: t("status") || "Status",
      align: "center",
      render: (v) => (
        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_BADGE[v] || "bg-gray-100 text-gray-600"}`}>
          {tEnum("invoiceStatus", v) || v}
        </span>
      ),
    },
  ]

  const btnClass = "p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
        <button className={btnClass} title={t("estimation") || "Estimation"} onClick={() => setEstimationOpen(true)}>
          <TrendingUp className="w-5 h-5" />
        </button>
        {canCreate && (
          <SvgIconButton IconDefault={AddIcon1} IconHover={AddIcon2} title={t("add") || "Add"} onClick={() => setAddOpen(true)} />
        )}
        <SvgIconButton IconDefault={FilterIcon1} IconHover={FilterIcon2} title={t("filter") || "Filter"} onClick={() => setFiltersVisible((v) => !v)} />
      </div>

      <TabTableTemplate
        columns={columns}
        data={rows}
        loading={loading}
        emptyMessage={t("noInvoiceDataAvailable")}
        onRowClick={(r) => r.publicId && router.push(`/invoices/${r.publicId}`)}
        showFilters={filtersVisible}
        onShowFiltersChange={setFiltersVisible}
      />

      <Dialog open={estimationOpen} onOpenChange={setEstimationOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <h2 className="text-base font-semibold">{t("estimation") || "Estimación"}</h2>
          </DialogHeader>
          <EmployerBillingTab employerId={employerId} />
        </DialogContent>
      </Dialog>

      <AddInvoicesModal open={addOpen} onOpenChange={setAddOpen} onCreated={fetchInvoices} />
    </div>
  )
}

function SvgIconButton({
  IconDefault,
  IconHover,
  title,
  onClick,
}: {
  IconDefault: ComponentType<{ className?: string }>
  IconHover: ComponentType<{ className?: string }>
  title: string
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={onClick}
      title={title}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"
    >
      {hovered ? <IconHover className="w-5 h-5" /> : <IconDefault className="w-5 h-5" />}
    </button>
  )
}
