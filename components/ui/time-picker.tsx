"use client"

import { useState, useRef, useEffect } from "react"
import { Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { createPortal } from "react-dom"

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
  const [selectedPeriod, setSelectedPeriod] = useState("AM")
  const dropdownRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const hourListRef = useRef<HTMLDivElement>(null)
  const minuteListRef = useRef<HTMLDivElement>(null)

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

  const hours = ["00","01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"]
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
      const dropdownWidth = 150 // Match the width in the JSX
      
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
      >
        <Clock className="h-3 w-3" />
      </Button>

      {isOpen && isPositioned && typeof document !== 'undefined' && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-300 rounded-md shadow-lg p-2 z-50"
          style={{ 
            ...dropdownStyle,
            width: "150px",
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
                <div className="text-xs font-medium text-center mb-1 text-gray-600">Hour</div>
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
                        const timeString = `${hour}:${selectedMinute} ${selectedPeriod}`;
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
                <div className="text-xs font-medium text-center mb-1 text-gray-600">Min</div>
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
                        const timeString = `${selectedHour}:${minute} ${selectedPeriod}`;
                        onChange?.(timeString);
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
              <div className="w-[48px]">
                <div className="text-xs font-medium text-center mb-1 text-gray-600">Period</div>
                <div 
                  className="flex flex-col gap-1"
                  onTouchStart={(e) => e.stopPropagation()} 
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  {["AM", "PM"].map((period) => (
                    <button
                      key={period}
                      className={`text-center py-1 text-xs border rounded ${
                        selectedPeriod === period 
                          ? 'bg-blue-500 text-white' 
                          : 'hover:bg-gray-100'
                      }`}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setSelectedPeriod(period);
                        const timeString = `${selectedHour}:${selectedMinute} ${period}`;
                        onChange?.(timeString);
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Done Button */}
            <button
              className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded"
              onTouchStart={(e) => e.stopPropagation()} 
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                // Always close when Done is clicked
                setIsOpen(false);
                setIsPositioned(false);
              }}
            >
              Done
            </button>
            {/* Debug text removed */}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
