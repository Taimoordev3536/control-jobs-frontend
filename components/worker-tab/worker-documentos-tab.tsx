"use client"

import { useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AnimatedLoader } from "@/components/animated-loader"
import { Download, Printer, Trash2, Upload, FileText, Loader2 } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"

interface WorkerDocumentosTabProps {
  workerId: string
}

const fmtSize = (b?: number | null) => {
  if (!b) return ""
  const kb = b / 1024
  return kb < 1024 ? `${kb.toFixed(0)} KB` : `${(kb / 1024).toFixed(1)} MB`
}
const fmtDate = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("es-ES", { timeZone: "Europe/Madrid" }) : "")
const downloadUrl = (url: string) =>
  url.includes("/upload/") ? url.replace("/upload/", "/upload/fl_attachment/") : url

export function WorkerDocumentosTab({ workerId }: WorkerDocumentosTabProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: session, status } = useSession()
  const queryClient = useQueryClient()
  const [uploading, setUploading] = useState(false)
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("otros")
  const fileRef = useRef<HTMLInputElement>(null)

  const catLabel = (c?: string) =>
    c === "justificante" ? t("justificantes") || "Justificantes" : t("others") || "Otros"

  const base = process.env.NEXT_PUBLIC_API_BASE_URL
  const authHeader = { Authorization: `Bearer ${session?.accessToken}` }

  const filesKey = ["worker", workerId, "documents"]
  const { data: files = [], isLoading: loading } = useQuery<any[]>({
    queryKey: filesKey,
    queryFn: async () => {
      const j = await apiFetch<any>(`/worker/${workerId}/documents`)
      return Array.isArray(j?.data) ? j.data : Array.isArray(j) ? j : []
    },
    enabled: status === "authenticated" && !!workerId,
  })
  // Upload/delete handlers keep hitting the API directly; these just refresh
  // the read.
  const load = () => queryClient.invalidateQueries({ queryKey: filesKey })
  const setFiles = (updater: (prev: any[]) => any[]) =>
    queryClient.setQueryData(filesKey, (prev: any[] = []) => updater(prev))

  const onPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    try {
      const fd = new FormData()
      fd.append("file", file)
      fd.append("category", category)
      if (description.trim()) fd.append("description", description.trim())
      const res = await fetch(`${base}/worker/${workerId}/documents`, { method: "POST", headers: authHeader, body: fd })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || "Upload failed")
      }
      toast({ title: t("fileUploaded") || "File uploaded", variant: "success" as any })
      setDescription("")
      load()
    } catch (err: any) {
      toast({ title: err.message || "Error", variant: "destructive" })
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const remove = async (id: string) => {
    if (!confirm(t("confirmDeleteFile") || "Delete this file permanently?")) return
    try {
      await fetch(`${base}/worker/${workerId}/documents/${id}`, { method: "DELETE", headers: authHeader })
      toast({ title: t("fileDeleted") || "File deleted", variant: "success" as any })
      setFiles((prev) => prev.filter((f) => f.id !== id))
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    }
  }

  const iconBtn = "p-1.5 rounded-md transition-colors"

  return (
    <div className="space-y-4 p-2">
      <div className="flex flex-wrap items-end gap-3 border-b border-border pb-4">
        <div className="flex flex-col gap-1 flex-1 min-w-[200px]">
          <label className="text-xs text-muted-foreground">{t("descriptionOptional") || "Description (optional)"}</label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("fileDescriptionPlaceholder") || "e.g. contract, ID…"}
            className="h-9"
          />
        </div>
        <div className="flex flex-col gap-1 min-w-[160px]">
          <label className="text-xs text-muted-foreground">{t("category") || "Categoría"}</label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="justificante">{t("justificantes") || "Justificantes"}</SelectItem>
              <SelectItem value="otros">{t("others") || "Otros"}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          onChange={onPick}
          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
        />
        <Button onClick={() => fileRef.current?.click()} disabled={uploading} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
          {t("uploadFile") || "Upload file"}
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <AnimatedLoader />
        </div>
      ) : files.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">{t("noFilesYet") || "No files yet"}</p>
      ) : (
        <ul className="divide-y divide-border">
          {files.map((f) => (
            <li key={f.id} className="flex items-center gap-3 py-2">
              <FileText className="h-5 w-5 text-[#662D91] shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{f.fileName}</div>
                <div className="text-xs text-muted-foreground truncate">
                  {[catLabel(f.category), f.description, fmtSize(f.sizeBytes), fmtDate(f.createdAt)].filter(Boolean).join(" · ")}
                </div>
              </div>
              <a
                href={downloadUrl(f.url)}
                target="_blank"
                rel="noopener noreferrer"
                title={t("download") || "Download"}
                className={`${iconBtn} text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950`}
              >
                <Download className="h-4 w-4" />
              </a>
              <button
                onClick={() => window.open(f.url, "_blank", "noopener,noreferrer")}
                title={t("print") || "Print"}
                className={`${iconBtn} text-[#662D91] hover:bg-purple-50 dark:hover:bg-purple-950`}
              >
                <Printer className="h-4 w-4" />
              </button>
              <button
                onClick={() => remove(f.id)}
                title={t("delete") || "Delete"}
                className={`${iconBtn} text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
