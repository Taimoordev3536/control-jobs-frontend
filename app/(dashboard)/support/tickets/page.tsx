"use client"

import DataListTemplate from "@/components/ui/data-list-template"
import { useTranslation } from "@/hooks/use-translation"
import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"
import { formatLocalDateTime } from "@/lib/datetime"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export default function SupportTicketsPage() {
  const { t } = useTranslation()
  const { session, isAuthenticated } = useAuth()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selected, setSelected] = useState<any | null>(null)
  const [reply, setReply] = useState("")
  const [sending, setSending] = useState(false)

  const { data: tickets = [], isLoading } = useQuery<any[]>({
    queryKey: ["support", "tickets"],
    queryFn: async () => {
      const data = await apiFetch<{ data: any[] }>("/support/tickets")
      return (data.data || []).map((r: any) => ({
        id: r.publicId || r.id,
        publicId: r.publicId,
        date: formatLocalDateTime(r.createdAt),
        requester: r.requesterName || "-",
        role: r.requesterRole || "-",
        message: r.message || "-",
        status: r.status || "OPEN",
        response: r.response || "",
        respondedByName: r.respondedByName || "",
        respondedAt: r.respondedAt ? formatLocalDateTime(r.respondedAt) : "",
      }))
    },
    enabled: isAuthenticated,
  })

  const fetchTickets = () => queryClient.invalidateQueries({ queryKey: ["support", "tickets"] })

  const openTicket = (row: any) => {
    setSelected(row)
    setReply(row.response || "")
  }

  const sendReply = async () => {
    if (!selected?.publicId || !reply.trim() || !session?.accessToken) return
    setSending(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/support/tickets/${selected.publicId}/reply`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ response: reply.trim() }),
        },
      )
      if (!res.ok) throw new Error("Failed to send reply")
      toast({ title: t("replySent") || "Reply sent" })
      setSelected(null)
      setReply("")
      fetchTickets()
    } catch (err) {
      console.error("Error sending reply:", err)
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  const columns = [
    { key: "date", label: t("date"), sortable: true },
    { key: "requester", label: t("requester"), sortable: true },
    { key: "role", label: t("role"), sortable: true },
    { key: "message", label: t("message"), sortable: false },
    {
      key: "status",
      label: t("status"),
      sortable: true,
      align: "center" as const,
      render: (value: string) => (
        <span
          className={
            value === "ANSWERED"
              ? "text-green-600 dark:text-green-400 font-medium"
              : "text-amber-600 dark:text-amber-400 font-medium"
          }
        >
          {value === "ANSWERED" ? t("answered") || "Answered" : t("open") || "Open"}
        </span>
      ),
    },
  ]

  return (
    <>
      <DataListTemplate
        title={t("tickets")}
        data={tickets}
        columns={columns}
        defaultSortColumn="date"
        defaultSortDirection="desc"
        onRowClick={openTicket as any}
        emptyMessage={(!isAuthenticated || isLoading) ? <AnimatedLoader size={32} /> : t("noTicketsFound") || "No tickets found"}
      />

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("ticketDetail") || "Ticket detail"}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-4">
              <div className="text-sm space-y-1">
                <div>
                  <span className="text-muted-foreground">{t("requester")}: </span>
                  <span className="font-medium">{selected.requester}</span>{" "}
                  <span className="text-muted-foreground">({selected.role})</span>
                </div>
                <div className="text-muted-foreground">{selected.date}</div>
              </div>
              <div className="rounded-md border border-border bg-muted/30 p-3 text-sm whitespace-pre-wrap">
                {selected.message}
              </div>
              {selected.response && (
                <div className="text-xs text-muted-foreground">
                  {t("lastReply") || "Last reply"} · {selected.respondedByName} · {selected.respondedAt}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">{t("reply") || "Reply"}</label>
                <Textarea
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={4}
                  placeholder={t("typeYourReply") || "Type your reply..."}
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelected(null)} disabled={sending}>
              {t("cancel") || "Cancel"}
            </Button>
            <Button
              onClick={sendReply}
              disabled={sending || !reply.trim()}
              className="bg-purple-600 hover:bg-purple-700 text-white"
            >
              {sending ? t("sending") || "Sending..." : t("sendReply") || "Send reply"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
