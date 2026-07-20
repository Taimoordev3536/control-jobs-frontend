"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { useTranslation } from "@/hooks/use-translation"

interface ShowInactiveToggleProps {
  checked: boolean
  onCheckedChange: (checked: boolean) => void
  /** How many rows are currently hidden. Shown next to the label so a hidden
   *  row on a later page is still discoverable. */
  count?: number
  id?: string
}

export function ShowInactiveToggle({
  checked,
  onCheckedChange,
  count,
  id = "show-inactive",
}: ShowInactiveToggleProps) {
  const { t } = useTranslation()

  return (
    <label
      htmlFor={id}
      className="hidden sm:flex items-center gap-1.5 text-xs text-foreground cursor-pointer select-none whitespace-nowrap"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onCheckedChange(v === true)}
      />
      {t("showInactive")}
      {count ? <span className="text-muted-foreground">({count})</span> : null}
    </label>
  )
}
