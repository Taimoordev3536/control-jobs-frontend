"use client"

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTranslation } from "@/hooks/use-translation"
import JobFormCore from "./JobFormCore"
import type { AddJobModalProps } from "./types"

export default function AddJobModal({ open, onOpenChange, onJobAdded }: AddJobModalProps) {
  const { t } = useTranslation()

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[50rem] p-0 gap-0 max-h-[90vh] flex flex-col bg-background ml-1 mr-3">
        <DialogHeader className="p-6 pb-6 space-y-4">
          <div className="flex items-center justify-between relative">
            <div className="flex-1" />
            <div className="absolute left-1/2 transform -translate-x-1/2 mb-3">
              <DialogTitle className="text-xl sm:text-2xl font-semibold text-foreground text-center tracking-tight">
                {t("newJob") || "New Job"}
              </DialogTitle>
            </div>
            <div className="flex-1 flex justify-end" />
          </div>
        </DialogHeader>

        <div className="px-6 pb-8 flex-1 overflow-y-auto">
          <JobFormCore
            mode="create"
            onComplete={(job) => {
              onOpenChange(false)
              if (onJobAdded) {
                onJobAdded(job)
              }
            }}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

