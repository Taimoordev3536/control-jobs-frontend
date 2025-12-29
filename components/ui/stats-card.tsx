import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"

interface StatsCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  color?: string
}

export function StatsCard({ label, value, icon: Icon, color = "gray-500" }: StatsCardProps) {
  return (
    <Card className="border-border hover:shadow-md transition-all duration-300 hover:scale-105 group bg-card">
      <CardContent className="p-3">
        <div className={`w-full h-0.5 bg-${color} rounded-full mb-2`}></div>
        <div className="flex items-center justify-between mb-2">
          <div className={`p-1.5 rounded-lg bg-${color} group-hover:scale-110 transition-transform duration-300`}>
            <Icon className="w-4 h-4 text-white" />
          </div>
          <div className="text-right">
            <div className="text-lg font-bold text-foreground group-hover:scale-110 transition-transform duration-300">
              {value}
            </div>
          </div>
        </div>
        <div className="text-muted-foreground font-medium text-xs uppercase tracking-wider">{label}</div>
      </CardContent>
    </Card>
  )
}
