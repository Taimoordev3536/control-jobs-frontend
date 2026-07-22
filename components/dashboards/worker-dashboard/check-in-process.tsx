"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Navigation, QrCode, Camera, Scan, AlertCircle } from "lucide-react"
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

  // GPS no longer gates anything — it resolves in the background while the
  // worker aims the camera, and only matters when a scanned code covers several
  // work centers. The IP step was removed entirely: it compared nothing, no
  // competitor does it on mobile, and it blocked the camera behind a call to a
  // third-party service.
  const [gpsStatus, setGpsStatus] = useState<StepStatus>("pending")
  const [qrStatus, setQrStatus] = useState<StepStatus>("pending")

  // GPS states
  const [location, setLocation] = useState<LocationData | null>(null)
  const [gpsError, setGpsError] = useState<string | null>(null)
  // Ref, not state: the watchPosition success callback closes over its value,
  // and a state variable is still null there — so clearWatch never ran and the
  // watch kept firing, restarting IP verification and unmounting the scanner.
  const watchIdRef = useRef<number | null>(null)

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

  // GDPR location consent gate — must be granted before GPS is read.
  const [consentOpen, setConsentOpen] = useState(false)
  const [consentBusy, setConsentBusy] = useState(false)

  // Consent is only a gate on reading LOCATION, not on checking in. Ask once,
  // then let GPS resolve in the background.
  const [consentResolved, setConsentResolved] = useState(false)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const st = await locationConsentStatus(token)
      if (cancelled) return
      setConsentResolved(true)
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
      // Recording consent failed — carry on without location rather than
      // stranding the worker at the door.
      setGpsStatus("error")
      toast({
        variant: "destructive",
        title: t("locationUnavailable"),
        description: t("locationUnavailableDesc"),
      })
    }
  }
  const handleConsentDecline = () => {
    setConsentOpen(false)
    // Declining location does not block check-in — the QR itself evidences
    // presence. The worker just picks the work center by hand when a scanned
    // code covers more than one.
    setGpsStatus("error")
    toast({
      title: t("locationOff"),
      description: t("locationOffDesc"),
    })
  }

  const clearGpsWatch = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current)
      watchIdRef.current = null
    }
  }

  /**
   * Starts a location fix in the background. Nothing waits on it: the camera is
   * already open, and the coordinates are only consulted if the scanned code
   * turns out to cover several work centers.
   */
  const startGPSVerification = () => {
    if (!navigator.geolocation) {
      setGpsError(t("geolocationNotSupported"))
      setGpsStatus("error")
      return
    }

    setGpsStatus("inProgress")
    setGpsError(null)

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setGpsError(null)
        setGpsStatus("completed")
        // One fix is all we need; keeping the watch alive drained battery and
        // re-triggered the rest of the flow.
        clearGpsWatch()
      },
      (error) => {
        console.error("GPS Error:", error)
        setGpsError(error.message)
        clearGpsWatch()
        // Not fatal. Check-in continues; the worker picks the work center by
        // hand if the scanned code turns out to be ambiguous.
        setGpsStatus("error")
      },
      {
        enableHighAccuracy: true,
        maximumAge: 60000,
        timeout: 15000,
      },
    )
    watchIdRef.current = id
  }

  // Latest fix, readable from async callbacks without stale-closure surprises.
  const locationRef = useRef<LocationData | null>(null)
  useEffect(() => {
    locationRef.current = location
  }, [location])

  /**
   * Waits up to `ms` for a location fix, then gives up. Called only after a scan,
   * and only when the code might be ambiguous — so a slow fix costs at most this
   * long, and never delays the camera.
   */
  const waitForFix = (ms: number): Promise<LocationData | null> =>
    new Promise((resolve) => {
      if (locationRef.current) return resolve(locationRef.current)
      const started = Date.now()
      const id = setInterval(() => {
        if (locationRef.current || Date.now() - started >= ms) {
          clearInterval(id)
          resolve(locationRef.current)
        }
      }, 100)
    })

  // QR Code Scanner Functions
  /**
   * @param silent when the camera is being opened automatically rather than by a
   *   tap. Some browsers (notably iOS Safari) only grant getUserMedia from a user
   *   gesture, so an auto-start can legitimately fail — surface the Start button
   *   instead of alarming the worker with a permission error they did not cause.
   */
  const startQRScanner = async (silent = false) => {
    // "error" is retryable: a denied camera permission used to latch qrStatus
    // there, and the Start button then did nothing forever.
    if (qrStatus !== "pending" && qrStatus !== "error") {
      return
    }

    processingScanRef.current = false
    setQrStatus("inProgress")

    if (!navigator.mediaDevices?.getUserMedia) {
      if (!silent) {
        toast({
          title: t("cameraNotAvailable"),
          description: t("cameraNotAvailableDesc"),
          variant: "destructive",
        })
      }
      setQrStatus("error")
      return
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
      })

      if (!videoRef.current) {
        // The card unmounted while the permission prompt was open. Release the
        // camera and return to a state the Start button can act on — leaving
        // qrStatus at "inProgress" would strand the worker with a dead button.
        stream.getTracks().forEach((track) => track.stop())
        setQrStatus("pending")
        autoStartedRef.current = false
        return
      }

      videoRef.current.srcObject = stream
      videoRef.current.setAttribute("playsinline", "true")
      await videoRef.current.play()
      setCameraReady(true)
      setScannerActive(true)
      setIsScanning(true)
      scanQRCode()
    } catch (err: any) {
      console.error("Camera error:", err)
      if (!silent) {
        const description =
          err?.name === "NotAllowedError"
            ? t("cameraDenied")
            : err?.name === "NotFoundError"
              ? t("cameraNotFound")
              : err?.name === "NotReadableError"
                ? t("cameraInUse")
                : err?.message || t("cameraGenericError")
        toast({ title: t("cameraUnavailable"), description, variant: "destructive" })
      }
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
        // ── Merged QR: ask the server which work center this is ──────────
        // A single-token QR names its own work center, so it skips this call.
        // A merged one may cover several, and the server resolves it: one
        // candidate wins outright, otherwise GPS ranks them, otherwise we ask.
        const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001"

        let selectionData: any = null
        // An HTTP failure here used to be dropped silently, so the worker was
        // told the QR contained no work centers for this job.
        let selectionError: string | null = null

        // The fix may still be arriving — give it a short grace period rather
        // than either blocking the scan or discarding a fix that is 200ms away.
        // waitForFix reads the ref, so it returns instantly if a fix already
        // landed — reading `location` here would risk a stale closure value.
        const fix = await waitForFix(1500)

        const res = await fetch(`${baseUrl}/work-centers/check-in/gps-select`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            qrToken: qrData,
            jobId: job.publicId || job.id,
            // Omitted entirely when unavailable — the server then either resolves
            // a single candidate or asks the worker.
            ...(fix
              ? { latitude: fix.latitude, longitude: fix.longitude, accuracy: fix.accuracy }
              : {}),
          }),
        })
        if (res.ok) {
          const body = await res.json()
          selectionData = body.data
        } else {
          selectionError = await readErrorMessage(res)
        }

        if (selectionError) {
          console.error("gps-select failed:", selectionError)
        }

        if (selectionData?.selectionType === "auto" && selectionData.workCenterId) {
          // GPS found exactly one WC within range → auto check-in
          toast({
            title: t("workCenterFound"),
            description: `${t("checkingInAt")}: ${selectionData.message}`,
          })
          await recordScan(qrData, selectionData.workCenterId)
          setQrStatus("completed")
          return
        }

        // No GPS match OR multiple matches OR API failed → ALWAYS show selector
        // Worker MUST pick a work center manually — never auto-checkin without WC
        setPendingQrToken(qrData)
        setAvailableWorkCenters(selectionData?.workCenters || [])
        setSelectorReason(selectionError || translateSelectorReason(selectionData?.message))
        setShowWorkCenterSelector(true)
        // The scan is not finished — the worker still has to pick. Release the
        // guard so cancelling and rescanning works.
        processingScanRef.current = false
        return
      }

      // ── Static QR: work center is embedded in the token itself ──────────
      // No GPS needed — the WC is identified on the backend from the token.
      toast({ title: t("qrVerified"), description: t("sendingCheckIn") })
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
      toast({ title: t("qrVerified"), description: t("sendingCheckIn") })
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

  /** The selector reason is authored server-side in English; show it translated. */
  const translateSelectorReason = (raw?: string): string => {
    const msg = (raw || "").toLowerCase()
    if (msg.includes("close together")) return t("reasonTooClose")
    if (msg.includes("no work center found near")) return t("reasonNoneNearby")
    if (msg.includes("match the scanned qr")) return t("reasonNoMatch")
    return t("selectWorkCenterManually")
  }

  /** Maps a raw backend error message to a user-friendly title + description */
  const parseBackendError = (raw: string): { title: string; description: string } => {
    const msg = raw.toLowerCase()
    if (msg.includes("not scheduled for today"))
      return { title: t("errNotScheduledTitle"), description: t("errNotScheduledDesc") }
    if (msg.includes("outside the allowed check-in window") || msg.includes("shift window"))
      return { title: t("errOutsideShiftTitle"), description: t("errOutsideShiftDesc") }
    if (msg.includes("no active schedule") || msg.includes("no active shifts"))
      return { title: t("errNoScheduleTitle"), description: t("errNoScheduleDesc") }
    if (msg.includes("not assigned to this job") || msg.includes("worker is not assigned"))
      return { title: t("errNotAssignedTitle"), description: t("errNotAssignedDesc") }
    if (msg.includes("invalid or expired") || msg.includes("invalid qr"))
      return { title: t("errInvalidQrTitle"), description: t("errInvalidQrDesc") }
    if (msg.includes("merged qr") || msg.includes("no work center selected"))
      return { title: t("errSelectWcTitle"), description: t("errSelectWcDesc") }
    if (msg.includes("does not belong to this job"))
      return { title: t("errWrongLocationTitle"), description: t("errWrongLocationDesc") }
    if (msg.includes("does not belong to the selected work center"))
      return { title: t("errWrongWcTitle"), description: t("errWrongWcDesc") }
    if (msg.includes("away from") || (msg.includes("within") && msg.includes("m of the work center")))
      // `raw` carries the actual distance, which is the useful part.
      return { title: t("errTooFarTitle"), description: raw }
    if (msg.includes("already checked in to this job"))
      return { title: t("alreadyCheckedInTitle"), description: t("alreadyCheckedInDesc") }
    if (msg.includes("already has an open session"))
      return { title: t("openSessionTitle"), description: t("openSessionDesc") }
    if (msg.includes("worker not found") || msg.includes("user not found"))
      return { title: t("errAccountTitle"), description: t("errAccountDesc") }
    return { title: t("checkInFailed"), description: raw }
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
        latitude: locationRef.current?.latitude ?? null,
        longitude: locationRef.current?.longitude ?? null,
        // ipAddress is deliberately not sent: the server records the IP it
        // observes, and a client-supplied one is both untrusted and unused.
        // Only what was actually captured. This blob previously fell back to the
        // job's default work-center NAME when no address was known, so an
        // attendance record showed a name under "Address" — and a different work
        // center from the one the check-in resolved to.
        location: JSON.stringify({
          address: locationRef.current?.address ?? null,
          latitude: locationRef.current?.latitude ?? null,
          longitude: locationRef.current?.longitude ?? null,
          accuracy: locationRef.current?.accuracy ?? null,
        }),
        // The work center is stored on the record itself; repeating its internal
        // numeric id here surfaced "work center 10" in the worker-facing timeline.
        notes: "QR check-in",
        userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      }),
    })

    if (!response.ok) {
      throw new Error(await readErrorMessage(response))
    }

    const result = await response.json()
    console.log("✅ Scan recorded successfully:", result)

    toast({
      title: t("checkInDoneTitle"),
      description: `${t("checkedInTo")} ${job.title}.`,
      variant: "success",
    })
    onComplete()
  }

  // A token scanned in the previous screen is processed immediately — there is
  // no reason to wait for a location fix that may not even be needed.
  const preScannedProcessed = useRef(false)
  useEffect(() => {
    if (
      preScannedQrToken &&
      consentResolved &&
      qrStatus === "pending" &&
      !preScannedProcessed.current
    ) {
      preScannedProcessed.current = true
      setQrStatus("inProgress")
      handleQRCodeDetected(preScannedQrToken)
    }
  }, [preScannedQrToken, consentResolved, qrStatus])

  // Open the camera as soon as the screen is usable. The scan is the whole
  // point of this screen; making the worker tap "Start" first was a wasted step.
  const autoStartedRef = useRef(false)
  useEffect(() => {
    if (
      !preScannedQrToken &&
      consentResolved &&
      qrStatus === "pending" &&
      !scannerActive &&
      !autoStartedRef.current
    ) {
      autoStartedRef.current = true
      startQRScanner(true)
    }
  }, [preScannedQrToken, consentResolved, qrStatus, scannerActive])

  // Cleanup on unmount only — depending on the watch id tore the camera down
  // on every re-registration.
  useEffect(() => {
    return () => {
      clearGpsWatch()
      stopScanner()
    }
  }, [])

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
          {/* Location is background information, not a step to complete — one
              quiet line instead of the old three-step progress bar. */}
          <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground px-1">
            <Navigation className="w-4 h-4 shrink-0" />
            {gpsStatus === "completed" && location ? (
              <span className="text-green-600 dark:text-green-400">
                {t("locationDetected")} (±{Math.round(location.accuracy)} m)
              </span>
            ) : gpsStatus === "inProgress" ? (
              <span>{t("detectingLocation")}</span>
            ) : (
              <span>{t("noLocationHint")}</span>
            )}
          </div>

          {/* The scanner is the screen. Nothing gates it - location resolves
              alongside it and is only consulted after a scan, if needed. */}
          {consentResolved && (
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
                    // Let the camera come back up on its own so cancelling
                    // returns the worker to a working scanner, not a dead frame.
                    autoStartedRef.current = false
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
                        <p className="text-green-600 dark:text-green-400 font-medium text-sm sm:text-base">{t("qrVerifiedCompleting")}</p>
                      ) : qrStatus === "error" ? (
                        <p className="text-red-600 dark:text-red-400 font-medium text-sm sm:text-base">{t("qrProcessingFailed")}</p>
                      ) : (
                        <>
                          <div className="w-5 h-5 shrink-0 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-orange-700 dark:text-orange-300 font-medium text-sm sm:text-base">{t("processingQr")}</p>
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
                      // Wrapped: passing the handler directly would hand the click
                      // event in as `silent`, suppressing the very error the
                      // worker needs to see when they tap Start themselves.
                      onClick={() => startQRScanner(false)}
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
                      1. <strong>{t("qrCode")}:</strong> {t("scanWorkplaceQrInstruction")}
                    </p>
                    <p>
                      2. <strong>{t("gps")}:</strong> {t("allowLocationAccessInstruction")}
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
