import { DataTable } from "@/components/data-table"

export default function PaymentsPage() {
  const payments = [
    { id: 1, method: "Credit Card", amount: "1,200 €", date: "2025-01-15", status: "Completed" },
    { id: 2, method: "Bank Transfer", amount: "850 €", date: "2025-02-20", status: "Pending" },
    { id: 3, method: "PayPal", amount: "2,300 €", date: "2025-03-10", status: "Completed" },
    { id: 4, method: "Credit Card", amount: "1,750 €", date: "2025-04-05", status: "Failed" },
  ]

  return (
    <div>
      <h1 className="page-title">Payments</h1>
      <DataTable
        data={payments}
        columns={[
          { key: "method", label: "Method" },
          { key: "amount", label: "Amount" },
          { key: "date", label: "Date" },
          { key: "status", label: "Status" },
        ]}
        totalRecords={4}
      />
    </div>
  )
}
