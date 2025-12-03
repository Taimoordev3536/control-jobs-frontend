"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Camera } from "lucide-react"

interface Props {
  onBack: () => void
  onComplete?: () => void
  job?: any
}

export default function QrCodeScanner({ onBack, onComplete }: Props) {
  const [scanning, setScanning] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  return (
    <div className="min-h-[320px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">QR Code Scanner</h3>
      </div>

      <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-800">
        <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">Point your camera at the job QR code. This is a UI placeholder for the camera preview.</div>

        <div className="w-full h-48 bg-black/5 dark:bg-white/5 rounded flex items-center justify-center mb-3">
          {/* Placeholder for video preview */}
          <div className="text-center text-sm text-gray-500">Camera preview placeholder</div>
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={() => { setScanning(!scanning); setMessage(scanning ? 'Scanner stopped' : 'Scanner started') }}>
            <Camera className="w-4 h-4 mr-2" /> {scanning ? 'Stop' : 'Start'} Scan
          </Button>
          <Button variant="secondary" onClick={() => { onComplete && onComplete() }}>
            Done
          </Button>
        </div>

        {message && <div className="mt-3 text-sm text-gray-600">{message}</div>}
      </div>
    </div>
  )
}
