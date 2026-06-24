"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { AnimatedLoader } from "@/components/animated-loader"
import { useAuth } from "@/hooks/use-auth"
import { useTranslation } from "@/hooks/use-translation"
import { useToast } from "@/hooks/use-toast"
import { useBackendError } from "@/lib/backend-error"

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  endpoint: string
  successMessage: string
}

export function SupportMessageDialog({ open, onOpenChange, title, description, endpoint, successMessage }: Props) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const translateBackendError = useBackendError()
  const [message, setMessage] = useState("")
  const [sending, setSending] = useState(false)

  const submit = async () => {
    if (!session?.accessToken || !message.trim()) return
    setSending(true)
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}${endpoint}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: message.trim() }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err.message || `Error ${res.status}`)
      }
      toast({ title: successMessage, variant: "success" })
      setMessage("")
      onOpenChange(false)
    } catch (err: any) {
      toast({ title: translateBackendError(err), variant: "destructive" })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
        <Textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          rows={5}
          placeholder={t("typeYourMessage") || "Type your message..."}
        />
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("cancel")}
          </Button>
          <Button
            onClick={submit}
            disabled={sending || !message.trim()}
            className="bg-purple-600 hover:bg-purple-700 text-white"
          >
            {sending ? <AnimatedLoader size={16} className="mr-1" /> : null}
            {t("send") || "Send"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
