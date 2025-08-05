"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Navigation, Wifi, Globe, QrCode, Camera, Scan, AlertCircle } from "lucide-react"
import { QRScanner } from "@/components/qr-scanner"

interface JobAssignment {
  id: number
  jobId: string
  title: string
  client: {
    id: number
    name: string
  }
  workCenter: {
    id: number
    name: string
    address: string
    coordinates: { lat: number; lng: number }
  }
}

interface CheckInProcessProps {
  job: JobAssignment
  method: string
  onBack: () => void
  onComplete: () => void
  onQRScan?: (data: string) => void
}

export function CheckInProcess({ job, method, onBack, onComplete, onQRScan }: CheckInProcessProps) {
  const [showQRScanner, setShowQRScanner] = useState(false)
  const [qrScanLoading, setQrScanLoading] = useState(false)
  const [qrScanError, setQrScanError] = useState<string | null>(null)

  const handleStartQRScan = () => {
    console.log('Starting QR scan for job:', job.id, job.title) // Debug log
    setShowQRScanner(true)
    setQrScanError(null)
  }

  const handleQRScanComplete = async (data: string) => {
    console.log('QR scan completed with data:', data) // Debug log
    if (onQRScan) {
      setQrScanLoading(true)
      setQrScanError(null)
      try {
        await onQRScan(data)
        setShowQRScanner(false)
      } catch (error) {
        console.error('QR scan failed:', error)
        const errorMessage = error instanceof Error ? error.message : 'QR scan failed. Please try again.'
        setQrScanError(errorMessage)
        // Keep scanner open on error
      } finally {
        setQrScanLoading(false)
      }
    }
  }

  const handleCloseQRScanner = () => {
    setShowQRScanner(false)
    setQrScanLoading(false)
    setQrScanError(null)
  }
  const getMethodName = (method: string) => {
    switch (method) {
      case "gps":
        return "GPS Location"
      case "wifi":
        return "WiFi Network"
      case "ip":
        return "IP Address"
      case "qrCode":
        return "QR Code Scanner"
      case "callerId":
        return "Caller ID"
      default:
        return method
    }
  }

  const renderMethodSpecificUI = () => {
    switch (method) {
      case "gps":
        return (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <Navigation className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Getting your location...</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Please allow location access to continue</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Location Details</h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>Expected: {job.workCenter.address}</p>
                  <p>Current: Detecting...</p>
                  <p>Accuracy: ±5 meters</p>
                  <p className="text-green-600 dark:text-green-400 font-medium">✓ Location Verified</p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={onComplete} className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
              Verify Location & Check In
            </Button>
          </div>
        )

      case "wifi":
        return (
          <div className="space-y-4">
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
              <CardContent className="p-4 text-center">
                <Wifi className="w-12 h-12 text-green-600 dark:text-green-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">WiFi Verification</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Connect to the workplace WiFi network</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-3">Available Networks</h4>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-green-600 dark:text-green-400" />
                      <span className="font-medium text-gray-900 dark:text-white">TechSolutions_Staff</span>
                    </div>
                    <span className="text-xs bg-green-50 text-green-700 border border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800 px-2 py-1 rounded">
                      WORKPLACE
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg opacity-50">
                    <div className="flex items-center gap-2">
                      <Wifi className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-500">TechSolutions_Guest</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button onClick={onComplete} className="w-full bg-green-600 hover:bg-green-700 text-white py-3">
              Connect & Check In
            </Button>
          </div>
        )

      case "ip":
        return (
          <div className="space-y-4">
            <Card className="bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800">
              <CardContent className="p-4 text-center">
                <Globe className="w-12 h-12 text-purple-600 dark:text-purple-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">IP Verification</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Verifying your network connection</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">Network Information</h4>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <p>Your IP: 192.168.1.45</p>
                  <p>Expected Range: 192.168.1.x</p>
                  <p>Network: TechSolutions Internal</p>
                  <p className="text-green-600 dark:text-green-400 font-medium">✓ IP Address Verified</p>
                </div>
              </CardContent>
            </Card>

            <Button onClick={onComplete} className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3">
              Confirm & Check In
            </Button>
          </div>
        )

      case "qrCode":
        return (
          <div className="space-y-4">
            <Card className="bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-800">
              <CardContent className="p-4 text-center">
                <QrCode className="w-12 h-12 text-orange-600 dark:text-orange-400 mx-auto mb-3" />
                <h3 className="font-semibold text-gray-900 dark:text-white mb-2">QR Code Scanner</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">Scan the QR code at your workplace</p>
              </CardContent>
            </Card>

            <Card className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800">
              <CardContent className="p-4">
                <div className="aspect-square bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center mb-4">
                  <div className="w-64 h-64 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-500 dark:text-gray-400">Position QR code within frame</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-center">
                  <Button 
                    variant="ghost" 
                    className="flex items-center gap-2 text-purple-600 hover:text-purple-700"
                    onClick={handleStartQRScan}
                  >
                    <Scan className="w-4 h-4" />
                    <span className="text-sm font-medium">Enable Camera</span>
                  </Button>
                </div>
              </CardContent>
            </Card>

            <Button 
              onClick={handleStartQRScan} 
              className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3"
            >
              Scan QR Code to Check In
            </Button>
          </div>
        )

      default:
        return null
    }
  }

  const getInstructions = () => {
    switch (method) {
      case "gps":
        return "Make sure you are at the correct location before checking in. GPS accuracy may vary indoors."
      case "wifi":
        return "Connect to the designated workplace WiFi network. Make sure you have the correct password."
      case "ip":
        return "Ensure you are connected to the company network. VPN connections may not work."
      case "qrCode":
        return "Find the QR code posted at your workplace entrance or designated area and scan it clearly."
      default:
        return ""
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 mb-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={onBack} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">{getMethodName(method)}</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">{job.title}</p>
          </div>
        </div>
      </div>

      <div className="max-w-[1400px] mx-auto p-4 space-y-4">
        {renderMethodSpecificUI()}

        <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1">Instructions</h4>
                <p className="text-sm text-blue-800 dark:text-blue-200">{getInstructions()}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* QR Scan Error Display */}
      {qrScanError && (
        <div className="fixed top-4 left-4 right-4 z-40">
          <Card className="bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 max-w-md mx-auto">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-red-900 dark:text-red-100 mb-1">Scan Failed</h4>
                  <p className="text-sm text-red-800 dark:text-red-200">{qrScanError}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQrScanError(null)}
                  className="p-1 hover:bg-red-100 dark:hover:bg-red-800"
                >
                  ×
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* QR Scanner Modal */}
      <QRScanner
        isOpen={showQRScanner}
        onScan={handleQRScanComplete}
        onClose={handleCloseQRScanner}
        loading={qrScanLoading}
        title="Scan Job QR Code"
        subtitle={`Check in for: ${job.title}`}
      />
    </div>
  )
}
