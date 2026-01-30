"use client"
import React, { useEffect, useRef, useState } from "react"

export interface AddressComponents {
  street?: string
  streetNumber?: string
  locality?: string
  province?: string
  country?: string
  postalCode?: string
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

      // Parse address components
      const components: AddressComponents = {}
      
      place.address_components?.forEach((component) => {
        const types = component.types
        
        if (types.includes("route")) {
          components.street = component.long_name
        } else if (types.includes("street_number")) {
          components.streetNumber = component.long_name
        } else if (types.includes("locality")) {
          components.locality = component.long_name
        } else if (types.includes("administrative_area_level_1")) {
          components.province = component.long_name
        } else if (types.includes("country")) {
          components.country = component.long_name
        } else if (types.includes("postal_code")) {
          components.postalCode = component.long_name
        }
      })

      // ✅ Set full selected address with parsed components
      onChange(place.formatted_address, place.place_id, components)
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
