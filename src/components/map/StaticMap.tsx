import { Property } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MapPin, DollarSign, Bed, Bath, Square, Navigation, Layers } from 'lucide-react'

interface StaticMapProps {
  properties: Property[]
  selectedProperty?: Property | null
  onPropertySelect: (property: Property) => void
  center?: { lat: number; lng: number }
}

export function StaticMap({ properties, selectedProperty, onPropertySelect, center = { lat: 27.7172, lng: 85.3240 } }: StaticMapProps) {
  // Create a static map URL using OpenStreetMap tiles
  const mapWidth = 800
  const mapHeight = 600
  const zoom = 12
  
  // Generate markers for the static map
  const markers = properties.slice(0, 10).map((property, index) => {
    const color = property.priceType === 'rent' ? 'blue' : property.priceType === 'sale' ? 'red' : 'orange'
    return `pin-s-${index + 1}+${color}(${property.location.longitude},${property.location.latitude})`
  }).join(',')

  const staticMapUrl = `https://api.mapbox.com/styles/v1/mapbox/streets-v11/static/${markers}/${center.lng},${center.lat},${zoom}/${mapWidth}x${mapHeight}@2x?access_token=pk.eyJ1IjoibWFwYm94IiwiYSI6ImNpejY4NXVycTA2emYycXBndHRqcmZ3N3gifQ.rJcFIG214AriISLbB6B5aw`

  return (
    <div className="h-full w-full relative bg-muted/20">
      {/* Static Map Image */}
      <div className="relative h-full w-full overflow-hidden rounded-lg">
        <img
          src={staticMapUrl}
          alt="Property locations map"
          className="w-full h-full object-cover"
          onError={(e) => {
            // Fallback to a simple grid view if static map fails
            e.currentTarget.style.display = 'none'
            const fallback = e.currentTarget.nextElementSibling as HTMLElement
            if (fallback) fallback.style.display = 'block'
          }}
        />
        
        {/* Fallback Grid View */}
        <div className="hidden absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 p-6 overflow-y-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <MapPin className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold mb-2">Property Locations</h3>
            <p className="text-sm text-muted-foreground">
              Interactive map unavailable - showing property list
            </p>
          </div>
          
          <div className="grid gap-3 max-w-2xl mx-auto">
            {properties.map((property, index) => (
              <Card 
                key={property.id}
                className={`cursor-pointer transition-all hover:shadow-md ${
                  selectedProperty?.id === property.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => onPropertySelect(property)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge 
                          variant={property.priceType === 'rent' ? 'default' : property.priceType === 'sale' ? 'destructive' : 'secondary'}
                          className="text-xs"
                        >
                          For {property.priceType}
                        </Badge>
                        {property.aiRecommendationScore && (
                          <Badge variant="outline" className="text-xs">
                            {Math.round(property.aiRecommendationScore * 100)}% match
                          </Badge>
                        )}
                      </div>
                      
                      <h4 className="font-medium text-sm mb-1">{property.title}</h4>
                      
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mb-2">
                        <MapPin className="w-3 h-3" />
                        <span>{property.location.address}</span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Bed className="w-3 h-3" />
                          <span>{property.bedrooms}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Bath className="w-3 h-3" />
                          <span>{property.bathrooms}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Square className="w-3 h-3" />
                          <span>{property.area} {property.areaUnit}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm font-semibold">
                        <DollarSign className="w-4 h-4" />
                        <span>NPR {property.price.toLocaleString()}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        /{property.priceType === 'rent' ? 'month' : 'total'}
                      </span>
                    </div>
                  </div>
                  
                  {property.aiExplanation && (
                    <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-xs">
                      <span className="text-blue-800">
                        <strong>🤖 AI Insight:</strong> {property.aiExplanation}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Map Controls Overlay */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-2 z-10">
        <div className="flex items-center space-x-1">
          <Button variant="default" size="sm" className="text-xs">
            Static Map
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

      {/* Click overlay for property selection */}
      <div className="absolute inset-0 z-5">
        {properties.slice(0, 10).map((property, index) => {
          // Calculate approximate position based on lat/lng (simplified)
          const x = ((property.location.longitude - (center.lng - 0.05)) / 0.1) * 100
          const y = ((center.lat + 0.05 - property.location.latitude) / 0.1) * 100
          
          if (x < 0 || x > 100 || y < 0 || y > 100) return null
          
          return (
            <button
              key={property.id}
              className="absolute w-8 h-8 bg-primary/80 hover:bg-primary text-white rounded-full flex items-center justify-center text-xs font-bold shadow-lg transition-all hover:scale-110"
              style={{
                left: `${x}%`,
                top: `${y}%`,
                transform: 'translate(-50%, -50%)'
              }}
              onClick={() => onPropertySelect(property)}
              title={`${property.title} - NPR ${property.price.toLocaleString()}`}
            >
              {index + 1}
            </button>
          )
        })}
      </div>
    </div>
  )
}