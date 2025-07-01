"use client"

// import { TabTableTemplate, type TabTableColumn } from "@/components/ui/tab-table-template"
import TabTableTemplate, { type TabTableColumn } from "@/components/ui/tab-table-template"
import { useTranslation } from "@/hooks/use-translation"

interface ClientMessagesTabProps {
  clientId: string
}

export function ClientMessagesTab({ clientId }: ClientMessagesTabProps) {
  const { t } = useTranslation()

  const columns: TabTableColumn[] = [
    { key: "message", label: t("message"), sortable: false },
    { key: "date", label: t("date"), sortable: true, align: "right" },
  ]

  // Mock data - empty as shown in screenshot
  const messages: any[] = []

  return <TabTableTemplate columns={columns} data={messages} loading={false} emptyMessage="" />
}
