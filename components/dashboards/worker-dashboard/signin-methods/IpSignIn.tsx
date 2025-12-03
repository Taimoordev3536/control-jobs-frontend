"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Globe } from "lucide-react"

interface Props {
  onBack: () => void
  onComplete?: () => void
  job?: any
}

export default function IpSignIn({ onBack, onComplete }: Props) {
  const [ip, setIp] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const simulateDetect = async () => {
    setLoading(true)
    setError(null)
    setTimeout(() => {
      setIp('203.0.113.42')
      setLoading(false)
    }, 700)
  }

  return (
    <div className="min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">IP Detection</h3>
      </div>

      <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-800">
        <p className="text-sm text-gray-600 mb-3">This is a UI placeholder to detect your public IP address.</p>

        <div className="mb-3">
          <div className="text-sm text-gray-500">Detected IP:</div>
          <div className="text-lg font-medium">{loading ? 'Detecting...' : ip ?? '—'}</div>
          {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={simulateDetect}>
            <Globe className="w-4 h-4 mr-2" /> Detect IP
          </Button>
          <Button variant="secondary" onClick={() => onComplete && onComplete()}>
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
