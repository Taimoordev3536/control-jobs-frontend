"use client"
import React, { useEffect, useRef, useState, useCallback } from "react"

export interface AddressComponents {
  street?: string
  streetNumber?: string
  floorDoor?: string
  city?: string
  province?: string
  country?: string
  postalCode?: string
  latitude?: number
  longitude?: number
}

interface GoogleAddressInputProps {
  value?: string
  onChange: (value: string, placeId?: string, components?: AddressComponents) => void
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
  const onChangeRef = useRef(onChange)
  const [isReady, setIsReady] = useState(false)

  // Keep the ref in sync with latest onChange prop to avoid stale closures
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  // Sync the uncontrolled input when the value prop is changed externally
  // (e.g. from LocationPickerDialog or form reset)
  const prevValueRef = useRef(value)
  useEffect(() => {
    if (value !== prevValueRef.current && inputRef.current) {
      inputRef.current.value = value || ""
      prevValueRef.current = value
    }
  }, [value])

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

      // Parse address components
      const components: AddressComponents = {}
      
      place.address_components?.forEach((component) => {
        const types = component.types
        
        if (types.includes("route")) {
          components.street = component.long_name
        } else if (types.includes("street_number")) {
          components.streetNumber = component.long_name
        } else if (types.includes("subpremise")) {
          components.floorDoor = component.long_name
        } else if (types.includes("locality")) {
          components.city = component.long_name
        } else if (types.includes("administrative_area_level_1")) {
          components.province = component.long_name
        } else if (types.includes("country")) {
          components.country = component.long_name
        } else if (types.includes("postal_code")) {
          components.postalCode = component.long_name
        }
      })

      // Extract GPS coordinates from Google Place geometry
      if (place.geometry?.location) {
        components.latitude = place.geometry.location.lat()
        components.longitude = place.geometry.location.lng()
      }

      // ✅ Use ref to always call latest onChange (avoids stale closure)
      onChangeRef.current(place.formatted_address, place.place_id, components)
    })
  }, [isReady]) // Remove onChange from deps — use ref instead

  return (
    <input
      ref={inputRef}
      defaultValue={value}
      onChange={(e) => onChangeRef.current(e.target.value)}
      placeholder={placeholder || "Enter address, business, school, etc."}
      className={className}
    />
  )
}

export default GoogleAddressInput
