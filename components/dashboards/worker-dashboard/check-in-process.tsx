"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Navigation, Wifi, Globe, QrCode, Camera, Scan, AlertCircle, CheckCircle } from "lucide-react"
import jsQR from 'jsqr'

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
  token: string // Add token prop
  onBack: () => void
  onComplete: () => void
}

export function CheckInProcess({ job, method, token, onBack, onComplete }: CheckInProcessProps) {
  const [scannerActive, setScannerActive] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)

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

  // QR Code scanning functions - Updated to match qr-scanner.tsx pattern
  const startScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera access not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraReady(true);
        setScannerActive(true);
        setIsScanning(true);
        scanQRCode(); // Start the scanning loop
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      alert(`Camera access denied: ${err.message}`);
    }
  };

  const stopScanner = () => {
    setIsScanning(false);
    setCameraReady(false);
    setScannerActive(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        console.log('QR Code detected:', code.data);
        handleQRCodeDetected(code.data);
        return;
      } else {
        // Keep scanning message
        setScanResult('Scanning...');
      }
    } else {
      setScanResult('Waiting for camera...');
    }

    // Delay next scan attempt by 2 seconds (like qr-scanner.tsx)
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(scanQRCode);
    }, 2000);
  };

  const handleQRCodeDetected = async (qrData: string) => {
    try {
      setScanResult(`Scanned: ${qrData}`);
      stopScanner();
      
      // Parse QR code data
      const qrJobData = JSON.parse(qrData);
      console.log('Parsed QR Job Data:', qrJobData);
      console.log('Current Job ID:', job.id, 'Type:', typeof job.id);
      console.log('QR Job ID:', qrJobData.jobId, 'Type:', typeof qrJobData.jobId);
      
      // Validate that this QR code is for the correct job - convert both to numbers for comparison
      const currentJobId = typeof job.id === 'string' ? parseInt(job.id) : job.id;
      const qrJobId = typeof qrJobData.jobId === 'string' ? parseInt(qrJobData.jobId) : qrJobData.jobId;
      
      if (qrJobId !== currentJobId) {
        alert(`This QR code is for job ${qrJobId}, but you are checking into job ${currentJobId}!`);
        // Restart scanner
        setTimeout(() => startScanner(), 1000);
        return;
      }
      
      // Show success message
      alert('QR Code verified! Recording check-in...');
      
      // Call the backend API to record the scan
      await recordScan(qrData);
      
    } catch (error) {
      console.error('Error processing QR code:', error);
      alert('Invalid QR code format. Please try again.');
      // Restart scanner
      setTimeout(() => startScanner(), 1000);
    }
  };

  const recordScan = async (qrData: string) => {
    try {
      if (!token) {
        throw new Error("No authentication token found");
      }

      const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001";
      console.log('Recording scan with data:', {
        jobId: job.id,
        scanType: "check-in",
        location: `${job.workCenter.name}`,
        notes: `QR Code scan: ${qrData.substring(0, 50)}...`
      });

      const response = await fetch(`${baseUrl}/jobs/scan`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          jobId: job.id,
          scanType: "check-in",
          location: `${job.workCenter.name}`,
          notes: `QR Code scan: ${qrData.substring(0, 50)}...`
        }),
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const result = await response.json();
      console.log('✅ Scan recorded successfully:', result);
      
      // Show success toast
      alert('✅ Check-in successful! Welcome to work.');
      
      console.log('🎯 Calling onComplete to navigate to dashboard...');
      // Complete check-in and navigate to current job view
      onComplete();
      
    } catch (error) {
      console.error("❌ Error recording scan:", error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      alert(`❌ Failed to record check-in: ${errorMessage}`);
      // Restart scanner for retry
      setTimeout(() => startScanner(), 1000);
    }
  };

  // Auto-start scanner when QR Code method is selected
  useEffect(() => {
    if (method === "qrCode") {
      startScanner();
    }
    
    // Cleanup on unmount
    return () => {
      stopScanner();
    };
  }, [method]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

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
                <div className="relative w-full aspect-video overflow-hidden rounded-md border border-gray-300">
                  <video
                    ref={videoRef}
                    className={`absolute top-0 left-0 w-full h-full object-cover ${scannerActive ? '' : 'hidden'}`}
                    autoPlay
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {/* Scanner Overlay */}
                  {scannerActive && (
                    <>
                      <div className="absolute inset-0 border-4 border-green-400 rounded-md pointer-events-none z-10" />
                      <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                        <div className="absolute w-full h-1 bg-red-500 animate-scan-line" />
                      </div>
                    </>
                  )}

                  {/* Camera starting message */}
                  {!scannerActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800">
                      <div className="text-center">
                        <Camera className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-sm text-gray-500">Starting camera...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Scanner controls */}
                <div className="flex items-center justify-center gap-2 mt-4">
                  {!scannerActive ? (
                    <Button onClick={startScanner} className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white">
                      <Camera className="w-4 h-4" />
                      <span className="text-sm font-medium">Start Scanner</span>
                    </Button>
                  ) : (
                    <Button onClick={stopScanner} variant="outline" className="flex items-center gap-2">
                      <Scan className="w-4 h-4" />
                      <span className="text-sm font-medium">Stop Scanner</span>
                    </Button>
                  )}
                </div>

                {/* Scan result */}
                {scanResult && (
                  <div className="mt-4 text-center">
                    <strong className="text-gray-800 dark:text-gray-200">{scanResult}</strong>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Success message */}
            {scanResult && scanResult.startsWith('Scanned:') && (
              <Card className="bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <h4 className="font-medium text-green-900 dark:text-green-100">Scan Successful</h4>
                  </div>
                  <p className="text-sm text-green-700 dark:text-green-300">QR code verified! Processing check-in...</p>
                </CardContent>
              </Card>
            )}
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
    <>
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
      </div>
      
      <style jsx>{`
        @keyframes scanLine {
          0% {
            top: 0%;
          }
          100% {
            top: 100%;
          }
        }

        .animate-scan-line {
          animation: scanLine 2s linear infinite;
        }
      `}</style>
    </>
  )
}
