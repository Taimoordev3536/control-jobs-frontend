"use client"

import { useState } from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { Plus, Filter, Ban, RotateCcw } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddEmployerModal from "@/components/add-employer-modal"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { toast } from "@/hooks/use-toast"
import { formatLocalDate } from "@/lib/datetime"
import { useBackendError } from "@/lib/backend-error"
import { apiFetch } from "@/lib/api"
import { ShowInactiveToggle } from "@/components/ui/show-inactive-toggle"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

interface PartnerEmployersTabProps {
  partnerId: string
}

export default function PartnerEmployersTab({ partnerId }: PartnerEmployersTabProps) {
  const { t } = useTranslation()
  const translateBackendError = useBackendError()
  const router = useRouter()
  const { session } = useAuth()
  const queryClient = useQueryClient()

  const [showAddModal, setShowAddModal] = useState(false)
  const [toggleTarget, setToggleTarget] = useState<any | null>(null)
  const [isToggling, setIsToggling] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  const employersKey = ["employers", "by-partner", partnerId]
  const { data: allEmployers = [], isLoading } = useQuery<any[]>({
    queryKey: employersKey,
    enabled: !!session?.accessToken && !!partnerId,
    queryFn: async () => {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employers?partnerId=${encodeURIComponent(partnerId)}`,
        {
          headers: {
            Authorization: `Bearer ${session!.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!res.ok) throw new Error("Failed to fetch employers")
      const data = await res.json()
      return (data.data || []).map((e: any) => ({
        id: e.publicId || e.id,
        name: e.name || "-",
        class: e.class || "-",
        type: e.type || "-",
        discount: e.discount || "0",
        highDate: e.createdAt ? formatLocalDate(e.createdAt) : "-",
        partner: e.partnerName || "-",
        billing: e.billing || "0 €",
        asset: e.active !== false,
      }))
    },
  })

  const inactiveCount = allEmployers.filter((e: any) => !e.asset).length
  // Two views, never mixed: the toggle swaps active for inactive.
  const employers = allEmployers.filter((e: any) =>
    showInactive ? !e.asset : e.asset,
  )

  // Modal-add prepends to the cached list directly.
  const setEmployers = (updater: (prev: any[]) => any[]) =>
    queryClient.setQueryData(employersKey, (prev: any[] = []) => updater(prev))

  const handleRowClick = (row: any) => {
    router.push(`/employers/${row.id}`)
  }

  const handleEmployerAdded = (newEmployer: any) => {
    setEmployers((prev) => [newEmployer, ...prev])
  }

  const handleToggleConfirm = async () => {
    if (!toggleTarget) return
    const next = !toggleTarget.asset

    setIsToggling(true)
    try {
      await apiFetch(
        `/employers/${toggleTarget.id}/${next ? "activate" : "deactivate"}`,
        { method: "PATCH" },
      )
      queryClient.invalidateQueries({ queryKey: ["employers"] })
      toast({
        title: t(
          next ? "employerReactivatedSuccessfully" : "employerDeactivatedSuccessfully",
        ),
        variant: "success",
      })
    } catch (err: any) {
      toast({
        title: translateBackendError(
          err,
          next ? "errorReactivatingEmployer" : "errorDeactivatingEmployer",
        ),
        variant: "destructive",
      })
    } finally {
      setIsToggling(false)
      setToggleTarget(null)
    }
  }

  const columns: any[] = [
    { key: "name", label: t("name"), sortable: true },
    { key: "class", label: t("class"), sortable: true },
    {
      key: "type",
      label: t("fee"),
      sortable: true,
    },
    {
      key: "discount",
      label: t("discount"),
      sortable: true,
      align: "center" as const,
    },
    { key: "highDate", label: t("highDate"), sortable: true },
    { key: "billing", label: t("billing"), sortable: true, align: "right" as const },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: (_value: any, row: any) => (
        <button
          onClick={(e) => {
            e.stopPropagation()
            setToggleTarget(row)
          }}
          className={`p-1.5 rounded-md text-muted-foreground transition-colors ${
            row.asset
              ? "hover:text-destructive hover:bg-destructive/10"
              : "hover:text-green-600 hover:bg-green-600/10"
          }`}
          title={t(row.asset ? "deactivate" : "reactivate")}
        >
          {row.asset ? <Ban className="w-4 h-4" /> : <RotateCcw className="w-4 h-4" />}
        </button>
      ),
    },
  ]

  const actionButtons = [
    {
      icon: Plus,
      onClick: () => setShowAddModal(true),
      title: t("addEmployerToPartner"),
      type: "add",
    },
    {
      icon: Filter,
      onClick: () => console.log("Filter clicked"),
      title: t("filter"),
      type: "filter",
    },
    {
      icon: ExcelIcon,
      onClick: () => exportToXLSX(employers, columns.filter((c: any) => c.key !== "actions"), "employers.xlsx"),
      title: t("exportExcel"),
      type: "excel",
    },
    {
      icon: CsvIcon,
      onClick: () => exportToCSV(employers, columns.filter((c: any) => c.key !== "actions"), "employers.csv"),
      title: t("exportCsv"),
      type: "csv",
    },
    {
      icon: PdfIcon,
      onClick: () => exportToPDF(employers, columns.filter((c: any) => c.key !== "actions"), "employers.pdf"),
      title: t("exportPdf"),
      type: "pdf",
    },
  ]

  return (
    <>
      <DataListTemplate
        title={t("listOfPartnerEmployers")}
        data={employers}
        columns={columns}
        toolbarExtra={
          <ShowInactiveToggle
            checked={showInactive}
            onCheckedChange={setShowInactive}
            count={inactiveCount}
            id="show-inactive-partner-employers"
          />
        }
        onRowClick={handleRowClick}
        actionButtons={actionButtons}
        emptyMessage={isLoading ? <AnimatedLoader size={32} /> : t("noEmployerDataAvailable")}
      />

      <AddEmployerModal
        open={showAddModal}
        onOpenChange={setShowAddModal}
        onEmployerAdded={handleEmployerAdded}
        defaultPartnerId={partnerId}
      />

      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(open) => !open && setToggleTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {t(
                toggleTarget?.asset
                  ? "confirmDeactivateEmployer"
                  : "confirmReactivateEmployer",
              )}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                toggleTarget?.asset
                  ? "confirmDeactivateEmployerDesc"
                  : "confirmReactivateEmployerDesc",
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isToggling}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleToggleConfirm}
              disabled={isToggling}
              className={
                toggleTarget?.asset
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-green-600 hover:bg-green-700 text-white"
              }
            >
              {t(toggleTarget?.asset ? "deactivate" : "reactivate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
