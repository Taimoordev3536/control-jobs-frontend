
"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Plus, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddEmployerModal from "@/components/add-employer-modal"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import PendingEmployersTab, { type PendingItem } from "@/components/employers/pending-employers-tab"
import { useTranslation } from "@/hooks/use-translation"
import { formatLocalDate } from "@/lib/datetime"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

interface Employer {
  id: number
  name: string
  class: string
  type: string
  lack: string
  partner: string
  billing: string
}

export default function EmployersPage() {
  const { t, tEnum } = useTranslation()
  const router = useRouter()
  const { session, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const [showAddModal, setShowAddModal] = useState(false)
  const isAdmin =
    String(session?.user?.role?.name || "").toLowerCase() === "admin"
  const roleName = session?.user?.role?.name?.toLowerCase()
  const partnerId = session?.user?.partnerId

  const { data: pendingItems = [], isLoading: pendingLoading } = useQuery<PendingItem[]>({
    queryKey: ["employers", "pending"],
    queryFn: async () => {
      const j = await apiFetch<{ data: PendingItem[] }>("/employers/pending")
      return j?.data || []
    },
    enabled: isAuthenticated,
  })

  const { data: employers = [], isLoading } = useQuery<Employer[]>({
    // partnerId is in the key so a partner and an admin don't share a cache entry
    queryKey: ["employers", "list", roleName, partnerId],
    queryFn: async () => {
      const path =
        roleName === "partner" && partnerId ? `/employers?partnerId=${partnerId}` : "/employers"
      const data = await apiFetch<{ data: any[] }>(path)
      return (data.data || []).map((e: any) => ({
        id: e.publicId || e.id,
        name: e.name,
        class: e.class,
        type: e.type,
        lack: e.createdAt ? formatLocalDate(e.createdAt) : "-",
        partner: e.partnerName || "-",
        trial: typeof e.trialDaysRemaining === "number" && e.trialDaysRemaining > 0
          ? e.trialDaysRemaining
          : "—",
        billing: e.billing || "0 €",
      }))
    },
    enabled: isAuthenticated,
  })

  const loadPending = () => queryClient.invalidateQueries({ queryKey: ["employers", "pending"] })

  const handleRowClick = (row: any) => {
    const name = row?.name || ""
    router.push(`/employers/${row.id}${name ? `?name=${encodeURIComponent(name)}` : ""}`)
  }

  // Callback to handle new employer addition - adds to the beginning of the list
  const handleEmployerAdded = (newEmployer: Employer) => {
    queryClient.setQueryData(
      ["employers", "list", roleName, partnerId],
      (prev: Employer[] = []) => [newEmployer, ...prev],
    )
    queryClient.invalidateQueries({ queryKey: ["employers", "list"] })
  }

  // Define columns for employers
  const columns = [
    {
      key: "name",
      label: t("name"),
      sortable: true,
    },
    {
      key: "class",
      label: t("class"),
      sortable: true,
      render: (value: any) => tEnum("employerSubType", value),
    },
    {
      key: "type", // Show employer type name in Fee column
      label: t("fee"),
      sortable: true,
      render: (value: any) => tEnum("employerType", value),
    },
    {
      key: "partner",
      label: t("partner"),
      sortable: true,
    },
    {
      key: "trial",
      label: t("trial"),
      sortable: true,
      align: "center" as const,
      width: "90px",
    },
    {
      key: "billing",
      label: t("billing"),
      sortable: true,
      align: "right" as const,
      width: "110px",
    },
  ]

  // Define action buttons
  const actionButtons = [
  {
    icon: Plus,
    onClick: () => setShowAddModal(true),
    title: t("addEmployer"),
    type: "add", // Add this line
  },
  {
    icon: Filter,
    onClick: () => console.log("Filter clicked"),
    title: t("filter"),
    type: "filter", // Add this line
  },
  {
    icon: ExcelIcon,
    onClick: () => exportToXLSX(employers, columns, "employers.xlsx"),
    title: t("exportExcel"),
    type: "excel", // Add this line
  },
  {
    icon: CsvIcon,
    onClick: () => exportToCSV(employers, columns, "employers.csv"),
    title: t("exportCsv"),
    type: "csv", // Add this line
  },
  {
    icon: PdfIcon,
    onClick: () => exportToPDF(employers, columns, "employers.pdf"),
    title: t("exportPdf"),
    type: "pdf", // Add this line
  },
]

  return (
    <>
      <Tabs defaultValue="active" className="w-full">
        <div className="px-2 pt-2">
          <TabsList>
            <TabsTrigger value="active">{t("active")}</TabsTrigger>
            <TabsTrigger value="pending">
              {t("pending")}
              {pendingItems.length > 0 && (
                <span className="ml-2 inline-flex items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200 px-2 text-xs font-medium min-w-[1.5rem] h-5">
                  {pendingItems.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="active" className="mt-0">
          <DataListTemplate
            title={t("listOfEmployers")}
            data={employers}
            columns={columns}
            isLoading={isLoading}
            onRowClick={handleRowClick}
            actionButtons={actionButtons}
            emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noEmployersFound")}
          />
        </TabsContent>

        <TabsContent value="pending" className="mt-0">
          <PendingEmployersTab
            data={pendingItems}
            isLoading={pendingLoading}
            onRefresh={loadPending}
            isAdmin={isAdmin}
          />
        </TabsContent>
      </Tabs>

      <AddEmployerModal open={showAddModal} onOpenChange={setShowAddModal} onEmployerAdded={handleEmployerAdded} />
    </>
  )
}
