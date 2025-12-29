"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Globe } from "lucide-react"

interface Props {
  onBack: () => void
  onComplete: (ipAddress: string) => void
  job?: any
}

export default function IpSignIn({ onBack, onComplete }: Props) {
  const [ip, setIp] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const detectIP = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch("https://api.ipify.org?format=json")
      const data = await response.json()
      setIp(data.ip)
      setLoading(false)
    } catch (err) {
      console.error("IP detection error:", err)
      setError("Could not detect IP address")
      setLoading(false)
    }
  }

  React.useEffect(() => {
    // Auto-detect IP on mount
    detectIP()
  }, [])

  const handleContinue = () => {
    if (ip) {
      onComplete(ip)
    }
  }

  return (
    <div className="min-h-[200px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold text-foreground">IP Detection</h3>
      </div>

      <div className="border-border rounded-md p-4 bg-muted/50">
        <p className="text-sm text-muted-foreground mb-3">Detecting your public IP address...</p>

        <div className="mb-3">
          <div className="text-sm text-muted-foreground">Detected IP:</div>
          <div className="text-lg font-medium text-foreground">{loading ? 'Detecting...' : ip ?? '—'}</div>
          {error && <div className="text-sm text-red-500 mt-1">{error}</div>}
        </div>

        <div className="flex items-center gap-2">
          <Button onClick={detectIP} disabled={loading}>
            <Globe className="w-4 h-4 mr-2" /> {loading ? 'Detecting...' : 'Retry'}
          </Button>
          <Button 
            onClick={handleContinue} 
            disabled={!ip || loading}
            variant="default"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}
