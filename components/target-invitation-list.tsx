"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Trash2, Plus, Filter, Pencil, X } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import RedemptionDrawer from "@/components/redemption-drawer"
import BulkSimpleInvitationModal from "@/components/bulk-simple-invitation-modal"
import { AnimatedLoader } from "@/components/animated-loader"
import DataListTemplate, {
  ExcelIcon,
  CsvIcon,
  PdfIcon,
} from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"

type Target = "worker" | "client"

interface Invitation {
  id: number
  publicId: string
  description: string
  employerId: number
  employer?: { id: number; name: string }
  maxRedemptions: number | null
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  expiresAt: string | null
  createdAt: string
  inviteLink?: string
  acceptedCount?: number
}

const RESOURCE_BY_TARGET: Record<Target, string> = {
  worker: "worker-invitations",
  client: "client-invitations",
}

const FILE_BASE_BY_TARGET: Record<Target, string> = {
  worker: "worker-invitations",
  client: "client-invitations",
}

export default function TargetInvitationList({ target }: { target: Target }) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()

  const apiPath = RESOURCE_BY_TARGET[target]

  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drawerInvitation, setDrawerInvitation] = useState<Invitation | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null)

  const fetchInvitations = async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/${apiPath}`,
        { headers: { Authorization: `Bearer ${session.accessToken}` } },
      )
      if (!res.ok) throw new Error("Failed to load")
      const json = await res.json()
      setInvitations(json.data || [])
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, apiPath])

  const copyLink = async (link?: string) => {
    if (!link) {
      toast({
        title: t("noLinkAvailable") || "No link available",
        variant: "destructive",
      })
      return
    }
    try {
      await navigator.clipboard.writeText(link)
      toast({ title: t("linkCopied") || "Link copied", variant: "success" as any })
    } catch {
      const ta = document.createElement("textarea")
      ta.value = link
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
      toast({ title: t("linkCopied") || "Link copied", variant: "success" as any })
    }
  }

  const revoke = async (publicId: string) => {
    if (!confirm(t("confirmRevoke") || "Revoke this invitation?")) return
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/${apiPath}/${publicId}/revoke`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      )
      if (!res.ok) throw new Error("Failed to revoke")
      toast({
        title: t("invitationRevoked") || "Invitation revoked",
        variant: "success" as any,
      })
      fetchInvitations()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    }
  }

  const removeInvitation = async (publicId: string) => {
    if (!confirm(t("confirmDelete") || "Delete this invitation permanently?"))
      return
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/${apiPath}/${publicId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(errJson?.message || "Failed to delete")
      }
      toast({
        title: t("invitationDeleted") || "Invitation deleted",
        variant: "success" as any,
      })
      fetchInvitations()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    }
  }

  const fmtDate = (d?: string | null) =>
    d ? new Date(d).toLocaleDateString() : "—"

  const invitationColumns = useMemo(
    () => [
      {
        key: "description",
        label: t("description") || "Descripción",
        sortable: true,
      },
      {
        key: "createdAt",
        label: t("created") || "Creación",
        sortable: true,
        render: (v: any) => fmtDate(v),
      },
      {
        key: "expiresAt",
        label: t("expires") || "Caduca",
        sortable: true,
        render: (v: any) => fmtDate(v),
      },
      {
        key: "inviteLink",
        label: t("link") || "Enlace",
        align: "center" as const,
        render: (link: any) =>
          link ? (
            <button
              onClick={() => copyLink(link)}
              title={t("copyLink") || "Copy link"}
              className="p-1 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          ) : (
            <span className="text-muted-foreground text-[10px]">—</span>
          ),
      },
      {
        key: "acceptedCount",
        label: t("accepted") || "Aceptadas",
        align: "center" as const,
        sortable: true,
        render: (_v: any, row: any) => (
          <button
            onClick={() => setDrawerInvitation(row.__raw as Invitation)}
            className="text-[#662D91] hover:underline font-medium"
            title={t("viewRedeemers") || "View redeemers"}
          >
            {row.acceptedCount ?? 0}
            {row.maxRedemptions ? ` / ${row.maxRedemptions}` : ""}
          </button>
        ),
      },
      {
        key: "actions",
        label: t("actions") || "Acciones",
        align: "right" as const,
        render: (_v: any, row: any) => {
          const inv = row.__raw as Invitation
          const isPending = inv.status === "PENDING"
          const canDelete = (inv.acceptedCount ?? 0) === 0
          return (
            <div className="flex items-center justify-end gap-1">
              {isPending && (
                <button
                  onClick={() => setEditingInvitation(inv)}
                  title={t("edit") || "Edit"}
                  className="p-1 text-muted-foreground hover:text-[#662D91] transition-colors"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {isPending && (
                <button
                  onClick={() => revoke(inv.publicId)}
                  title={t("revoke") || "Revoke"}
                  className="p-1 text-foreground hover:text-amber-600 transition-colors"
                >
                  <span className="inline-flex h-3.5 w-3.5 items-center justify-center rounded-full bg-current">
                    <X className="h-2.5 w-2.5 text-background" strokeWidth={3} />
                  </span>
                </button>
              )}
              {canDelete && (
                <button
                  onClick={() => removeInvitation(inv.publicId)}
                  title={t("delete") || "Delete"}
                  className="p-1 text-muted-foreground hover:text-red-600 transition-colors"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        },
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t],
  )

  const invitationRows = useMemo(
    () =>
      invitations.map((inv) => ({
        id: inv.id,
        publicId: inv.publicId,
        description: inv.description,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        status: inv.status,
        inviteLink: inv.inviteLink || "",
        acceptedCount: inv.acceptedCount ?? 0,
        maxRedemptions: inv.maxRedemptions,
        __raw: inv,
      })),
    [invitations],
  )

  const fileBase = FILE_BASE_BY_TARGET[target]

  const actionButtons = useMemo(
    () => [
      {
        icon: Plus,
        onClick: () => setShowCreateModal(true),
        title: t("createInvitation") || "Create invitation",
        type: "add" as const,
      },
      {
        icon: Filter,
        onClick: () => {},
        title: t("filter") || "Filter",
        type: "filter" as const,
      },
      {
        icon: ExcelIcon,
        onClick: () =>
          exportToXLSX(invitationRows, invitationColumns, `${fileBase}.xls`),
        title: t("exportExcel") || "Export Excel",
        type: "excel" as const,
      },
      {
        icon: CsvIcon,
        onClick: () =>
          exportToCSV(invitationRows, invitationColumns, `${fileBase}.csv`),
        title: t("exportCsv") || "Export CSV",
        type: "csv" as const,
      },
      {
        icon: PdfIcon,
        onClick: () =>
          exportToPDF(invitationRows, invitationColumns, `${fileBase}.pdf`),
        title: t("exportPdf") || "Export PDF",
        type: "pdf" as const,
      },
    ],
    [t, invitationRows, invitationColumns, fileBase],
  )

  const titleCreate =
    target === "worker"
      ? t("inviteWorkerTitle") || "Invite Worker"
      : t("inviteClientTitle") || "Invite Client"
  const titleEdit = t("editInvitation") || "Edit invitation"

  return (
    <>
      <DataListTemplate
        title=""
        data={invitationRows}
        columns={invitationColumns}
        isLoading={isLoading}
        actionButtons={actionButtons}
        emptyMessage={
          isLoading ? (
            <AnimatedLoader size={32} />
          ) : (
            t("noInvitesSent") || "No invitations created yet."
          )
        }
      />

      <BulkSimpleInvitationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={fetchInvitations}
        apiPath={apiPath}
        titleCreate={titleCreate}
        titleEdit={titleEdit}
      />

      <BulkSimpleInvitationModal
        open={!!editingInvitation}
        onOpenChange={(o) => !o && setEditingInvitation(null)}
        onCreated={fetchInvitations}
        apiPath={apiPath}
        titleCreate={titleCreate}
        titleEdit={titleEdit}
        invitation={
          editingInvitation
            ? {
                publicId: editingInvitation.publicId,
                description: editingInvitation.description,
                expiresAt: editingInvitation.expiresAt,
              }
            : null
        }
      />

      <RedemptionDrawer
        invitation={drawerInvitation}
        onClose={() => setDrawerInvitation(null)}
        target={target}
      />
    </>
  )
}
