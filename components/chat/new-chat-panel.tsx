"use client"

import { ChangeEvent, useEffect, useMemo, useRef, useState } from "react"
import { ArrowLeft, Camera, Search, X } from "lucide-react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedLoader } from "@/components/animated-loader"
import { cn } from "@/lib/utils"
import { useChat } from "@/components/providers/chat-provider"
import { useTranslation } from "@/hooks/use-translation"
import type { ContactGroup, ParticipantType } from "@/lib/api/chat"
import { groupInitials, participantLabel } from "./chat-utils"

const MAX_GROUP_IMAGE_BYTES = 2 * 1024 * 1024
const ACCEPTED_GROUP_IMAGE_MIME = ["image/png", "image/jpeg", "image/jpg"]

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2)
  return parts.map((p) => p[0]?.toUpperCase() || "").join("") || "?"
}

interface CompactSelectItemProps {
  value: string
  className?: string
  children: React.ReactNode
}

function CompactSelectItem({ value, className, children }: CompactSelectItemProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      className={cn(
        "relative flex cursor-default select-none items-center gap-1.5 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-sidebar-accent focus:text-sidebar-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className,
      )}
    >
      <SelectPrimitive.ItemIndicator>
        <Check className="h-3.5 w-3.5 flex-shrink-0 text-[#662D91]" />
      </SelectPrimitive.ItemIndicator>
      <SelectPrimitive.ItemText asChild>
        <span className="flex min-w-0 items-center gap-2">{children}</span>
      </SelectPrimitive.ItemText>
    </SelectPrimitive.Item>
  )
}

interface NewChatPanelProps {
  mode: "direct" | "group"
  onBack: () => void
  onConversationCreated: (publicId: string) => void
}

export function NewChatPanel({ mode, onBack, onConversationCreated }: NewChatPanelProps) {
  const { t } = useTranslation()
  const { fetchContacts, startDirect, startGroup, uploadGroupImage, myScope } = useChat()
  const isPartner = myScope?.participantType === "PARTNER"
  const isAdmin = myScope?.participantType === "ADMIN"
  const isEmployer = myScope?.participantType === "EMPLOYER"

  const [contacts, setContacts] = useState<ContactGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState("")
  const [busy, setBusy] = useState(false)
  const [employerId, setEmployerId] = useState("")
  const [adminId, setAdminId] = useState("")
  const [partnerId, setPartnerId] = useState("")
  const [clientId, setClientId] = useState("")
  const [workerId, setWorkerId] = useState("")
  const [groupName, setGroupName] = useState("")
  const [groupImage, setGroupImage] = useState<File | null>(null)
  const [groupImagePreview, setGroupImagePreview] = useState<string | null>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    if (!groupImage) {
      setGroupImagePreview(null)
      return
    }
    const url = URL.createObjectURL(groupImage)
    setGroupImagePreview(url)
    return () => URL.revokeObjectURL(url)
  }, [groupImage])

  useEffect(() => {
    setLoading(true)
    setError(null)
    fetchContacts()
      .then((rows) => {
        setContacts(rows)
        const selfEmployer = rows
          .find((g) => g.type === "EMPLOYER")
          ?.items.find((it) => it.isSelf && it.publicId)
        if (selfEmployer?.publicId) setEmployerId(selfEmployer.publicId)
        const admins = rows.find((g) => g.type === "ADMIN")?.items || []
        if (admins.length === 1 && admins[0].publicId) setAdminId(admins[0].publicId)
      })
      .catch((err) => setError(err?.message || "Failed to load contacts"))
      .finally(() => setLoading(false))
  }, [fetchContacts])

  const directContacts = useMemo(
    () => contacts.map((g) => ({ ...g, items: g.items.filter((it) => !it.isSelf) })).filter((g) => g.items.length > 0),
    [contacts],
  )

  const filteredGroups = useMemo(() => {
    if (!query.trim()) return directContacts
    const q = query.toLowerCase()
    return directContacts
      .map((g) => ({ ...g, items: g.items.filter((it) => it.name.toLowerCase().includes(q)) }))
      .filter((g) => g.items.length > 0)
  }, [directContacts, query])

  const getGroup = (type: ParticipantType) => contacts.find((g) => g.type === type)?.items || []

  async function handleDirect(type: ParticipantType, publicId?: string) {
    if (type !== "ADMIN" && !publicId) return
    setBusy(true)
    try {
      const conv = await startDirect(type, publicId)
      onConversationCreated(conv.publicId)
    } finally {
      setBusy(false)
    }
  }

  function handlePickImage(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (!ACCEPTED_GROUP_IMAGE_MIME.includes(file.type)) {
      setImageError(t("groupImage") + ": PNG/JPEG")
      return
    }
    if (file.size > MAX_GROUP_IMAGE_BYTES) {
      setImageError(t("groupImage") + ": 2MB")
      return
    }
    setImageError(null)
    setGroupImage(file)
  }

  async function handleCreateGroup() {
    if (!employerId) return
    if (isPartner && !adminId) return
    if (isAdmin && !partnerId) return
    if (!isPartner && !isAdmin && (!clientId || !workerId)) return
    setBusy(true)
    try {
      const trimmedName = groupName.trim()
      const conv = await startGroup(
        isPartner
          ? {
              employerPublicId: employerId,
              adminPublicId: adminId,
              name: trimmedName || undefined,
            }
          : isAdmin
            ? {
                employerPublicId: employerId,
                partnerPublicId: partnerId,
                name: trimmedName || undefined,
              }
            : {
                employerPublicId: employerId,
                clientPublicId: clientId,
                workerPublicId: workerId,
                name: trimmedName || undefined,
              },
      )
      if (groupImage) {
        try {
          await uploadGroupImage(conv.publicId, groupImage)
        } catch {
          // Avatar upload failure is non-fatal; the group is created.
        }
      }
      onConversationCreated(conv.publicId)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex h-[54px] flex-shrink-0 items-center gap-2 border-b border-border bg-card px-3">
        <button
          onClick={onBack}
          className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          aria-label="Back"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <span className="text-sm font-semibold">
          {mode === "direct" ? t("newChat") : t("newGroup")}
        </span>
      </div>

      {mode === "direct" ? (
        <>
          <div className="flex-shrink-0 border-b border-border bg-card px-3 py-2">
            <div className="relative">
              <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t("searchConversations")}
                className="w-full rounded-md border border-border bg-background py-1.5 pl-7 pr-2 text-xs chat-caret focus:border-[#662D91] focus:outline-none"
              />
            </div>
          </div>
          <div className="chat-scrollbar min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex h-full items-center justify-center py-6">
                <AnimatedLoader size={24} />
              </div>
            ) : error ? (
              <div className="px-4 py-6 text-center text-xs text-destructive">{error}</div>
            ) : filteredGroups.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                {t("noContacts")}
              </div>
            ) : (
              filteredGroups.map((g) => (
                <div key={g.type}>
                  <div className="bg-muted/60 px-3 py-1 text-[11px] font-semibold uppercase text-muted-foreground">
                    {participantLabel(g.type)}
                  </div>
                  {g.items.map((item) => (
                    <button
                      key={`${g.type}-${item.id}`}
                      disabled={busy || (g.type !== "ADMIN" && !item.publicId)}
                      onClick={() => handleDirect(g.type, item.publicId)}
                      className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground disabled:opacity-50"
                    >
                      <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#662D91] text-xs font-semibold text-white">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          initials(item.name)
                        )}
                      </div>
                      <span className="min-w-0 flex-1 truncate">{item.name}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      ) : (
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
          {loading ? (
            <div className="flex justify-center py-4">
              <AnimatedLoader size={24} />
            </div>
          ) : error ? (
            <div className="text-center text-xs text-destructive">{error}</div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="relative flex h-14 w-14 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#662D91] text-sm font-semibold uppercase text-white"
                  aria-label={t("addGroupImage")}
                >
                  {groupImagePreview ? (
                    <img src={groupImagePreview} alt="" className="h-full w-full object-cover" />
                  ) : groupName.trim() ? (
                    <span>{groupInitials(groupName)}</span>
                  ) : (
                    <Camera className="h-5 w-5" />
                  )}
                  {groupImagePreview && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation()
                        setGroupImage(null)
                      }}
                      className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-background text-foreground shadow ring-1 ring-border"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  )}
                </button>
                <div className="flex-1 space-y-1">
                  <label className="block text-xs font-medium text-muted-foreground">
                    {t("groupName")}
                  </label>
                  <input
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    maxLength={120}
                    placeholder={t("groupNamePlaceholder")}
                    className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-[#662D91] focus:outline-none"
                  />
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg"
                  className="hidden"
                  onChange={handlePickImage}
                />
              </div>
              {imageError && (
                <div className="text-xs text-destructive">{imageError}</div>
              )}
              {!isEmployer && (
                <GroupSelect
                  label={t("selectEmployer")}
                  value={employerId}
                  options={getGroup("EMPLOYER")}
                  onChange={setEmployerId}
                />
              )}
              {isPartner && (
                <GroupSelect
                  label={t("selectAdmin")}
                  value={adminId}
                  options={getGroup("ADMIN")}
                  onChange={setAdminId}
                />
              )}
              {isAdmin && (
                <GroupSelect
                  label={t("selectPartner")}
                  value={partnerId}
                  options={getGroup("PARTNER")}
                  onChange={setPartnerId}
                />
              )}
              {!isPartner && !isAdmin && (
                <>
                  <GroupSelect
                    label={t("selectClient")}
                    value={clientId}
                    options={getGroup("CLIENT")}
                    onChange={setClientId}
                  />
                  <GroupSelect
                    label={t("selectWorker")}
                    value={workerId}
                    options={getGroup("WORKER")}
                    onChange={setWorkerId}
                  />
                </>
              )}
              <Button
                className="w-full"
                disabled={
                  busy ||
                  !employerId ||
                  (isPartner && !adminId) ||
                  (isAdmin && !partnerId) ||
                  (!isPartner && !isAdmin && (!clientId || !workerId))
                }
                onClick={handleCreateGroup}
              >
                {t("createGroup")}
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  )
}

interface GroupSelectProps {
  label: string
  value: string
  options: { id: number; name: string; publicId?: string; imageUrl?: string | null }[]
  onChange: (publicId: string) => void
  placeholder?: string
}

function ContactAvatar({ name, imageUrl }: { name: string; imageUrl?: string | null }) {
  return (
    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#662D91] text-[10px] font-semibold text-white">
      {imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={imageUrl} alt={name} className="h-full w-full object-cover" />
      ) : (
        initials(name)
      )}
    </span>
  )
}

function GroupSelect({ label, value, options, onChange, placeholder }: GroupSelectProps) {
  const selectable = options.filter((o) => !!o.publicId)
  const selected = selectable.find((o) => o.publicId === value)
  return (
    <div className="space-y-1">
      <span className="block text-xs font-medium text-muted-foreground">{label}</span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-full text-sm">
          <SelectValue placeholder={placeholder || "—"}>
            {selected && (
              <span className="flex items-center gap-2">
                <ContactAvatar name={selected.name} imageUrl={selected.imageUrl} />
                <span className="truncate">{selected.name}</span>
              </span>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent className="max-h-72 w-[var(--radix-select-trigger-width)] max-w-[var(--radix-select-trigger-width)]">
          {selectable.length === 0 ? (
            <div className="px-3 py-2 text-xs text-muted-foreground">—</div>
          ) : (
            selectable.map((o) => (
              <CompactSelectItem key={o.id} value={o.publicId!}>
                <ContactAvatar name={o.name} imageUrl={o.imageUrl} />
                <span className="truncate">{o.name}</span>
              </CompactSelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  )
}
