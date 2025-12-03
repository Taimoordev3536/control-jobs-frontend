"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { MapPin, QrCode, Globe, Lock, Smartphone, Monitor } from "lucide-react"
import { QrCodeScanner, GpsSignIn, IpSignIn, WebSignIn } from "./signin-methods/main"
import { useTranslation } from "@/hooks/use-translation"
import bg from "@/public/bg.jpg"

type MethodKey = "QRCODE" | "IP" | "WEB" | "GPS"

interface Props {
  isOpen: boolean
  signingMethods?: Array<string>
  onClose: () => void
  onSelect: (method: MethodKey) => void
  workerName?: string
}

function detectMobileDevice(): boolean {
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent || "" : ""
    const mobile = /Mobi|Android|iPhone|iPad|iPod|Windows Phone|webOS|BlackBerry/i.test(ua)
    // also treat devices with touch points as mobile/tablet
    const hasTouch = typeof navigator !== "undefined" && (navigator as any).maxTouchPoints > 0
    return Boolean(mobile || hasTouch)
  } catch (e) {
    return false
  }
}

const normalize = (s: any) => String(s || "").trim().toUpperCase()

const methodLabel = (m: string) => {
  switch (m) {
    case "QRCODE":
      return "QR Code"
    case "GPS":
      return "GPS"
    case "IP":
      return "IP"
    case "WEB":
      return "Web"
    default:
      return m
  }
}

const MethodIcon = ({ m, color = "currentColor" }: { m: string; color?: string }) => {
  switch (m) {
    case "QRCODE":
      return <QrCode className="w-4 h-4" color={color} />
    case "GPS":
      return <MapPin className="w-4 h-4" color={color} />
    case "IP":
      return <Globe className="w-4 h-4" color={color} />
    case "WEB":
      return <Lock className="w-4 h-4" color={color} />
    default:
      return null
  }
}

// small helper to convert hex color to rgba string with an alpha
const hexToRgba = (hex: string, alpha = 1) => {
  const sanitized = hex.replace(/^#/, "")
  const full = sanitized.length === 3 ? sanitized.split("").map((c) => c + c).join("") : sanitized
  const int = parseInt(full, 16)
  const r = (int >> 16) & 255
  const g = (int >> 8) & 255
  const b = int & 255
  return `rgba(${r},${g},${b},${alpha})`
}

const methodColors: Record<MethodKey, string> = {
  QRCODE: "#3b82f6", // blue-500
  IP: "#f97316", // orange-500
  GPS: "#10b981", // green-500
  WEB: "#662D91", // purple
}

// Method button with hover effects (lift, stronger tint, subtle shadow)
const MethodButton = ({ m, onClick }: { m: MethodKey; onClick: () => void }) => {
  const [hover, setHover] = React.useState(false)
  const hex = methodColors[m] ?? "#000000"
  const bg = hexToRgba(hex, hover ? 0.16 : 0.10)
  const border = hexToRgba(hex, hover ? 0.26 : 0.18)
  const iconBg = hexToRgba(hex, hover ? 1 : 0.95)
  const shadow = hover ? `0 10px 24px ${hexToRgba(hex, 0.14)}` : "none"

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        backgroundColor: bg,
        border: `1px solid ${border}`,
        boxShadow: shadow,
        transform: hover ? "translateY(-3px)" : "translateY(0)",
        transition: "transform 150ms ease, box-shadow 150ms ease, background-color 150ms ease",
      }}
      className="flex items-center gap-3 p-4 rounded-lg"
    >
      <div style={{ backgroundColor: iconBg }} className="p-2 rounded flex items-center justify-center text-white shadow-md">
        <MethodIcon m={m} color="#fff" />
      </div>
      <div className="text-left">
        <div className="text-sm font-medium" style={{ color: "rgba(0,0,0,0.85)" }}>{methodLabel(m)}</div>
      </div>
    </button>
  )
}

export default function SignInMethodDialog({ isOpen, signingMethods = [], onClose, onSelect }: Props) {
  const { t } = useTranslation("dashboard")
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)
  const [selectedMethod, setSelectedMethod] = React.useState<null | "QRCODE" | "IP" | "WEB" | "GPS">(null)

  // optional worker name to show greeting
  const workerName = (arguments && (arguments as any)[0] && (arguments as any)[0].workerName) || undefined

  React.useEffect(() => {
    // detect once on client
    setIsMobile(detectMobileDevice())
  }, [])

  // Allowed per device
  const allowedForDevice = isMobile ? ["QRCODE", "IP", "WEB", "GPS"] : ["IP", "WEB"]

  // normalize incoming list and take intersection
  const provided = Array.isArray(signingMethods) ? signingMethods.map(normalize) : []
  const uniqueProvided = Array.from(new Set(provided))
  const available = uniqueProvided.filter((m) => allowedForDevice.includes(m)) as MethodKey[]

  // friendly fallback: if no methods available, show nothing message

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        className="max-w-md p-0"
        style={{
          backgroundImage: `url(${(bg as any)?.src ?? bg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        {/* frosted glass inner panel for readability (glassy effect) */}
        <div
          className="relative z-0 m-4 rounded-md overflow-hidden"
          style={{
            // ultra-clear glass so background shows through strongly
            background: "rgba(255,255,255,0.02)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
          }}
        >
          {/* very subtle glossy highlight (almost invisible) */}
          <div className="absolute inset-0 pointer-events-none" style={{background: "linear-gradient(180deg, rgba(255,255,255,0.02), rgba(255,255,255,0))"}} />
          <DialogHeader className="p-6">
            <div className="relative">
              <div className="text-center">
                <div className="text-lg text-purple-700 font-bold">{new Date().toLocaleDateString(typeof navigator !== 'undefined' ? navigator.language : undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <h2 className="text-3xl font-bold text-purple-700 mt-2">{t("hello") || "Hello"} {workerName || "Worker"}</h2>
                <p className="text-lg text-black mt-2 font-semibold">{t("chooseClockInMethod") || "Choose sign-in method"}</p>
              </div>
            </div>
          </DialogHeader>

          <div className="p-6">
          {isMobile === undefined ? (
            <div className="text-sm text-gray-500">Detecting device...</div>
          ) : selectedMethod ? (
            <div>
              {selectedMethod === 'QRCODE' && (
                <QrCodeScanner
                  onBack={() => setSelectedMethod(null)}
                  onComplete={() => {
                    onSelect('QRCODE')
                    setSelectedMethod(null)
                  }}
                />
              )}
              {selectedMethod === 'GPS' && (
                <GpsSignIn
                  onBack={() => setSelectedMethod(null)}
                  onComplete={() => {
                    onSelect('GPS')
                    setSelectedMethod(null)
                  }}
                />
              )}
              {selectedMethod === 'IP' && (
                <IpSignIn
                  onBack={() => setSelectedMethod(null)}
                  onComplete={() => {
                    onSelect('IP')
                    setSelectedMethod(null)
                  }}
                />
              )}
              {selectedMethod === 'WEB' && (
                (() => {
                  onSelect('WEB');
                  setSelectedMethod(null);
                  return null;
                })()
              )}
            </div>
          ) : available.length === 0 ? (
            <div className="text-sm text-gray-500">No available sign-in methods for your device.</div>
          ) : (
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 bg-gray-100 rounded">
                  {isMobile ? <Smartphone className="w-5 h-5 text-gray-700 font-bold" /> : <Monitor className="w-5 h-5 text-gray-700" />}
                </div>
                <div className="text-lg font-bold">
                  {isMobile ? (t("mobile") || "Mobile") : (t("pc") || "PC")}:
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {available.map((m) => (
                  <MethodButton key={m} m={m} onClick={() => setSelectedMethod(m as any)} />
                ))}
              </div>
            </div>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
