import { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Property } from '@/types'
import { MapPin, DollarSign, Bed, Bath, Square, Heart, Phone, Mail } from 'lucide-react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

interface InteractiveMapProps {
  properties: Property[]
  selectedProperty?: Property | null
  onPropertySelect: (property: Property) => void
  center?: [number, number]
  zoom?: number
}

// Custom marker icons
const createCustomIcon = (price: number, type: 'rent' | 'sale' | 'swap') => {
  const color = type === 'rent' ? '#2563EB' : type === 'sale' ? '#DC2626' : '#F59E0B'
  const priceText = price > 100000 ? `${Math.round(price / 100000)}L` : `${Math.round(price / 1000)}K`
  
  return L.divIcon({
    html: `
      <div style="
        background: ${color};
        color: white;
        padding: 4px 8px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        border: 2px solid white;
        min-width: 60px;
        text-align: center;
      ">
        NPR ${priceText}
      </div>
    `,
    className: 'custom-marker',
    iconSize: [60, 24],
    iconAnchor: [30, 24],
  })
}

function MapController({ properties, selectedProperty }: { properties: Property[], selectedProperty?: Property | null }) {
  const map = useMap()

  useEffect(() => {
    if (selectedProperty) {
      map.setView([selectedProperty.location.latitude, selectedProperty.location.longitude], 16)
    } else if (properties.length > 0) {
      const bounds = L.latLngBounds(
        properties.map(p => [p.location.latitude, p.location.longitude])
      )
      map.fitBounds(bounds, { padding: [20, 20] })
    }
  }, [map, properties, selectedProperty])

  return null
}

export function InteractiveMap({ properties, selectedProperty, onPropertySelect, center = [27.7172, 85.3240], zoom = 13 }: InteractiveMapProps) {
  const [mapReady, setMapReady] = useState(false)

  const PropertyPopup = ({ property }: { property: Property }) => (
    <div className="w-80 p-0">
      <Card className="border-0 shadow-none">
        <CardContent className="p-0">
          {/* Property Image */}
          <div className="relative h-32 bg-muted rounded-t-lg overflow-hidden">
            {property.images && property.images.length > 0 ? (
              <img
                src={property.images[0]}
                alt={property.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                <MapPin className="w-8 h-8 text-muted-foreground" />
              </div>
            )}
            <Badge 
              variant={property.priceType === 'rent' ? 'default' : property.priceType === 'sale' ? 'destructive' : 'secondary'}
              className="absolute top-2 left-2"
            >
              For {property.priceType}
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 bg-white/80 hover:bg-white"
            >
              <Heart className="w-4 h-4" />
            </Button>
          </div>

          {/* Property Details */}
          <div className="p-4">
            <h3 className="font-semibold text-lg mb-2">{property.title}</h3>
            
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4 text-muted-foreground" />
                <span className="font-bold text-lg">NPR {property.price.toLocaleString()}</span>
                <span className="text-sm text-muted-foreground">/{property.priceType === 'rent' ? 'month' : 'total'}</span>
              </div>
              {property.aiRecommendationScore && (
                <Badge variant="secondary">
                  {Math.round(property.aiRecommendationScore * 100)}% match
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Bed className="w-4 h-4" />
                <span>{property.bedrooms} Bedrooms</span>
              </div>
              <div className="flex items-center space-x-1">
                <Bath className="w-4 h-4" />
                <span>{property.bathrooms} Bathrooms</span>
              </div>
              <div className="flex items-center space-x-1">
                <Square className="w-4 h-4" />
                <span>{property.area} {property.areaUnit}</span>
              </div>
            </div>

            <div className="flex items-center space-x-1 mb-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">{property.location.address}</span>
            </div>

            {property.aiExplanation && (
              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
                <p className="text-sm text-primary">
                  <span className="font-medium">💡 AI Insight:</span> {property.aiExplanation}
                </p>
              </div>
            )}

            <div className="flex items-center space-x-2">
              <Button
                size="sm"
                onClick={() => onPropertySelect(property)}
                className="flex-1"
              >
                View Details
              </Button>
              <Button variant="outline" size="sm">
                <Phone className="w-4 h-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Mail className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )

  return (
    <div className="h-full w-full relative">
      <MapContainer
        center={center}
        zoom={zoom}
        className="h-full w-full"
        whenReady={() => setMapReady(true)}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapController properties={properties} selectedProperty={selectedProperty} />
        
        {properties.map((property) => (
          <Marker
            key={property.id}
            position={[property.location.latitude, property.location.longitude]}
            icon={createCustomIcon(property.price, property.priceType)}
          >
            <Popup
              closeButton={false}
              className="custom-popup"
              maxWidth={320}
              minWidth={320}
            >
              <PropertyPopup property={property} />
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Map Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-[1000]">
        <h4 className="font-medium text-sm mb-2">Property Types</h4>
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
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg px-3 py-2 z-[1000]">
        <span className="text-sm font-medium">
          {properties.length} {properties.length === 1 ? 'Property' : 'Properties'} Found
        </span>
      </div>
    </div>
  )
}