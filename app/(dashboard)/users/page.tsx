"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Plus, Filter, MoreVertical, Mail, KeyRound, UserX, UserCheck, Trash2, Copy, Link as LinkIcon, Pencil } from "lucide-react"

import DataListTemplate from "@/components/ui/data-list-template"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import {
  SubUser,
  SubUserPermission,
  SubUserStatus,
  createSubUser,
  deleteSubUser,
  listSubUsers,
  resetSubUserPassword,
  updateSubUser,
} from "@/lib/api/sub-users"

export default function UsersPage() {
  const router = useRouter()
  const { t } = useTranslation("sub-user")
  const { isSubUser, isAuthenticated, isLoading: authLoading } = useAuth()

  const [rows, setRows] = useState<SubUser[]>([])
  const [loading, setLoading] = useState(true)

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SubUser | null>(null)
  const [confirm, setConfirm] = useState<{
    action: "deactivate" | "reactivate" | "remove" | "reset"
    sub: SubUser
  } | null>(null)

  useEffect(() => {
    if (!authLoading && isAuthenticated && isSubUser) {
      router.replace("/dashboard")
    }
  }, [authLoading, isAuthenticated, isSubUser, router])

  const load = async () => {
    setLoading(true)
    try {
      setRows(await listSubUsers())
    } catch (e: any) {
      toast({ title: t("toastLoadFailed"), description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && !isSubUser) load()
  }, [isAuthenticated, isSubUser])

  const columns = useMemo(
    () => [
      { key: "name", label: t("colName"), sortable: true },
      { key: "email", label: t("colEmail"), sortable: true },
      {
        key: "permission",
        label: t("colPermission"),
        sortable: true,
        align: "center" as const,
        render: (value: SubUserPermission | null) => <PermissionBadge value={value} t={t} />,
      },
      {
        key: "status",
        label: t("colStatus"),
        sortable: true,
        align: "center" as const,
        render: (value: SubUserStatus) => <StatusBadge value={value} t={t} />,
      },
      {
        key: "inviteLink",
        label: t("colInviteLink"),
        render: (value: string | null) => <InviteLinkCell value={value} t={t} />,
      },
      {
        key: "_actions",
        label: "",
        align: "right" as const,
        render: (_: any, row: SubUser) => (
          <RowActions
            row={row}
            onEdit={() => setEditTarget(row)}
            onConfirm={(action) => setConfirm({ action, sub: row })}
            t={t}
          />
        ),
      },
    ],
    [t],
  )

  const actionButtons = useMemo(
    () => [
      {
        icon: Plus,
        onClick: () => setCreateOpen(true),
        title: t("addSubUser"),
        type: "add" as const,
      },
      {
        icon: Filter,
        onClick: () => {},
        title: t("filter"),
        type: "filter" as const,
      },
    ],
    [t],
  )

  if (isSubUser) return null

  return (
    <>
      <DataListTemplate
        title={t("pageTitle")}
        data={rows}
        columns={columns}
        isLoading={loading}
        actionButtons={actionButtons}
        emptyMessage={t("noSubUsers")}
      />

      <CreateSubUserDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={load} t={t} />
      <EditPermissionDialog target={editTarget} onClose={() => setEditTarget(null)} onSaved={load} t={t} />
      <ConfirmDialog confirm={confirm} onClose={() => setConfirm(null)} onDone={load} t={t} />
    </>
  )
}

type TranslateFn = (key: string, params?: Record<string, any>) => string

function PermissionBadge({ value, t }: { value: SubUserPermission | null; t: TranslateFn }) {
  if (value === "EDIT") {
    return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">{t("permissionEdit")}</Badge>
  }
  if (value === "VIEW_ONLY") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">{t("permissionViewOnly")}</Badge>
  }
  return <Badge variant="outline">—</Badge>
}

function StatusBadge({ value, t }: { value: SubUserStatus; t: TranslateFn }) {
  if (value === "active") {
    return <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-emerald-200">{t("statusActive")}</Badge>
  }
  if (value === "pending") {
    return <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-amber-200">{t("statusPending")}</Badge>
  }
  return <Badge className="bg-slate-100 text-slate-600 hover:bg-slate-100 border-slate-200">{t("statusInactive")}</Badge>
}

function InviteLinkCell({ value, t }: { value: string | null; t: TranslateFn }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>
  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: t("toastInviteCopied") })
    } catch {
      toast({ title: t("toastCopyFailed"), variant: "destructive" })
    }
  }
  return (
    <div className="flex items-center gap-1.5">
      <LinkIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="max-w-[240px] truncate font-mono text-xs text-[#662D91] hover:underline"
        title={value}
      >
        {value.replace(/^https?:\/\//, "")}
      </a>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy} title={t("toastInviteCopied")}>
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function RowActions({
  row, onEdit, onConfirm, t,
}: {
  row: SubUser
  onEdit: () => void
  onConfirm: (action: "deactivate" | "reactivate" | "remove" | "reset") => void
  t: TranslateFn
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-full hover:bg-muted"
          onClick={(e) => e.stopPropagation()}
        >
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={4}
        className="min-w-[8rem] w-auto rounded-md border border-border p-0.5 shadow-md"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenuItem
          onClick={onEdit}
          className="gap-2 rounded px-2 py-1.5 text-xs focus:bg-[#662D91]/10 focus:text-[#662D91]"
        >
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("actionEditPermission")}</span>
        </DropdownMenuItem>
        {row.status === "pending" && (
          <DropdownMenuItem
            onClick={() => onConfirm("reset")}
            className="gap-2 rounded px-2 py-1.5 text-xs focus:bg-[#662D91]/10 focus:text-[#662D91]"
          >
            <Mail className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{t("actionResendInvite")}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onConfirm("reset")}
          className="gap-2 rounded px-2 py-1.5 text-xs focus:bg-[#662D91]/10 focus:text-[#662D91]"
        >
          <KeyRound className="h-3.5 w-3.5 text-muted-foreground" />
          <span>{t("actionResetPassword")}</span>
        </DropdownMenuItem>

        <DropdownMenuSeparator className="my-0.5" />

        {row.isActive ? (
          <DropdownMenuItem
            onClick={() => onConfirm("deactivate")}
            className="gap-2 rounded px-2 py-1.5 text-xs text-amber-700 focus:bg-amber-50 focus:text-amber-800"
          >
            <UserX className="h-3.5 w-3.5" />
            <span>{t("actionDeactivate")}</span>
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem
            onClick={() => onConfirm("reactivate")}
            className="gap-2 rounded px-2 py-1.5 text-xs text-emerald-700 focus:bg-emerald-50 focus:text-emerald-800"
          >
            <UserCheck className="h-3.5 w-3.5" />
            <span>{t("actionReactivate")}</span>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => onConfirm("remove")}
          className="gap-2 rounded px-2 py-1.5 text-xs text-red-600 focus:bg-red-50 focus:text-red-700"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span>{t("actionRemove")}</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function CreateSubUserDialog({
  open, onOpenChange, onCreated, t,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
  t: TranslateFn
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<SubUserPermission>("EDIT")
  const [busy, setBusy] = useState(false)
  const [errors, setErrors] = useState({ firstName: false, lastName: false, email: false })

  useEffect(() => {
    if (!open) {
      setFirstName(""); setLastName(""); setEmail(""); setPermission("EDIT")
      setErrors({ firstName: false, lastName: false, email: false })
    }
  }, [open])

  const isValidEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const submit = async () => {
    const newErrors = {
      firstName: !firstName,
      lastName: !lastName,
      email: !email || !isValidEmail(email),
    }
    setErrors(newErrors)
    if (newErrors.firstName || newErrors.lastName || newErrors.email) return

    setBusy(true)
    try {
      const res = await createSubUser({ firstName, lastName, email, permission })
      try { await navigator.clipboard.writeText(res.inviteLink) } catch {}
      toast({
        title: t("toastSubUserInvited"),
        description: t("toastSubUserInvitedDesc"),
      })
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast({ title: t("toastCreateFailed"), description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 gap-0 max-h-[90vh] flex flex-col bg-background border-border mx-4">
        <DialogHeader className="p-4 sm:p-6 pb-4 space-y-2">
          <DialogTitle className="text-lg font-semibold text-foreground text-center tracking-tight">
            {t("createTitle")}
          </DialogTitle>
          <p className="text-sm text-muted-foreground text-center">
            {t("createSubtitle")}
          </p>
        </DialogHeader>

        <div className="px-4 sm:px-6 pb-6 flex-1 overflow-y-auto">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="firstName" className="text-sm font-medium text-foreground">
                  {t("firstNameLabel")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  value={firstName}
                  onChange={(e) => { setFirstName(e.target.value); setErrors((p) => ({ ...p, firstName: false })) }}
                  className={`mt-1 ${errors.firstName ? "border-red-500" : ""}`}
                />
                {errors.firstName && <p className="mt-1 text-xs text-red-500">{t("fieldRequired")}</p>}
              </div>
              <div>
                <Label htmlFor="lastName" className="text-sm font-medium text-foreground">
                  {t("lastNameLabel")} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="lastName"
                  value={lastName}
                  onChange={(e) => { setLastName(e.target.value); setErrors((p) => ({ ...p, lastName: false })) }}
                  className={`mt-1 ${errors.lastName ? "border-red-500" : ""}`}
                />
                {errors.lastName && <p className="mt-1 text-xs text-red-500">{t("fieldRequired")}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="subEmail" className="text-sm font-medium text-foreground">
                {t("emailLabel")} <span className="text-red-500">*</span>
              </Label>
              <Input
                id="subEmail"
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: false })) }}
                placeholder={t("emailPlaceholder")}
                className={`mt-1 ${errors.email ? "border-red-500" : ""}`}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">
                  {!email ? t("fieldRequired") : t("invalidEmail")}
                </p>
              )}
            </div>

            <div>
              <Label className="text-sm font-medium text-foreground">
                {t("permissionLevelLabel")} <span className="text-red-500">*</span>
              </Label>
              <RadioGroup
                value={permission}
                onValueChange={(v) => setPermission(v as SubUserPermission)}
                className="mt-2 space-y-2"
              >
                <label
                  htmlFor="perm-edit"
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                    permission === "EDIT" ? "border-[#662D91] bg-[#662D91]/5" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <RadioGroupItem value="EDIT" id="perm-edit" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t("editOptionTitle")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t("editOptionDesc")}
                    </div>
                  </div>
                </label>
                <label
                  htmlFor="perm-view"
                  className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                    permission === "VIEW_ONLY" ? "border-[#662D91] bg-[#662D91]/5" : "border-border hover:bg-muted/40"
                  }`}
                >
                  <RadioGroupItem value="VIEW_ONLY" id="perm-view" className="mt-0.5" />
                  <div className="flex-1">
                    <div className="text-sm font-medium">{t("viewOnlyOptionTitle")}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {t("viewOnlyOptionDesc")}
                    </div>
                  </div>
                </label>
              </RadioGroup>
            </div>

            <p className="text-xs text-muted-foreground">
              {t("inviteLinkNotice")}
            </p>

            <div className="flex flex-col sm:flex-row justify-between pt-2 gap-3">
              <Button
                onClick={() => onOpenChange(false)}
                disabled={busy}
                className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto"
              >
                {t("cancel")}
              </Button>
              <Button
                onClick={submit}
                disabled={busy}
                className="text-white px-6 w-full sm:w-auto"
                style={{ backgroundColor: "#662D91" }}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#551A80")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#662D91")}
              >
                {busy ? t("sending") : t("sendInvite")}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function EditPermissionDialog({
  target, onClose, onSaved, t,
}: {
  target: SubUser | null
  onClose: () => void
  onSaved: () => void
  t: TranslateFn
}) {
  const [permission, setPermission] = useState<SubUserPermission>("EDIT")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (target) setPermission(target.permission === "VIEW_ONLY" ? "VIEW_ONLY" : "EDIT")
  }, [target])

  const save = async () => {
    if (!target) return
    setBusy(true)
    try {
      await updateSubUser(target.id, { permission })
      toast({ title: t("toastPermissionUpdated") })
      onSaved()
      onClose()
    } catch (e: any) {
      toast({ title: t("toastUpdateFailed"), description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm sm:max-w-md p-0 gap-0 bg-background border-border mx-4">
        <DialogHeader className="p-4 sm:p-6 pb-4 space-y-2">
          <DialogTitle className="text-lg font-semibold text-foreground text-center tracking-tight">
            {t("editPermissionTitle")}
          </DialogTitle>
          {target && (
            <p className="text-sm text-muted-foreground text-center">
              {target.name} — {target.email}
            </p>
          )}
        </DialogHeader>
        <div className="px-4 sm:px-6 pb-6 space-y-4">
          <RadioGroup
            value={permission}
            onValueChange={(v) => setPermission(v as SubUserPermission)}
            className="space-y-2"
          >
            <label
              htmlFor="edit-perm-edit"
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                permission === "EDIT" ? "border-[#662D91] bg-[#662D91]/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="EDIT" id="edit-perm-edit" className="mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium">{t("editOptionTitle")}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("editOptionDesc")}
                </div>
              </div>
            </label>
            <label
              htmlFor="edit-perm-view"
              className={`flex items-start gap-3 rounded-md border p-3 cursor-pointer transition ${
                permission === "VIEW_ONLY" ? "border-[#662D91] bg-[#662D91]/5" : "border-border hover:bg-muted/40"
              }`}
            >
              <RadioGroupItem value="VIEW_ONLY" id="edit-perm-view" className="mt-0.5" />
              <div className="flex-1">
                <div className="text-sm font-medium">{t("viewOnlyOptionTitle")}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {t("viewOnlyOptionDesc")}
                </div>
              </div>
            </label>
          </RadioGroup>

          <div className="flex flex-col sm:flex-row justify-between pt-2 gap-3">
            <Button
              onClick={onClose}
              disabled={busy}
              className="bg-neutral-500 hover:bg-neutral-600 text-white px-6 w-full sm:w-auto"
            >
              {t("cancel")}
            </Button>
            <Button
              onClick={save}
              disabled={busy}
              className="text-white px-6 w-full sm:w-auto"
              style={{ backgroundColor: "#662D91" }}
              onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#551A80")}
              onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "#662D91")}
            >
              {busy ? t("saving") : t("save")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({
  confirm, onClose, onDone, t,
}: {
  confirm: { action: "deactivate" | "reactivate" | "remove" | "reset"; sub: SubUser } | null
  onClose: () => void
  onDone: () => void
  t: TranslateFn
}) {
  const [busy, setBusy] = useState(false)
  if (!confirm) return null
  const { action, sub } = confirm

  const copyMap: Record<"deactivate" | "reactivate" | "remove" | "reset", { title: string; desc: string; cta: string; danger?: boolean }> = {
    deactivate: {
      title: t("deactivateTitle", { name: sub.name }),
      desc: t("deactivateDesc"),
      cta: t("deactivateCta"),
      danger: true,
    },
    reactivate: {
      title: t("reactivateTitle", { name: sub.name }),
      desc: t("reactivateDesc"),
      cta: t("reactivateCta"),
    },
    remove: {
      title: t("removeTitle", { name: sub.name }),
      desc: t("removeDesc"),
      cta: t("removeCta"),
      danger: true,
    },
    reset: {
      title: t("resetTitle", { email: sub.email }),
      desc: t("resetDesc"),
      cta: t("resetCta"),
    },
  }
  const copy = copyMap[action]

  const run = async () => {
    setBusy(true)
    try {
      if (action === "deactivate") await updateSubUser(sub.id, { isActive: false })
      else if (action === "reactivate") await updateSubUser(sub.id, { isActive: true })
      else if (action === "remove") await deleteSubUser(sub.id)
      else if (action === "reset") {
        const res = await resetSubUserPassword(sub.id)
        try { await navigator.clipboard.writeText(res.inviteLink) } catch {}
        toast({
          title: t("toastNewInviteGenerated"),
          description: t("toastNewInviteDesc"),
        })
      }
      if (action !== "reset") toast({ title: t("toastDone") })
      onDone()
      onClose()
    } catch (e: any) {
      toast({ title: t("toastActionFailed"), description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <AlertDialog open={!!confirm} onOpenChange={(v) => !v && onClose()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{copy.title}</AlertDialogTitle>
          <AlertDialogDescription>{copy.desc}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={run}
            disabled={busy}
            className={copy.danger ? "bg-red-600 hover:bg-red-700" : "bg-[#662D91] hover:bg-[#4f2270]"}
          >
            {busy ? t("working") : copy.cta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
