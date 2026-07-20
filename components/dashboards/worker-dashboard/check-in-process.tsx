"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Navigation, Globe, QrCode, Camera, Scan, AlertCircle, CheckCircle } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import jsQR from "jsqr"
import { WorkCenterSelector, WorkCenterOption } from "./work-center-selector"
import GpsConsentDialog from "./gps-consent-dialog"
import { locationConsentStatus, grantLocationConsent } from "@/lib/consent-client"

interface JobAssignment {
  id: number
  /** UUID the API expects; falls back to the numeric id when absent. */
  publicId?: string
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
  token: string
  onBack: () => void
  onComplete: () => void
  /** When provided, skip the QR scanner and auto-process this token once GPS+IP are done */
  preScannedQrToken?: string
}

type StepStatus = "pending" | "inProgress" | "completed" | "error"

interface LocationData {
  latitude: number
  longitude: number
  accuracy: number
  address?: string
}

export function CheckInProcess({ job, method, token, onBack, onComplete, preScannedQrToken }: CheckInProcessProps) {
  const { t } = useTranslation("worker-dashboard")
  const { toast } = useToast()

  // Sequential step states
  const [gpsStatus, setGpsStatus] = useState<StepStatus>("pending")
  const [ipStatus, setIpStatus] = useState<StepStatus>("pending")
  const [qrStatus, setQrStatus] = useState<StepStatus>("pending")

  // GPS states
  const [location, setLocation] = useState<LocationData | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  // Ref, not state: the watchPosition success callback closes over its value,
  // and a state variable is still null there — so clearWatch never ran and the
  // watch kept firing, restarting IP verification and unmounting the scanner.
  const watchIdRef = useRef<number | null>(null)

  // IP states
  const [userIP, setUserIP] = useState<string>("")
  const [ipError, setIpError] = useState<string | null>(null)

  // QR Scanner states
  const [scannerActive, setScannerActive] = useState(false)
  const [scanResult, setScanResult] = useState<string | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [cameraReady, setCameraReady] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number | null>(null)
  const scanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // Guards against two scan loops (or a loop plus the pre-scanned effect)
  // submitting the same check-in twice.
  const processingScanRef = useRef(false)

  // Hybrid GPS / work-center selection states
  const [showWorkCenterSelector, setShowWorkCenterSelector] = useState(false)
  const [availableWorkCenters, setAvailableWorkCenters] = useState<WorkCenterOption[]>([])
  const [pendingQrToken, setPendingQrToken] = useState<string | null>(null)
  const [selectorReason, setSelectorReason] = useState<string>("")

  // Allowed IP addresses for the workplace
  const allowedIPs = ["39.50.140.1", "192.168.1.45"] // Add your workplace IPs here

  // GDPR location consent gate — must be granted before GPS is read.
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentBusy, setConsentBusy] = useState(false)

  // Initialize the sequential process — gate GPS behind location consent.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const st = await locationConsentStatus(token)
      if (cancelled) return
      if (st.granted) startGPSVerification()
      else setConsentOpen(true)
    })()
    return () => { cancelled = true }
  }, [])

  const handleConsentAccept = async () => {
    setConsentBusy(true)
    const res = await grantLocationConsent(token)
    setConsentBusy(false)
    setConsentOpen(false)
    if (res.granted) startGPSVerification()
    else {
      toast({ variant: "destructive", title: "Ubicación necesaria", description: "No se pudo registrar el consentimiento. Inténtalo de nuevo." })
      onBack()
    }
  }
  const handleConsentDecline = () => {
    setConsentOpen(false)
    toast({ variant: "destructive", title: "Ubicación necesaria", description: "Necesitamos tu consentimiento de ubicación para fichar." })
    onBack()
  }

  const clearGpsWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  // GPS Verification
  const startGPSVerification = () => {
    if (!navigator.geolocation) {
      setGpsError(t("geolocationNotSupported"))
      // GPS not supported — continue without GPS
      setGpsStatus("completed")
      setTimeout(() => startIPVerification(), 500)
      return
    }

    setGpsStatus("inProgress")
    setGpsError(null)

    const id = navigator.geolocation.watchPosition(
      (position) => {
        const locationData: LocationData = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        }
        setLocation(locationData)

        // Clear any previous error
        setGpsError(null)

        // Fetch address details
        fetchAddressFromCoordinates(position.coords.latitude, position.coords.longitude)

        // Mark GPS as completed immediately when we get coordinates
        setGpsStatus("completed")

        // Stop watching location once we have it
        clearGpsWatch()

        // Automatically start IP verification once GPS is completed
        setTimeout(() => startIPVerification(), 1000)
      },
      (error) => {
        console.error("GPS Error:", error)
        setGpsError(error.message)
        clearGpsWatch()
        // GPS failed — continue anyway (location will be null).
        // For merged QR this means the manual WC selector will appear.
        setGpsStatus("completed")
        setTimeout(() => startIPVerification(), 500)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000, // Accept cached position up to 1 minute old
        timeout: 30000, // Increased timeout to 30 seconds
      },
    )
    watchIdRef.current = id
  }

  const fetchAddressFromCoordinates = async (lat: number, lng: number) => {
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16`,
      )
      if (response.ok) {
        const data = await response.json()
        setLocation((prev) => (prev ? { ...prev, address: data.display_name } : null))
      }
    } catch (error) {
      console.error(t("addressFetchError"), error)
    }
  }

  const isLocationValid = (lat: number, lng: number) => {
    // For now, accept any location where we successfully get coordinates
    // You can add distance validation later if needed
    return true

    // Optional: Calculate distance between current location and job work center
    // const distance = calculateDistance(lat, lng, job.workCenter.coordinates.lat, job.workCenter.coordinates.lng)
    // Accept if within 100 meters (you can adjust this)
    // return distance <= 100
  }

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371e3 // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180
    const φ2 = (lat2 * Math.PI) / 180
    const Δφ = ((lat2 - lat1) * Math.PI) / 180
    const Δλ = ((lon2 - lon1) * Math.PI) / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c // Distance in meters
  }

  // IP Verification
  const startIPVerification = async () => {
    setIpStatus("inProgress")
    setIpError(null)

    try {
      const response = await fetch("https://api.ipify.org?format=json")
      const data = await response.json()
      setUserIP(data.ip)

      // Just fetch IP and mark as completed - no comparison needed
      setIpStatus("completed")
      // IP verification completed, user can now proceed to QR code
      setTimeout(() => setQrStatus("pending"), 500)
    } catch (error) {
      setIpError(t("couldNotFetchIp"))
      setIpStatus("error")
    }
  }

  // QR Code Scanner Functions
  const startQRScanner = async () => {
    // "error" is retryable: a denied camera permission used to latch qrStatus
    // there, and the Start button then did nothing forever.
    if (
      (qrStatus !== "pending" && qrStatus !== "error") ||
      gpsStatus !== "completed" ||
      ipStatus !== "completed"
    ) {
      return
    }

    processingScanRef.current = false
    setQrStatus("inProgress")

    if (!navigator.mediaDevices?.getUserMedia) {
      toast({ title: "Camera Not Available", description: "Your browser does not support camera access. Please use a different device or browser.", variant: "destructive" })
      setQrStatus("error")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute("playsinline", "true")
        await videoRef.current.play()
        setCameraReady(true)
        setScannerActive(true)
        setIsScanning(true)
        scanQRCode()
      }
    } catch (err: any) {
      console.error("Camera error:", err)
      const description =
        err?.name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser settings, then tap Start again."
          : err?.name === "NotFoundError"
            ? "No camera was found on this device."
            : err?.name === "NotReadableError"
              ? "The camera is already in use by another app. Close it and tap Start again."
              : err?.message || "Please allow camera access to scan the QR code."
      toast({ title: "Camera Unavailable", description, variant: "destructive" })
      setQrStatus("error")
    }
  }

  const stopScanner = () => {
    setIsScanning(false)
    setCameraReady(false)
    setScannerActive(false)
    if (animationRef.current) cancelAnimationFrame(animationRef.current)
    // Without this the pending retry timer re-arms the loop after the stop.
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current)
      scanTimeoutRef.current = null
    }
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream
      stream.getTracks().forEach((track) => track.stop())
      videoRef.current.srcObject = null
    }
  }

  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return

    const video = videoRef.current
    const canvas = canvasRef.current
    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
      const code = jsQR(imageData.data, imageData.width, imageData.height)

      if (code) {
        console.log("QR Code detected:", code.data)
        handleQRCodeDetected(code.data)
        return
      } else {
        setScanResult(t("scanning"))
      }
    } else {
      setScanResult(t("waitingForCamera"))
    }

    scanTimeoutRef.current = setTimeout(() => {
      animationRef.current = requestAnimationFrame(scanQRCode)
    }, 400)
  }

  const handleQRCodeDetected = async (qrData: string) => {
    if (processingScanRef.current) return
    processingScanRef.current = true
    try {
      setScanResult(`${t("scanning")}: ${qrData}`)
      stopScanner()

      console.log("QR Token detected:", qrData)

      const isMerged = isMergedToken(qrData)

      if (isMerged) {
        // ── Merged / Dynamic QR: ALWAYS go through GPS → selector path ──
        // Static QR already identifies work center from the token itself.
        // Merged QR can belong to multiple work centers — we MUST use GPS
        // to pick the right one, or ask the worker to choose manually.
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"

        let selectionData: any = null
        // An HTTP failure here used to be dropped silently, so the worker was
        // told the QR contained no work centers for this job.
        let selectionError: string | null = null

        if (location) {
          // We have GPS — call backend to find the nearest work center
          const res = await fetch(`${baseUrl}/work-centers/check-in/gps-select`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({
              qrToken: qrData,
              latitude: location.latitude,
              longitude: location.longitude,
              jobId: job.publicId || job.id,
            }),
          })
          if (res.ok) {
            const body = await res.json()
            selectionData = body.data
          } else {
            selectionError = await readErrorMessage(res)
          }
        } else {
          // No GPS — fetch work center list for manual pick (send 0,0 so backend returns all WCs)
          const res = await fetch(`${baseUrl}/work-centers/check-in/gps-select`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ qrToken: qrData, latitude: 0, longitude: 0, jobId: job.publicId || job.id }),
          })
          if (res.ok) {
            const body = await res.json()
            selectionData = body.data
          } else {
            selectionError = await readErrorMessage(res)
          }
        }

        if (selectionError) {
          console.error("gps-select failed:", selectionError)
        }

        if (selectionData?.selectionType === "auto" && selectionData.workCenterId) {
          // GPS found exactly one WC within range → auto check-in
          toast({
            title: "Work Center Found",
            description: `Checking in at: ${selectionData.message}`,
          })
          await recordScan(qrData, selectionData.workCenterId)
          setQrStatus("completed")
          return
        }

        // No GPS match OR multiple matches OR API failed → ALWAYS show selector
        // Worker MUST pick a work center manually — never auto-checkin without WC
        setPendingQrToken(qrData)
        setAvailableWorkCenters(selectionData?.workCenters || [])
        setSelectorReason(
          selectionError
            ? selectionError
            : location
              ? (selectionData?.message || "No work center found near your location. Please select manually.")
              : "GPS is unavailable. Please select your work center."
        )
        setShowWorkCenterSelector(true)
        // The scan is not finished — the worker still has to pick. Release the
        // guard so cancelling and rescanning works.
        processingScanRef.current = false
        return
      }

      // ── Static QR: work center is embedded in the token itself ──────────
      // No GPS needed — the WC is identified on the backend from the token.
      toast({ title: "QR Code Verified", description: "Sending check-in to the server..." })
      await recordScan(qrData)
      setQrStatus("completed")
    } catch (error) {
      console.error("Error processing QR code:", error)
      const raw = error instanceof Error ? error.message : t("invalidQrCode")
      const { title, description } = parseBackendError(raw)
      toast({ title, description, variant: "destructive" })
      setQrStatus("error")
      processingScanRef.current = false
    }
  }

  /** Returns true when the scanned string looks like a base64-encoded merged token */
  const isMergedToken = (token: string): boolean => {
    try {
      const decoded = atob(token)
      const data = JSON.parse(decoded)
      return Array.isArray(data.wc) && typeof data.j === "number"
    } catch {
      return false
    }
  }

  /** Reads a NestJS error body: { statusCode, message, error } */
  const readErrorMessage = async (res: Response): Promise<string> => {
    try {
      const body = await res.json()
      return Array.isArray(body.message)
        ? body.message.join("; ")
        : body.message || `HTTP ${res.status}`
    } catch {
      return `HTTP ${res.status}`
    }
  }

  /** Called after the worker manually selects a work center from the selector */
  const handleWorkCenterSelected = async (workCenterId: number) => {
    if (!pendingQrToken || processingScanRef.current) return
    processingScanRef.current = true
    setShowWorkCenterSelector(false)
    try {
      toast({ title: "QR Code Verified", description: "Sending check-in to the server..." })
      await recordScan(pendingQrToken, workCenterId)
      setQrStatus("completed")
    } catch (error) {
      console.error("Error completing manual check-in:", error)
      const raw = error instanceof Error ? error.message : t("checkInFailed")
      const { title, description } = parseBackendError(raw)
      toast({ title, description, variant: "destructive" })
      setQrStatus("error")
    } finally {
      setPendingQrToken(null)
      processingScanRef.current = false
    }
  }

  /** Maps a raw backend error message to a user-friendly title + description */
  const parseBackendError = (raw: string): { title: string; description: string } => {
    const msg = raw.toLowerCase()
    if (msg.includes("not scheduled for today"))
      return { title: "Not Scheduled Today", description: "This job is not scheduled for today. You cannot check in." }
    if (msg.includes("outside the allowed check-in window") || msg.includes("shift window"))
      return { title: "Outside Shift Hours", description: "Check-in is only allowed from 30 minutes before your shift starts until the shift ends." }
    if (msg.includes("no active schedule") || msg.includes("no active shifts"))
      return { title: "No Active Schedule", description: "No shifts are active for today. Contact your employer." }
    if (msg.includes("not assigned to this job") || msg.includes("worker is not assigned"))
      return { title: "Not Assigned", description: "You are not assigned to this job." }
    if (msg.includes("invalid or expired") || msg.includes("invalid qr"))
      return { title: "Invalid QR Code", description: "The QR code has expired or is not valid. Please scan again." }
    if (msg.includes("merged qr") || msg.includes("no work center selected"))
      return { title: "Select Work Center", description: "Please select a work center before checking in." }
    if (msg.includes("does not belong to this job"))
      return { title: "Wrong Location", description: "The selected work center is not part of this job." }
    if (msg.includes("does not belong to the selected work center"))
      return { title: "Wrong Work Center", description: "This QR code belongs to a different work center, or it expired. Please scan again." }
    if (msg.includes("away from") || (msg.includes("within") && msg.includes("m of the work center")))
      return { title: "Too Far Away", description: raw }
    if (msg.includes("worker not found") || msg.includes("user not found"))
      return { title: "Account Error", description: "Your worker account could not be found. Please log in again." }
    return { title: "Check-In Failed", description: raw }
  }

  /** Throws on failure — callers own the error toast and the status reset. */
  const recordScan = async (qrData: string, workCenterId?: number) => {
    if (!token) {
      throw new Error(t("noAuthTokenFound"))
    }

    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"

    const response = await fetch(`${baseUrl}/jobs/scan`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        jobId: job.publicId || job.id,
        scanType: "check-in",
        signingMethod: "qrcode",
        qrToken: qrData,
        ...(workCenterId != null ? { workCenterId: String(workCenterId) } : {}),
        latitude: location?.latitude ?? null,
        longitude: location?.longitude ?? null,
        ipAddress: userIP || undefined,
        location: JSON.stringify({
          address: location?.address || job.workCenter.name,
          ip: userIP,
          latitude: location?.latitude || null,
          longitude: location?.longitude || null,
          qrData: qrData.substring(0, 50),
        }),
        notes: `Sequential check-in: GPS → IP → QR${workCenterId != null ? ` (manual WC ${workCenterId})` : ""}`,
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })

    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }

    const result = await response.json()
    console.log("✅ Scan recorded successfully:", result)

    toast({
      title: "✅ Check-In Successful",
      description: `You have checked in to ${job.title}.`,
      variant: "success",
    })
    onComplete()
  }

  // Auto-process pre-scanned QR token once GPS + IP are done
  const preScannedProcessed = useRef(false)
  useEffect(() => {
    if (
      preScannedQrToken &&
      gpsStatus === "completed" &&
      ipStatus === "completed" &&
      qrStatus === "pending" &&
      !preScannedProcessed.current
    ) {
      preScannedProcessed.current = true
      setQrStatus("inProgress")
      handleQRCodeDetected(preScannedQrToken)
    }
  }, [preScannedQrToken, gpsStatus, ipStatus, qrStatus])

  // Cleanup on unmount only — depending on the watch id tore the camera down
  // on every re-registration.
  useEffect(() => {
    return () => {
      clearGpsWatch()
      stopScanner()
    }
  }, [])

  const getStepIcon = (status: StepStatus) => {
    switch (status) {
      case "completed":
        return <CheckCircle className="w-6 h-6 text-green-600" />
      case "inProgress":
        return <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
      case "error":
        return <AlertCircle className="w-6 h-6 text-red-600" />
      default:
        return <div className="w-6 h-6 border-2 border-gray-300 dark:border-gray-600 rounded-full" />
    }
  }

  return (
    <>
      <GpsConsentDialog
        open={consentOpen}
        busy={consentBusy}
        onAccept={handleConsentAccept}
        onDecline={handleConsentDecline}
      />
      <div className="min-h-screen w-full overflow-x-hidden bg-gray-50 dark:bg-gray-950">
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 p-3 sm:p-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-2 sm:gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="shrink-0 p-2 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="min-w-0">
              <h1 className="truncate text-base sm:text-xl font-semibold text-gray-900 dark:text-white">
                {t("sequentialCheckInProcess")}
              </h1>
              <p className="truncate text-gray-600 dark:text-gray-400 text-xs sm:text-sm">{job.title}</p>
            </div>
          </div>
        </div>

        <div className="w-full p-3 sm:p-4 space-y-3 sm:space-y-4">
          {/* Progress Steps */}
          <Card className="bg-white dark:bg-gray-900">
            <CardContent className="p-4 sm:p-6">
              {/* Stacked rows on phones — three steps plus connectors cannot fit
                  across a phone screen and used to overflow off the right edge. */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-0">
                {/* Step 1: GPS */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0">{getStepIcon(gpsStatus)}</span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm sm:text-base">{t("gpsLocation")}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t("verifyYourLocation")}</p>
                  </div>
                </div>

                <div className="hidden sm:block flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4">
                  <div
                    className={`h-full transition-all duration-500 ${gpsStatus === "completed" ? "bg-green-500 w-full" : "bg-gray-300 dark:bg-gray-600 w-0"}`}
                  />
                </div>

                {/* Step 2: IP */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0">{getStepIcon(ipStatus)}</span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm sm:text-base">{t("networkIp")}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t("checkWorkplaceNetwork")}</p>
                  </div>
                </div>

                <div className="hidden sm:block flex-1 h-0.5 bg-gray-200 dark:bg-gray-700 mx-4">
                  <div
                    className={`h-full transition-all duration-500 ${ipStatus === "completed" ? "bg-green-500 w-full" : "bg-gray-300 dark:bg-gray-600 w-0"}`}
                  />
                </div>

                {/* Step 3: QR */}
                <div className="flex items-center gap-3 min-w-0">
                  <span className="shrink-0">{getStepIcon(qrStatus)}</span>
                  <div className="min-w-0">
                    <h3 className="font-medium text-sm sm:text-base">{t("qrCode")}</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground">{t("scanWorkplaceQr")}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* GPS Section */}
          {gpsStatus !== "completed" && (
            <Card
              className={`${gpsStatus === "inProgress" ? "border-blue-500 bg-blue-50 dark:bg-blue-950/20" : gpsStatus === "error" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Navigation className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-blue-600" />
                  <h3 className="font-semibold text-sm sm:text-base">{t("gpsLocationVerification")}</h3>
                  {gpsStatus === "inProgress" && (
                    <div className="ml-auto">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {location && (
                  <div className="space-y-2 mb-4 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="text-xs sm:text-sm break-words">
                      <strong>✅ {t("coordinates")}:</strong> {location.latitude.toFixed(6)},{" "}
                      {location.longitude.toFixed(6)}
                    </p>
                    <p className="text-xs sm:text-sm">
                      <strong>📍 {t("accuracy")}:</strong> ±{Math.round(location.accuracy)} {t("meters")}
                    </p>
                    {location.address && (
                      <p className="text-xs sm:text-sm break-words">
                        <strong>📮 {t("address")}:</strong> {location.address}
                      </p>
                    )}
                  </div>
                )}

                {gpsError && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg border border-yellow-200 dark:border-yellow-900 mb-4">
                    <span className="text-yellow-700 dark:text-yellow-300 text-xs sm:text-sm">
                      ⚠️ GPS unavailable — you will select your work center manually after scanning the QR code.
                    </span>
                  </div>
                )}

                {gpsStatus === "inProgress" && !location && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-900">
                    <p className="text-blue-600 dark:text-blue-300 text-xs sm:text-sm">🔍 {t("detectingLocation")}</p>
                  </div>
                )}

                {gpsStatus === "inProgress" && location && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="text-green-600 dark:text-green-300 text-xs sm:text-sm">✅ {t("locationDetected")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* IP Section */}
          {gpsStatus === "completed" && ipStatus !== "completed" && (
            <Card
              className={`${ipStatus === "inProgress" ? "border-purple-500 bg-purple-50 dark:bg-purple-950/20" : ipStatus === "error" ? "border-red-500 bg-red-50 dark:bg-red-950/20" : "border-gray-200 dark:border-gray-800"}`}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Globe className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-purple-600" />
                  <h3 className="font-semibold text-sm sm:text-base">{t("networkIpDetection")}</h3>
                  {ipStatus === "inProgress" && (
                    <div className="ml-auto">
                      <div className="w-5 h-5 border-2 border-purple-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  )}
                </div>

                {userIP && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900 mb-4">
                    <p className="text-xs sm:text-sm break-all">
                      <strong>✅ {t("yourIpAddress")}:</strong> {userIP}
                    </p>
                    <p className="text-xs sm:text-sm text-green-600 dark:text-green-300">
                      <strong>{t("status")}:</strong> {t("ipDetectedSuccessfully")}
                    </p>
                  </div>
                )}

                {ipError && (
                  <div className="p-3 bg-red-50 dark:bg-red-950/20 rounded-lg border border-red-200 dark:border-red-900 mb-4">
                    {/* Stacks on phones — side-by-side squeezed the message to a
                        few characters next to the Retry button. */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                      <span className="text-red-600 dark:text-red-300 text-xs sm:text-sm break-words">
                        {t("error")}: {ipError}
                      </span>
                      <Button
                        onClick={startIPVerification}
                        size="sm"
                        className="w-full sm:w-auto shrink-0 bg-red-600 hover:bg-red-700 text-white"
                      >
                        {t("retry")}
                      </Button>
                    </div>
                  </div>
                )}

                {ipStatus === "inProgress" && !userIP && (
                  <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-900">
                    <p className="text-purple-600 dark:text-purple-300 text-xs sm:text-sm">🔍 {t("detectingIpAddress")}</p>
                  </div>
                )}

                {ipStatus === "inProgress" && userIP && (
                  <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-900">
                    <p className="text-green-600 dark:text-green-300 text-xs sm:text-sm">✅ {t("ipDetectedMovingToQr")}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* QR Code Section */}
          {gpsStatus === "completed" && ipStatus === "completed" && (
            <>
              {/* Work Center Selector — shown after scanning a merged/dynamic QR */}
              {showWorkCenterSelector && (
                <WorkCenterSelector
                  workCenters={availableWorkCenters}
                  reason={selectorReason}
                  onSelect={handleWorkCenterSelected}
                  onCancel={() => {
                    setShowWorkCenterSelector(false)
                    setPendingQrToken(null)
                    processingScanRef.current = false
                    // The pre-scanned path has no scanner to fall back to, so
                    // "pending" there renders an endless spinner. Show the
                    // retryable error card instead.
                    setQrStatus(preScannedQrToken ? "error" : "pending")
                  }}
                />
              )}

              {!showWorkCenterSelector && preScannedQrToken && (
                <Card className="border-orange-500 bg-orange-50 dark:bg-orange-950/20">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3 mb-4">
                      <QrCode className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-orange-600" />
                      <h3 className="font-semibold text-sm sm:text-base">{t("qrCodeScanner")}</h3>
                    </div>
                    <div className="flex items-center justify-center gap-3 py-6 sm:py-8 text-center">
                      {qrStatus === "completed" ? (
                        <p className="text-green-600 dark:text-green-400 font-medium text-sm sm:text-base">✅ QR code verified — completing check-in…</p>
                      ) : qrStatus === "error" ? (
                        <p className="text-red-600 dark:text-red-400 font-medium text-sm sm:text-base">QR processing failed. Go back and try again.</p>
                      ) : (
                        <>
                          <div className="w-5 h-5 shrink-0 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-orange-700 dark:text-orange-300 font-medium text-sm sm:text-base">Processing scanned QR code…</p>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {!showWorkCenterSelector && !preScannedQrToken && (
                <Card
                  className={`${qrStatus === "inProgress" ? "border-orange-500" : qrStatus === "error" ? "border-red-500" : "border-gray-200 dark:border-gray-800"}`}
                >
                  <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <QrCode className="w-5 h-5 sm:w-6 sm:h-6 shrink-0 text-orange-600" />
                  <h3 className="font-semibold text-sm sm:text-base">{t("qrCodeScanner")}</h3>
                </div>

                {/* 4:3 on phones — a 16:9 box is a thin letterbox in portrait and
                    leaves too little of the frame for the code to be readable. */}
                <div className="relative w-full aspect-[4/3] sm:aspect-video overflow-hidden rounded-md border border-gray-300 dark:border-gray-700 mb-4">
                  <video
                    ref={videoRef}
                    className={`absolute top-0 left-0 w-full h-full object-cover ${scannerActive ? "" : "hidden"}`}
                    autoPlay
                    muted
                  />
                  <canvas ref={canvasRef} className="hidden" />

                  {scannerActive && (
                    <>
                      <div className="absolute inset-0 border-4 border-green-400 rounded-md pointer-events-none z-10" />
                      <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                        <div className="absolute w-full h-1 bg-red-500 animate-scan-line" />
                      </div>
                    </>
                  )}

                  {!scannerActive && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 p-4">
                      <div className="text-center">
                        <Camera className="w-10 h-10 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2" />
                        <p className="text-xs sm:text-sm text-muted-foreground">{t("clickToStartQrScanner")}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2">
                  {!scannerActive ? (
                    <Button
                      onClick={startQRScanner}
                      disabled={gpsStatus !== "completed" || ipStatus !== "completed"}
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-orange-600 hover:bg-orange-700 text-white"
                    >
                      <Camera className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">{t("startQrScanner")}</span>
                    </Button>
                  ) : (
                    <Button
                      onClick={stopScanner}
                      variant="outline"
                      className="w-full sm:w-auto flex items-center justify-center gap-2 bg-transparent"
                    >
                      <Scan className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">{t("stopScanner")}</span>
                    </Button>
                  )}
                </div>

                {scanResult && (
                  <div className="mt-4 text-center">
                    <strong className="text-xs sm:text-sm break-all text-gray-800 dark:text-gray-200">{scanResult}</strong>
                  </div>
                )}
              </CardContent>
            </Card>
              )}
            </>
          )}

          {/* Instructions */}
          <Card className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-blue-600 dark:text-blue-400 mt-0.5" />
                <div className="min-w-0">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-1 text-sm sm:text-base">{t("instructions")}</h4>
                  <div className="text-xs sm:text-sm text-blue-800 dark:text-blue-200 space-y-1">
                    <p>
                      1. <strong>{t("gps")}:</strong> {t("allowLocationAccessInstruction")}
                    </p>
                    <p>
                      2. <strong>{t("network")}:</strong> {t("detectCurrentIpInstruction")}
                    </p>
                    <p>
                      3. <strong>{t("qrCode")}:</strong> {t("scanWorkplaceQrInstruction")}
                    </p>
                  </div>
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
