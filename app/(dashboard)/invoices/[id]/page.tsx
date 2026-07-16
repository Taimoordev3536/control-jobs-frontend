"use client"

import { useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowLeft, CheckCircle2, XCircle, Trash2, Pencil } from "lucide-react"
import PdfIconDefault from "@/icons/Controles/pdf1.svg"
import PdfIconHover from "@/icons/Controles/pdf2.svg"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"
import { apiFetch, apiFetchRaw } from "@/lib/api"
import InvoiceForm from "@/components/invoice-form"

export default function InvoiceDetailPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const { id: publicId } = useParams() as { id: string }
  const { session, hasRole } = useAuth()
  const queryClient = useQueryClient()
  const { toast } = useToast()
  // Mark-paid + cancel are admin-only operations (accounting actions).
  const canManage = hasRole("admin")

  const [isActing, setIsActing] = useState(false)
  const [pdfHovered, setPdfHovered] = useState(false)
  const [editData, setEditData] = useState<any | null>(null)

  const { data: invoice = null, isLoading } = useQuery<any | null>({
    queryKey: ["invoices", "detail", publicId],
    queryFn: async () => (await apiFetch<{ data: any }>(`/invoices/${publicId}`))?.data ?? null,
    enabled: !!session?.accessToken && !!publicId,
  })
  // Reused by mark-paid / cancel / saveEdit to refresh after an action.
  const fetchInvoice = () => queryClient.invalidateQueries({ queryKey: ["invoices", "detail", publicId] })

  const markPaid = async () => {
    if (!invoice || !session?.accessToken) return
    setIsActing(true)
    try {
      await apiFetch(`/invoices/${invoice.publicId}/mark-paid`, { method: "POST" })
      toast({ title: t("markedAsPaid") || "Marked as paid", variant: "success" as any })
      fetchInvoice()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setIsActing(false)
    }
  }

  const cancelInvoice = async () => {
    if (!invoice || !session?.accessToken) return
    if (!confirm(t("confirmCancelInvoice") || "Cancel this invoice?")) return
    setIsActing(true)
    try {
      await apiFetch(`/invoices/${invoice.publicId}/cancel`, { method: "POST" })
      toast({ title: t("invoiceCancelled") || "Invoice cancelled", variant: "success" as any })
      fetchInvoice()
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setIsActing(false)
    }
  }

  const deleteInvoice = async () => {
    if (!invoice || !session?.accessToken) return
    if (!confirm(t("confirmDeleteInvoice") || "Delete this invoice permanently? This cannot be undone.")) return
    setIsActing(true)
    try {
      await apiFetch(`/invoices/${invoice.publicId}`, { method: "DELETE" })
      toast({ title: t("invoiceDeleted") || "Invoice deleted", variant: "success" as any })
      router.push("/invoices")
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
      setIsActing(false)
    }
  }

  const openEdit = async () => {
    if (!invoice || !session?.accessToken) return
    try {
      const json = await apiFetch<{ data: any }>(`/invoices/${invoice.publicId}/edit`)
      setEditData(json.data)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const saveEdit = async (payload: any) => {
    if (!invoice) return
    setIsActing(true)
    try {
      await apiFetch(`/invoices/${invoice.publicId}`, { method: "PATCH", body: payload })
      toast({ title: t("invoiceUpdated") || "Invoice updated", variant: "success" as any })
      setEditData(null)
      fetchInvoice()
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setIsActing(false)
    }
  }

  const downloadPdf = async () => {
    if (!invoice || !session?.accessToken) return
    try {
      const res = await apiFetchRaw(`/invoices/${invoice.publicId}/pdf`)
      if (!res.ok) throw new Error("Failed to load PDF")
      const blob = await res.blob()
      const objectUrl = URL.createObjectURL(blob)
      window.open(objectUrl, "_blank")
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  if (isLoading) {
    return <AnimatedLoader />
  }
  if (!invoice) {
    return (
      <div className="bg-background min-h-screen p-12 text-center">
        <p className="text-sm text-muted-foreground">{t("noData") || "No data"}</p>
      </div>
    )
  }

  return (
    <div className="bg-background min-h-[calc(100vh-60px)] w-full pb-16">
      <div className="bg-card border-b border-border">
        <div className="grid grid-cols-3 items-center px-4 pt-1 pb-1 sm:px-3">
          <h1 className="text-sm sm:text-base font-semibold text-foreground truncate">
            {invoice.invoiceNumber}
          </h1>
          <span className="text-sm sm:text-base font-medium text-foreground text-center">
            {t("invoices")}
          </span>
          <div className="flex justify-end">
            <button
              onClick={() => router.back()}
              className="p-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 px-3 sm:px-4 py-2 border-t border-border bg-gray-100 dark:bg-gray-800">
          <button
            onClick={downloadPdf}
            title="PDF"
            onMouseEnter={() => setPdfHovered(true)}
            onMouseLeave={() => setPdfHovered(false)}
            className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors"
          >
            {pdfHovered ? <PdfIconHover className="w-5 h-5" /> : <PdfIconDefault className="w-5 h-5" />}
          </button>
          {canManage && invoice.status === "PENDING" && !invoice.isManual && !editData && (
            <button
              onClick={openEdit}
              disabled={isActing}
              title={t("edit") || "Edit"}
              className="p-1.5 text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950 rounded-md transition-colors disabled:opacity-50"
            >
              <Pencil className="w-5 h-5" />
            </button>
          )}
          {canManage && invoice.status === "PENDING" && (
            <button
              onClick={markPaid}
              disabled={isActing}
              title={t("markAsPaid") || "Mark as paid"}
              className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950 rounded-md transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-5 h-5" />
            </button>
          )}
          {canManage && invoice.status !== "CANCELLED" && invoice.status !== "PAID" && (
            <button
              onClick={cancelInvoice}
              disabled={isActing}
              title={t("cancel") || "Cancel"}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors disabled:opacity-50"
            >
              <XCircle className="w-5 h-5" />
            </button>
          )}
          {canManage && invoice.status === "PENDING" && invoice.isLastInvoice && (
            <button
              onClick={deleteInvoice}
              disabled={isActing}
              title={t("delete") || "Delete"}
              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        {editData ? (
          <InvoiceForm mode="edit" invoice={editData} onSave={saveEdit} generating={isActing} onCancel={() => setEditData(null)} />
        ) : (
          <InvoiceForm mode="view" invoice={invoice} allowMethodEdit={canManage} onMethodChanged={fetchInvoice} />
        )}
      </div>
    </div>
  )
}
