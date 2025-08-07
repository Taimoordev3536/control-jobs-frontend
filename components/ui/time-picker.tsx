"use client"

import { useState, useRef, useEffect } from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  className?: string
}

export function TimePicker({ value = "", onChange, className }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState("08")
  const [selectedMinute, setSelectedMinute] = useState("00")
  const [selectedPeriod, setSelectedPeriod] = useState("AM")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Parse initial value
  useEffect(() => {
    if (value) {
      const [time, period] = value.split(" ")
      if (time && period) {
        const [hour, minute] = time.split(":")
        setSelectedHour(hour)
        setSelectedMinute(minute)
        setSelectedPeriod(period)
      } else if (time) {
        // Handle 24-hour format
        const [hour, minute] = time.split(":")
        const hourNum = Number.parseInt(hour)
        if (hourNum === 0) {
          setSelectedHour("12")
          setSelectedPeriod("AM")
        } else if (hourNum <= 12) {
          setSelectedHour(hour.padStart(2, "0"))
          setSelectedPeriod("AM")
        } else {
          setSelectedHour((hourNum - 12).toString().padStart(2, "0"))
          setSelectedPeriod("PM")
        }
        setSelectedMinute(minute || "00")
      }
    }
  }, [value])

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const hours = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
  const minutes = [
    "00",
    "01",
    "02",
    "03",
    "04",
    "05",
    "06",
    "07",
    "08",
    "09",
    "10",
    "11",
    "12",
    "13",
    "14",
    "15",
    "16",
    "17",
    "18",
    "19",
    "20",
    "21",
    "22",
    "23",
    "24",
    "25",
    "26",
    "27",
    "28",
    "29",
    "30",
    "31",
    "32",
    "33",
    "34",
    "35",
    "36",
    "37",
    "38",
    "39",
    "40",
    "41",
    "42",
    "43",
    "44",
    "45",
    "46",
    "47",
    "48",
    "49",
    "50",
    "51",
    "52",
    "53",
    "54",
    "55",
    "56",
    "57",
    "58",
    "59",
  ]

  const handleTimeSelect = (hour: string, minute: string, period: string) => {
    const timeString = `${hour}:${minute} ${period}`
    onChange?.(timeString)
    setIsOpen(false)
  }

  const formatDisplayTime = () => {
    if (!value) return "--:--"
    return value
  }

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className={cn("h-6 w-6 p-0", className)}
        onClick={() => setIsOpen(!isOpen)}
        type="button"
      >
        <Clock className="h-3 w-3" />
      </Button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="absolute top-8 left-0 z-50 bg-white border border-gray-300 rounded-md shadow-lg p-2 min-w-[200px]"
        >
          <div className="flex gap-2">
            {/* Hours Column */}
            <div className="flex-1">
              <div className="text-xs font-medium text-center mb-1 text-gray-600">Hour</div>
              <div className="max-h-32 overflow-y-auto border rounded">
                {hours.map((hour) => (
                  <button
                    key={hour}
                    className={cn(
                      "w-full px-2 py-1 text-sm hover:bg-blue-100 text-center",
                      selectedHour === hour ? "bg-blue-500 text-white" : "text-gray-700",
                    )}
                    onClick={() => {
                      setSelectedHour(hour)
                      handleTimeSelect(hour, selectedMinute, selectedPeriod)
                    }}
                  >
                    {hour}
                  </button>
                ))}
              </div>
            </div>

            {/* Minutes Column */}
            <div className="flex-1">
              <div className="text-xs font-medium text-center mb-1 text-gray-600">Min</div>
              <div className="max-h-32 overflow-y-auto border rounded">
                {minutes.slice(0, 14).map((minute) => (
                  <button
                    key={minute}
                    className={cn(
                      "w-full px-2 py-1 text-sm hover:bg-blue-100 text-center",
                      selectedMinute === minute ? "bg-blue-500 text-white" : "text-gray-700",
                    )}
                    onClick={() => {
                      setSelectedMinute(minute)
                      handleTimeSelect(selectedHour, minute, selectedPeriod)
                    }}
                  >
                    {minute}
                  </button>
                ))}
              </div>
            </div>

            {/* AM/PM Column */}
            <div className="flex-1">
              <div className="text-xs font-medium text-center mb-1 text-gray-600">Period</div>
              <div className="border rounded">
                {["AM", "PM"].map((period) => (
                  <button
                    key={period}
                    className={cn(
                      "w-full px-2 py-1 text-sm hover:bg-blue-100 text-center",
                      selectedPeriod === period ? "bg-blue-500 text-white" : "text-gray-700",
                    )}
                    onClick={() => {
                      setSelectedPeriod(period)
                      handleTimeSelect(selectedHour, selectedMinute, period)
                    }}
                  >
                    {period}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}


