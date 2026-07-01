"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"
import { Loader2, MapPin, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { DateInput } from "@/components/ui/date-input"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"

const gmaps = () => (typeof window !== "undefined" ? (window as any).google : undefined)

interface PlanificadorDialogProps {
  open: boolean
  onOpenChange: (o: boolean) => void
  defaultDate: string
}

interface NearbyWorker {
  id: string
  name: string
  occupation: string | null
  latitude: number
  longitude: number
  distanceMeters: number
  available: boolean
}

export function PlanificadorDialog({ open, onOpenChange, defaultDate }: PlanificadorDialogProps) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { data: session } = useSession()

  const mapDivRef = useRef<HTMLDivElement>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const mapRef = useRef<any>(null)
  const originMarkerRef = useRef<any>(null)
  const workerMarkersRef = useRef<any[]>([])

  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null)
  const [radiusKm, setRadiusKm] = useState(10)
  const [date, setDate] = useState(defaultDate)
  const [onlyAvailable, setOnlyAvailable] = useState(true)
  const [results, setResults] = useState<NearbyWorker[]>([])
  const [searching, setSearching] = useState(false)
  const [mapReady, setMapReady] = useState(false)

  useEffect(() => {
    if (!open) return
    let tries = 0
    const init = () => {
      const g = gmaps()
      if (!g?.maps || !mapDivRef.current) {
        if (tries++ < 40) return void setTimeout(init, 150)
        return
      }
      const center = origin || { lat: 40.4168, lng: -3.7038 }
      const map = new g.maps.Map(mapDivRef.current, { center, zoom: origin ? 12 : 6, mapTypeControl: false, streetViewControl: false })
      mapRef.current = map
      map.addListener("click", (e: any) => setOrigin({ lat: e.latLng.lat(), lng: e.latLng.lng() }))

      if (searchRef.current && g.maps.places) {
        const ac = new g.maps.places.Autocomplete(searchRef.current, { fields: ["geometry"] })
        ac.addListener("place_changed", () => {
          const place = ac.getPlace()
          if (place?.geometry?.location) {
            setOrigin({ lat: place.geometry.location.lat(), lng: place.geometry.location.lng() })
          }
        })
      }
      setMapReady(true)
    }
    init()
  }, [open])

  useEffect(() => {
    const g = gmaps()
    if (!mapReady || !g?.maps || !mapRef.current || !origin) return
    if (originMarkerRef.current) originMarkerRef.current.setMap(null)
    originMarkerRef.current = new g.maps.Marker({ position: origin, map: mapRef.current, label: "★" })
    mapRef.current.setCenter(origin)
    if (mapRef.current.getZoom() < 11) mapRef.current.setZoom(12)
  }, [origin, mapReady])

  const search = async () => {
    if (!origin) {
      toast({ title: t("pickLocationFirst") || "Pick a location on the map first", variant: "destructive" })
      return
    }
    setSearching(true)
    try {
      const url = `${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/planner/nearby?lat=${origin.lat}&lng=${origin.lng}&radius=${Math.round(radiusKm * 1000)}&date=${date}`
      const res = await fetch(url, { headers: { Authorization: `Bearer ${session?.accessToken}` } })
      const body = await res.json()
      const list: NearbyWorker[] = Array.isArray(body?.data) ? body.data : []
      setResults(list)
      placeWorkerMarkers(list.filter((w) => !onlyAvailable || w.available))
    } catch (e: any) {
      toast({ title: e.message || "Error", variant: "destructive" })
    } finally {
      setSearching(false)
    }
  }

  const placeWorkerMarkers = (list: NearbyWorker[]) => {
    const g = gmaps()
    if (!g?.maps || !mapRef.current) return
    workerMarkersRef.current.forEach((m) => m.setMap(null))
    workerMarkersRef.current = list.map((w) =>
      new g.maps.Marker({
        position: { lat: w.latitude, lng: w.longitude },
        map: mapRef.current,
        title: `${w.name} · ${(w.distanceMeters / 1000).toFixed(1)} km`,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 7,
          fillColor: w.available ? "#16a34a" : "#9ca3af",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
        },
      }),
    )
  }

  const shown = results.filter((w) => !onlyAvailable || w.available)
  const km = (m: number) => `${(m / 1000).toFixed(m < 10000 ? 1 : 0)} km`

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl bg-background">
        <DialogHeader>
          <DialogTitle>{t("planner") || "Planificador"}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">{t("searchAddress") || "Buscar dirección"}</label>
            <input
              ref={searchRef}
              type="text"
              placeholder={t("typeAddress") || "Escribe una dirección…"}
              className="w-full h-9 px-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-background focus:outline-none focus:border-[#662D91] focus:ring-1 focus:ring-[#662D91]"
            />
          </div>
          <div className="w-24">
            <label className="text-xs text-muted-foreground">{t("radiusKm") || "Radio (km)"}</label>
            <Input type="number" min={1} value={radiusKm} onChange={(e) => setRadiusKm(Number(e.target.value) || 1)} className="h-9" />
          </div>
          <div className="w-40">
            <label className="text-xs text-muted-foreground">{t("date") || "Fecha"}</label>
            <DateInput value={date} onChange={(e) => setDate(e.target.value)} allowPastDates className="h-9" />
          </div>
          <Button onClick={search} disabled={searching} className="bg-[#662D91] hover:bg-[#532073] text-white h-9">
            {searching ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Search className="h-4 w-4 mr-1" />}
            {t("search") || "Buscar"}
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div ref={mapDivRef} className="md:col-span-2 h-[360px] rounded-md border border-border bg-muted/20" />
          <div className="h-[360px] overflow-y-auto rounded-md border border-border p-2 space-y-2">
            <label className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <input type="checkbox" checked={onlyAvailable} onChange={(e) => { setOnlyAvailable(e.target.checked); placeWorkerMarkers(results.filter((w) => !e.target.checked || w.available)) }} />
              {t("onlyAvailable") || "Solo disponibles"}
            </label>
            {shown.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                {origin ? t("noWorkersFound") || "No workers found" : t("pickLocationFirst") || "Pick a location and search"}
              </p>
            ) : (
              shown.map((w) => (
                <div key={w.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5">
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{w.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{w.occupation || ""}</div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="flex items-center gap-1 text-xs text-foreground"><MapPin className="h-3 w-3" />{km(w.distanceMeters)}</div>
                    <span className={`inline-block mt-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium ${w.available ? "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300" : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300"}`}>
                      {w.available ? t("available") || "Disponible" : t("occupied") || "Ocupado"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
