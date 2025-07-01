"use client"

import { useState } from "react"
import { Plus, Filter } from "lucide-react"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import AddInvoicesModal from "@/components/add-invoices-modal"
import { useRouter } from "next/navigation"
import { useTranslation } from "@/hooks/use-translation"

export default function InvoicesPage() {
  const router = useRouter()
  const { t } = useTranslation()
  const [showAddModal, setShowAddModal] = useState(false)

  const invoices = [
    {
      id: 1,
      date: "01/12/2020",
      invoiceNo: "A00003",
      employer: "Employer 3",
      total: "£36.30",
      paid: "No",
    },
    {
      id: 2,
      date: "01/11/2020",
      invoiceNo: "A00002",
      employer: "Employer 1",
      total: "8.47 €",
      paid: "No",
    },
    {
      id: 3,
      date: "10/26/2020",
      invoiceNo: "A00001",
      employer: "Employer 1",
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
      key: "invoiceNo",
      label: t("invoiceNo"),
      sortable: true,
    },
    {
      key: "employer",
      label: t("employer"),
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
      title: "addInvoices",
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
    router.push(`/invoices/${id}`)
  }

  return (
    <>
      <DataListTemplate
        title={t("listOfInvoices")}
        data={invoices}
        columns={columns}
        actionButtons={actionButtons}
        totalRecords={3}
        emptyMessage={t("noInvoicesAvailable")}
        onRowClick={handleRowClick}
      />

      <AddInvoicesModal open={showAddModal} onOpenChange={setShowAddModal} />
    </>
  )
}
