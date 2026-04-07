"use client"

import { useState, useEffect } from "react"
import { Printer, Mail, RefreshCw, QrCode } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { toast } from "@/hooks/use-toast"
import { Input } from "@/components/ui/input"
import { AnimatedLoader } from "@/components/animated-loader"

interface QrCodeData {
  id: string
  type: 'STATIC' | 'DYNAMIC'
  token: string
  qrImage: string
  isActive: boolean
  isSelected: boolean
  expiresAt?: string
  lastRefreshedAt?: string
}

interface WorkCenterData {
  id: number
  name: string
  locality?: string
  clientName?: string
  employer?: {
    name: string
    address?: string
    postalCode?: string
    city?: string
    province?: string
    logoUrl?: string
  }
}

interface QrCodeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  workCenterId: string
  qrData?: { active: boolean; code: string }
  onUpdate: () => void
}

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

/**
 * Print the QR by opening a popup window with self-contained HTML.
 * This gives us full control of @page size (A5 landscape), margins, and layout —
 * which react-to-print wasn't reliably delivering (Chrome was falling back to A4).
 *
 * Layout (A5 landscape, 210 × 148 mm):
 *  - 6mm gray frame on every side (uniform border)
 *  - Work Center Name + City:  fixed 20mm block, both lines share an auto-scaled
 *                              single-line font (white-space: nowrap, no wrap)
 *  - QR code: fills remaining vertical space
 *  - Client Name:              fixed 12mm block, single line, auto-scaled
 *  - Footer 18mm: employer (4 lines, white italic, left) + ControlJobs (2 lines, right)
 */
function openQrPrintWindow(args: {
  qrImage: string
  workCenterName: string
  workCenterCity: string
  clientName: string
  employer?: {
    name?: string
    address?: string
    postalCode?: string
    city?: string
    province?: string
    logoUrl?: string
  }
}): boolean {
  const { qrImage, workCenterName, workCenterCity, clientName, employer } = args
  const wcName = (workCenterName || "").toUpperCase()
  const wcCity = (workCenterCity || "").toUpperCase()
  const cName = (clientName || "").toUpperCase()
  const empPcCity = [employer?.postalCode, employer?.city].filter(Boolean).join(" ")

  // Employer logo HTML — only rendered if logoUrl is available
  const empLogoHtml = employer?.logoUrl
    ? `<img id="emp-logo" class="emp-logo" src="${escapeHtml(employer.logoUrl)}" alt="" />`
    : ""

  // Build absolute URL for logo so the popup can load it
  // Embed ControlJobs logo as data URL since popup is about:blank and can't load from origin
  const logoUrl = "data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0idXRmLTgiPz4NCjwhLS0gR2VuZXJhdG9yOiBBZG9iZSBJbGx1c3RyYXRvciAyMi4xLjAsIFNWRyBFeHBvcnQgUGx1Zy1JbiAuIFNWRyBWZXJzaW9uOiA2LjAwIEJ1aWxkIDApICAtLT4NCjxzdmcgdmVyc2lvbj0iMS4xIiBpZD0iQ2FwYV8xIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIiB4PSIwcHgiIHk9IjBweCINCgkgdmlld0JveD0iMCAwIDI5MC4xIDU1LjMiIHN0eWxlPSJlbmFibGUtYmFja2dyb3VuZDpuZXcgMCAwIDI5MC4xIDU1LjM7IiB4bWw6c3BhY2U9InByZXNlcnZlIj4NCjxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+DQoJLnN0MHtmaWxsOiMzMzMzMzM7fQ0KCS5zdDF7ZmlsbDojNjYyRDkxO30NCgkuc3Qye2ZpbGw6IzMzMzMzMztzdHJva2U6IzMzMzMzMztzdHJva2Utd2lkdGg6MS41O3N0cm9rZS1taXRlcmxpbWl0OjEwO30NCjwvc3R5bGU+DQo8Zz4NCgk8Zz4NCgkJPGc+DQoJCQk8Zz4NCgkJCQk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMzUuNCwzMy4xYzEuNCwwLDEuOSwxLjEsMSwyLjNjLTMuNyw1LjItOS41LDguNS0xNS45LDguNUM5LjIsNDMuOSwwLDM0LDAsMjEuN0MwLDEwLDkuMiwwLDIwLjQsMA0KCQkJCQljNi40LDAsMTIsMy4yLDE1LjgsOC4yYzAuOSwxLjMsMC4zLDIuMy0xLjEsMi4zaC0xYy0wLjksMC0xLjUtMC4zLTIuMi0xYy0yLjktMy4yLTctNS4yLTExLjQtNS4yYy05LDAtMTYuMyw3LjktMTYuMywxNy4zDQoJCQkJCWMwLDkuOSw3LjIsMTcuOCwxNi4zLDE3LjhjNC41LDAsOC43LTIsMTEuNi01LjNjMC43LTAuOCwxLjMtMS4xLDIuMi0xLjFIMzUuNHoiLz4NCgkJCQk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNNDIuNCwzMC4yYzAtNy41LDYuMi0xMy43LDEzLjctMTMuN2M3LjUsMCwxMy43LDYuMiwxMy43LDEzLjdjMCw3LjQtNi4yLDEzLjgtMTMuNywxMy44DQoJCQkJCUM0OC42LDQ0LDQyLjQsMzcuNiw0Mi40LDMwLjJ6IE00Ni42LDMwLjJjMCw1LjIsNC4xLDkuOCw5LjUsOS44czkuNS00LjYsOS41LTkuOGMwLTUuMy00LjEtOS43LTkuNS05LjdTNDYuNiwyNC44LDQ2LjYsMzAuMnoiDQoJCQkJCS8+DQoJCQkJPHBhdGggY2xhc3M9InN0MCIgZD0iTTc4LDQzLjNjLTEuMywwLTEuOS0wLjctMS45LTEuOVYxOC44YzAtMS4zLDAuNy0xLjksMS45LTEuOWgwLjJjMS4zLDAsMS45LDAuNywxLjksMS45djEuMw0KCQkJCQljMi4xLTIuMyw1LTMuNiw4LjYtMy42YzcuNiwwLDEwLjgsMy40LDEwLjgsMTEuOHYxMy4xYzAsMS4zLTAuNywxLjktMS45LDEuOWgtMC4yYy0xLjMsMC0xLjktMC43LTEuOS0xLjlWMjguMw0KCQkJCQljMC01LjItMi40LTcuOC02LjgtNy44Yy01LjMtMC4xLTguNiwyLjktOC42LDguOHYxMi4xYzAsMS4zLTAuNywxLjktMS45LDEuOUg3OHoiLz4NCgkJCQk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTE3LDIwLjZoLTR2MjAuOGMwLDEuMy0wLjcsMS45LTEuOSwxLjloLTAuMmMtMS4zLDAtMS45LTAuNy0xLjktMS45VjIwLjZoLTJjLTEuMywwLTEuOS0wLjctMS45LTEuOQ0KCQkJCQljMC0xLjEsMC43LTEuNywxLjktMS43aDJWOC41YzAtMS4zLDAuNy0xLjksMS45LTEuOWgwLjJjMS4zLDAsMS45LDAuNywxLjksMS45djguNWg0YzEuMywwLDEuOSwwLjYsMS45LDEuOA0KCQkJCQlTMTE4LjIsMjAuNiwxMTcsMjAuNnoiLz4NCgkJCQk8cGF0aCBjbGFzcz0ic3QwIiBkPSJNMTI4LjMsMjAuNWMxLjctMiw0LjEtMy40LDctMy44YzEuMy0wLjIsMiwwLjUsMiwxLjh2MC4xYzAsMS4zLTAuNywxLjgtMS45LDJjLTMuOSwwLjYtNy4xLDMuNC03LjEsOC4xDQoJCQkJCXYxMi43YzAsMS4zLTAuNywxLjktMS45LDEuOWgtMC4yYy0xLjMsMC0xLjktMC43LTEuOS0xLjlWMTguOGMwLTEuMywwLjctMS45LDEuOS0xLjloMC4yYzEuMywwLDEuOSwwLjcsMS45LDEuOVYyMC41eiIvPg0KCQkJCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xNzUuOCw0My4zYy0xLjMsMC0xLjktMC43LTEuOS0xLjl2LTM5YzAtMS4zLDAuNy0xLjksMS45LTEuOWgwLjJjMS4zLDAsMS45LDAuNywxLjksMS45djM5DQoJCQkJCWMwLDEuMy0wLjcsMS45LTEuOSwxLjlIMTc1Ljh6Ii8+DQoJCQk8L2c+DQoJCTwvZz4NCgkJPGc+DQoJCQk8cGF0aCBjbGFzcz0ic3QxIiBkPSJNMTgwLjcsNTIuOGMwLTEuMiwwLjctMS44LDEuOS0yYzYuNC0wLjcsMTAuMS01LDEwLjEtMTEuOVYyLjRjMC0xLjMsMC43LTEuOSwxLjktMS45aDAuNQ0KCQkJCWMxLjMsMCwxLjksMC43LDEuOSwxLjl2MzYuNWMwLDkuNy01LjMsMTUuNi0xNC40LDE2LjRjLTEuMywwLjEtMi0wLjctMi0xLjlWNTIuOHoiLz4NCgkJCTxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yMDQsMzAuMmMwLTcuNSw2LjItMTMuNywxMy43LTEzLjdjNy41LDAsMTMuNyw2LjIsMTMuNywxMy43YzAsNy40LTYuMiwxMy44LTEzLjcsMTMuOA0KCQkJCUMyMTAuMSw0NCwyMDQsMzcuNiwyMDQsMzAuMnogTTIwOC4yLDMwLjJjMCw1LjIsNC4xLDkuOCw5LjUsOS44czkuNS00LjYsOS41LTkuOGMwLTUuMy00LjEtOS43LTkuNS05LjdTMjA4LjIsMjQuOCwyMDguMiwzMC4yeiINCgkJCQkvPg0KCQkJPHBhdGggY2xhc3M9InN0MSIgZD0iTTIzOS41LDQzLjNjLTEuMywwLTEuOS0wLjctMS45LTEuOXYtMzljMC0xLjMsMC43LTEuOSwxLjktMS45aDAuMmMxLjMsMCwxLjksMC43LDEuOSwxLjl2MTguOA0KCQkJCWMyLjQtMi45LDUuOS00LjcsMTAtNC43YzcuNSwwLDEzLjcsNi4yLDEzLjcsMTMuN2MwLDcuNC02LjIsMTMuOC0xMy43LDEzLjhjLTQsMC03LjYtMS45LTEwLTQuOXYyLjNjMCwxLjMtMC43LDEuOS0xLjksMS45DQoJCQkJSDIzOS41eiBNMjYxLjEsMzAuMmMwLTUuMy00LTkuNy05LjQtOS43Yy01LjIsMC05LjgsNC40LTkuOCw5LjdjMCw1LjIsNC42LDkuOCw5LjgsOS44QzI1Ny4xLDQwLDI2MS4xLDM1LjQsMjYxLjEsMzAuMnoiLz4NCgkJCTxwYXRoIGNsYXNzPSJzdDEiIGQ9Ik0yODQuNywyMmMtMC45LTEuMS0yLjYtMS43LTQuOC0xLjdjLTMuMiwwLTUuNCwxLjUtNS40LDMuNWMwLDIsMS43LDMuMSw2LjEsNGM2LjgsMS40LDkuNSwzLjcsOS41LDguMQ0KCQkJCWMwLDQuNi0zLjUsNy45LTEwLjEsNy45Yy01LDAtOC42LTIuMy05LjgtNS45Yy0wLjQtMS4zLDAuNC0yLDEuNy0yYzEuMSwwLDEuNiwwLjUsMi4yLDEuNGMxLDEuNiwzLjIsMi43LDUuOSwyLjcNCgkJCQljMy45LDAsNi41LTEuNyw2LjUtNC4xYzAtMi41LTEuNy0zLjQtNi41LTQuM2MtNi4zLTEuMy05LjEtMy41LTkuMS03LjdjMC00LDMuMS03LjMsOS4xLTcuM2M0LjMsMCw3LjMsMS45LDguNiw0LjgNCgkJCQljMC41LDEuMy0wLjIsMi4xLTEuNiwyLjFDMjg1LjksMjMuNCwyODUuNCwyMi45LDI4NC43LDIyeiIvPg0KCQk8L2c+DQoJPC9nPg0KCTxnPg0KCQk8cGF0aCBjbGFzcz0ic3QyIiBkPSJNMTY0LjMsMjIuNGMtMi4xLTIuNy01LjEtNC41LTguNC01Yy0zLjMtMC40LTYuNiwwLjQtOS4zLDIuNWwtMS0xYy0wLjMtMC4zLTAuNS0wLjItMC42LDAuMmwtMC4zLDMuNQ0KCQkJYzAsMC40LDAuMywwLjcsMC42LDAuN2wzLjUtMC4zYzAuNCwwLDAuNS0wLjMsMC4yLTAuNmwtMS0xYzIuMi0xLjYsNC45LTIuMyw3LjYtMS45YzIuOCwwLjQsNS4zLDEuOSw3LjEsNC4yDQoJCQljMS43LDIuMywyLjUsNS4yLDIuMSw4Yy0wLjMsMi0xLjEsMy45LTIuMyw1LjVjLTAuNSwwLjYtMS4xLDEuMi0xLjgsMS43Yy0yLjMsMS44LTUuMSwyLjUtNy45LDIuMmMtMi44LTAuNC01LjMtMS45LTcuMS00LjINCgkJCWMtMS43LTIuMi0yLjUtNS0yLjEtNy44YzAuMS0wLjYtMC4zLTEuMS0wLjktMS4yYy0wLjYtMC4xLTEuMSwwLjMtMS4xLDAuOWMtMC40LDMuNCwwLjUsNi43LDIuNiw5LjRjMi4xLDIuNyw1LjEsNC41LDguNCw1DQoJCQljMy40LDAuNCw2LjctMC41LDkuNC0yLjZjMC44LTAuNiwxLjUtMS4zLDIuMS0yLjFjMS41LTEuOSwyLjUtNC4xLDIuOC02LjVDMTY3LjMsMjguNiwxNjYuNCwyNS4yLDE2NC4zLDIyLjR6Ii8+DQoJCTxwYXRoIGNsYXNzPSJzdDAiIGQ9Ik0xNTMuNywyMS45Yy0wLjUsMC0wLjgsMC40LTAuOCwwLjh2OC40bDcuNSw0YzAuMSwwLjEsMC4zLDAuMSwwLjQsMC4xYzAuMywwLDAuNi0wLjIsMC43LTAuNQ0KCQkJYzAuMi0wLjQsMC4xLTAuOS0wLjQtMS4xbC02LjctMy41di03LjRDMTU0LjUsMjIuMywxNTQuMiwyMS45LDE1My43LDIxLjl6Ii8+DQoJPC9nPg0KPC9nPg0KPC9zdmc+DQo="

  const html = `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<title>QR</title>
<style>
  @page {
    size: portrait;
    margin: 0;
  }
  * {
    box-sizing: border-box;
    margin: 0; padding: 0;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    color-adjust: exact;
  }
  html, body {
    margin: 0; padding: 0;
    width: 100vw; height: 100vh;
    font-family: Arial, Helvetica, sans-serif;
    background: #a6a6a6;
    overflow: hidden;
  }
  .page {
    position: absolute;
    top: 0; left: 0; right: 0; bottom: 0;
    padding: 2% 3%;
    display: flex; flex-direction: column;
    gap: 1.5%;
    overflow: hidden;
  }
  .wc, .client {
    background: #fff;
    display: flex; align-items: center; justify-content: center;
    overflow: hidden;
    flex-shrink: 0;
  }
  .wc { flex: 0 0 14%; padding: 0.5% 2%; }
  .wc-inner { width: 100%; text-align: center; line-height: 1.15; }
  .wc-inner .line,
  .client .line {
    display: block;
    white-space: nowrap;
    font-weight: 700;
    letter-spacing: 0.05em;
    color: #000;
  }
  .wc-inner .line + .line { margin-top: 0.5%; }
  .qr {
    flex: 1 1 auto;
    background: #fff;
    padding: 2% 1%;
    display: flex; align-items: center; justify-content: center;
    min-height: 0;
    overflow: hidden;
  }
  .qr img { width: 80%; height: auto; max-height: 95%; object-fit: contain; }
  .client { flex: 0 0 6%; padding: 0.5% 3%; }
  .client .line { width: 100%; text-align: center; }
  .footer {
    flex: 0 0 12%;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
    padding: 0 0.5%;
    color: #fff;
    flex-shrink: 0;
  }
  .emp-section {
    display: flex;
    align-items: flex-end;
    gap: 2%;
    max-width: 60%;
  }
  .emp-logo {
    height: 80%;
    width: auto;
    max-width: 15%;
    object-fit: contain;
    flex-shrink: 0;
    filter: brightness(0) invert(1);
  }
  .emp {
    display: flex; flex-direction: column;
    gap: 3px;
    font-style: italic;
    font-size: 14pt;
    line-height: 1.3;
  }
  .emp span {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    color: #fff;
  }
  .emp .n { font-weight: 700; }
  .brand {
    display: flex; flex-direction: column;
    align-items: flex-end;
    justify-content: flex-end;
    gap: 2px;
    height: 100%;
  }
  .brand .pw {
    color: #fff;
    font-size: 14pt;
    font-style: italic;
    font-weight: 500;
  }
  .brand img { height: 50%; width: auto; max-width: 100%; }
</style>
</head>
<body>
  <div class="page">
    <div class="wc">
      <div class="wc-inner">
        <span class="line">${escapeHtml(wcName)}</span>
        ${wcCity ? `<span class="line">${escapeHtml(wcCity)}</span>` : ""}
      </div>
    </div>
    <div class="qr"><img id="qr-img" src="${escapeHtml(qrImage)}" alt="QR" /></div>
    <div class="client">
      <span class="line">${escapeHtml(cName)}</span>
    </div>
    <div class="footer">
      <div class="emp-section">
        ${empLogoHtml}
        <div class="emp">
          <span class="n">${escapeHtml(employer?.name || "")}</span>
          <span>${escapeHtml(employer?.address || "")}</span>
          <span>${escapeHtml(empPcCity)}</span>
          <span>${escapeHtml(employer?.province || "")}</span>
        </div>
      </div>
      <div class="brand">
        <span class="pw">Powered by</span>
        <img id="cj-logo" src="${escapeHtml(logoUrl)}" alt="ControlJobs" />
      </div>
    </div>
  </div>
<script>
(function () {
  function fitLines(container, lines, maxPt, minPt) {
    if (!container || lines.length === 0) return;
    var usable = container.clientWidth - 2;
    var fs = maxPt;
    var step = 0.5;
    function apply(s) { for (var i = 0; i < lines.length; i++) lines[i].style.fontSize = s + 'pt'; }
    apply(fs);
    var guard = 0;
    while (fs > minPt && guard < 500) {
      var over = false;
      for (var j = 0; j < lines.length; j++) {
        if (lines[j].scrollWidth > usable) { over = true; break; }
      }
      if (!over) break;
      fs -= step;
      apply(fs);
      guard++;
    }
  }

  function fitAll() {
    var wc = document.querySelector('.wc-inner');
    var wcLines = wc ? Array.prototype.slice.call(wc.querySelectorAll('.line')) : [];
    fitLines(wc, wcLines, 96, 10);

    var cl = document.querySelector('.client');
    var clLines = cl ? Array.prototype.slice.call(cl.querySelectorAll('.line')) : [];
    fitLines(cl, clLines, 40, 8);
  }

  function waitForImg(img) {
    return new Promise(function (res) {
      if (!img || img.complete) return res();
      img.addEventListener('load', function () { res(); }, { once: true });
      img.addEventListener('error', function () { res(); }, { once: true });
    });
  }

  var imgs = [
    document.getElementById('qr-img'),
    document.getElementById('cj-logo'),
    document.getElementById('emp-logo')
  ].filter(Boolean);

  Promise.all(imgs.map(waitForImg)).then(function () {
    fitAll();
    setTimeout(function () {
      window.focus();
      window.print();
      setTimeout(function () { window.close(); }, 600);
    }, 100);
  });
})();
</script>
</body>
</html>`

  const w = window.open("", "_blank", "width=900,height=650,menubar=no,toolbar=no,location=no,status=no")
  if (!w) return false
  w.document.open()
  w.document.write(html)
  w.document.close()
  return true
}

export function QrCodeDialog({ open, onOpenChange, workCenterId, qrData, onUpdate }: QrCodeDialogProps) {
  const { session } = useAuth()
  const { t } = useTranslation()
  const [qrType, setQrType] = useState<"STATIC" | "DYNAMIC">("STATIC")
  const [staticQr, setStaticQr] = useState<QrCodeData | null>(null)
  const [dynamicQr, setDynamicQr] = useState<QrCodeData | null>(null)
  const [clientEmail, setClientEmail] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSendingEmail, setIsSendingEmail] = useState(false)
  const [showEmailInput, setShowEmailInput] = useState(false)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [timeUntilExpiry, setTimeUntilExpiry] = useState<string>("")
  const [workCenterData, setWorkCenterData] = useState<WorkCenterData | null>(null)
  const [isLoadingWorkCenter, setIsLoadingWorkCenter] = useState(false)
  const [progressPercent, setProgressPercent] = useState(100)

  const selectedQr = qrType === "STATIC" ? staticQr : dynamicQr
  // Check both isSelected and isActive for backward compatibility with old data
  const isActive = selectedQr?.isSelected || selectedQr?.isActive || false

  const printQr = () => {
    if (!selectedQr?.qrImage) {
      toast({ title: t("noQrToPrint"), variant: "destructive" })
      return
    }
    const ok = openQrPrintWindow({
      qrImage: selectedQr.qrImage,
      workCenterName: workCenterData?.name || "",
      workCenterCity: workCenterData?.locality || "",
      clientName: workCenterData?.clientName || "",
      employer: workCenterData?.employer,
    })
    if (!ok) {
      toast({
        title: "Permite ventanas emergentes para imprimir el QR",
        variant: "destructive",
      })
    }
  }

  // Fetch QR codes when dialog opens
  useEffect(() => {
    if (!open || !session?.accessToken) return
    fetchQrCodes()
    fetchWorkCenterDetails()
  }, [open, session?.accessToken, workCenterId])

  // Update expiry countdown and progress bar for dynamic QR
  useEffect(() => {
    if (!dynamicQr?.expiresAt || !dynamicQr?.isSelected) {
      setTimeUntilExpiry("")
      setProgressPercent(100)
      return
    }

    const totalDuration = 30000 // 30 seconds
    const expiryTime = new Date(dynamicQr.expiresAt).getTime()
    const startTime = expiryTime - totalDuration

    const update = () => {
      const now = Date.now()
      const diff = expiryTime - now

      if (diff <= 0) {
        setTimeUntilExpiry("Expirado - Actualizando...")
        setProgressPercent(0)
        fetchQrCodes() // Refresh to get new token
        return
      }

      const minutes = Math.floor(diff / 60000)
      const seconds = Math.floor((diff % 60000) / 1000)
      setTimeUntilExpiry(`${minutes}:${seconds.toString().padStart(2, '0')}`)

      const elapsed = now - startTime
      const remaining = Math.max(0, totalDuration - elapsed)
      setProgressPercent(Math.min(100, (remaining / totalDuration) * 100))
    }

    update()
    const interval = setInterval(update, 200)
    return () => clearInterval(interval)
  }, [dynamicQr?.expiresAt, dynamicQr?.isSelected])

  const fetchQrCodes = async () => {
    setIsLoading(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/qr-codes`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        const data = result.data // Backend wraps response in { data: { staticQr, dynamicQr } }
        setStaticQr(data.staticQr || null)
        setDynamicQr(data.dynamicQr || null)
        
        // Set selected type based on what's currently selected
        if (data.staticQr?.isSelected) {
          setQrType("STATIC")
        } else if (data.dynamicQr?.isSelected) {
          setQrType("DYNAMIC")
        }
      }
    } catch (error) {
      console.error("Error fetching QR codes:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchWorkCenterDetails = async () => {
    setIsLoadingWorkCenter(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.accessToken}`,
          },
        }
      )

      if (response.ok) {
        const result = await response.json()
        if (result.isSuccess && result.data) {
          const data = result.data
          const emp = data.employer
          setWorkCenterData({
            id: data.id,
            name: data.name,
            locality: data.locality || data.city || "",
            clientName: data.client?.name || "",
            employer: emp ? {
              name: emp.name,
              address: emp.address,
              postalCode: emp.postalCode || emp.postal_code,
              city: emp.city,
              province: emp.province,
              logoUrl: emp.logoUrl || emp.logo_url || emp.logo || undefined,
            } : undefined
          })
        }
      }
    } catch (error) {
      console.error("Error fetching work center details:", error)
    } finally {
      setIsLoadingWorkCenter(false)
    }
  }

  const handleActivateQrType = async (type: "STATIC" | "DYNAMIC") => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/signing-methods/qr`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedType: type,
            active: true,
          }),
        }
      )

      if (response.ok) {
        await fetchQrCodes()
        // Don't call onUpdate() here to keep dialog open
      } else {
        toast({ title: t("qrActivateError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error activating QR:", error)
      toast({ title: t("qrActivateError"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeactivateQr = async () => {
    if (!session?.accessToken) return

    setIsSaving(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/signing-methods/qr`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selectedType: qrType,
            active: false,
          }),
        }
      )

      if (response.ok) {
        await fetchQrCodes()
        // Don't call onUpdate() here to keep dialog open
      } else {
        toast({ title: t("qrDeactivateError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error deactivating QR:", error)
      toast({ title: t("qrDeactivateError"), variant: "destructive" })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendEmail = async () => {
    if (!clientEmail || !session?.accessToken) return

    setIsSendingEmail(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/send-static-qr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            recipientEmail: clientEmail,
          }),
        }
      )

      if (response.ok) {
        toast({ title: t("emailSentSuccess"), variant: "success" })
        setShowEmailInput(false)
        setClientEmail("")
      } else {
        const error = await response.json()
        toast({ title: error.message || t("emailSendError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error sending email:", error)
      toast({ title: t("emailSendError"), variant: "destructive" })
    } finally {
      setIsSendingEmail(false)
    }
  }

  const handleRegenerateStaticQr = async () => {
    if (!session?.accessToken) return

    const confirmed = window.confirm(
      "¿Estás seguro de regenerar el código QR estático?\n\nEl código anterior quedará inválido y no podrá usarse para fichajes."
    )

    if (!confirmed) return

    setIsRegenerating(true)
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/work-centers/${workCenterId}/regenerate-static-qr`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            "Content-Type": "application/json",
          },
        }
      )

      if (response.ok) {
        toast({ title: t("qrRegenerateSuccess"), variant: "success" })
        await fetchQrCodes()
      } else {
        const error = await response.json()
        toast({ title: error.message || t("qrRegenerateError"), variant: "destructive" })
      }
    } catch (error) {
      console.error("Error regenerating QR:", error)
      toast({ title: t("qrRegenerateError"), variant: "destructive" })
    } finally {
      setIsRegenerating(false)
    }
  }

  const handleTypeChange = (e: React.MouseEvent, newType: "STATIC" | "DYNAMIC") => {
    e.preventDefault()
    e.stopPropagation()
    setQrType(newType)
    // Don't auto-activate - employer must manually toggle Estado switch
  }

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      onOpenChange(newOpen)
      if (!newOpen) {
        // Call onUpdate when dialog closes to refresh parent table
        onUpdate()
      }
    }}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center">
            {isLoadingWorkCenter && !workCenterData ? (
              <>
                <div className="h-5 w-40 mx-auto bg-gray-200 rounded animate-pulse" />
                <div className="h-4 w-24 mx-auto bg-gray-100 rounded animate-pulse mt-1" />
              </>
            ) : (
              <>
                <div className="text-base font-bold uppercase tracking-wide">{workCenterData?.name || ""}</div>
                {workCenterData?.locality && (
                  <div className="text-sm font-normal text-muted-foreground">{workCenterData.locality}</div>
                )}
              </>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Configuración del código QR estático o dinámico para el centro de trabajo
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <AnimatedLoader size={32} className="py-8" />
        ) : (
          <div className="space-y-4">
            {/* QR Type Toggle */}
            <div className="flex justify-center">
              <div className="inline-flex rounded-lg border border-gray-300 overflow-hidden">
                <button
                  type="button"
                  onClick={(e) => handleTypeChange(e, "STATIC")}
                  disabled={isSaving}
                  className={`px-6 py-2 text-sm font-medium transition-colors ${
                    qrType === "STATIC"
                      ? "bg-[#6B21A8] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  {t("qrStatic")}
                </button>
                <button
                  type="button"
                  onClick={(e) => handleTypeChange(e, "DYNAMIC")}
                  disabled={isSaving}
                  className={`px-6 py-2 text-sm font-medium transition-colors border-l border-gray-300 ${
                    qrType === "DYNAMIC"
                      ? "bg-[#6B21A8] text-white"
                      : "bg-white text-gray-700 hover:bg-gray-50"
                  } disabled:opacity-50`}
                >
                  {t("qrDynamic")}
                </button>
              </div>
            </div>

            {/* QR Code Display - fixed height to prevent layout shift between tabs */}
            <div className="flex flex-col items-center gap-2">
              {selectedQr?.qrImage ? (
                <img src={selectedQr.qrImage} alt="QR Code" className="w-48 h-48 border-2 border-gray-200 rounded-lg" />
              ) : (
                <div className="w-48 h-48 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center text-gray-400">
                  <div className="text-center">
                    <QrCode className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">
                      {qrType === "DYNAMIC"
                        ? t("dynamicQrInactive")
                        : t("staticQrInactive")}
                    </p>
                  </div>
                </div>
              )}
              {/* Always render progress bar row to keep consistent height */}
              <div className="h-4">
                {qrType === "DYNAMIC" && isActive && selectedQr?.qrImage && timeUntilExpiry && (
                  <div className="flex items-center gap-2 w-56">
                    <span className={`text-xs font-semibold tabular-nums whitespace-nowrap transition-colors ${
                      Math.ceil((progressPercent / 100) * 30) <= 10 ? 'text-[#C2185B]' : 'text-[#6B21A8]'
                    }`}>
                      {(() => {
                        const totalSecs = Math.ceil((progressPercent / 100) * 30)
                        const mm = String(Math.floor(totalSecs / 60)).padStart(2, '0')
                        const ss = String(totalSecs % 60).padStart(2, '0')
                        return `${mm}:${ss}`
                      })()}
                    </span>
                    <div className="h-2 flex-1 rounded-full bg-gray-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-colors ${
                        Math.ceil((progressPercent / 100) * 30) <= 10 ? 'bg-[#C2185B]' : 'bg-[#6B21A8]'
                      }`}
                        style={{
                          width: `${progressPercent}%`,
                          transition: 'width 200ms linear',
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Active Toggle */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Label className="text-sm font-medium">{t("activate")}</Label>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    isActive ? handleDeactivateQr() : handleActivateQrType(qrType)
                  }}
                  disabled={isSaving}
                  className={`relative inline-flex h-6 w-12 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#6B21A8] focus:ring-offset-2 disabled:opacity-50 ${
                    isActive ? "bg-[#6B21A8]" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-lg transition-transform ${
                      isActive ? "translate-x-7" : "translate-x-0.5"
                    }`}
                  />
                  <span
                    className={`absolute text-[10px] font-medium transition-opacity ${
                      isActive ? "left-1.5 text-white opacity-100" : "left-1.5 opacity-0"
                    }`}
                  >
                    {t("yes")}
                  </span>
                  <span
                    className={`absolute text-[10px] font-medium transition-opacity ${
                      !isActive ? "right-1.5 text-gray-600 opacity-100" : "right-1.5 opacity-0"
                    }`}
                  >
                    {t("no")}
                  </span>
                </button>
              </div>

              {/* Action Buttons - always reserve space for consistent layout */}
              <div className="flex items-center gap-2 min-h-[36px]">
                {selectedQr?.isSelected && qrType === "STATIC" && (
                  <>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={printQr} 
                      aria-label="Imprimir"
                      title="Imprimir QR"
                    >
                      <Printer className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={() => setShowEmailInput(!showEmailInput)}
                      aria-label="Enviar por email"
                      title="Enviar QR por email"
                    >
                      <Mail className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="outline" 
                      size="icon" 
                      onClick={handleRegenerateStaticQr}
                      disabled={isRegenerating}
                      aria-label="Regenerar"
                      title="Regenerar QR (el anterior quedará inválido)"
                      className="text-orange-600 hover:text-orange-700"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* Email Input */}
            {showEmailInput && qrType === "STATIC" && (
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <Label className="text-sm font-medium">{t("sendStaticQrByEmail")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="email"
                    placeholder="email@cliente.com"
                    value={clientEmail}
                    onChange={(e) => setClientEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    onClick={handleSendEmail}
                    disabled={!clientEmail || isSendingEmail}
                    className="bg-[#6B21A8] hover:bg-[#581C87] text-white"
                  >
                    {isSendingEmail ? t("sending") : t("send")}
                  </Button>
                </div>
                <p className="text-xs text-gray-500">
                  {t("sendStaticQrHint")}
                </p>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
