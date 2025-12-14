"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Camera } from "lucide-react"
import jsQR from "jsqr"

interface Props {
  onBack: () => void
  onComplete: (qrToken: string) => void
  job?: any
}

export default function QrCodeScanner({ onBack, onComplete }: Props) {
  const [scanning, setScanning] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>("Initializing...")
  const [error, setError] = React.useState<string | null>(null)
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const canvasRef = React.useRef<HTMLCanvasElement>(null)
  const animationRef = React.useRef<number | null>(null)
  const streamRef = React.useRef<MediaStream | null>(null)
  const isScanningRef = React.useRef<boolean>(false)

  const startScanner = async () => {
    setMessage("Requesting camera permission...")
    setError(null)
    
    if (!navigator.mediaDevices?.getUserMedia) {
      const msg = "Camera access not supported in this browser"
      setMessage(msg)
      setError(msg)
      return
    }

    try {
      console.log("Requesting camera access...")
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { 
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
      })

      console.log("Camera access granted, stream:", stream)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true")
        
        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          console.log("Video metadata loaded")
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              console.log("Video playing, starting scan loop")
              isScanningRef.current = true
              setScanning(true)
              setMessage("Scanning for QR code...")
              // Start scanning loop
              requestAnimationFrame(scanQRCode)
            }).catch(err => {
              console.error("Video play error:", err)
              setError(`Cannot play video: ${err.message}`)
            })
          }
        }
      }
    } catch (err: any) {
      console.error("Camera error:", err)
      let errorMsg = ""
      if (err.name === "NotAllowedError") {
        errorMsg = "Camera permission denied. Please allow camera access."
      } else if (err.name === "NotFoundError") {
        errorMsg = "No camera found on this device."
      } else if (err.name === "NotReadableError") {
        errorMsg = "Camera is already in use by another application."
      } else {
        errorMsg = `Camera error: ${err.message}`
      }
      setMessage(errorMsg)
      setError(errorMsg)
    }
  }

  const stopScanner = () => {
    console.log("Stopping scanner")
    isScanningRef.current = false
    setScanning(false)
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current)
      animationRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => {
        console.log("Stopping track:", track.label)
        track.stop()
      })
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }

  const scanQRCode = () => {
    // Check if we should continue scanning using ref (not state)
    if (!isScanningRef.current || !videoRef.current || !canvasRef.current) {
      console.log("Scan cancelled - scanning:", isScanningRef.current)
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) {
      console.log("No canvas context")
      return
    }

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      if (canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        })

        if (code) {
          console.log("QR Code detected:", code.data)
          setMessage(`Scanned successfully!`)
          stopScanner()
          onComplete(code.data)
          return
        }
      }
    }

    // Continue scanning loop
    if (isScanningRef.current) {
      animationRef.current = requestAnimationFrame(scanQRCode)
    }
  }

  React.useEffect(() => {
    // Auto-start scanner when component mounts
    const timer = setTimeout(() => {
      startScanner()
    }, 100) // Small delay to ensure DOM is ready
    
    return () => {
      clearTimeout(timer)
      stopScanner()
    }
  }, [])

  return (
    <div className="min-h-[320px]">
      <div className="flex items-center gap-2 mb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="p-2">
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <h3 className="text-lg font-semibold">QR Code Scanner</h3>
      </div>

      <div className="border rounded-md p-4 bg-gray-50 dark:bg-gray-800">
        <div className="mb-3 text-sm text-gray-600 dark:text-gray-300">Point your camera at the job QR code</div>

        <div className="w-full h-80 bg-black rounded flex items-center justify-center mb-3 relative overflow-hidden">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${scanning ? 'block' : 'hidden'}`}
            autoPlay
            muted
            playsInline
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {scanning && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-56 h-56 border-4 border-purple-500 rounded-lg"></div>
            </div>
          )}
          
          {!scanning && (
            <div className="text-center px-4">
              <p className="text-sm text-gray-400 mb-2">
                {error ? "⚠️ " + error : message}
              </p>
              {error && (
                <Button onClick={startScanner} className="bg-purple-600 hover:bg-purple-700 mt-2">
                  <Camera className="w-4 h-4 mr-2" /> Try Again
                </Button>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {scanning ? (
            <Button onClick={stopScanner} variant="destructive">
              Stop Scan
            </Button>
          ) : !error ? (
            <Button onClick={startScanner} className="bg-purple-600 hover:bg-purple-700">
              <Camera className="w-4 h-4 mr-2" /> Start Scan
            </Button>
          ) : null}
        </div>

        {message && !error && scanning && (
          <div className="mt-3 text-sm font-medium text-green-600 dark:text-green-400">{message}</div>
        )}
      </div>
    </div>
  )
}
