"use client"

import { MapPin, Navigation } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

export interface WorkCenterOption {
  id: number
  name: string
  address: string
  /** Distance in metres from worker (-1 means GPS data unavailable) */
  distance: number
}

interface WorkCenterSelectorProps {
  workCenters: WorkCenterOption[]
  onSelect: (workCenterId: number) => void
  onCancel: () => void
  reason?: string
}

export function WorkCenterSelector({
  workCenters,
  onSelect,
  onCancel,
  reason,
}: WorkCenterSelectorProps) {
  const formatDistance = (metres: number) => {
    if (metres < 0) return null
    if (metres < 1000) return `${Math.round(metres)} m`
    return `${(metres / 1000).toFixed(1)} km`
  }

  // Sort: known distances first (ascending), then unknown
  const sorted = [...workCenters].sort((a, b) => {
    if (a.distance < 0 && b.distance < 0) return a.name.localeCompare(b.name)
    if (a.distance < 0) return 1
    if (b.distance < 0) return -1
    return a.distance - b.distance
  })

  return (
    <Card className="border-orange-300 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-700">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-5 h-5 text-orange-600" />
          <CardTitle className="text-base text-orange-900 dark:text-orange-100">
            Select Work Center
          </CardTitle>
        </div>
        <CardDescription className="text-orange-700 dark:text-orange-300">
          {reason || "Multiple work centers found. Please select where you are checking in."}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-2">
        {sorted.map((wc) => {
          const dist = formatDistance(wc.distance)
          return (
            <Button
              key={wc.id}
              variant="outline"
              onClick={() => onSelect(wc.id)}
              className="w-full justify-start gap-3 h-auto py-3 px-4 bg-white dark:bg-gray-900 hover:bg-orange-100 dark:hover:bg-orange-900/30 border-orange-200 dark:border-orange-800"
            >
              <MapPin className="w-4 h-4 text-orange-500 shrink-0" />
              <div className="flex-1 text-left">
                <p className="font-medium text-sm text-gray-900 dark:text-gray-100">{wc.name}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{wc.address}</p>
              </div>
              {dist && (
                <Badge variant="secondary" className="shrink-0 text-xs">
                  {dist}
                </Badge>
              )}
            </Button>
          )
        })}

        <Button
          variant="ghost"
          onClick={onCancel}
          className="w-full mt-1 text-gray-500 hover:text-gray-700"
        >
          Cancel
        </Button>
      </CardContent>
    </Card>
  )
}
