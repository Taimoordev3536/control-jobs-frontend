'use client';
import { useState, useEffect, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { DEFAULT_TIMEZONE } from '@/lib/datetime';

type PlaceDetails = {
  displayName?: string;
  placeName?: string;
  address?: {
    town?: string;
    city?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
    road?: string;
    postcode?: string;
  };
};

export default function LocationTracker() {
  // State management
  const [location, setLocation] = useState<GeolocationPosition | null>(null);
  const [place, setPlace] = useState<PlaceDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watchId, setWatchId] = useState<number | null>(null);
  const [map, setMap] = useState<L.Map | null>(null);
  const [marker, setMarker] = useState<L.Marker | null>(null);
  const [accuracyCircle, setAccuracyCircle] = useState<L.Circle | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Initialize map
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mapInstance = L.map('map', {
      zoomControl: false
    }).setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(mapInstance);

    L.control.zoom({ position: 'topright' }).addTo(mapInstance);

    setMap(mapInstance);

    return () => {
      mapInstance.remove();
    };
  }, []);

  // Custom marker icon
  const createMarkerIcon = useCallback(() => {
    return L.icon({
      iconUrl: '/marker-icon-red.png',
      iconRetinaUrl: '/marker-icon-2x-red.png',
      shadowUrl: '/marker-shadow.png',
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41]
    });
  }, []);

  // Fetch place details from coordinates
  const fetchPlaceDetails = useCallback(async (lat: number, lng: number) => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=16&namedetails=1&addressdetails=1`
      );
      
      if (!response.ok) throw new Error('Failed to fetch location details');
      
      const data = await response.json();
      
      setPlace({
        displayName: data.display_name,
        placeName: getPrimaryPlaceName(data.address),
        address: data.address
      });
    } catch (err) {
      console.error("Place detection error:", err);
      setPlace(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Helper to get the most specific place name
  const getPrimaryPlaceName = useCallback((address: any) => {
    return address.town || address.city || address.village || 
           address.municipality || address.county || address.state || '';
  }, []);

  // Update map with new position
  const updateMap = useCallback((position: GeolocationPosition) => {
    if (!map) return;

    const pos: L.LatLngExpression = [position.coords.latitude, position.coords.longitude];
    const accuracy = position.coords.accuracy;

    // Update map view
    map.setView(pos, 16);

    // Update or create marker
    if (marker) {
      marker.setLatLng(pos);
    } else {
      const newMarker = L.marker(pos, {
        icon: createMarkerIcon(),
        title: 'Your location',
        alt: 'Current position marker'
      }).addTo(map);
      
      newMarker.bindPopup("You are here").openPopup();
      setMarker(newMarker);
    }

    // Update accuracy circle
    if (accuracyCircle) {
      accuracyCircle.setLatLng(pos).setRadius(accuracy);
    } else {
      const circle = L.circle(pos, {
        radius: accuracy,
        color: '#3388ff',
        fillColor: '#3388ff',
        fillOpacity: 0.2,
        weight: 2
      }).addTo(map);
      setAccuracyCircle(circle);
    }

    // Fetch place details
    fetchPlaceDetails(position.coords.latitude, position.coords.longitude);
  }, [map, marker, accuracyCircle, createMarkerIcon, fetchPlaceDetails]);

  // Start/stop tracking
  const toggleTracking = useCallback(() => {
    if (watchId) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation not supported');
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (position) => {
        setLocation(position);
        updateMap(position);
      },
      (err) => {
        setError(err.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 10000
      }
    );
    setWatchId(id);
  }, [watchId, updateMap]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  return (
    <div className="max-w-4xl mx-auto p-4 space-y-4">
      <h1 className="text-2xl font-bold">Live Location Tracker</h1>
      
      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1">
          <div id="map" className="w-full h-96 rounded-lg border border-gray-300"></div>
          
          <button
            onClick={toggleTracking}
            disabled={isLoading}
            className={`w-full mt-4 py-3 px-4 rounded-lg text-white font-medium ${
              watchId 
                ? 'bg-red-600 hover:bg-red-700' 
                : 'bg-blue-600 hover:bg-blue-700'
            } ${isLoading ? 'opacity-70' : ''}`}
          >
            {isLoading ? 'Processing...' : watchId ? 'Stop Tracking' : 'Start Tracking'}
          </button>
        </div>

        <div className="flex-1 space-y-4">
          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Location Data</h2>
            {location ? (
              <div className="space-y-2">
                <p><span className="font-medium">Coordinates:</span> {location.coords.latitude.toFixed(6)}, {location.coords.longitude.toFixed(6)}</p>
                <p><span className="font-medium">Accuracy:</span> ±{Math.round(location.coords.accuracy)} meters</p>
                <p><span className="font-medium">Last Update:</span> {new Date(location.timestamp).toLocaleTimeString("es-ES", { timeZone: DEFAULT_TIMEZONE })}</p>
              </div>
            ) : (
              <p>No location data available</p>
            )}
          </div>

          <div className="bg-white p-4 rounded-lg shadow">
            <h2 className="text-lg font-semibold mb-2">Place Information</h2>
            {isLoading ? (
              <p>Detecting location...</p>
            ) : place ? (
              <div className="space-y-2">
                {place.placeName && (
                  <p className="font-medium text-lg">{place.placeName}</p>
                )}
                <div className="grid grid-cols-2 gap-2">
                  {place.address?.road && <p><span className="text-gray-600">Road:</span> {place.address.road}</p>}
                  {(place.address?.town || place.address?.city || place.address?.village) && (
                    <p><span className="text-gray-600">Locality:</span> {place.address.town || place.address.city || place.address.village}</p>
                  )}
                  {place.address?.municipality && <p><span className="text-gray-600">Municipality:</span> {place.address.municipality}</p>}
                  {place.address?.county && <p><span className="text-gray-600">County:</span> {place.address.county}</p>}
                  {place.address?.state && <p><span className="text-gray-600">State:</span> {place.address.state}</p>}
                  {place.address?.country && <p><span className="text-gray-600">Country:</span> {place.address.country}</p>}
                  {place.address?.postcode && <p><span className="text-gray-600">Postal Code:</span> {place.address.postcode}</p>}
                </div>
                {place.displayName && (
                  <p className="text-sm text-gray-500 mt-2">{place.displayName}</p>
                )}
              </div>
            ) : (
              <p>No place information available</p>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg">
          <p className="font-medium">Error:</p>
          <p>{error}</p>
        </div>
      )}

      <div className="text-xs text-gray-500 text-center">
        Map data © <a href="https://www.openstreetmap.org/" target="_blank" rel="noopener noreferrer" className="underline">OpenStreetMap</a> contributors
      </div>
    </div>
  );
}