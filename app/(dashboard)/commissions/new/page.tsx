"use client"

import { useRouter } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import AutofacturaForm from "@/components/autofactura-form"
import { useTranslation } from "@/hooks/use-translation"

export default function NewCommissionPage() {
  const { t } = useTranslation()
  const router = useRouter()
  return (
    <div className="w-full p-4 bg-background min-h-screen">
      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => router.back()} className="p-1 text-muted-foreground hover:text-foreground"><ArrowLeft className="h-5 w-5" /></button>
        <h1 className="text-xl font-semibold">{t("newSelfInvoice") || "Nueva autofactura"}</h1>
      </div>
      <div className="w-full overflow-x-auto">
        <AutofacturaForm mode="create" onSaved={(created) => router.push(`/commissions/${created.id}`)} onCancel={() => router.push("/commissions")} />
      </div>
    </div>
  )
}
