"use client"

import { useEffect, useMemo, useState } from "react"
import { Filter } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { useTranslation } from "@/hooks/use-translation"
import DataListTemplate, {
  ExcelIcon,
  CsvIcon,
  PdfIcon,
} from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import { AnimatedLoader } from "@/components/animated-loader"

interface InvitationLite {
  publicId: string
  description: string
  acceptedCount?: number
  maxRedemptions?: number | null
}

type RedemptionTarget = "employer" | "worker" | "client"

interface Redemption {
  id: number
  redeemedEmail: string
  redeemedAt: string
  redeemedEmployerId?: number
  redeemedEmployer?: { id: number; name: string } | null
  redeemedWorkerId?: number
  redeemedWorker?: { id: number; code?: string } | null
  redeemedUser?: { id: number; name?: string } | null
  redeemedClientId?: number
  redeemedClient?: { id: number; name: string } | null
}

const RESOURCE_BY_TARGET: Record<RedemptionTarget, string> = {
  employer: "employer-invitations",
  worker: "worker-invitations",
  client: "client-invitations",
}

export default function RedemptionDrawer({
  invitation,
  onClose,
  target = "employer",
}: {
  invitation: InvitationLite | null
  onClose: () => void
  target?: RedemptionTarget
}) {
  const { session } = useAuth()
  const { toast } = useToast()
  const { t } = useTranslation()
  const [rows, setRows] = useState<Redemption[]>([])
  // Start true so the spinner shows immediately when the drawer opens,
  // before the first fetch resolves.
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!invitation || !session?.accessToken) return
    let cancelled = false
    // Reset on every open so a stale "no redemptions" from the previous
    // invitation doesn't flash before the new fetch lands.
    setRows([])
    setLoading(true)
    ;(async () => {
      try {
        const resource = RESOURCE_BY_TARGET[target]
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/${resource}/${invitation.publicId}/redemptions`,
          { headers: { Authorization: `Bearer ${session.accessToken}` } },
        )
        if (!res.ok) throw new Error("Failed to load redemptions")
        const json = await res.json()
        if (!cancelled) setRows(json.data || [])
      } catch (e: any) {
        if (!cancelled) toast({ title: e.message, variant: "destructive" })
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [invitation, session?.accessToken, target, toast])

  const nameLabel =
    target === "worker"
      ? t("worker") || "Trabajador"
      : target === "client"
        ? t("client") || "Cliente"
        : t("employer") || "Empleador"

  const columns = useMemo(
    () => [
      {
        key: "name",
        label: nameLabel,
        sortable: true,
      },
      {
        key: "redeemedEmail",
        label: t("email") || "Email",
        sortable: true,
      },
      {
        key: "redeemedAtDisplay",
        label: t("date") || "Fecha",
        align: "center" as const,
        sortable: true,
      },
    ],
    [t, nameLabel],
  )

  const data = useMemo(
    () =>
      rows.map((r) => {
        const name =
          target === "worker"
            ? r.redeemedUser?.name ||
              r.redeemedWorker?.code ||
              `#${r.redeemedWorkerId ?? "?"}`
            : target === "client"
              ? r.redeemedClient?.name || `#${r.redeemedClientId ?? "?"}`
              : r.redeemedEmployer?.name || `#${r.redeemedEmployerId ?? "?"}`
        const d = new Date(r.redeemedAt)
        const dd = String(d.getDate()).padStart(2, "0")
        const mm = String(d.getMonth() + 1).padStart(2, "0")
        const yyyy = d.getFullYear()
        const hh = String(d.getHours()).padStart(2, "0")
        const mi = String(d.getMinutes()).padStart(2, "0")
        return {
          id: r.id,
          name,
          redeemedEmail: r.redeemedEmail,
          redeemedAtDisplay: `${dd}/${mm}/${yyyy} ${hh}:${mi}`,
        }
      }),
    [rows, target],
  )

  const fileBase = (invitation?.description || "redemptions")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "redemptions"

  const actionButtons = useMemo(
    () => [
      {
        icon: Filter,
        onClick: () => {},
        title: t("filter") || "Filter",
        type: "filter" as const,
      },
      {
        icon: ExcelIcon,
        onClick: () => exportToXLSX(data, columns, `${fileBase}.xls`),
        title: t("exportExcel") || "Export Excel",
        type: "excel" as const,
      },
      {
        icon: CsvIcon,
        onClick: () => exportToCSV(data, columns, `${fileBase}.csv`),
        title: t("exportCsv") || "Export CSV",
        type: "csv" as const,
      },
      {
        icon: PdfIcon,
        onClick: () => exportToPDF(data, columns, `${fileBase}.pdf`),
        title: t("exportPdf") || "Export PDF",
        type: "pdf" as const,
      },
    ],
    [t, data, columns, fileBase],
  )

  const open = !!invitation

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-4 pb-2 border-b border-border space-y-0.5">
          <DialogTitle className="text-base font-semibold text-foreground">
            {t("acceptedInvitations") || "Aceptadas"}
          </DialogTitle>
          {invitation && (
            <DialogDescription className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {invitation.description}
              </span>
              <span className="mx-1.5">·</span>
              {invitation.maxRedemptions
                ? `${rows.length} / ${invitation.maxRedemptions}`
                : rows.length}
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="px-3 pt-2 pb-2 [&>div]:!min-h-0 [&>div]:!p-0 [&>div]:!bg-transparent">
          <DataListTemplate
            title=""
            data={data}
            columns={columns}
            isLoading={loading}
            actionButtons={actionButtons}
            defaultSortColumn="name"
            defaultSortDirection="asc"
            emptyMessage={
              loading ? (
                <AnimatedLoader size={32} />
              ) : (
                t("noRedemptionsYet") ||
                "No one has redeemed this invitation yet."
              )
            }
            showPagination={data.length > 5}
            itemsPerPage={5}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}
