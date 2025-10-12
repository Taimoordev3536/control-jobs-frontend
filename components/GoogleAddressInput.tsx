"use client"
import React, { useEffect, useRef, useState } from "react"

interface GoogleAddressInputProps {
  value?: string
  onChange: (value: string, placeId?: string) => void
  placeholder?: string
  className?: string
}

const GoogleAddressInput: React.FC<GoogleAddressInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    const checkGoogle = setInterval(() => {
      if (window.google && window.google.maps) {
        setIsReady(true)
        clearInterval(checkGoogle)
      }
    }, 300)
    return () => clearInterval(checkGoogle)
  }, [])

  useEffect(() => {
    if (!isReady || !inputRef.current) return

    // ✅ No restrictions
    autocompleteRef.current = new google.maps.places.Autocomplete(inputRef.current)

    autocompleteRef.current.addListener("place_changed", () => {
      const place = autocompleteRef.current?.getPlace()
      if (!place?.place_id || !place?.formatted_address) return

      // ✅ Set full selected address
      onChange(place.formatted_address, place.place_id)
    })
  }, [isReady, onChange])

  return (
    <input
      ref={inputRef}
      defaultValue={value} // ✅ use defaultValue instead of value (lets Google override)
      onChange={(e) => onChange(e.target.value)} // typing still works
      placeholder={placeholder || "Enter address, business, school, etc."}
      className={className}
    />
  )
}

export default GoogleAddressInput
