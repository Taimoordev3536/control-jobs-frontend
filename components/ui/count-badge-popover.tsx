"use client"

import { useRef, useState } from "react"
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover"

/**
 * The purple "+N" count badge used in compact table cells. Shows the full list
 * of folded values (work centres / workers / cities) in a small popover.
 *
 * Opens on hover (desktop) AND on click (so touch devices, which have no hover,
 * work by tapping). Uses PopoverAnchor — not PopoverTrigger — so Radix does not
 * auto-toggle on click and this component fully owns the open state.
 *
 * The badge's onClick stops propagation, so tapping it never fires the row's
 * onClick — clicking anywhere else on the row keeps its normal behaviour.
 *
 * `items` is the FULL list (the caller renders items[0] in the cell); the badge
 * shows "+{items.length - 1}" and the popover lists every value.
 */
export function CountBadgePopover({ items, label }: { items: string[]; label: string }) {
  const [open, setOpen] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const clear = () => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }
  const openNow = () => {
    clear()
    setOpen(true)
  }
  // Delay the close so moving the pointer from the badge across the small gap
  // to the popover content doesn't flicker it shut.
  const closeSoon = () => {
    clear()
    timer.current = setTimeout(() => setOpen(false), 120)
  }

  if (items.length <= 1) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            clear()
            setOpen((v) => !v)
          }}
          onMouseEnter={openNow}
          onMouseLeave={closeSoon}
          className="shrink-0 rounded-full bg-[#662D91]/10 text-[#662D91] px-1.5 py-0.5 text-[11px] font-semibold hover:bg-[#662D91]/20 transition-colors cursor-pointer"
        >
          +{items.length - 1}
        </button>
      </PopoverAnchor>
      <PopoverContent
        align="start"
        sideOffset={4}
        className="w-56 p-0"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onClick={(e) => e.stopPropagation()}
        onMouseEnter={openNow}
        onMouseLeave={closeSoon}
      >
        <div className="px-3 py-2 border-b border-border text-xs font-semibold text-muted-foreground">
          {label} · {items.length}
        </div>
        <ul className="max-h-60 overflow-y-auto py-1">
          {items.map((n, i) => (
            <li key={i} className="px-3 py-1.5 text-sm text-foreground">
              {n}
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  )
}
