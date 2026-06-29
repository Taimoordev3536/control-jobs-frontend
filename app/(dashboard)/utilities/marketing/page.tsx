"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Copy, Check, Share2, FileText } from "lucide-react"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"
import { AnimatedLoader } from "@/components/animated-loader"

export default function MarketingPage() {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const [link, setLink] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!session?.accessToken) return
    setLoading(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/employer-invitations`, {
        headers: { Authorization: `Bearer ${session.accessToken}` },
      })
      if (res.ok) {
        const json = await res.json()
        const rows = json?.data || []
        const withLink = rows.find((r: any) => r.inviteLink)
        setLink(withLink?.inviteLink || "")
      }
    } catch {
      /* swallow */
    } finally {
      setLoading(false)
    }
  }, [session?.accessToken])

  useEffect(() => {
    load()
  }, [load])

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      toast({ title: t("somethingWentWrong") || "Something went wrong", variant: "destructive" })
    }
  }

  return (
    <div className="w-full p-6 bg-background min-h-screen space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">{t("marketingResources") || "Marketing resources"}</h1>

      {/* Affiliate link */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-3">
        <div className="flex items-center gap-2">
          <Share2 className="h-5 w-5 text-[#662D91]" />
          <h2 className="text-base font-semibold text-foreground">{t("affiliateLink") || "Affiliate link"}</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          {t("affiliateLinkDesc") || "Share this link to invite employers. Sign-ups are linked to your account."}
        </p>

        {loading ? (
          <AnimatedLoader size={24} />
        ) : link ? (
          <div className="flex gap-2 max-w-2xl">
            <Input readOnly value={link} className="bg-muted/30" />
            <Button onClick={copy} className="gap-2 bg-purple-600 hover:bg-purple-700 text-white shrink-0">
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? t("copied") || "Copied" : t("copyLink") || "Copy link"}
            </Button>
          </div>
        ) : (
          <Link href="/utilities/invite">
            <Button variant="outline" className="border-[#662D91] text-[#662D91] hover:bg-purple-50">
              {t("invitations") || "Invitar"}
            </Button>
          </Link>
        )}
      </div>

      {/* Marketing materials */}
      <div className="bg-card rounded-lg shadow-sm border border-border p-6 space-y-3">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-[#662D91]" />
          <h2 className="text-base font-semibold text-foreground">{t("marketingMaterials") || "Marketing materials"}</h2>
        </div>
        <p className="text-sm text-muted-foreground">{t("noMaterialsYet") || "No materials available yet."}</p>
      </div>
    </div>
  )
}
