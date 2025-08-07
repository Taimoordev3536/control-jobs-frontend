"use client"

import { useState } from "react"
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar as CalendarComponent } from "@/components/ui/calendar"
import { format } from "date-fns"
import { useTranslation } from "@/hooks/use-translation"

interface Consultation {
  id: number
  company: string
  timeSlot: string
  service: string
  date: string
}

export default function ConsultationsPage() {
  const { t } = useTranslation()
  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)

  // Mock consultation data - replace with actual API data
  const consultations: Consultation[] = [
    {
      id: 1,
      company: "SOCIALIS, S.L.",
      timeSlot: "10:00 - 11:30",
      service: "Limpieza oficina",
      date: format(selectedDate, "yyyy-MM-dd"),
    },
    {
      id: 2,
      company: "SOCIALIS, S.L.",
      timeSlot: "10:00 - 11:30",
      service: "Limpieza oficina",
      date: format(selectedDate, "yyyy-MM-dd"),
    },
    {
      id: 3,
      company: "SOCIALIS, S.L.",
      timeSlot: "10:00 - 11:30",
      service: "Limpieza oficina",
      date: format(selectedDate, "yyyy-MM-dd"),
    },
  ]

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date)
      setIsCalendarOpen(false)
    }
  }

  const navigateDate = (direction: "prev" | "next") => {
    const newDate = new Date(selectedDate)
    if (direction === "prev") {
      newDate.setDate(newDate.getDate() - 1)
    } else {
      newDate.setDate(newDate.getDate() + 1)
    }
    setSelectedDate(newDate)
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header Section with Purple Background */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 dark:from-purple-700 dark:to-purple-800 px-6 py-8 shadow-lg">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-4">
            {/* Previous Date Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDate("prev")}
              className="text-white hover:bg-white/20 dark:hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>

            {/* Date Input with Calendar Popup */}
            <div className="relative">
              <Popover open={isCalendarOpen} onOpenChange={setIsCalendarOpen}>
                <PopoverTrigger asChild>
                  <div className="relative">
                    <Input
                      value={format(selectedDate, "MM/dd/yyyy")}
                      readOnly
                      className="bg-white dark:bg-gray-800 text-center text-foreground font-medium px-4 py-2 w-40 cursor-pointer border-0 shadow-md hover:shadow-lg transition-shadow"
                      placeholder="mm/dd/yyyy"
                    />
                    <Calendar className="absolute right-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 bg-popover border-border shadow-lg" align="center">
                  <CalendarComponent
                    mode="single"
                    selected={selectedDate}
                    onSelect={handleDateChange}
                    initialFocus
                    className="bg-popover"
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Next Date Button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigateDate("next")}
              className="text-white hover:bg-white/20 dark:hover:bg-white/10 p-2 rounded-full transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content Section with Light Blue/Teal Background */}
      <div className="bg-gradient-to-b from-cyan-50 to-teal-100 dark:from-slate-800 dark:to-slate-900 min-h-[calc(100vh-120px)]">
        <div className="px-6 py-8">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {consultations.map((consultation) => (
                <div
                  key={consultation.id}
                  className="bg-card border border-border rounded-lg shadow-md hover:shadow-lg transition-all duration-200 p-6 hover:scale-[1.02] cursor-pointer"
                >
                  <div className="text-center space-y-3">
                    <h3 className="text-lg font-semibold text-card-foreground">{consultation.company}</h3>
                    <div className="inline-block bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium">
                      {consultation.timeSlot}
                    </div>
                    <p className="text-muted-foreground text-sm">{consultation.service}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Empty State */}
            {consultations.length === 0 && (
              <div className="text-center py-12">
                <div className="bg-card border border-border rounded-lg shadow-md p-8 max-w-md mx-auto">
                  <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-card-foreground mb-2">No consultations scheduled</h3>
                  <p className="text-muted-foreground">
                    {"No consultations found for"} {format(selectedDate, "MM/dd/yyyy")}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
