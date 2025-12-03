"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, MapPin } from "lucide-react"

interface Props {
  onBack: () => void
  onComplete?: () => void
  job?: any
}

export default function GpsSignIn({ onBack, onComplete }: Props) {
  const [status, setStatus] = React.useState<'idle' | 'locating' | 'done' | 'error'>('idle')
  const [coords, setCoords] = React.useState<{ lat: number; lng: number } | null>(null)
  const [error, setError] = React.useState<string | null>(null)

  const simulateLocate = () => {
    setStatus('locating')
    setError(null)
    setTimeout(() => {
      setCoords({ lat: 51.509865, lng: -0.118092 })
      setStatus('done')
    }, 900)
  }

  return (
    <div className="min-h-[240px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">GPS Sign-in</h3>
      </div>

      <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-800">
        <p className="text-sm text-gray-600 mb-3">This is a UI placeholder for requesting location permission and showing coordinates.</p>

        <div className="mb-3">
          <div className="text-sm text-gray-500">Status: <span className="font-medium">{status}</span></div>
          {coords && <div className="text-sm text-gray-700 mt-1">Latitude: {coords.lat}, Longitude: {coords.lng}</div>}
          {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={simulateLocate}>
            <MapPin className="w-4 h-4 mr-2" /> Get Location
          </Button>
          <Button variant="secondary" onClick={() => onComplete && onComplete()}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
