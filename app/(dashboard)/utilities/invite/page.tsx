"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Plus, Filter, Pencil, Trash2, X } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import RedemptionDrawer from "@/components/redemption-drawer"
import BulkInvitationModal from "@/components/bulk-invitation-modal"
import TargetInvitationList from "@/components/target-invitation-list"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnimatedLoader } from "@/components/animated-loader"
import DataListTemplate, {
  ExcelIcon,
  CsvIcon,
  PdfIcon,
} from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"

interface Invitation {
  id: number
  publicId: string
  description: string
  partnerId: number
  partner?: { id: number; name: string }
  discountPercent: number
  trialDays: number
  maxRedemptions: number | null
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "REVOKED"
  expiresAt: string | null
  createdAt: string
  inviteLink?: string
  acceptedCount?: number
}

interface PartnerOption {
  id: number
  name: string
}

export default function InvitePage() {
  const { t } = useTranslation()
  const { session, hasRole, isLoading: isAuthLoading } = useAuth()
  const { toast } = useToast()

  const isAdmin = hasRole("admin")
  const isPartner = hasRole("partner")
  const isEmployer = hasRole("employer")
  const canIssue = isAdmin || isPartner || isEmployer

  // Data
  const [partners, setPartners] = useState<PartnerOption[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [drawerInvitation, setDrawerInvitation] = useState<Invitation | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingInvitation, setEditingInvitation] = useState<Invitation | null>(null)

  useEffect(() => {
    if (!isAdmin || !session?.accessToken) return
    ;(async () => {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/partners`, {
          headers: { Authorization: `Bearer ${session.accessToken}` },
        })
        if (res.ok) {
          const json = await res.json()
          setPartners((json.data || []).map((p: any) => ({ id: p.id, name: p.name })))
        }
      } catch {
        /* ignore */
      }
    })()
  }, [isAdmin, session?.accessToken])

  const fetchInvitations = async () => {
    if (!session?.accessToken) return
    // Employer-only users land in the worker/client tabs branch and don't
    // need to hit the employer-invitations endpoint (they're not allowed to).
    if (isEmployer && !isAdmin && !isPartner) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations`,
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
    setInvitations([])
    fetchInvitations()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.accessToken, isEmployer, isAdmin, isPartner])

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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations/${publicId}/revoke`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.message ||
            t("revokeFailed") ||
            "Fallo al intentar revocar",
        )
      }
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
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations/${publicId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${session?.accessToken}` },
        },
      )
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.message ||
            t("deleteFailed") ||
            "Fallo al intentar eliminar",
        )
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

  const partnerName = useMemo(() => {
    return (id: number, fallback?: string) =>
      partners.find((p) => p.id === id)?.name || fallback || `#${id}`
  }, [partners])

  // Columns used by DataListTemplate. `render` is honoured for both display
  // and search/sort/filter (the template extracts string text from the node
  // when needed) so a single column definition covers the cell + the export.
  const invitationColumns = useMemo(
    () => [
      {
        key: "description",
        label: t("description") || "Descripción",
        sortable: true,
      },
      ...(isAdmin
        ? [
            {
              key: "partner",
              label: t("partner") || "Partner",
              sortable: true,
            },
          ]
        : []),
      {
        key: "discountPercent",
        label: "% Dto.",
        align: "center" as const,
        sortable: true,
        render: (v: any) => `${Number(v)}%`,
      },
      {
        key: "trialDays",
        label: t("trial") || "Prueba",
        align: "center" as const,
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
    [t, isAdmin],
  )

  // Each row carries flat keys for the columns plus `__raw` so handlers
  // (e.g. opening the redemption drawer) can use the original object.
  const invitationRows = useMemo(
    () =>
      invitations.map((inv) => ({
        id: inv.id,
        publicId: inv.publicId,
        description: inv.description,
        partner: partnerName(inv.partnerId, inv.partner?.name),
        discountPercent: Number(inv.discountPercent),
        trialDays: inv.trialDays,
        createdAt: inv.createdAt,
        expiresAt: inv.expiresAt,
        status: inv.status,
        inviteLink: inv.inviteLink || "",
        acceptedCount: inv.acceptedCount ?? 0,
        maxRedemptions: inv.maxRedemptions,
        __raw: inv,
      })),
    [invitations, partnerName],
  )

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
          exportToXLSX(invitationRows, invitationColumns, "invitations.xls"),
        title: t("exportExcel") || "Export Excel",
        type: "excel" as const,
      },
      {
        icon: CsvIcon,
        onClick: () =>
          exportToCSV(invitationRows, invitationColumns, "invitations.csv"),
        title: t("exportCsv") || "Export CSV",
        type: "csv" as const,
      },
      {
        icon: PdfIcon,
        onClick: () =>
          exportToPDF(invitationRows, invitationColumns, "invitations.pdf"),
        title: t("exportPdf") || "Export PDF",
        type: "pdf" as const,
      },
    ],
    [t, invitationRows, invitationColumns],
  )

  if (isAuthLoading) {
    return (
      <div className="p-6">
        <AnimatedLoader />
      </div>
    )
  }

  if (!canIssue) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          {t("noAccess") || "Access denied"}
        </p>
      </div>
    )
  }

  if (isEmployer && !isAdmin && !isPartner) {
    return (
      <div className="w-full p-4">
        <h1 className="text-xl font-semibold mb-3">
          {t("invitationsList") || "Listado de invitaciones"}
        </h1>
        <Tabs defaultValue="workers" className="w-full">
          <TabsList>
            <TabsTrigger value="workers">{t("workers") || "Trabajadores"}</TabsTrigger>
            <TabsTrigger value="clients">{t("clients") || "Clientes"}</TabsTrigger>
          </TabsList>
          <TabsContent value="workers" className="mt-4">
            <TargetInvitationList target="worker" />
          </TabsContent>
          <TabsContent value="clients" className="mt-4">
            <TargetInvitationList target="client" />
          </TabsContent>
        </Tabs>
      </div>
    )
  }

  return (
    <>
      <DataListTemplate
        title={t("employerInvitations") || "Invitaciones a Empleadores"}
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

      <BulkInvitationModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={fetchInvitations}
      />

      <BulkInvitationModal
        open={!!editingInvitation}
        onOpenChange={(o) => !o && setEditingInvitation(null)}
        onCreated={fetchInvitations}
        invitation={
          editingInvitation
            ? {
                publicId: editingInvitation.publicId,
                description: editingInvitation.description,
                partnerId: editingInvitation.partnerId,
                partnerName:
                  editingInvitation.partner?.name ||
                  partnerName(editingInvitation.partnerId),
                discountPercent: Number(editingInvitation.discountPercent),
                trialDays: editingInvitation.trialDays,
                expiresAt: editingInvitation.expiresAt,
              }
            : null
        }
      />

      <RedemptionDrawer
        invitation={drawerInvitation}
        onClose={() => setDrawerInvitation(null)}
      />
    </>
  )
}
