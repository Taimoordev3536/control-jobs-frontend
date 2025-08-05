"use client"

import { useState, useEffect } from "react"
import { RefreshCw, Download, Copy, CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/hooks/use-auth"

interface QRCodeGeneratorProps {
  jobId: number
  jobTitle: string
  onRefresh?: () => void
  className?: string
}

export function QRCodeGenerator({ jobId, jobTitle, onRefresh, className = "" }: QRCodeGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [qrData, setQrData] = useState<string>("")
  const [error, setError] = useState<string | null>(null)
  const { session } = useAuth()

  // Fetch QR code from backend
  const generateQRCode = async () => {
    try {
      setLoading(true)
      setError(null)
      
      if (!session?.accessToken) {
        throw new Error('No authentication token available')
      }

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/generate-qr`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId })
      })

      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`HTTP error! status: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      
      // Handle wrapped response format: {data: {qrCode, jobData}, message, statusCode}
      const actualData = responseData.data || responseData
      
      if (!actualData.qrCode || !actualData.jobData) {
        throw new Error(`Invalid response format: missing qrCode or jobData`)
      }
      
      setQrCodeUrl(actualData.qrCode)
      setQrData(JSON.stringify(actualData.jobData, null, 2))
      onRefresh?.()
      
    } catch (error) {
      console.error('QR Code generation failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to generate QR code')
    } finally {
      setLoading(false)
    }
  }
  // Copy QR data to clipboard
  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(qrData)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy to clipboard:', error)
    }
  }

  // Download QR code as image
  const downloadQRCode = () => {
    if (!qrCodeUrl) return
    
    const link = document.createElement('a')
    link.href = qrCodeUrl
    link.download = `job-${jobId}-qr-code.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Generate QR code on mount
  useEffect(() => {
    if (session?.accessToken) {
      generateQRCode()
    }
  }, [jobId, session?.accessToken])

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          <p className="text-red-700 dark:text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* QR Code Display */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 text-center">
        {loading ? (
          <div className="flex items-center justify-center">
            <div className="w-32 h-32 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse flex items-center justify-center">
              <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
            </div>
          </div>
        ) : qrCodeUrl ? (
          <div className="space-y-3">
            <img 
              src={qrCodeUrl} 
              alt={`QR Code for ${jobTitle}`}
              className="w-32 h-32 mx-auto border border-gray-200 dark:border-gray-700 rounded-lg"
            />
            <Badge variant="secondary" className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400">
              QR Code Ready
            </Badge>
          </div>
        ) : (
          <div className="w-32 h-32 mx-auto bg-gray-200 dark:bg-gray-700 rounded-lg flex items-center justify-center">
            <span className="text-gray-500 dark:text-gray-400 text-sm">No QR Code</span>
          </div>
        )}
        
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Workers scan this code to check in/out
        </p>
      </div>

      {/* QR Code Data */}
      {qrData && (
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-900 dark:text-white">QR Code Data:</label>
          <div className="relative">
            <code className="block text-xs bg-white dark:bg-gray-900 p-3 rounded border border-gray-200 dark:border-gray-700 break-all font-mono text-gray-800 dark:text-gray-200">
              {qrData}
            </code>
            <Button
              size="sm"
              variant="ghost"
              onClick={copyToClipboard}
              className="absolute top-2 right-2 h-6 w-6 p-0"
            >
              {copied ? (
                <CheckCircle className="w-3 h-3 text-green-500" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex gap-2">
        <Button
          onClick={generateQRCode}
          disabled={loading}
          className="flex-1 bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Regenerate QR Code
        </Button>
        {qrCodeUrl && (
          <Button
            onClick={downloadQRCode}
            variant="outline"
            size="sm"
          >
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        )}
      </div>

      {/* QR Code Info */}
      <div className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
        <p>• QR code generated by backend with complete job data</p>
        <p>• Contains job ID, client, work center, and timestamps</p>
        <p>• Workers scan this to check in/out of the job</p>
        <p>• Click "Regenerate" to get latest QR code from server</p>
      </div>
    </div>
  )
}
