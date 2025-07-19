import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Property } from '@/types'
import { 
  MapPin, 
  DollarSign, 
  Bed, 
  Bath, 
  Square, 
  Heart, 
  Phone, 
  Mail, 
  Eye,
  Sparkles,
  Car,
  Wifi,
  Shield,
  Building
} from 'lucide-react'

interface PropertyCardProps {
  property: Property
  onSelect: (property: Property) => void
  onFavorite?: (property: Property) => void
  onContact?: (property: Property) => void
  className?: string
}

const amenityIcons: Record<string, any> = {
  'Parking': Car,
  'WiFi': Wifi,
  'Security': Shield,
  'Elevator': Building,
}

export function PropertyCard({ property, onSelect, onFavorite, onContact, className = '' }: PropertyCardProps) {
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFavorite?.(property)
  }

  const handleContact = (e: React.MouseEvent) => {
    e.stopPropagation()
    onContact?.(property)
  }

  return (
    <Card 
      className={`group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 shadow-sm hover:shadow-xl hover:-translate-y-1 ${className}`}
      onClick={() => onSelect(property)}
    >
      <CardContent className="p-0">
        {/* Property Image */}
        <div className="relative h-48 bg-muted rounded-t-lg overflow-hidden">
          {property.images && property.images.length > 0 ? (
            <img
              src={property.images[0]}
              alt={property.title}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
              <MapPin className="w-12 h-12 text-muted-foreground" />
            </div>
          )}
          
          {/* Badges */}
          <div className="absolute top-3 left-3 flex flex-col space-y-1">
            <Badge 
              variant={property.priceType === 'rent' ? 'default' : property.priceType === 'sale' ? 'destructive' : 'secondary'}
              className="shadow-sm"
            >
              For {property.priceType}
            </Badge>
            {property.aiRecommendationScore && property.aiRecommendationScore > 0.8 && (
              <Badge variant="secondary" className="bg-accent text-white shadow-sm">
                <Sparkles className="w-3 h-3 mr-1" />
                AI Pick
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="absolute top-3 right-3 flex flex-col space-y-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleFavorite}
              className="bg-white/80 hover:bg-white shadow-sm w-8 h-8 p-0"
            >
              <Heart className="w-4 h-4" />
            </Button>
            <div className="bg-white/80 rounded px-2 py-1 text-xs font-medium flex items-center space-x-1">
              <Eye className="w-3 h-3" />
              <span>{property.views}</span>
            </div>
          </div>

          {/* Property Type */}
          <div className="absolute bottom-3 left-3">
            <Badge variant="outline" className="bg-white/90 text-xs">
              {property.propertyType}
            </Badge>
          </div>
        </div>

        {/* Property Details */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-lg leading-tight line-clamp-2 flex-1 mr-2">
              {property.title}
            </h3>
            {property.aiRecommendationScore && (
              <Badge variant="secondary" className="text-xs">
                {Math.round(property.aiRecommendationScore * 100)}%
              </Badge>
            )}
          </div>
          
          <div className="flex items-center space-x-1 mb-3">
            <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
            <span className="text-sm text-muted-foreground line-clamp-1">{property.location.address}</span>
          </div>

          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-1">
              <DollarSign className="w-5 h-5 text-muted-foreground" />
              <span className="font-bold text-xl">NPR {property.price.toLocaleString()}</span>
              <span className="text-sm text-muted-foreground">
                /{property.priceType === 'rent' ? 'month' : 'total'}
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-4 mb-3 text-sm text-muted-foreground">
            {property.bedrooms && (
              <div className="flex items-center space-x-1">
                <Bed className="w-4 h-4" />
                <span>{property.bedrooms}BR</span>
              </div>
            )}
            {property.bathrooms && (
              <div className="flex items-center space-x-1">
                <Bath className="w-4 h-4" />
                <span>{property.bathrooms}BA</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Square className="w-4 h-4" />
              <span>{property.area} {property.areaUnit}</span>
            </div>
          </div>

          {/* Amenities */}
          {property.amenities && property.amenities.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-3">
              {property.amenities.slice(0, 4).map((amenity, index) => {
                const IconComponent = amenityIcons[amenity]
                return (
                  <Badge key={index} variant="outline" className="text-xs">
                    {IconComponent && <IconComponent className="w-3 h-3 mr-1" />}
                    {amenity}
                  </Badge>
                )
              })}
              {property.amenities.length > 4 && (
                <Badge variant="outline" className="text-xs">
                  +{property.amenities.length - 4} more
                </Badge>
              )}
            </div>
          )}

          {/* AI Explanation */}
          {property.aiExplanation && (
            <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 mb-3">
              <p className="text-sm text-primary">
                <span className="font-medium">💡 AI Insight:</span> {property.aiExplanation}
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center space-x-2">
            <Button
              size="sm"
              className="flex-1"
              onClick={() => onSelect(property)}
            >
              View Details
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleContact}
            >
              <Phone className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleContact}
            >
              <Mail className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}