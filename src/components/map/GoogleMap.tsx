import { useEffect, useRef, useState, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Property } from '@/types'
import { MapPin, DollarSign, Bed, Bath, Square, Heart, Phone, Mail, Navigation, Layers } from 'lucide-react'

interface GoogleMapProps {
  properties: Property[]
  selectedProperty?: Property | null
  onPropertySelect: (property: Property) => void
  center?: { lat: number; lng: number }
  zoom?: number
}

declare global {
  interface Window {
    google: any
    initMap: () => void
    initGoogleMaps: () => void
  }
}

export function GoogleMap({ properties, selectedProperty, onPropertySelect, center = { lat: 27.7172, lng: 85.3240 }, zoom = 13 }: GoogleMapProps) {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [markers, setMarkers] = useState<any[]>([])
  const [infoWindow, setInfoWindow] = useState<any>(null)
  const [isLoaded, setIsLoaded] = useState(false)
  const [mapType, setMapType] = useState<'roadmap' | 'satellite' | 'hybrid' | 'terrain'>('roadmap')

  // Load Google Maps API
  useEffect(() => {
    if (window.google && window.google.maps && window.google.maps.Map) {
      setIsLoaded(true)
      return
    }

    // Load Google Maps API using Blink's secure API proxy to get the API key
    const loadGoogleMaps = async () => {
      try {
        // Get the API key securely from Blink Edge Function
        let apiKey = 'AIzaSyBFw0Qbyq9zTuTlWUurOLmh_TqHVWRsPrw' // Fallback public key for development
        
        try {
          const response = await fetch('https://v02a98y5--google-maps-key.functions.blink.new')
          if (response.ok) {
            const data = await response.json()
            if (data.key && data.key !== apiKey) {
              apiKey = data.key
              console.log('Using secure API key from Blink vault')
            } else {
              console.log('Using fallback API key for development')
            }
          } else {
            console.log('Could not fetch secure API key, using fallback')
          }
        } catch (keyError) {
          console.log('Error fetching API key from function:', keyError.message)
        }

        const script = document.createElement('script')
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places&loading=async&v=weekly&callback=initGoogleMaps`
        script.async = true
        script.defer = true
        
        // Create a global callback function
        window.initGoogleMaps = () => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            console.log('Google Maps API loaded successfully')
            setIsLoaded(true)
          } else {
            console.error('Google Maps API loaded but objects not available')
            setIsLoaded(true) // Show fallback
          }
        }
        
        // Handle script loading errors (including API key issues)
        script.onerror = (error) => {
          console.error('Failed to load Google Maps API script:', error)
          setIsLoaded(true) // Show fallback
        }
        
        // Handle Google Maps API errors (like ApiTargetBlockedMapError)
        window.addEventListener('error', (event) => {
          if (event.message && event.message.includes('Google Maps')) {
            console.error('Google Maps API Error:', event.message)
            if (event.message.includes('ApiTargetBlockedMapError')) {
              console.error('API key is restricted for this domain. Please check API key restrictions in Google Cloud Console.')
            }
          }
        })
        
        document.head.appendChild(script)
      } catch (error) {
        console.error('Error loading Google Maps:', error)
        setIsLoaded(true) // Show fallback
      }
    }

    loadGoogleMaps()
  }, [])

  // Initialize map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || map) return

    // Check if Google Maps is actually available
    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.error('Google Maps API not available, showing fallback message')
      return
    }

    try {
      const googleMap = new window.google.maps.Map(mapRef.current, {
        center,
        zoom,
        mapTypeId: mapType,
        styles: [
          {
            featureType: 'poi',
            elementType: 'labels',
            stylers: [{ visibility: 'off' }]
          }
        ],
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        zoomControl: true,
        scaleControl: true
      })

      const infoWin = new window.google.maps.InfoWindow()
      
      setMap(googleMap)
      setInfoWindow(infoWin)
    } catch (error) {
      console.error('Error initializing Google Maps:', error)
    }
  }, [isLoaded, center, zoom, mapType, map])

  // Update markers when properties change
  useEffect(() => {
    if (!map || !window.google) return

    // Clear existing markers
    markers.forEach(marker => marker.setMap(null))

    const newMarkers = properties.map(property => {
      const priceText = property.price > 100000 ? `${Math.round(property.price / 100000)}L` : `${Math.round(property.price / 1000)}K`
      const color = property.priceType === 'rent' ? '#2563EB' : property.priceType === 'sale' ? '#DC2626' : '#F59E0B'
      
      // Use regular Marker for better compatibility
      const marker = new window.google.maps.Marker({
        position: { lat: property.location.latitude, lng: property.location.longitude },
        map,
        title: property.title,
        icon: {
          path: window.google.maps.SymbolPath.CIRCLE,
          scale: 15,
          fillColor: color,
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 3
        },
        label: {
          text: priceText,
          color: 'white',
          fontSize: '11px',
          fontWeight: 'bold'
        }
      })

      // Add click listener (works for both marker types)
      if (marker.addListener) {
        marker.addListener('click', () => {
        onPropertySelect(property)
        
        const content = `
          <div style="max-width: 300px; padding: 8px;">
            <div style="position: relative; height: 120px; background: linear-gradient(135deg, #f3f4f6, #e5e7eb); border-radius: 8px; margin-bottom: 12px; overflow: hidden;">
              ${property.images && property.images.length > 0 ? 
                `<img src="${property.images[0]}" alt="${property.title}" style="width: 100%; height: 100%; object-fit: cover;">` :
                `<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: #6b7280;">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7v10c0 5.55 3.84 9.74 9 11 5.16-1.26 9-5.45 9-11V7l-10-5z"/>
                  </svg>
                </div>`
              }
              <div style="position: absolute; top: 8px; left: 8px;">
                <span style="background: ${property.priceType === 'rent' ? '#2563EB' : property.priceType === 'sale' ? '#DC2626' : '#F59E0B'}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">
                  For ${property.priceType}
                </span>
              </div>
              ${property.aiRecommendationScore ? 
                `<div style="position: absolute; top: 8px; right: 8px;">
                  <span style="background: rgba(0,0,0,0.7); color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px;">
                    ${Math.round(property.aiRecommendationScore * 100)}% match
                  </span>
                </div>` : ''
              }
            </div>
            
            <h3 style="font-size: 16px; font-weight: 600; margin: 0 0 8px 0; color: #111827;">${property.title}</h3>
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#6b7280">
                  <path d="M7 4V2C7 1.45 7.45 1 8 1S9 1.55 9 2V4H15V2C15 1.45 15.45 1 16 1S17 1.55 17 2V4H19C20.1 4 21 4.9 21 6V20C21 21.1 20.1 22 19 22H5C3.9 22 3 21.1 3 20V6C3 4.9 3.9 4 5 4H7Z"/>
                </svg>
                <span style="font-size: 18px; font-weight: 700; color: #111827;">NPR ${property.price.toLocaleString()}</span>
                <span style="font-size: 12px; color: #6b7280;">/${property.priceType === 'rent' ? 'month' : 'total'}</span>
              </div>
            </div>

            <div style="display: flex; gap: 16px; margin-bottom: 8px; font-size: 12px; color: #6b7280;">
              <div style="display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14c1.66 0 3-1.34 3-3S8.66 8 7 8s-3 1.34-3 3 1.34 3 3 3zm0-4c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm12-3h-8v8H3V5H1v11h2v3h2v-3h2v3h2v-3h4v3h2v-3h2v3h2v-3h2V5z"/>
                </svg>
                <span>${property.bedrooms} Bedrooms</span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9,2V8H7V2H9M13,2V8H11V2H13M17,2V8H15V2H17M19,8V10H5V8H19M5,10H19V12H5V10Z"/>
                </svg>
                <span>${property.bathrooms} Bathrooms</span>
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3,3H21V21H3V3M5,5V19H19V5H5Z"/>
                </svg>
                <span>${property.area} ${property.areaUnit}</span>
              </div>
            </div>

            <div style="display: flex; align-items: center; gap: 4px; margin-bottom: 8px;">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#6b7280">
                <path d="M12,11.5A2.5,2.5 0 0,1 9.5,9A2.5,2.5 0 0,1 12,6.5A2.5,2.5 0 0,1 14.5,9A2.5,2.5 0 0,1 12,11.5M12,2A7,7 0 0,0 5,9C5,14.25 12,22 12,22C12,22 19,14.25 19,9A7,7 0 0,0 12,2Z"/>
              </svg>
              <span style="font-size: 12px; color: #6b7280;">${property.location.address}</span>
            </div>

            ${property.aiExplanation ? 
              `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 6px; padding: 8px; margin-bottom: 8px;">
                <p style="font-size: 12px; color: #1d4ed8; margin: 0;">
                  <strong>🤖 AI Insight:</strong> ${property.aiExplanation}
                </p>
              </div>` : ''
            }

            <div style="display: flex; gap: 8px; margin-top: 12px;">
              <button onclick="window.parent.postMessage({type: 'viewDetails', propertyId: '${property.id}'}, '*')" 
                      style="flex: 1; background: #2563eb; color: white; border: none; padding: 8px 12px; border-radius: 6px; font-size: 12px; cursor: pointer;">
                View Details
              </button>
              <button onclick="window.parent.postMessage({type: 'contact', propertyId: '${property.id}'}, '*')" 
                      style="background: #f3f4f6; color: #374151; border: 1px solid #d1d5db; padding: 8px; border-radius: 6px; cursor: pointer;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6.62,10.79C8.06,13.62 10.38,15.94 13.21,17.38L15.41,15.18C15.69,14.9 16.08,14.82 16.43,14.93C17.55,15.3 18.75,15.5 20,15.5A1,1 0 0,1 21,16.5V20A1,1 0 0,1 20,21A17,17 0 0,1 3,4A1,1 0 0,1 4,3H7.5A1,1 0 0,1 8.5,4C8.5,5.25 8.7,6.45 9.07,7.57C9.18,7.92 9.1,8.31 8.82,8.59L6.62,10.79Z"/>
                </svg>
              </button>
            </div>
          </div>
        `
        
        infoWindow.setContent(content)
        infoWindow.open(map, marker)
        })
      }

      return marker
    })

    setMarkers(newMarkers)

    // Fit bounds to show all properties
    if (properties.length > 0) {
      const bounds = new window.google.maps.LatLngBounds()
      properties.forEach(property => {
        bounds.extend({ lat: property.location.latitude, lng: property.location.longitude })
      })
      map.fitBounds(bounds)
      
      // Ensure minimum zoom level
      const listener = window.google.maps.event.addListener(map, 'idle', () => {
        if (map.getZoom() > 16) map.setZoom(16)
        window.google.maps.event.removeListener(listener)
      })
    }
  }, [map, properties, onPropertySelect, infoWindow]) // eslint-disable-line react-hooks/exhaustive-deps

  // Handle selected property
  useEffect(() => {
    if (!map || !selectedProperty) return

    map.setCenter({ lat: selectedProperty.location.latitude, lng: selectedProperty.location.longitude })
    map.setZoom(16)

    // Find and trigger click on the corresponding marker
    const marker = markers.find(m => {
      const position = m.position || m.getPosition()
      const lat = position.lat || (typeof position.lat === 'function' ? position.lat() : position.latitude)
      const lng = position.lng || (typeof position.lng === 'function' ? position.lng() : position.longitude)
      return lat === selectedProperty.location.latitude && lng === selectedProperty.location.longitude
    })
    
    if (marker) {
      window.google.maps.event.trigger(marker, 'click')
    }
  }, [map, selectedProperty, markers])

  // Handle map type change
  const handleMapTypeChange = (type: 'roadmap' | 'satellite' | 'hybrid' | 'terrain') => {
    setMapType(type)
    if (map) {
      map.setMapTypeId(type)
    }
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold mb-2">Loading Google Maps</h3>
          <p className="text-sm text-muted-foreground">Initializing interactive map with property locations...</p>
        </div>
      </div>
    )
  }

  // Show fallback message if Google Maps API failed to load
  if (isLoaded && (!window.google || !window.google.maps || !window.google.maps.Map)) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted/20">
        <div className="text-center max-w-md mx-auto p-6">
          <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-white" />
          </div>
          <h3 className="font-semibold mb-2">Interactive Map Unavailable</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Google Maps couldn't load due to API key restrictions. The API key needs to be configured to allow this domain.
          </p>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
            <p className="text-xs text-amber-800">
              <strong>🔧 For Developers:</strong> Add your domain to the Google Maps API key restrictions in Google Cloud Console, or use an unrestricted key for development.
            </p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs text-blue-800">
              <strong>Properties Found:</strong> {properties.length} properties in Kathmandu Valley
            </p>
            <div className="mt-2 space-y-1">
              {properties.slice(0, 3).map(property => (
                <div key={property.id} className="text-xs text-blue-700">
                  📍 {property.title} - NPR {property.price.toLocaleString()}
                </div>
              ))}
              {properties.length > 3 && (
                <div className="text-xs text-blue-600">
                  ...and {properties.length - 3} more properties
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full relative">
      <div ref={mapRef} className="h-full w-full" />
      
      {/* Map Controls */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-10">
        <div className="flex items-center space-x-1">
          <Button
            variant={mapType === 'roadmap' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleMapTypeChange('roadmap')}
            className="text-xs"
          >
            Map
          </Button>
          <Button
            variant={mapType === 'satellite' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleMapTypeChange('satellite')}
            className="text-xs"
          >
            Satellite
          </Button>
          <Button
            variant={mapType === 'hybrid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => handleMapTypeChange('hybrid')}
            className="text-xs"
          >
            Hybrid
          </Button>
        </div>
      </div>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-10">
        <h4 className="font-medium text-sm mb-2 flex items-center">
          <Layers className="w-4 h-4 mr-2" />
          Property Types
        </h4>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-primary rounded-full"></div>
            <span className="text-xs">For Rent</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-600 rounded-full"></div>
            <span className="text-xs">For Sale</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-accent rounded-full"></div>
            <span className="text-xs">For Swap</span>
          </div>
        </div>
      </div>

      {/* Property Count */}
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-10">
        <div className="flex items-center space-x-2">
          <Navigation className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">
            {properties.length} {properties.length === 1 ? 'Property' : 'Properties'} Found
          </span>
        </div>
      </div>
    </div>
  )
}