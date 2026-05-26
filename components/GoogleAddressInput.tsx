"use client"
import React, { useEffect, useRef, useState, useCallback } from "react"
import { normalizeFloorDoor, extractFloorDoorFromFormattedAddress } from "@/lib/utils/normalize-floor-door"

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
  /**
   * When true, store Google's full `formatted_address` (e.g. "Av. San Ignacio, 7, 31002
   * Pamplona, Navarra, España") instead of the trimmed "Street, Number" form. Used for
   * work-centers so a worker can locate the exact site without separate city/postal/
   * province fields.
   */
  useFullAddress?: boolean
}

const GoogleAddressInput: React.FC<GoogleAddressInputProps> = ({
  value,
  onChange,
  placeholder,
  className,
  useFullAddress = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null)
  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null)
  const onChangeRef = useRef(onChange)
  const useFullAddressRef = useRef(useFullAddress)
  const [isReady, setIsReady] = useState(false)

  // Keep refs in sync with latest props to avoid stale closures inside the
  // place_changed listener (which is attached once when google maps is ready).
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])
  useEffect(() => {
    useFullAddressRef.current = useFullAddress
  }, [useFullAddress])

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
          components.floorDoor = normalizeFloorDoor(component.long_name)
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

      // Google sometimes leaves the floor/door in `formatted_address` without
      // emitting a `subpremise` component. Pull it out of the gap between the
      // street number and the postal code as a fallback.
      if (!components.floorDoor) {
        const fallback = extractFloorDoorFromFormattedAddress(
          place.formatted_address,
          components.street,
          components.streetNumber,
          components.postalCode,
        )
        if (fallback) components.floorDoor = fallback
      }

      // Extract GPS coordinates from Google Place geometry
      if (place.geometry?.location) {
        components.latitude = place.geometry.location.lat()
        components.longitude = place.geometry.location.lng()
      }

      // Choose how to render the address back into the input:
      //  - useFullAddress: keep Google's full formatted_address (city, postal code,
      //    province, country) so workers can locate the exact site.
      //  - default: trim to "Street, Number" for forms that surface city/postal/
      //    province as separate fields and don't want them duplicated here.
      const streetParts = [components.street, components.streetNumber].filter(Boolean)
      const finalAddress = useFullAddressRef.current
        ? place.formatted_address
        : (streetParts.length > 0 ? streetParts.join(", ") : place.formatted_address)

      if (inputRef.current) {
        inputRef.current.value = finalAddress
      }

      // ✅ Use ref to always call latest onChange (avoids stale closure)
      onChangeRef.current(finalAddress, place.place_id, components)
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
