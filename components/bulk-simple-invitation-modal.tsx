"use client"

import { useEffect, useState } from "react"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import DateInput from "@/components/ui/date-input"
import { useTranslation } from "@/hooks/use-translation"
import { useAuth } from "@/hooks/use-auth"
import { useToast } from "@/hooks/use-toast"

type ClientType = "company" | "particular"

interface InvitationToEdit {
  publicId: string
  description: string
  expiresAt?: string | null
  occupation?: string
  type?: ClientType
}

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
  invitation?: InvitationToEdit | null
  /** Backend resource path, e.g. "worker-invitations" or "client-invitations". */
  apiPath: string
  /** Which flow this dialog is serving — controls the extra first field. */
  target: "worker" | "client"
  /** Localized title shown in the dialog header (Create / Edit). */
  titleCreate: string
  titleEdit: string
}

export default function BulkSimpleInvitationModal({
  open,
  onOpenChange,
  onCreated,
  invitation,
  apiPath,
  target,
  titleCreate,
  titleEdit,
}: Props) {
  const { t } = useTranslation()
  const { session } = useAuth()
  const { toast } = useToast()
  const isEditMode = !!invitation

  const [description, setDescription] = useState("")
  const [expiresAt, setExpiresAt] = useState<string>("")
  const [occupation, setOccupation] = useState("")
  const [clientType, setClientType] = useState<ClientType | "">("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (!open) return
    if (invitation) {
      setDescription(invitation.description ?? "")
      setExpiresAt(
        invitation.expiresAt
          ? new Date(invitation.expiresAt).toISOString().slice(0, 10)
          : "",
      )
      setOccupation(invitation.occupation ?? "")
      setClientType(invitation.type ?? "")
    } else {
      setDescription("")
      setExpiresAt("")
      setOccupation("")
      setClientType("")
    }
  }, [open, invitation])

  const submit = async () => {
    if (target === "worker" && !occupation.trim()) {
      toast({
        title: t("occupationRequired") || "Occupation is required",
        variant: "destructive",
      })
      return
    }
    if (target === "client" && !clientType) {
      toast({
        title: t("typeRequired") || "Type is required",
        variant: "destructive",
      })
      return
    }
    if (expiresAt) {
      const picked = new Date(expiresAt)
      picked.setHours(23, 59, 59, 999)
      if (picked.getTime() <= Date.now()) {
        toast({
          title:
            t("expiryMustBeFuture") ||
            "La fecha de caducidad debe ser posterior a la fecha actual",
          variant: "destructive",
        })
        return
      }
    }
    if (!description.trim()) {
      toast({
        title: t("descriptionRequired") || "Description is required",
        variant: "destructive",
      })
      return
    }
    setIsSubmitting(true)
    try {
      const url = isEditMode
        ? `${process.env.NEXT_PUBLIC_API_BASE_URL}/${apiPath}/${invitation!.publicId}`
        : `${process.env.NEXT_PUBLIC_API_BASE_URL}/${apiPath}`
      const method = isEditMode ? "PATCH" : "POST"

      const body: any = {
        description: description.trim(),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
      }
      if (target === "worker") body.occupation = occupation.trim()
      if (target === "client") body.type = clientType

      const res = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${session?.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const errJson = await res.json().catch(() => null)
        throw new Error(
          errJson?.message ||
            (isEditMode ? "Failed to update" : "Failed to create"),
        )
      }

      if (isEditMode) {
        toast({
          title: t("invitationUpdated") || "Invitation updated",
          variant: "success" as any,
        })
      } else {
        const json = await res.json()
        const link = json?.data?.inviteLink
        if (link) {
          try {
            await navigator.clipboard.writeText(link)
            toast({
              title: t("linkCreatedAndCopied") || "Link created and copied",
              variant: "success" as any,
            })
          } catch {
            toast({
              title: t("linkCreated") || "Link created",
              variant: "success" as any,
            })
          }
        }
      }
      onCreated?.()
      onOpenChange(false)
    } catch (e: any) {
      toast({ title: e.message, variant: "destructive" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
            {isEditMode ? titleEdit : titleCreate}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {target === "worker" && (
            <div>
              <Label className="text-xs font-medium text-foreground">
                {t("occupation") || "Ocupación"} *
              </Label>
              <Input
                value={occupation}
                onChange={(e) => setOccupation(e.target.value)}
                placeholder={
                  t("occupationPlaceholder") || "e.g. Limpiador, Electricista"
                }
                className="mt-1 h-9 text-xs"
                maxLength={120}
              />
            </div>
          )}

          {target === "client" && (
            <div>
              <Label className="text-xs font-medium text-foreground">
                {t("type") || "Tipo"} *
              </Label>
              <Select
                value={clientType}
                onValueChange={(v) => setClientType(v as ClientType)}
              >
                <SelectTrigger className="mt-1 h-9 text-xs">
                  <SelectValue
                    placeholder={t("selectType") || "Select type"}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company">
                    {t("company") || "Empresa"}
                  </SelectItem>
                  <SelectItem value="particular">
                    {t("particular") || "Particular"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("expiry") || "Caducidad"}
            </Label>
            <div className="mt-1">
              <DateInput
                value={expiresAt}
                onChange={(e) => setExpiresAt(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-medium text-foreground">
              {t("description") || "Descripción"} *
            </Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={
                t("descriptionPlaceholder") || "e.g. Spring promo, Group A"
              }
              rows={3}
              className="mt-1 text-xs resize-none"
              maxLength={255}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("cancel") || "Cancel"}
          </Button>
          <Button onClick={submit} disabled={isSubmitting}>
            {isSubmitting && (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            )}
            {isEditMode
              ? t("save") || "Guardar"
              : t("create") || "Create"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
