"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { useSession } from "next-auth/react"
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
  Building2,
  MapPin,
  Briefcase,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export default function EmployerRecordDetailPage() {
  const params = useParams()
  const { data: session } = useSession()
  const [activeTab, setActiveTab] = useState("fichajes")
  const [record, setRecord] = useState<any>(null)
  const [isLoading, setIsLoading] = useState(true)

  const workSessionId = params.recordId

  // Fetch work session details
  useEffect(() => {
    const fetchWorkSessionDetail = async () => {
      if (!session?.accessToken || !workSessionId) {
        console.log('Missing session or workSessionId:', { hasSession: !!session?.accessToken, workSessionId })
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      try {
        const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/employer/work-session/${workSessionId}`
        console.log('Fetching work session detail from:', url)
        
        const response = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.accessToken}`,
            'Content-Type': 'application/json',
          },
        })

        console.log('Response status:', response.status)
        const result = await response.json()
        console.log('API Response:', result)
        
        if (result.isSuccess) {
          console.log('Work session data received:', result.data)
          console.log('scansByDate:', result.data?.scansByDate)
          console.log('tasksByDate:', result.data?.tasksByDate)
          console.log('tasksByDate keys:', result.data?.tasksByDate ? Object.keys(result.data.tasksByDate) : 'none')
          console.log('First task sample:', result.data?.tasksByDate ? Object.values(result.data.tasksByDate)[0] : 'none')
          console.log('checkInTime:', result.data?.checkInTime)
          console.log('client:', result.data?.client)
          console.log('workCenter:', result.data?.workCenter)
          setRecord(result.data)
        } else {
          console.error('Failed to fetch work session details:', result.message)
          console.error('Developer error:', result.developerError)
        }
      } catch (error) {
        console.error('Error fetching work session details:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchWorkSessionDetail()
  }, [workSessionId, session?.accessToken])

  const formatDate = (d: string) => {
    const date = new Date(d)
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`
  }
  
  const formatTime = (t?: string | Date | null) => {
    if (!t) return '—'
    const d = t instanceof Date ? t : new Date(t)
    if (isNaN(d.getTime())) return '—'
    return d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit', hour12: false })
  }
  
  const formatDuration = (minutes: number) => {
    const hours = Math.floor(Math.abs(minutes) / 60)
    const mins = Math.abs(minutes) % 60
    const sign = minutes < 0 ? "-" : ""
    return `${sign}${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(0).padStart(2, '0')}`
  }

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

  const formatDateKey = (dateKey: string) => {
    const [year, month, day] = dateKey.split('-')
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
    const days = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"]
    const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"]
    return `${days[date.getDay()]}, ${date.getDate()} ${months[date.getMonth()]}, ${date.getFullYear()}`
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">No se encontró el registro</div>
      </div>
    )
  }

  const checkInDate = record.checkInTime ? new Date(record.checkInTime) : new Date()

  const tabs = [
    { key: "fichajes", label: "Fichajes" },
    { key: "tareas", label: "Tareas" },
    { key: "encuestas", label: "Encuestas" },
    { key: "alertas", label: "Alertas" },
  ]

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card border-b border-border">
        <div className="px-4 py-3 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.history.back()} className="text-xs">
            <ArrowLeft className="w-4 h-4 mr-1" /> Volver
          </Button>
          <h1 className="text-base font-medium text-foreground">
            Detalle de Registro
          </h1>
        </div>
      </div>

      {/* TODO EL CONTENIDO SIN MÁRGENES LATERALES */}
      <div className="w-full">
        {/* Purple Header with Date and Info */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-6">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5" />
            <h2 className="text-xl font-semibold capitalize">{formatDate(record.checkInTime)}</h2>
          </div>
          
          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4" />
              <span className="text-purple-100">{record.client?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              <span className="text-purple-100">{record.workCenter?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4" />
              <span className="text-purple-100">{record.job?.name || 'N/A'}</span>
            </div>
            <div className="flex items-center gap-2">
              <User className="w-4 h-4" />
              <span className="text-purple-100">{record.worker?.name} {record.worker?.lastName}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="bg-muted/50 px-6 py-6 border-b border-border">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{formatDuration(record.estimatedMinutes || 0)}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">TIEMPO ESTIMADO</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatDuration(record.totalWorkMinutes || 0)}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">TIEMPO TRABAJADO</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{formatDuration(record.totalBreakMinutes || 0)}</div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">TIEMPO DESCANSO</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${(record.difference || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatDuration(record.difference || 0)}
              </div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mt-1">DIFERENCIA</div>
            </div>
          </div>
        </div>

        {/* Tabs with Client Detail Page Style */}
        <div className="border-b border-border bg-card">
          <nav className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-shrink-0 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.key
                    ? "border-[#662D91] text-[#662D91] bg-purple-50 dark:bg-purple-950/50"
                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="min-h-[400px] bg-card p-6">
          {activeTab === "fichajes" && (
            /* Timeline grouped by date */
            <div className="space-y-6">
              {record.scansByDate && Object.keys(record.scansByDate).length > 0 ? (
                Object.keys(record.scansByDate).sort().map((dateKey) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="mb-3 pb-2 border-b border-border">
                    <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                      {formatDateKey(dateKey)}
                    </h3>
                  </div>
                  
                  {/* Scans for this date */}
                  <div className="space-y-3">
                    {record.scansByDate[dateKey].map((scan: any) => {
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
                                <div className="text-sm font-medium text-foreground">{getLabel(scan.scanType)}</div>
                                <div className="text-lg font-bold text-foreground">{formatTime(scan.scanTime)}</div>
                              </div>
                            </div>
                          </div>

                          {loc.address && (
                            <div className="mt-3 ml-10 text-xs text-muted-foreground space-y-0.5">
                              {loc.address && <p><strong>Dirección:</strong> {loc.address}</p>}
                              {loc.ip && <p><strong>IP:</strong> {loc.ip}</p>}
                            </div>
                          )}

                          {scan.notes && (
                            <p className="mt-2 ml-10 text-xs italic text-muted-foreground">"{scan.notes}"</p>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )))
              : (
                <p className="text-sm text-muted-foreground">No hay registros de fichajes</p>
              )}
            </div>
          )}

          {activeTab === "tareas" && (
            /* Tasks grouped by date */
            <div className="space-y-6">
              {!record.tasksByDate || Object.keys(record.tasksByDate).length === 0 ? (
                <p className="text-sm text-muted-foreground">No hay tareas registradas</p>
              ) : (
                Object.keys(record.tasksByDate).sort().map((dateKey) => (
                  <div key={dateKey}>
                    {/* Date Header */}
                    <div className="mb-3 pb-2 border-b border-border">
                      <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {formatDateKey(dateKey)}
                      </h3>
                    </div>
                    
                    {/* Tasks for this date */}
                    <div className="space-y-2">
                      {record.tasksByDate[dateKey].map((task: any) => (
                        <div
                          key={task.id}
                          className="p-3 rounded-lg border bg-green-50 border-green-300 dark:bg-green-900/10"
                        >
                          <div className="flex items-start gap-3">
                            <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-medium text-green-800 dark:text-green-400">
                                  {task.taskName}
                                </span>
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {formatTime(task.completedAt)}
                                </span>
                              </div>
                              {task.workCenter && task.workCenter.name && (
                                <div className="flex items-center gap-1.5 mt-1">
                                  <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                  <span className="text-xs text-muted-foreground">
                                    {task.workCenter.name}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === "encuestas" && (
            <p className="text-sm text-muted-foreground">No hay encuestas disponibles</p>
          )}

          {activeTab === "alertas" && (
            <p className="text-sm text-muted-foreground">No hay alertas</p>
          )}
        </div>
      </div>
    </div>
  )
}
