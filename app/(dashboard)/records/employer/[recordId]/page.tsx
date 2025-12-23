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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (!record) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-950 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">No se encontró el registro</div>
      </div>
    )
  }

  const checkInDate = record.checkInTime ? new Date(record.checkInTime) : new Date()

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
        <div className="bg-gray-100 dark:bg-gray-800/50 px-6 py-6 border-b border-gray-200 dark:border-gray-800">
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-blue-600">{formatDuration(record.estimatedMinutes || 0)}</div>
              <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-1">TIEMPO ESTIMADO</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{formatDuration(record.totalWorkMinutes || 0)}</div>
              <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-1">TIEMPO TRABAJADO</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">{formatDuration(record.totalBreakMinutes || 0)}</div>
              <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-1">TIEMPO DESCANSO</div>
            </div>
            <div>
              <div className={`text-2xl font-bold ${(record.difference || 0) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatDuration(record.difference || 0)}
              </div>
              <div className="text-xs uppercase tracking-wider text-gray-600 dark:text-gray-400 mt-1">DIFERENCIA</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 rounded-none h-12 px-6">
            <TabsTrigger value="fichajes" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none">
              Fichajes
            </TabsTrigger>
            <TabsTrigger value="tareas" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none">
              Tareas
            </TabsTrigger>
            <TabsTrigger value="encuestas" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none">
              Encuestas
            </TabsTrigger>
            <TabsTrigger value="alertas" className="data-[state=active]:border-b-2 data-[state=active]:border-purple-600 rounded-none">
              Alertas
            </TabsTrigger>
          </TabsList>

          <TabsContent value="fichajes" className="bg-white dark:bg-gray-900 p-6">
            {/* Timeline grouped by date */}
            <div className="space-y-6">
              {record.scansByDate && Object.keys(record.scansByDate).length > 0 ? (
                Object.keys(record.scansByDate).sort().map((dateKey) => (
                <div key={dateKey}>
                  {/* Date Header */}
                  <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
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
              )))
              : (
                <p className="text-sm text-gray-600 dark:text-gray-400">No hay registros de fichajes</p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="tareas" className="bg-white dark:bg-gray-900 p-6">
            {/* Tasks grouped by date */}
            <div className="space-y-6">
              {!record.tasksByDate || Object.keys(record.tasksByDate).length === 0 ? (
                <p className="text-sm text-gray-600 dark:text-gray-400">No hay tareas registradas</p>
              ) : (
                Object.keys(record.tasksByDate).sort().map((dateKey) => (
                  <div key={dateKey}>
                    {/* Date Header */}
                    <div className="mb-3 pb-2 border-b border-gray-200 dark:border-gray-700">
                      <h3 className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                        {formatDateKey(dateKey)}
                      </h3>
                    </div>
                    
                    {/* Tasks for this date */}
                    <div className="space-y-2">
                      {record.tasksByDate[dateKey].map((task: any) => (
                        <div
                          key={task.id}
                          className="flex items-center gap-3 p-3 rounded-lg border bg-green-50 border-green-300 dark:bg-green-900/10"
                        >
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <span className="text-sm font-medium text-green-800 dark:text-green-400">
                            {task.taskName}
                          </span>
                          <span className="text-xs text-gray-500 ml-auto">
                            {formatTime(task.completedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="encuestas" className="bg-white dark:bg-gray-900 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">No hay encuestas disponibles</p>
          </TabsContent>

          <TabsContent value="alertas" className="bg-white dark:bg-gray-900 p-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">No hay alertas</p>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
