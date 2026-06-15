"use client"

import { useEffect, useState, type ComponentType } from "react"
import { useRouter } from "next/navigation"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import FilterIcon1 from "@/icons/Controles/filter1.svg"
import FilterIcon2 from "@/icons/Controles/filter2.svg"
import { apiFetch } from "@/lib/api"
import { useTranslation } from "@/hooks/use-translation"

interface PartnerInvoicesTabProps {
  partnerId: string
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

export default function PartnerInvoicesTab({ partnerId }: PartnerInvoicesTabProps) {
  const { t, tEnum } = useTranslation()
  const router = useRouter()
  const [rows, setRows] = useState<any[]>([])
  const [employerNames, setEmployerNames] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [filtersVisible, setFiltersVisible] = useState(false)

  useEffect(() => {
    if (!partnerId) return
    setLoading(true)
    Promise.all([
      apiFetch<{ data: any[] }>(`/invoices?partnerId=${encodeURIComponent(partnerId)}&pageSize=100`).catch(() => ({ data: [] })),
      apiFetch<{ data: any[] }>(`/employers?partnerId=${encodeURIComponent(partnerId)}`).catch(() => ({ data: [] })),
    ])
      .then(([inv, emp]) => {
        setRows(inv.data || [])
        const map: Record<number, string> = {}
        ;(emp.data || []).forEach((e: any) => {
          map[e.id] = e.name
        })
        setEmployerNames(map)
      })
      .finally(() => setLoading(false))
  }, [partnerId])

  const columns: TabTableColumn[] = [
    {
      key: "employer",
      label: t("employer"),
      sortable: true,
      render: (_v, r) => employerNames[r.employerId] || `#${r.employerId}`,
    },
    { key: "invoiceNumber", label: t("invoiceNo"), sortable: true },
    { key: "issueDate", label: t("date"), sortable: true, render: (v) => isoToDmy(v) },
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

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2">
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
