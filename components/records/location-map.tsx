"use client"

import { useEffect, useRef, useState } from "react"

/**
 * Read-only Google Map with a single marker — same JS Maps API flow used by the
 * work-center GPS dialog (dynamic script load, reuses any existing load).
 */
export default function LocationMap({ lat, lng, className }: { lat: number; lng: number; className?: string }) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    const w = window as any
    if (w.google?.maps) {
      setLoaded(true)
      return
    }
    // If the script is already loading (e.g. from a work-center dialog), poll for readiness
    const existing = document.querySelector('script[src*="maps.googleapis.com"]')
    if (existing) {
      const iv = setInterval(() => {
        if (w.google?.maps) {
          setLoaded(true)
          clearInterval(iv)
        }
      }, 200)
      return () => clearInterval(iv)
    }
    w.initRecordLocationMap = () => setLoaded(true)
    const script = document.createElement("script")
    script.src = `https://maps.googleapis.com/maps/api/js?key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY}&callback=initRecordLocationMap`
    script.async = true
    script.defer = true
    document.head.appendChild(script)
  }, [])

  useEffect(() => {
    const w = window as any
    if (!loaded || !mapRef.current || !w.google?.maps) return
    const pos = { lat, lng }
    const map = new w.google.maps.Map(mapRef.current, {
      center: pos,
      zoom: 18,
      mapTypeId: "hybrid", // satellite imagery + street/place labels
      disableDefaultUI: true,
      zoomControl: true,
      mapTypeControl: true, // let the user toggle Map / Satellite
      mapTypeControlOptions: { position: w.google.maps.ControlPosition.TOP_LEFT },
      fullscreenControl: true,
      gestureHandling: "cooperative",
    })
    new w.google.maps.Marker({ position: pos, map })
  }, [loaded, lat, lng])

  return (
    <div className={className} ref={mapRef}>
      {!loaded && (
        <div className="w-full h-full grid place-items-center text-sm text-muted-foreground">Cargando mapa…</div>
      )}
    </div>
  )
}
