"use client"

import { useState, useEffect } from "react"
import { Plus, Filter, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import DataListTemplate, { ExcelIcon, CsvIcon, PdfIcon } from "@/components/ui/data-list-template"
import { exportToCSV, exportToXLSX, exportToPDF } from "@/lib/export"
import AddEmployerModal from "@/components/add-employer-modal"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"
import { toast } from "@/hooks/use-toast"
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
  const router = useRouter()
  const { session } = useAuth()

  const [employers, setEmployers] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<any | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    const fetchEmployers = async () => {
      if (!session?.accessToken || !partnerId) return
      setIsLoading(true)
      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_API_BASE_URL}/employers?partnerId=${partnerId}`,
          {
            headers: {
              Authorization: `Bearer ${session.accessToken}`,
              "Content-Type": "application/json",
            },
          }
        )
        if (!res.ok) throw new Error("Failed to fetch employers")
        const data = await res.json()
        const mapped = (data.data || []).map((e: any) => ({
          id: e.id,
          name: e.name || "-",
          class: e.class || "-",
          type: e.type || "-",
          fee: e.fee || "-",
          discount: e.discount || "0",
          highDate: e.createdAt ? new Date(e.createdAt).toLocaleDateString() : "-",
          partner: e.partnerName || "-",
          billing: e.billing || "0 €",
        }))
        setEmployers(mapped)
      } catch (err) {
        setEmployers([])
      } finally {
        setIsLoading(false)
      }
    }

    fetchEmployers()
  }, [session?.accessToken, partnerId])

  const handleRowClick = (row: any) => {
    router.push(`/employers/${row.id}`)
  }

  const handleEmployerAdded = (newEmployer: any) => {
    setEmployers((prev) => [newEmployer, ...prev])
  }

  const handleDeleteConfirm = async () => {
    if (!deleteTarget || !session?.accessToken) return
    setIsDeleting(true)
    try {
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/employers/${deleteTarget.id}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}))
        throw new Error(errorData.message || "Failed to delete employer")
      }
      setEmployers((prev) => prev.filter((e) => e.id !== deleteTarget.id))
      toast({
        title: t("employerDeletedSuccessfully"),
        variant: "default",
      })
    } catch (err: any) {
      toast({
        title: err.message || t("unexpectedError"),
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
      setDeleteTarget(null)
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
            setDeleteTarget(row)
          }}
          className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
          title={t("deleteEmployer")}
        >
          <Trash2 className="w-4 h-4" />
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

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteEmployer")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("confirmDeleteEmployer")}
              <br />
              <span className="text-xs text-muted-foreground mt-1 block">
                {t("deleteEmployerWarning")}
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? t("deleting") : t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
