"use client"

import { useState } from "react"
import { Plus, Filter } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { useRouter } from "next/navigation"
import AddCommissionModal from "@/components/add-invoices-modal"
import { useTranslation } from "@/hooks/use-translation"

export default function CommissionsPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [showAddModal, setShowAddModal] = useState(false)

  const commissions = [
    {
      id: 1,
      date: "01/15/2021",
      selfInvoiceNo: "A00003",
      partner: "Employer 3",
      total: "£36.30",
      paid: "No",
    },
    {
      id: 2,
      date: "01/14/2021",
      selfInvoiceNo: "A00002",
      partner: "Employer 1",
      total: "8.47 €",
      paid: "No",
    },
    {
      id: 3,
      date: "01/13/2021",
      selfInvoiceNo: "A00001",
      partner: "Employer 1",
      total: "8.47 €",
      paid: "No",
    },
  ]

  const columns = [
    {
      key: "date",
      label: t("date"),
      sortable: true,
    },
    {
      key: "selfInvoiceNo",
      label: t("selfInvoiceNo"),
      sortable: true,
    },
    {
      key: "partner",
      label: t("partner"),
      sortable: true,
    },
    {
      key: "total",
      label: t("total"),
      sortable: true,
      align: "right" as const,
    },
    {
      key: "paid",
      label: t("paid"),
      sortable: true,
      align: "center" as const,
    },
  ]

  const actionButtons = [
    {
      icon: Plus,
     onClick: () => setShowAddModal(true),
      title: "addCommission",
    },
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: "filter",
    },
    {
      icon: CsvIcon,
      onClick: () => console.log("Export CSV"),
      title: "Export CSV",
    },
    {
      icon: ExcelIcon,
      onClick: () => console.log("Export Excel"),
      title: "Export Excel",
    },
    {
      icon: PdfIcon,
      onClick: () => console.log("Export PDF"),
      title: "Export PDF",
    },
  ]

  const handleRowClick = (id: number) => {
    router.push(`/commissions/${id}`)
  }

  return (
    <>
    <DataListTemplate
      title={t("listOfCommissions")}
      data={commissions}
      columns={columns}
      actionButtons={actionButtons}
      totalRecords={3}
      emptyMessage={t("noCommissionsAvailable")}
      onRowClick={handleRowClick}
    />

    <AddCommissionModal open={showAddModal} onOpenChange={setShowAddModal} />
    </>
  )
}
