"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { X, Camera, RefreshCw, Check } from "lucide-react"

type Props = {
  open: boolean
  /** called with the captured JPEG data URL when the worker confirms */
  onCapture: (dataUrl: string) => void
  /** called when the worker closes/skips (check-in proceeds without a selfie) */
  onClose: () => void
}

export default function SelfieCapture({ open, onCapture, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [shot, setShot] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => {})
      }
    } catch {
      setError("No se pudo acceder a la cámara. Revisa los permisos.")
    }
  }, [])

  useEffect(() => {
    if (!open) return
    setShot(null)
    startCamera()
    return () => stopStream()
  }, [open, startCamera, stopStream])

  const capture = () => {
    const v = videoRef.current
    if (!v || !v.videoWidth) return
    const w = 480
    const h = Math.round(v.videoHeight * (w / v.videoWidth))
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) return
    ctx.drawImage(v, 0, 0, w, h)
    setShot(canvas.toDataURL("image/jpeg", 0.7))
    stopStream()
  }

  const retake = () => {
    setShot(null)
    startCamera()
  }

  const confirm = () => {
    if (!shot) return
    onCapture(shot)
    stopStream()
  }

  const close = () => {
    stopStream()
    onClose()
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[120] bg-black/70 flex items-center justify-center p-4">
      <div className="bg-card border border-border rounded-2xl w-full max-w-sm overflow-hidden shadow-xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <h3 className="font-bold text-sm flex items-center gap-2">
            <Camera className="w-4 h-4 text-[#662D91]" /> Verificación de identidad
          </h3>
          <button onClick={close} className="text-muted-foreground hover:text-foreground">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <div className="rounded-xl overflow-hidden bg-black aspect-[3/4] flex items-center justify-center">
            {error ? (
              <div className="text-sm text-white/80 px-6 text-center">{error}</div>
            ) : shot ? (
              <img src={shot} alt="Selfie" className="w-full h-full object-cover" />
            ) : (
              <video ref={videoRef} playsInline muted className="w-full h-full object-cover -scale-x-100" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Toma una selfie para confirmar tu identidad en el fichaje.
          </p>
        </div>

        <div className="flex gap-2 px-4 pb-4">
          {shot ? (
            <>
              <button
                onClick={retake}
                className="flex-1 h-10 rounded-xl bg-muted text-foreground text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                <RefreshCw className="w-4 h-4" /> Repetir
              </button>
              <button
                onClick={confirm}
                className="flex-1 h-10 rounded-xl bg-[#662D91] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5"
              >
                <Check className="w-4 h-4" /> Confirmar
              </button>
            </>
          ) : (
            <>
              <button
                onClick={close}
                className="flex-1 h-10 rounded-xl bg-muted text-foreground text-sm font-bold"
              >
                Omitir
              </button>
              <button
                onClick={capture}
                disabled={!!error}
                className="flex-1 h-10 rounded-xl bg-[#662D91] text-white text-sm font-bold inline-flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                <Camera className="w-4 h-4" /> Capturar
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
