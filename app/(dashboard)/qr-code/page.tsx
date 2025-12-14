"use client"

import { useState, useEffect } from "react"
import { useSession } from "next-auth/react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useTranslation } from "@/hooks/use-translation"
import { Loader2, Download, RefreshCw } from "lucide-react"

export default function QRCodePage() {
  const { t } = useTranslation()
  const { data: session } = useSession()
  const [qrImage, setQrImage] = useState<string | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [qrType, setQrType] = useState<"STATIC" | "DYNAMIC">("STATIC")
  const [expiresAt, setExpiresAt] = useState<Date | null>(null)
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date | null>(null)

  const generateQRCode = async () => {
    setLoading(true)
    setError(null)

    try {
      console.log("Generating QR code with type:", qrType)
      console.log("Session:", session)
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/jobs/generate-qr`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          type: qrType,
        }),
      })

      console.log("Response status:", response.status)
      
      if (!response.ok) {
        const errorText = await response.text()
        console.error("Error response:", errorText)
        throw new Error(`Failed to generate QR code: ${errorText}`)
      }

      const result = await response.json()
      console.log("QR Code data received:", result)
      
      // Extract data from wrapped response
      const data = result.data || result
      
      setQrImage(data.qrImage)
      setToken(data.token)
      setExpiresAt(data.expiresAt ? new Date(data.expiresAt) : null)
      setLastRefreshedAt(data.lastRefreshedAt ? new Date(data.lastRefreshedAt) : null)
    } catch (err) {
      console.error("QR Code generation error:", err)
      setError(err instanceof Error ? err.message : "Failed to generate QR code")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.accessToken) {
      generateQRCode()
    }
  }, [session?.accessToken, qrType])

  const downloadQRCode = () => {
    if (!qrImage) return

    const link = document.createElement("a")
    link.href = qrImage
    link.download = `qr-code-${token}.png`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{t("qrCode")}</h1>
        <p className="text-muted-foreground mt-2">
          {t("generateAndDownloadYourQRCode")}
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* QR Code Display */}
        <Card>
          <CardHeader>
            <CardTitle>{t("yourQRCode")}</CardTitle>
            <CardDescription>
              {qrType === "DYNAMIC" 
                ? t("dynamicQRCodeDescription") 
                : t("staticQRCodeDescription")}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center gap-4">
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-center p-4">
                {error}
              </div>
            ) : qrImage ? (
              <>
                <div className="bg-white p-4 rounded-lg border">
                  <img 
                    src={qrImage} 
                    alt="QR Code" 
                    className="w-64 h-64"
                  />
                </div>
                <div className="flex gap-2 w-full">
                  <Button 
                    onClick={downloadQRCode} 
                    className="flex-1"
                    variant="outline"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {t("download")}
                  </Button>
                  <Button 
                    onClick={generateQRCode} 
                    className="flex-1"
                  >
                    <RefreshCw className="mr-2 h-4 w-4" />
                    {t("refresh")}
                  </Button>
                </div>
              </>
            ) : null}
          </CardContent>
        </Card>

        {/* QR Code Info */}
        <Card>
          <CardHeader>
            <CardTitle>{t("qrCodeInformation")}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* QR Type Selection */}
            <div>
              <label className="text-sm font-medium mb-2 block">
                {t("qrCodeType")}
              </label>
              <div className="flex gap-2">
                <Button
                  variant={qrType === "STATIC" ? "default" : "outline"}
                  onClick={() => setQrType("STATIC")}
                  className="flex-1"
                >
                  {t("static")}
                </Button>
                <Button
                  variant={qrType === "DYNAMIC" ? "default" : "outline"}
                  onClick={() => setQrType("DYNAMIC")}
                  className="flex-1"
                >
                  {t("dynamic")}
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                {qrType === "STATIC" 
                  ? t("staticQRCodeInfo") 
                  : t("dynamicQRCodeInfo")}
              </p>
            </div>

            {/* Token Display */}
            {token && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("token")}
                </label>
                <div className="p-3 bg-muted rounded-md font-mono text-xs break-all">
                  {token}
                </div>
              </div>
            )}

            {/* Expiry Info for Dynamic QR */}
            {qrType === "DYNAMIC" && expiresAt && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("expiresAt")}
                </label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {expiresAt.toLocaleString()}
                </div>
              </div>
            )}

            {/* Last Refreshed */}
            {lastRefreshedAt && (
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {t("lastRefreshed")}
                </label>
                <div className="p-3 bg-muted rounded-md text-sm">
                  {lastRefreshedAt.toLocaleString()}
                </div>
              </div>
            )}

            <div className="pt-4 border-t">
              <h4 className="font-medium mb-2">{t("howToUse")}</h4>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>{t("qrCodeUsageStep1")}</li>
                <li>{t("qrCodeUsageStep2")}</li>
                <li>{t("qrCodeUsageStep3")}</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
