"use client"

import {
  Calendar,
  User,
  Clock,
  Coffee,
  LogIn,
  LogOut,
  PlayCircle,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function EmployerRecordDetailPage() {
  const record = {
    date: "2025-11-27",
    worker: { code: "10120", name: "Ahmed Khan" },
    totalWorkMinutes: 50,
    totalBreakMinutes: 10,
    totalBreaks: 2,
    tasks: [
      { id: 1, name: "Limpiar área de oficina", completed: true },
      { id: 2, name: "Reponer suministros", completed: true },
      { id: 3, name: "Desinfectar áreas comunes", completed: false },
    ],
    scans: [
      { id: 1, scanType: "check-in", scanTime: "2025-11-27T09:00:00+05:00", location: JSON.stringify({ address: "Abassia Town, Rahim Yar Khan, Punjab", ip: "39.46.116.45" }) },
      { id: 2, scanType: "break-start", scanTime: "2025-11-27T09:30:00+05:00", notes: "Descanso para té" },
      { id: 3, scanType: "break-end", scanTime: "2025-11-27T09:35:00+05:00" },
      { id: 4, scanType: "break-start", scanTime: "2025-11-27T10:00:00+05:00", notes: "Descanso corto" },
      { id: 5, scanType: "break-end", scanTime: "2025-11-27T10:05:00+05:00" },
      { id: 6, scanType: "check-out", scanTime: "2025-11-27T10:50:00+05:00", location: JSON.stringify({ address: "Abassia Town, Rahim Yar Khan, Punjab" }), notes: "Sesión de trabajo completada" },
    ],
  }

  const formatDate = (d: string) => new Date(d).toLocaleDateString("es-ES", { weekday: "long", year: "numeric", month: "long", day: "numeric", timeZone: "Europe/Madrid" })
  const formatTime = (t: string) => new Date(t).toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "Europe/Madrid" })

  const getIcon = (type: string) => {
    switch (type) {
      case "check-in": return <LogIn className="w-3.5 h-3.5 text-green-600" />
      case "check-out": return <LogOut className="w-3.5 h-3.5 text-red-600" />
      case "break-start": return <Coffee className="w-3.5 h-3.5 text-orange-600" />
      case "break-end": return <PlayCircle className="w-3.5 h-3.5 text-blue-600" />
      default: return <Clock className="w-3.5 h-3.5" />
    }
  }

  const getLabel = (type: string) => {
    switch (type) {
      case "check-in": return "Entrada"
      case "check-out": return "Salida"
      case "break-start": return "Inicio de descanso"
      case "break-end": return "Fin de descanso"
      default: return type
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Header sin padding lateral */}
      <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-xs">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h1 className="text-base font-medium text-gray-900 dark:text-white">
            Detalle de Registro
          </h1>
        </div>
      </div>

      {/* TODO EL CONTENIDO SIN MÁRGENES LATERALES */}
      <div className="w-full">
        {/* Cabecera morada - full width */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <Calendar className="w-5 h-5" />
              <h2 className="text-lg font-semibold">{formatDate(record.date)}</h2>
            </div>
            <Badge variant="secondary" className="bg-white/20 text-xs px-2.5 py-0.5">
              {record.scans.length} actividades
            </Badge>
          </div>
          <div className="mt-2 flex items-center gap-2.5 text-purple-100 text-sm">
            <User className="w-4 h-4" />
            <span>Trabajador {record.worker.code}</span>
            <span className="opacity-80">• {record.worker.name}</span>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-7">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{record.totalWorkMinutes}<span className="text-lg">m</span></div>
              <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-1">Tiempo trabajado</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{record.totalBreakMinutes}<span className="text-lg">m</span></div>
              <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-1">Tiempo de descanso</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{record.totalBreaks}</div>
              <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-1">Descansos</div>
            </div>
          </div>
        </div>

        {/* Tareas diarias */}
        <div className="bg-white dark:bg-gray-900 px-6 py-5 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Tareas del día</h3>
          <div className="flex flex-wrap gap-2">
            {record.tasks.map((t) => (
              <span
                key={t.id}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                  t.completed
                    ? "bg-green-100 text-green-800 border border-green-300 dark:bg-green-900/20 dark:text-green-400"
                    : "bg-red-100 text-red-800 border border-red-300 dark:bg-red-900/20 dark:text-red-400"
                }`}
              >
                {t.completed ? <CheckCircle2 className="w-3.5 h-3.5" /> : <span className="w-3 h-3 rounded-full border border-red-600" />}
                {t.name}
              </span>
            ))}
          </div>
        </div>

        {/* Resumen del día */}
        <div className="bg-gray-50 dark:bg-gray-800/50 px-6 py-5 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Resumen del día</h3>
          <div className="flex flex-wrap gap-3">
            <Badge className="bg-green-100 text-green-800 border border-green-300 text-xs px-3 py-1.5">
              <LogIn className="w-3.5 h-3.5 mr-1.5" /> Entrada 09:00 AM
            </Badge>
            <Badge className="bg-red-100 text-red-800 border border-red-300 text-xs px-3 py-1.5">
              <LogOut className="w-3.5 h-3.5 mr-1.5" /> Salida 10:50 AM
            </Badge>
          </div>
        </div>

        {/* Línea de tiempo - full width */}
        <div className="bg-white dark:bg-gray-900 px-6 py-6 border-t border-gray-200 dark:border-gray-800">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <Clock className="w-4 h-4 text-purple-600" />
            Línea de tiempo de actividades
          </h3>

          <div className="space-y-4">
            {record.scans
              .sort((a, b) => new Date(a.scanTime).getTime() - new Date(b.scanTime).getTime())
              .map((scan) => {
                let loc: any = {}
                try { loc = JSON.parse(scan.location || "{}") } catch {}

                return (
                  <div
                    key={scan.id}
                    className={`p-4 rounded-lg border ${
                      scan.scanType === "check-in" ? "border-green-300 bg-green-50 dark:bg-green-900/10" :
                      scan.scanType === "check-out" ? "border-red-300 bg-red-50 dark:bg-red-900/10" :
                      scan.scanType === "break-start" ? "border-orange-300 bg-orange-50 dark:bg-orange-900/10" :
                      "border-blue-300 bg-blue-50 dark:bg-blue-900/10"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        {getIcon(scan.scanType)}
                        <div>
                          <div className="text-sm font-medium text-gray-900 dark:text-white">{getLabel(scan.scanType)}</div>
                          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">{formatTime(scan.scanTime)}</div>
                        </div>
                      </div>
                    </div>

                    {loc.address && (
                      <div className="mt-3 ml-10 text-xs text-gray-600 dark:text-gray-400 space-y-0.5">
                        {loc.address && <p><strong>Dirección:</strong> {loc.address}</p>}
                        {loc.ip && <p><strong>IP:</strong> {loc.ip}</p>}
                      </div>
                    )}

                    {scan.notes && (
                      <p className="mt-2 ml-10 text-xs italic text-gray-600 dark:text-gray-400">"{scan.notes}"</p>
                    )}
                  </div>
                )
              })}
          </div>
        </div>
      </div>
    </div>
  )
}