"use client"

import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Download, Info, Upload } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useAuth } from "@/hooks/use-auth"
import { AnimatedLoader } from "@/components/animated-loader"

const SUPPORTED = new Set(["clients", "workers", "users", "partners", "employers"])

// Demo row (row 2) shows the allowed alternatives for the constrained fields,
// joined by "/", since a CSV cell can't hold a dropdown.
const SAMPLE_FIELDS: Record<string, { headers: string[]; example: string[] }> = {
  partners: {
    headers: ["Nombre", "NIF", "Email", "Responsable", "Teléfono", "Móvil", "Dirección", "Piso&Puerta", "Código Postal", "Localidad", "Provincia", "País", "Tipo", "Comisión (%)", "Retención (%)", "Activo"],
    example: ["Juan Pérez", "12345678A", "juan@ejemplo.com", "Juan Pérez", "910000000", "600000000", "Calle Sol 1", "2ºA", "28001", "Madrid", "Madrid", "España", "Gold/Silver/Bronze/Affiliate", "10", "15", "Sí"],
  },
  employers: {
    headers: ["Nombre", "NIF", "Email", "Responsable", "Partner", "Teléfono", "Móvil", "Dirección", "Piso&Portal", "Código Postal", "Localidad", "Provincia", "País", "Clase", "Tarifa", "%Dto", "Prueba", "Activo"],
    example: ["Empresa S.L.", "B12345678", "info@empresa.com", "Ana Gómez", "Nombre del partner", "910000000", "600000000", "Calle Mayor 1", "1ºB", "28001", "Madrid", "Madrid", "España", "Particular/Empresa/Autónomo", "Home/Static/Remote", "5", "30", "Sí"],
  },
  clients: {
    headers: ["Código", "Nombre", "NIF", "Email", "Responsable", "Empleador", "Teléfono", "Móvil", "Dirección", "Piso&Portal", "Código Postal", "Localidad", "Provincia", "País", "Tipo", "Activo"],
    example: ["CLI-001", "María García", "12345678A", "maria@ejemplo.com", "María García", "Nombre del empleador", "910000000", "600000000", "Calle Luna 3", "3ºC", "48001", "Bilbao", "Vizcaya", "España", "Particular/Empresa", "Sí"],
  },
  workers: {
    headers: ["Código", "Apellidos&Nombre", "NIF", "Email", "Empleador", "Teléfono", "Móvil", "Dirección", "Piso&Portal", "Código Postal", "Localidad", "Provincia", "País", "Ocupación", "Sexo", "F. Nacimiento", "Activo"],
    example: ["TRB-001", "López Ruiz, Ana", "87654321B", "ana@ejemplo.com", "Nombre del empleador", "910000000", "600000000", "Calle Mar 4", "4ºD", "41001", "Sevilla", "Sevilla", "España", "Auxiliar", "Hombre/Mujer", "01/01/1990", "Sí"],
  },
  users: {
    headers: ["Nombre", "Apellidos", "Email", "Rol", "Activo"],
    example: ["Carlos", "Ruiz Díaz", "carlos@ejemplo.com", "Administrador/Partner/Empleador/Cliente/Trabajador", "Sí"],
  },
}

interface ImportSummary {
  type: string
  total: number
  imported: number
  skipped: number
  failed: number
  errors: { row: number; reason: string; email?: string }[]
}

function toCsv(rows: string[][]): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const v = cell ?? ""
          return /[",;\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
        })
        .join(";"),
    )
    .join("\r\n")
}

export default function ImportPage() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { session } = useAuth()
  const [selectedRole, setSelectedRole] = useState("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [summary, setSummary] = useState<ImportSummary | null>(null)

  const fields = useMemo(() => (selectedRole ? SAMPLE_FIELDS[selectedRole] : null), [selectedRole])
  const supported = selectedRole ? SUPPORTED.has(selectedRole) : true

  const downloadSample = () => {
    if (!fields) {
      toast({ title: t("selectTypeFirst") || "Select a type first" })
      return
    }
    const csv = "﻿" + toCsv([fields.headers, fields.example])
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `plantilla_${selectedRole}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const exportErrors = () => {
    if (!summary || summary.errors.length === 0) return
    const rows = [
      [t("row") || "Row", "Email", t("reason") || "Reason"],
      ...summary.errors.map((e) => [String(e.row), e.email || "", e.reason]),
    ]
    const csv = "﻿" + toCsv(rows)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `importacion_${selectedRole}_errores.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!selectedRole) {
      toast({ title: t("selectTypeFirst") || "Select a type first" })
      return
    }
    if (!selectedFile) {
      toast({ title: t("selectCsvFile") || "Select a CSV file" })
      return
    }
    setBusy(true)
    setSummary(null)
    try {
      const form = new FormData()
      form.append("file", selectedFile)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/import/${selectedRole}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.accessToken}` },
        body: form,
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || body?.isSuccess === false) {
        throw new Error(body?.message || "Import failed")
      }
      setSummary(body.data)
      toast({
        title: t("importDone") || "Import processed",
        description: `${body.data.imported}/${body.data.total}`,
        variant: "success",
      })
    } catch (e: any) {
      toast({ title: t("somethingWentWrong") || "Something went wrong", description: e.message, variant: "destructive" })
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="w-full p-6 bg-background min-h-screen">
      <div className="bg-card rounded-lg shadow-sm border border-border">
        <div className="p-6 border-b border-border">
          <h1 className="text-2xl font-semibold text-foreground">{t("import")}</h1>
        </div>

        <div className="p-6 space-y-6">
          <div className="flex gap-3 rounded-md border border-purple-200 dark:border-purple-900 bg-purple-50 dark:bg-purple-950/30 p-4">
            <Info className="h-5 w-5 text-[#662D91] shrink-0 mt-0.5" />
            <p className="text-sm text-foreground">
              {t("importCsvInfo") ||
                "Puedes importar datos en formato CSV. Descarga la plantilla de ejemplo para ver los nombres de los campos (en español) que se pueden importar y rellénala antes de subirla."}
            </p>
          </div>

          <div className="space-y-2 max-w-sm">
            <Label className="text-sm font-medium text-foreground">{t("type") || "Tipo"}</Label>
            <Select
              value={selectedRole}
              onValueChange={(v) => { setSelectedRole(v); setSummary(null) }}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t("select")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partners">{t("partners")}</SelectItem>
                <SelectItem value="employers">{t("employers")}</SelectItem>
                <SelectItem value="clients">{t("clients")}</SelectItem>
                <SelectItem value="workers">{t("workers")}</SelectItem>
                <SelectItem value="users">{t("users")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {fields && (
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={downloadSample}
                className="gap-2 border-[#662D91] text-[#662D91] hover:bg-purple-50"
              >
                <Download className="h-4 w-4" />
                {t("downloadSampleCsv") || "Descargar CSV de ejemplo"}
              </Button>
              <div className="text-xs text-muted-foreground">
                {t("fields") || "Campos"}: {fields.headers.join(", ")}
              </div>
            </div>
          )}

          {selectedRole && !supported && (
            <div className="rounded-md border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm text-amber-800 dark:text-amber-300">
              {t("importTypeNotYet") ||
                "La importación de este tipo aún no está disponible. Créalos desde su formulario (requieren configuración de tarifa/tipo y facturación)."}
            </div>
          )}

          <div className="space-y-2 max-w-sm">
            <Label className="text-sm font-medium text-foreground">{t("csvFile") || "Archivo CSV"}</Label>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
              className="block w-full text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-purple-100 file:px-3 file:py-1.5 file:text-[#662D91] hover:file:bg-purple-200"
            />
          </div>

          <div className="pt-2">
            <Button
              onClick={handleImport}
              disabled={busy || (!!selectedRole && !supported)}
              className="gap-2 bg-purple-600 hover:bg-purple-700 text-white px-8"
            >
              {busy ? <AnimatedLoader size={18} /> : <Upload className="h-4 w-4" />}
              {t("Import")}
            </Button>
          </div>

          {summary && (
            <div className="space-y-3 rounded-md border border-border p-4">
              <div className="flex flex-wrap gap-4 text-sm">
                <span><strong>{summary.total}</strong> {t("total") || "total"}</span>
                <span className="text-green-600 dark:text-green-400"><strong>{summary.imported}</strong> {t("imported") || "imported"}</span>
                <span className="text-amber-600 dark:text-amber-400"><strong>{summary.skipped}</strong> {t("skipped") || "skipped"}</span>
                <span className="text-red-600 dark:text-red-400"><strong>{summary.failed}</strong> {t("failed") || "failed"}</span>
              </div>
              {summary.errors.length > 0 && (
                <div className="flex justify-end">
                  <Button
                    variant="outline"
                    onClick={exportErrors}
                    className="gap-2 border-[#662D91] text-[#662D91] hover:bg-purple-50"
                  >
                    <Download className="h-4 w-4" />
                    {t("exportErrors") || "Export errors"}
                  </Button>
                </div>
              )}
              {summary.errors.length > 0 && (
                <div className="max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="py-1 pr-3">{t("row") || "Row"}</th>
                        <th className="py-1 pr-3">Email</th>
                        <th className="py-1">{t("reason") || "Reason"}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {summary.errors.map((er, i) => (
                        <tr key={i} className="border-t border-border">
                          <td className="py-1 pr-3">{er.row}</td>
                          <td className="py-1 pr-3">{er.email || "-"}</td>
                          <td className="py-1">{er.reason}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
