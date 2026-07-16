"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Ticket, Megaphone, CheckCircle2 } from "lucide-react"
import InvoicesIcon from "../../icons/Menu/invoices.svg"
import EmployerIcon from "../../icons/Menu/employer.svg"
import SuggestionIcon from "../../icons/Header/Sugestions.svg"
import PaymentIcon from "../../icons/new/pagos.svg"
import InviteIcon from "../../icons/Menu/Invite.svg"
import BillingIcon from "../../icons/Menu/billing.svg"
import ImportIcon from "../../icons/new/importar.svg"
import profilePlaceholder from "@/icons/Header/profilePlaceholder.png"
import { AnimatedLoader } from "@/components/animated-loader"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { apiFetch } from "@/lib/api"
import { formatLocalDate } from "@/lib/datetime"
import { AttentionCard, ActionButton, SectionLabel, ListPanel, ListRow, RowAvatar, StatusChip } from "./dashboard-widgets"

const fmtEur = (n: number) => `${(Number(n) || 0).toFixed(2)} €`

const invoiceChipCls = (s: string) =>
  s === "PAID"
    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300"
    : s === "OVERDUE"
      ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300"
      : s === "CANCELLED"
        ? "bg-muted text-muted-foreground"
        : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"

const roleChipCls: Record<string, string> = {
  partner: "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300",
  employer: "bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300",
  worker: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  client: "bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300",
  admin: "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
}

export default function AdminDashboard() {
  const { t, language } = useTranslation()
  const { session, isAuthenticated } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [running, setRunning] = useState(false)

  const { data = null, isLoading: loading } = useQuery<any>({
    queryKey: ["dashboard", "admin"],
    queryFn: async () => (await apiFetch<any>("/dashboard/admin"))?.data ?? null,
    enabled: isAuthenticated,
  })
  const load = () => queryClient.invalidateQueries({ queryKey: ["dashboard", "admin"] })

  const runMonthly = async () => {
    if (running) return
    if (!window.confirm(t("generateLastMonthConfirm") || "Generate any missing invoices, commissions and bank tasks for the previous month. This does not modify or delete already-issued invoices. Continue?")) return
    setRunning(true)
    try {
      await apiFetch<any>("/billing/run-monthly", { method: "POST" })
      toast({ title: t("monthlyCloseDone") || "Monthly close completed" })
      load()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setRunning(false)
    }
  }

  const name = (session?.user as any)?.name || "Admin"
  const localeMap: Record<string, string> = { en: "en-GB", es: "es-ES", de: "de-DE" }
  const today = new Date().toLocaleDateString(localeMap[language] || "es-ES", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  const a = data?.attention || {}

  const tiles = [
    { value: a.pendingEmployers, label: t("pendingEmployers") || "Pending employers", Icon: EmployerIcon, tone: "warn" as const, href: "/employers" },
    { value: a.openTickets, label: t("openTickets") || "Open tickets", Icon: Ticket, tone: "info" as const, href: "/support/tickets" },
    { value: a.newSuggestions, label: t("newSuggestions") || "New suggestions", Icon: SuggestionIcon, tone: "info" as const, href: "/support/suggestions" },
    { value: a.bankTasks, label: t("bankTasks") || "Bank tasks", Icon: PaymentIcon, tone: "warn" as const, href: "/utilities/banks" },
    { value: a.overdueInvoices, label: t("overdueInvoices") || "Overdue invoices", Icon: InvoicesIcon, tone: "crit" as const, href: "/invoices" },
  ]
  const totalAttention = tiles.reduce((s, x) => s + (Number(x.value) || 0), 0)

  if (loading) {
    return (
      <div className="w-full min-h-screen bg-background flex items-center justify-center">
        <AnimatedLoader />
      </div>
    )
  }

  return (
    <div className="w-full p-4 bg-background min-h-screen space-y-5">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{t("hello") || "Hello"}, {name}</h1>
        <p className="text-sm text-muted-foreground mt-0.5 capitalize">{today}</p>
      </div>

      <section className="space-y-3">
        <SectionLabel
          right={
            totalAttention === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="h-4 w-4" /> {t("allClear") || "All clear"}
              </span>
            ) : undefined
          }
        >
          {t("needsAttention") || "Needs your attention"}
        </SectionLabel>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {tiles.map((x, i) => (
            <AttentionCard key={i} value={x.value} label={x.label} Icon={x.Icon} tone={x.tone} onClick={() => router.push(x.href)} />
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <SectionLabel>{t("quickActions") || "Quick actions"}</SectionLabel>
        <div className="flex flex-wrap gap-3">
          <ActionButton primary Icon={InviteIcon} label={t("invitePartnerEmployer") || "Invite partner / employer"} onClick={() => router.push("/utilities/invite")} />
          <ActionButton Icon={BillingIcon} spinning={running} disabled={running} label={t("generateLastMonth") || "Generate last month"} onClick={runMonthly} />
          <ActionButton Icon={Megaphone} label={t("newAnnouncement") || "New announcement"} onClick={() => router.push("/announcements")} />
          <ActionButton Icon={ImportIcon} iconClassName="h-6 w-6" label={t("import") || "Import data"} onClick={() => router.push("/utilities/import")} />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ListPanel title={t("latestInvoices") || "Latest invoices"} actionLabel={t("viewAll") || "View all"} onAction={() => router.push("/invoices")}>
          {(data?.latestInvoices || []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">{t("noInvoicesAvailable") || "No invoices"}</div>
          ) : (
            (data.latestInvoices).map((inv: any) => (
              <ListRow
                key={inv.id}
                onClick={() => router.push(`/invoices/${inv.id}`)}
                avatar={<RowAvatar><InvoicesIcon className="h-5 w-5" /></RowAvatar>}
                title={inv.number}
                subtitle={`${inv.employer} · ${formatLocalDate(inv.date)}`}
                right={
                  <div className="flex items-center gap-3">
                    <StatusChip className={invoiceChipCls(inv.status)}>{inv.status}</StatusChip>
                    <div className="text-sm font-bold tabular-nums w-20 text-right">{fmtEur(inv.total)}</div>
                  </div>
                }
              />
            ))
          )}
        </ListPanel>

        <ListPanel title={t("recentSignups") || "Recent signups"}>
          {(data?.recentSignups || []).length === 0 ? (
            <div className="p-6 text-sm text-muted-foreground text-center">—</div>
          ) : (
            (data.recentSignups).map((u: any, i: number) => (
              <ListRow
                key={i}
                avatar={
                  <div className="h-10 w-10 rounded-full overflow-hidden bg-muted grid place-items-center shrink-0 border border-border">
                    <img src={u.avatar || profilePlaceholder.src} alt={u.name} className="h-full w-full object-cover" />
                  </div>
                }
                title={u.name}
                subtitle={formatLocalDate(u.at)}
                right={<StatusChip className={`capitalize ${roleChipCls[u.role] || "bg-muted text-muted-foreground"}`}>{u.role || "—"}</StatusChip>}
              />
            ))
          )}
        </ListPanel>
      </section>
    </div>
  )
}
