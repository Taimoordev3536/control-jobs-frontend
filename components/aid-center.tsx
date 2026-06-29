"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import DataListTemplate from "@/components/ui/data-list-template"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"

interface Faq {
  publicId: string
  question: string
  answer: string
  audience: string
  sortOrder: number
}

const AUDIENCES = ["ALL", "ADMIN", "PARTNER", "EMPLOYER", "CLIENT", "WORKER"]

const emptyForm = { publicId: "", question: "", answer: "", audience: "ALL", sortOrder: 0 }

export default function AidCenter() {
  const { t } = useTranslation()
  const { session, getUserRole } = useAuth()
  const { toast } = useToast()
  const isAdmin = getUserRole() === "admin"
  const [faqs, setFaqs] = useState<Faq[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [viewing, setViewing] = useState<Faq | null>(null)
  const [form, setForm] = useState({ ...emptyForm })
  const [saving, setSaving] = useState(false)

  const apiBase = process.env.NEXT_PUBLIC_API_BASE_URL
  const authHeaders = useCallback(
    (json = false) => ({
      ...(json ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${session?.accessToken}`,
    }),
    [session?.accessToken],
  )

  const fetchFaqs = useCallback(async () => {
    if (!session?.accessToken) return
    setIsLoading(true)
    try {
      const res = await fetch(`${apiBase}/faqs`, { headers: authHeaders() })
      if (!res.ok) throw new Error("Failed to fetch FAQs")
      const data = await res.json()
      setFaqs(Array.isArray(data) ? data : data.data || [])
    } catch (err) {
      console.error("Error fetching FAQs:", err)
      setFaqs([])
    } finally {
      setIsLoading(false)
    }
  }, [apiBase, authHeaders, session?.accessToken])

  useEffect(() => {
    fetchFaqs()
  }, [fetchFaqs])

  // Non-admins only see FAQs targeted at everyone or at their own role.
  const visibleFaqs = useMemo(() => {
    if (isAdmin) return faqs
    const role = (getUserRole() || "").toUpperCase()
    return faqs.filter((f) => f.audience === "ALL" || f.audience === role)
  }, [faqs, isAdmin, getUserRole])

  const openNew = () => {
    setForm({ ...emptyForm })
    setDialogOpen(true)
  }

  const openEdit = (row: any) => {
    setForm({
      publicId: row.publicId,
      question: row.question,
      answer: row.answer,
      audience: row.audience || "ALL",
      sortOrder: row.sortOrder || 0,
    })
    setDialogOpen(true)
  }

  const save = async () => {
    if (!form.question.trim() || !form.answer.trim()) {
      toast({ title: t("questionAndAnswerRequired") || "Question and answer are required" })
      return
    }
    setSaving(true)
    try {
      const isEdit = !!form.publicId
      const res = await fetch(`${apiBase}/faqs${isEdit ? `/${form.publicId}` : ""}`, {
        method: isEdit ? "PUT" : "POST",
        headers: authHeaders(true),
        body: JSON.stringify({
          question: form.question.trim(),
          answer: form.answer.trim(),
          audience: form.audience,
          sortOrder: Number(form.sortOrder) || 0,
        }),
      })
      if (!res.ok) throw new Error("Failed to save FAQ")
      toast({ title: t("savedSuccessfully") || "Saved successfully" })
      setDialogOpen(false)
      fetchFaqs()
    } catch (err) {
      console.error("Error saving FAQ:", err)
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const remove = async () => {
    if (!form.publicId) return
    if (!window.confirm(t("confirmDeleteFaq") || "Delete this FAQ?")) return
    setSaving(true)
    try {
      const res = await fetch(`${apiBase}/faqs/${form.publicId}`, {
        method: "DELETE",
        headers: authHeaders(),
      })
      if (!res.ok) throw new Error("Failed to delete FAQ")
      toast({ title: t("deletedSuccessfully") || "Deleted successfully" })
      setDialogOpen(false)
      fetchFaqs()
    } catch (err) {
      console.error("Error deleting FAQ:", err)
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    } finally {
      setSaving(false)
    }
  }

  const audienceLabel = (a: string) => (a === "ALL" ? t("allUsers") || "All" : t(a.toLowerCase()) || a)

  const columns = [
    { key: "question", label: t("question") || "Question", sortable: true },
    {
      key: "answer",
      label: t("answer") || "Answer",
      sortable: false,
      render: (v: string) => <span className="line-clamp-2">{v}</span>,
    },
    ...(isAdmin
      ? [
          {
            key: "audience",
            label: t("audience") || "Audience",
            sortable: true,
            align: "center" as const,
            render: (v: string) => audienceLabel(v),
          },
        ]
      : []),
  ]

  const actionButtons = isAdmin
    ? [{ icon: Plus, onClick: openNew, title: t("addAid") || "Add", type: "add" as const }]
    : []

  return (
    <>
      <DataListTemplate
        title={t("aidCenter") || "Help"}
        data={visibleFaqs}
        columns={columns}
        actionButtons={actionButtons}
        onRowClick={(isAdmin ? openEdit : (row: any) => setViewing(row)) as any}
        getRowId={(r: any) => r.publicId}
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noHelpTopicsAvailable") || "No help topics yet"}
      />

      {/* Read-only view (non-admins) */}
      <Dialog open={!!viewing} onOpenChange={(o) => !o && setViewing(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewing?.question}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-foreground whitespace-pre-wrap">{viewing?.answer}</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>
              {t("close") || "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Admin create/edit */}
      {isAdmin && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{form.publicId ? t("editFaq") || "Edit FAQ" : t("addFaq") || "Add FAQ"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("question") || "Question"}</Label>
                <Input value={form.question} onChange={(e) => setForm((p) => ({ ...p, question: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium">{t("answer") || "Answer"}</Label>
                <Textarea rows={4} value={form.answer} onChange={(e) => setForm((p) => ({ ...p, answer: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("audience") || "Audience"}</Label>
                  <Select value={form.audience} onValueChange={(v) => setForm((p) => ({ ...p, audience: v }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AUDIENCES.map((a) => (
                        <SelectItem key={a} value={a}>
                          {audienceLabel(a)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">{t("order") || "Order"}</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((p) => ({ ...p, sortOrder: Number(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="flex sm:justify-between">
              {form.publicId ? (
                <Button variant="outline" onClick={remove} disabled={saving} className="gap-2 text-red-600 border-red-200 hover:bg-red-50">
                  <Trash2 className="h-4 w-4" />
                  {t("delete") || "Delete"}
                </Button>
              ) : (
                <span />
              )}
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
                  {t("cancel") || "Cancel"}
                </Button>
                <Button onClick={save} disabled={saving} className="bg-purple-600 hover:bg-purple-700 text-white">
                  {saving ? t("saving") || "Saving..." : t("save") || "Save"}
                </Button>
              </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  )
}
