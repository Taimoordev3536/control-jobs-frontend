"use client"

import { useState, useRef, useEffect } from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"
import { useTranslation } from "@/hooks/use-translation"

interface TimePickerProps {
  value?: string
  onChange?: (time: string) => void
  className?: string
  debug?: boolean // Add debug mode option
  disabled?: boolean
}

export function TimePicker({ value = "", onChange, className, debug = false, disabled = false }: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false) // Don't auto-open, even in debug mode
  const [isPositioned, setIsPositioned] = useState(false)
  const [selectedHour, setSelectedHour] = useState("00")
  const [selectedMinute, setSelectedMinute] = useState("00")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)

  const { t } = useTranslation()

  // Parse initial value
  useEffect(() => {
    if (value) {
      // Accept formats: "HH:MM" or "HH:MM AM/PM"
      const parts = value.split(" ")
      const time = parts[0]
      const period = parts[1]
      if (time) {
        const [hour, minute] = time.split(":")
        let hourNum = Number.parseInt(hour || "0")
        if (period) {
          const p = period.toUpperCase()
          if (p === "PM" && hourNum < 12) hourNum += 12
          if (p === "AM" && hourNum === 12) hourNum = 0
        }
        setSelectedHour(String(hourNum).padStart(2, "0"))
        setSelectedMinute((minute || "00").padStart(2, "0"))
      }
    }
  }, [value])
  // We no longer need the debug logging as we've fixed the issues

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return; // Always close regardless of debug mode

    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setIsPositioned(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [isOpen])

  const hours = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"))
  const minutes = [
    "00", "01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12", "13", "14", "15", "16", "17", "18",
    "19", "20", "21", "22", "23", "24", "25", "26", "27", "28", "29", "30", "31", "32", "33", "34", "35", "36", "37",
    "38", "39", "40", "41", "42", "43", "44", "45", "46", "47", "48", "49", "50", "51", "52", "53", "54", "55", "56",
    "57", "58", "59",
  ]

  // Time selection is now handled directly in the select onChange handlers

  const formatDisplayTime = () => {
    if (!value) return "--:--"
    return value
  }

  // Dynamically determine dropdown position
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 9999,
    opacity: 0 // Start with opacity 0
  })

  useEffect(() => {
    setIsPositioned(false) // Reset positioning when dropdown opens/closes
    
    if (isOpen && buttonRef.current) {
      const buttonRect = buttonRef.current.getBoundingClientRect()
      const spaceBelow = window.innerHeight - buttonRect.bottom
      const spaceAbove = buttonRect.top
  const dropdownWidth = 110 // Match the width in the JSX (smaller now that AM/PM column removed)
      
      // Calculate horizontal position - ensure it doesn't go off-screen
      let leftPosition = buttonRect.left + window.scrollX - (dropdownWidth / 2) + 12 // Center relative to button
      const rightEdge = leftPosition + dropdownWidth
      
      if (rightEdge > window.innerWidth) {
        // Adjust if it would go off the right edge
        leftPosition = window.innerWidth - dropdownWidth - 10
      }
      if (leftPosition < 0) {
        // Adjust if it would go off the left edge
        leftPosition = 10
      }
      
      // Calculate position - prefer below, but go above if not enough space
      if (spaceBelow >= 180 || spaceBelow > spaceAbove) {
        setDropdownStyle({
          position: "absolute",
          top: buttonRect.bottom + window.scrollY + 2, // Small offset for better visual appearance
          left: leftPosition,
          zIndex: 9999,
          opacity: 1 // Make visible after positioned
        })
      } else {
        setDropdownStyle({
          position: "absolute",
          top: buttonRect.top + window.scrollY - 180, // Height of dropdown + small offset
          left: leftPosition,
          zIndex: 9999,
          opacity: 1 // Make visible after positioned
        })
      }
      
      // Set positioned flag after a small delay to ensure styles are applied
      setTimeout(() => setIsPositioned(true), 10)
    }
  }, [isOpen])

  // Add any custom styles if needed
  useEffect(() => {
    if (typeof document === "undefined") return
    const id = "timepicker-select-styles"
    if (document.getElementById(id)) return
    const style = document.createElement("style")
    style.id = id
    style.innerHTML = `
      .time-select option:checked {
        background-color: #3b82f6;
        color: white;
      }
    `
    document.head.appendChild(style)
    return () => {
      const el = document.getElementById(id)
      if (el) el.remove()
    }
  }, [])

  // Scroll to selected hour and minute when dropdown opens
  useEffect(() => {
    if (isOpen && isPositioned && hourListRef.current && minuteListRef.current) {
      // Find selected hour and minute elements
      const hourEl = hourListRef.current.querySelector(`.bg-blue-500`);
      const minuteEl = minuteListRef.current.querySelector(`.bg-blue-500`);
      
      // Scroll to them with a slight delay to ensure the dropdown is fully rendered
      setTimeout(() => {
        if (hourEl) {
          hourEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
        if (minuteEl) {
          minuteEl.scrollIntoView({ block: 'center', behavior: 'auto' });
        }
      }, 50);
    }
  }, [isOpen, isPositioned]);

  // Add handler for wheel events to prevent scrolling issues
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      // Stop wheel events from propagating beyond the dropdown if it's inside
      if (isOpen && dropdownRef.current && dropdownRef.current.contains(e.target as Node)) {
        e.stopPropagation();
      }
    };

    document.addEventListener('wheel', handleWheel, { passive: false });
    return () => document.removeEventListener('wheel', handleWheel);
  }, [isOpen]);

  if (disabled) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className={cn("h-6 w-6 p-0 text-muted-foreground", className)}
        disabled
        tabIndex={-1}
      >
        <Clock className="h-3 w-3" />
      </Button>
    );
  }

  return (
    <div className="relative z-50">
      <Button
        ref={buttonRef}
        variant="ghost"
        size="sm"
        className={cn("h-6 w-6 p-0", className)}
        onClick={() => {
          if (isOpen) {
            setIsOpen(false)
            setIsPositioned(false)
          } else {
            setIsOpen(true)
          }
        }}
        type="button"
        tabIndex={-1}
      >
        <Clock className="h-3 w-3" />
      </Button>

      {isOpen && isPositioned && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 rounded-md shadow-lg p-2 z-50"
      style={{ 
        ...dropdownStyle,
        width: "110px",
            transition: "opacity 0.1s ease-in-out",
            pointerEvents: "auto" // Ensure the dropdown is always interactive
          }}
          onTouchStart={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          onScroll={(e) => e.stopPropagation()}
          onTouchMove={(e) => e.stopPropagation()}
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="space-y-2">
            <div className="flex gap-0.5">
              {/* Hours Column - Custom Scrollable Div */}
              <div className="w-[48px]">
                <div className="text-xs font-medium text-center mb-1 text-gray-600">{t("hour")}</div>
                <div 
                  className="h-24 w-full border rounded text-xs overflow-y-auto"
                  style={{ 
                    scrollbarWidth: 'thin',
                    WebkitOverflowScrolling: 'touch', // Better iOS scrolling
                    pointerEvents: 'auto',
                    touchAction: 'auto'
                  }}
                  ref={hourListRef}
                  onTouchStart={(e) => e.stopPropagation()} // Prevent dropdown from closing on touch
                  onMouseDown={(e) => e.stopPropagation()} // Prevent dropdown from closing on mouse down
                  onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing on click
                  onScroll={(e) => e.stopPropagation()} // Prevent scroll events from bubbling
                  onWheel={(e) => e.stopPropagation()} // Prevent wheel events from bubbling
                >
                  {hours.map((hour) => (
                    <div 
                      key={hour}
                      className={`text-center py-1 cursor-pointer hover:bg-gray-100 ${
                        selectedHour === hour ? 'bg-blue-500 text-white' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedHour(hour);
                        const timeString = `${hour}:${selectedMinute}`;
                        onChange?.(timeString);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      {hour}
                    </div>
                  ))}
                </div>
              </div>

              {/* Minutes Column - Custom Scrollable Div */}
              <div className="w-[48px]">
                <div className="text-xs font-medium text-center mb-1 text-gray-600">{t("min")}</div>
                <div 
                  className="h-24 w-full border rounded text-xs overflow-y-auto"
                  style={{ 
                    scrollbarWidth: 'thin',
                    WebkitOverflowScrolling: 'touch', // Better iOS scrolling
                    pointerEvents: 'auto',
                    touchAction: 'auto'
                  }}
                  ref={minuteListRef}
                  onTouchStart={(e) => e.stopPropagation()} // Prevent dropdown from closing on touch
                  onMouseDown={(e) => e.stopPropagation()} // Prevent dropdown from closing on mouse down
                  onClick={(e) => e.stopPropagation()} // Prevent dropdown from closing on click
                  onScroll={(e) => e.stopPropagation()} // Prevent scroll events from bubbling
                  onWheel={(e) => e.stopPropagation()} // Prevent wheel events from bubbling
                >
                  {minutes.map((minute) => (
                    <div 
                      key={minute}
                      className={`text-center py-1 cursor-pointer hover:bg-gray-100 ${
                        selectedMinute === minute ? 'bg-blue-500 text-white' : ''
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedMinute(minute);
                        const timeString = `${selectedHour}:${minute}`;
                        onChange?.(timeString);
                        // close dropdown after selecting minute
                        setIsOpen(false);
                        setIsPositioned(false);
                      }}
                      onMouseDown={(e) => e.stopPropagation()}
                      onTouchStart={(e) => e.stopPropagation()}
                    >
                      {minute}
                    </div>
                  ))}
                </div>
              </div>

              {/* AM/PM Column - Simple Buttons */}
              {/* No AM/PM column in 24-hour mode */}
            </div>
            
            {/* Done button removed — dropdown will close after minute selection */}
            {/* Debug text removed */}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
