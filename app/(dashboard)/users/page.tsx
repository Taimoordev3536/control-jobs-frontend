"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { MoreVertical, Mail, KeyRound, UserX, UserCheck, Trash2, Users, Copy, Link as LinkIcon } from "lucide-react"

import { useAuth } from "@/hooks/use-auth"
import { toast } from "@/hooks/use-toast"
import {
  SubUser,
  SubUserPermission,
  SubUserStatus,
  createSubUser,
  deleteSubUser,
  listSubUsers,
  resendInvite,
  resetSubUserPassword,
  updateSubUser,
} from "@/lib/api/sub-users"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton"

type FilterPermission = "all" | SubUserPermission
type FilterStatus = "all" | SubUserStatus

export default function UsersPage() {
  const router = useRouter()
  const { isSubUser, isAuthenticated, isLoading: authLoading } = useAuth()

  const [rows, setRows] = useState<SubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [permFilter, setPermFilter] = useState<FilterPermission>("all")
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all")

  const [createOpen, setCreateOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<SubUser | null>(null)
  const [confirm, setConfirm] = useState<{
    action: "deactivate" | "reactivate" | "remove" | "reset"
    sub: SubUser
  } | null>(null)

  // Route guard: sub-users cannot see this page.
  useEffect(() => {
    if (!authLoading && isAuthenticated && isSubUser) {
      router.replace("/dashboard")
    }
  }, [authLoading, isAuthenticated, isSubUser, router])

  const load = async () => {
    setLoading(true)
    try {
      const data = await listSubUsers()
      setRows(data)
    } catch (e: any) {
      toast({ title: "Failed to load sub-users", description: e.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isAuthenticated && !isSubUser) load()
  }, [isAuthenticated, isSubUser])

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (permFilter !== "all" && r.permission !== permFilter) return false
      if (statusFilter !== "all" && r.status !== statusFilter) return false
      if (search) {
        const s = search.toLowerCase()
        if (!r.name.toLowerCase().includes(s) && !r.email.toLowerCase().includes(s)) return false
      }
      return true
    })
  }, [rows, search, permFilter, statusFilter])

  if (isSubUser) return null

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Users</h1>
          <p className="text-sm text-muted-foreground">
            Manage team members who can access your account
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Add Sub-User</Button>
      </div>

      <div className="rounded-md border border-blue-200 bg-blue-50 px-4 py-2 text-sm text-blue-900">
        <strong>Note:</strong> invite emails aren't wired up yet. Copy the invite link from the table and send it to the person manually — they'll use it to set their password.
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={permFilter} onValueChange={(v) => setPermFilter(v as FilterPermission)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Permission" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All permissions</SelectItem>
            <SelectItem value="EDIT">Edit</SelectItem>
            <SelectItem value="VIEW_ONLY">View only</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="pending">Pending invite</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Permission</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invite link</TableHead>
              <TableHead className="w-14"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}><Skeleton className="h-6 w-full" /></TableCell>
                </TableRow>
              ))
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6}>
                  <EmptyState onAdd={() => setCreateOpen(true)} hasRows={rows.length > 0} />
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((r) => (
                <TableRow key={r.junctionId} className={r.status === "inactive" ? "opacity-60" : ""}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.email}</TableCell>
                  <TableCell><PermissionBadge value={r.permission} /></TableCell>
                  <TableCell><StatusBadge value={r.status} /></TableCell>
                  <TableCell><InviteLinkCell value={r.inviteLink} /></TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => setEditTarget(r)}>
                          Edit permission
                        </DropdownMenuItem>
                        {r.status === "pending" && (
                          <DropdownMenuItem onClick={() => setConfirm({ action: "reset", sub: r })}>
                            <Mail className="mr-2 h-4 w-4" /> Resend invite
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onClick={() => setConfirm({ action: "reset", sub: r })}>
                          <KeyRound className="mr-2 h-4 w-4" /> Reset password
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {r.isActive ? (
                          <DropdownMenuItem
                            className="text-yellow-600"
                            onClick={() => setConfirm({ action: "deactivate", sub: r })}
                          >
                            <UserX className="mr-2 h-4 w-4" /> Deactivate
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem
                            className="text-green-600"
                            onClick={() => setConfirm({ action: "reactivate", sub: r })}
                          >
                            <UserCheck className="mr-2 h-4 w-4" /> Reactivate
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          className="text-red-600"
                          onClick={() => setConfirm({ action: "remove", sub: r })}
                        >
                          <Trash2 className="mr-2 h-4 w-4" /> Remove
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <CreateSubUserDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={load}
      />

      <EditPermissionDialog
        target={editTarget}
        onClose={() => setEditTarget(null)}
        onSaved={load}
      />

      <ConfirmDialog
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onDone={load}
      />
    </div>
  )
}

function PermissionBadge({ value }: { value: SubUserPermission | null }) {
  if (value === "EDIT") return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Edit</Badge>
  if (value === "VIEW_ONLY") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">View only</Badge>
  return <Badge variant="outline">—</Badge>
}

function InviteLinkCell({ value }: { value: string | null }) {
  if (!value) return <span className="text-xs text-muted-foreground">—</span>
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value)
      toast({ title: "Invite link copied" })
    } catch {
      toast({ title: "Copy failed", variant: "destructive" })
    }
  }
  return (
    <div className="flex items-center gap-1">
      <a
        href={value}
        target="_blank"
        rel="noreferrer"
        className="max-w-[220px] truncate font-mono text-xs text-blue-600 hover:underline"
        title={value}
      >
        <LinkIcon className="mr-1 inline h-3 w-3" />
        {value.replace(/^https?:\/\//, "")}
      </a>
      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={copy} title="Copy link">
        <Copy className="h-3.5 w-3.5" />
      </Button>
    </div>
  )
}

function StatusBadge({ value }: { value: SubUserStatus }) {
  if (value === "active") return <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Active</Badge>
  if (value === "pending") return <Badge className="bg-yellow-100 text-yellow-800 hover:bg-yellow-100">Pending</Badge>
  return <Badge variant="secondary">Inactive</Badge>
}

function EmptyState({ onAdd, hasRows }: { onAdd: () => void; hasRows: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Users className="h-12 w-12 text-muted-foreground/40" />
      <h3 className="mt-4 text-lg font-medium">
        {hasRows ? "No matches" : "No sub-users yet"}
      </h3>
      <p className="mt-1 text-sm text-muted-foreground">
        {hasRows ? "Try changing your filters." : "Add team members to help manage your account."}
      </p>
      {!hasRows && (
        <Button onClick={onAdd} className="mt-4">+ Add Your First Sub-User</Button>
      )}
    </div>
  )
}

function CreateSubUserDialog({
  open, onOpenChange, onCreated,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onCreated: () => void
}) {
  const [firstName, setFirstName] = useState("")
  const [lastName, setLastName] = useState("")
  const [email, setEmail] = useState("")
  const [permission, setPermission] = useState<SubUserPermission>("EDIT")
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!open) {
      setFirstName(""); setLastName(""); setEmail(""); setPermission("EDIT")
    }
  }, [open])

  const submit = async () => {
    if (!firstName || !lastName || !email) {
      toast({ title: "Fill in all required fields", variant: "destructive" })
      return
    }
    setBusy(true)
    try {
      const res = await createSubUser({ firstName, lastName, email, permission })
      try { await navigator.clipboard.writeText(res.inviteLink) } catch {}
      toast({
        title: "Sub-user invited",
        description: "Invite link copied to clipboard. Send it to them to set their password.",
      })
      onOpenChange(false)
      onCreated()
    } catch (e: any) {
      toast({ title: "Failed to create sub-user", description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Sub-User</DialogTitle>
          <DialogDescription>Invite a team member to access your account.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>First name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Last name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Email *</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Permission level *</Label>
            <RadioGroup value={permission} onValueChange={(v) => setPermission(v as SubUserPermission)}>
              <div className="flex items-start gap-2 rounded border p-3">
                <RadioGroupItem value="EDIT" id="perm-edit" className="mt-1" />
                <label htmlFor="perm-edit" className="flex-1 cursor-pointer">
                  <div className="font-medium">Edit</div>
                  <div className="text-xs text-muted-foreground">
                    Full access — can create, update, and delete.
                  </div>
                </label>
              </div>
              <div className="flex items-start gap-2 rounded border p-3">
                <RadioGroupItem value="VIEW_ONLY" id="perm-view" className="mt-1" />
                <label htmlFor="perm-view" className="flex-1 cursor-pointer">
                  <div className="font-medium">View only</div>
                  <div className="text-xs text-muted-foreground">
                    Read-only — cannot make changes.
                  </div>
                </label>
              </div>
            </RadioGroup>
          </div>
          <p className="text-xs text-muted-foreground">
            An invitation email will be sent so they can set their password.
          </p>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button>
          <Button onClick={submit} disabled={busy}>
            {busy ? "Sending…" : "Send invite"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function EditPermissionDialog({
  target, onClose, onSaved,
}: {
  target: SubUser | null
  onClose: () => void
  onSaved: () => void
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
      toast({ title: "Permission updated" })
      onSaved()
      onClose()
    } catch (e: any) {
      toast({ title: "Failed to update", description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={!!target} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Change permission</DialogTitle>
          {target && <DialogDescription>{target.name} ({target.email})</DialogDescription>}
        </DialogHeader>
        <RadioGroup value={permission} onValueChange={(v) => setPermission(v as SubUserPermission)}>
          <div className="flex items-center gap-2 rounded border p-3">
            <RadioGroupItem value="EDIT" id="edit-perm-edit" />
            <label htmlFor="edit-perm-edit" className="cursor-pointer">Edit</label>
          </div>
          <div className="flex items-center gap-2 rounded border p-3">
            <RadioGroupItem value="VIEW_ONLY" id="edit-perm-view" />
            <label htmlFor="edit-perm-view" className="cursor-pointer">View only</label>
          </div>
        </RadioGroup>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function ConfirmDialog({
  confirm, onClose, onDone,
}: {
  confirm: { action: "deactivate" | "reactivate" | "remove" | "reset"; sub: SubUser } | null
  onClose: () => void
  onDone: () => void
}) {
  const [busy, setBusy] = useState(false)

  if (!confirm) return null
  const { action, sub } = confirm

  const copyMap: Record<"deactivate" | "reactivate" | "remove" | "reset", { title: string; desc: string; cta: string; danger?: boolean }> = {
    deactivate: {
      title: `Deactivate ${sub.name}?`,
      desc: "They will lose access immediately but can be reactivated later.",
      cta: "Deactivate",
      danger: true,
    },
    reactivate: {
      title: `Reactivate ${sub.name}?`,
      desc: "They will regain access with their previous permission.",
      cta: "Reactivate",
    },
    remove: {
      title: `Remove ${sub.name}?`,
      desc: "They will no longer be able to log in. You can invite them again later.",
      cta: "Remove",
      danger: true,
    },
    reset: {
      title: `Send password reset to ${sub.email}?`,
      desc: "They will receive a link to set a new password.",
      cta: "Send",
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
          title: "New invite link generated",
          description: "Copied to clipboard. Send it to them to set a new password.",
        })
      }
      if (action !== "reset") toast({ title: "Done" })
      onDone()
      onClose()
    } catch (e: any) {
      toast({ title: "Action failed", description: e.message, variant: "destructive" })
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
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={run}
            disabled={busy}
            className={copy.danger ? "bg-red-600 hover:bg-red-700" : ""}
          >
            {busy ? "Working…" : copy.cta}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
