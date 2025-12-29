"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin } from "lucide-react"

interface Props {
  onBack: () => void
  onComplete: (latitude: number, longitude: number) => void
  job?: any
}

export default function GpsSignIn({ onBack, onComplete }: Props) {
  const [status, setStatus] = React.useState<'idle' | 'locating' | 'done' | 'error'>('idle')
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const getLocation = async () => {
    setStatus('locating')
    setError(null)
    
    if (!navigator.geolocation) {
      setError("Geolocation not supported")
      setStatus('error')
      return
    }

    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 30000,
          maximumAge: 0,
        })
      })

      const newCoords = {
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }
      
      setCoords(newCoords)
      setStatus('done')
    } catch (err: any) {
      console.error("GPS error:", err)
      setError(err.message || "Could not access location")
      setStatus('error')
    }
  }

  React.useEffect(() => {
    // Auto-request location on mount
    getLocation()
  }, [])

  const handleContinue = () => {
    if (coords) {
      onComplete(coords.lat, coords.lng)
    }
  }

  return (
    <div className="min-h-[240px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">GPS Sign-in</h3>
      </div>

      <div className="border-border rounded-md p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground mb-3">Requesting location permission...</p>

        <div className="mb-3">
          <div className="text-sm text-muted-foreground">Status: <span className="font-medium">{status}</span></div>
          {coords && (
            <div className="text-sm text-foreground mt-1">
              <div>Latitude: {coords.lat.toFixed(6)}</div>
              <div>Longitude: {coords.lng.toFixed(6)}</div>
            </div>
          )}
          {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={getLocation} disabled={status === 'locating'}>
            <MapPin className="w-4 h-4 mr-2" /> {status === 'locating' ? 'Locating...' : 'Retry'}
          </Button>
          <Button 
            onClick={handleContinue}
            disabled={!coords || status === 'locating'}
            variant="default"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
