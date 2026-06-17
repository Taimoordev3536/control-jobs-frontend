"use client"

import { useRouter } from "next/navigation"
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog"
import InvoiceForm from "@/components/invoice-form"
import { useTranslation } from "@/hooks/use-translation"

interface AddInvoicesModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

export default function AddInvoicesModal({ open, onOpenChange, onCreated }: AddInvoicesModalProps) {
  const { t } = useTranslation()
  const router = useRouter()

  const handleSubmitted = (created?: any) => {
    onCreated?.()
    onOpenChange(false)
    if (created?.publicId) router.push(`/invoices/${created.publicId}`)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-y-auto p-0">
        <DialogHeader className="sr-only">
          <h2>{t("addInvoice") || "Add invoice"}</h2>
        </DialogHeader>
        {open && (
          <InvoiceForm mode="create" onSubmitted={handleSubmitted} onCancel={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
