import { Property } from '@/types'
import { blink } from './blink'
import { geminiSearch, GeminiSearchRequest } from './gemini'
import { tavilySearch } from './tavily'
import { googleMapsService } from './googleMaps'

export interface EnhancedProperty extends Property {
  nearbyContext?: {
    schools: Array<{ name: string; distance: string; rating?: number }>
    hospitals: Array<{ name: string; distance: string; rating?: number }>
    restaurants: Array<{ name: string; distance: string; rating?: number }>
    transport: Array<{ name: string; distance: string; type: string }>
    shopping: Array<{ name: string; distance: string; rating?: number }>
  }
  marketInsights?: {
    averageAreaPrice: number
    priceComparison: 'below' | 'average' | 'above'
    marketTrend: string
    lastUpdated: string
  }
  commuteInfo?: Array<{
    destination: string
    drivingTime: string
    walkingTime: string
    transitTime?: string
  }>
}

export class PropertyService {
  async searchProperties(query: string, userLocation?: { lat: number; lng: number }): Promise<{
    properties: EnhancedProperty[]
    aiResponse: string
    searchInsights: any
  }> {
    try {
      // Step 1: Use Gemini to interpret the search query
      const searchRequest: GeminiSearchRequest = {
        query,
        location: userLocation ? {
          latitude: userLocation.lat,
          longitude: userLocation.lng,
          radius: 10000 // 10km
        } : undefined
      }

      const geminiResponse = await geminiSearch.interpretSearch(searchRequest)
      console.log('Gemini interpretation:', geminiResponse)

      // Step 2: Get real-time market data using Tavily
      const marketData = await tavilySearch.getPropertyMarketData(
        geminiResponse.searchCriteria.propertyType?.[0] || 'apartment',
        geminiResponse.searchCriteria.location?.areas?.[0] || 'Kathmandu'
      )

      // Step 3: Search properties from database (mock data for now)
      const mockProperties = await this.getMockProperties(geminiResponse.searchCriteria)

      // Step 4: Enhance properties with Google Maps data
      const enhancedProperties = await Promise.all(
        mockProperties.map(property => this.enhancePropertyWithMapsData(property))
      )

      // Step 5: Generate AI explanations for each property
      const propertiesWithExplanations = await Promise.all(
        enhancedProperties.map(async (property) => {
          const explanation = await geminiSearch.explainPropertyMatch(property, query)
          return {
            ...property,
            aiExplanation: explanation,
            aiRecommendationScore: this.calculateMatchScore(property, geminiResponse.searchCriteria)
          }
        })
      )

      // Step 6: Generate overall AI response
      const aiResponse = await geminiSearch.generatePropertyRecommendation(propertiesWithExplanations, query)

      return {
        properties: propertiesWithExplanations.sort((a, b) => 
          (b.aiRecommendationScore || 0) - (a.aiRecommendationScore || 0)
        ),
        aiResponse,
        searchInsights: {
          interpretation: geminiResponse.interpretation,
          confidence: geminiResponse.confidence,
          marketData: marketData.marketOverview,
          suggestedRefinements: geminiResponse.suggestedRefinements
        }
      }
    } catch (error) {
      console.error('Error in property search:', error)
      
      // Fallback to basic search
      const fallbackProperties = await this.getMockProperties({})
      return {
        properties: fallbackProperties,
        aiResponse: "I found some properties that might interest you. Let me know if you'd like to refine your search criteria.",
        searchInsights: {
          interpretation: "Basic search performed",
          confidence: 0.5,
          marketData: "Market data temporarily unavailable",
          suggestedRefinements: ["Try being more specific about location", "Specify your budget range"]
        }
      }
    }
  }

  private async enhancePropertyWithMapsData(property: Property): Promise<EnhancedProperty> {
    try {
      // Get neighborhood context from Google Maps
      const nearbyPlaces = await googleMapsService.getNeighborhoodContext({
        lat: property.location.latitude,
        lng: property.location.longitude
      })

      // Calculate distances and format nearby context
      const nearbyContext = {
        schools: nearbyPlaces.schools.map(place => ({
          name: place.name,
          distance: this.calculateDistance(
            property.location.latitude,
            property.location.longitude,
            place.location.lat,
            place.location.lng
          ),
          rating: place.rating
        })),
        hospitals: nearbyPlaces.hospitals.map(place => ({
          name: place.name,
          distance: this.calculateDistance(
            property.location.latitude,
            property.location.longitude,
            place.location.lat,
            place.location.lng
          ),
          rating: place.rating
        })),
        restaurants: nearbyPlaces.restaurants.map(place => ({
          name: place.name,
          distance: this.calculateDistance(
            property.location.latitude,
            property.location.longitude,
            place.location.lat,
            place.location.lng
          ),
          rating: place.rating
        })),
        transport: nearbyPlaces.transport.map(place => ({
          name: place.name,
          distance: this.calculateDistance(
            property.location.latitude,
            property.location.longitude,
            place.location.lat,
            place.location.lng
          ),
          type: 'Bus Station'
        })),
        shopping: nearbyPlaces.shopping.map(place => ({
          name: place.name,
          distance: this.calculateDistance(
            property.location.latitude,
            property.location.longitude,
            place.location.lat,
            place.location.lng
          ),
          rating: place.rating
        }))
      }

      // Get market insights
      const marketInsights = await this.getMarketInsights(property)

      return {
        ...property,
        nearbyContext,
        marketInsights
      }
    } catch (error) {
      console.error('Error enhancing property with maps data:', error)
      return property
    }
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const R = 6371 // Radius of the Earth in kilometers
    const dLat = (lat2 - lat1) * Math.PI / 180
    const dLon = (lon2 - lon1) * Math.PI / 180
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    const distance = R * c

    if (distance < 1) {
      return `${Math.round(distance * 1000)}m`
    } else {
      return `${distance.toFixed(1)}km`
    }
  }

  private async getMarketInsights(property: Property): Promise<any> {
    try {
      // Get neighborhood insights from Tavily
      const insights = await tavilySearch.getNeighborhoodInsights(
        property.location.address.split(',')[0], // Extract area name
        property.location.city
      )

      // Mock market comparison (in real app, this would come from your database)
      const averageAreaPrice = property.priceType === 'rent' ? 
        Math.round(property.price * (0.8 + Math.random() * 0.4)) : 
        Math.round(property.price * (0.9 + Math.random() * 0.2))

      const priceComparison = property.price < averageAreaPrice * 0.9 ? 'below' :
                             property.price > averageAreaPrice * 1.1 ? 'above' : 'average'

      return {
        averageAreaPrice,
        priceComparison,
        marketTrend: insights.marketTrends || 'Stable market conditions',
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error getting market insights:', error)
      return {
        averageAreaPrice: property.price,
        priceComparison: 'average' as const,
        marketTrend: 'Market data unavailable',
        lastUpdated: new Date().toISOString()
      }
    }
  }

  private calculateMatchScore(property: Property, criteria: any): number {
    let score = 0.5 // Base score

    // Price matching
    if (criteria.priceRange) {
      if (property.price >= criteria.priceRange.min && property.price <= criteria.priceRange.max) {
        score += 0.3
      } else if (property.price <= criteria.priceRange.max * 1.2) {
        score += 0.1
      }
    }

    // Bedroom matching
    if (criteria.bedrooms && property.bedrooms === criteria.bedrooms) {
      score += 0.2
    }

    // Property type matching
    if (criteria.propertyType && criteria.propertyType.includes(property.propertyType)) {
      score += 0.2
    }

    // Amenities matching
    if (criteria.amenities && property.amenities) {
      const matchingAmenities = criteria.amenities.filter((amenity: string) =>
        property.amenities.some(propAmenity => 
          propAmenity.toLowerCase().includes(amenity.toLowerCase())
        )
      )
      score += (matchingAmenities.length / criteria.amenities.length) * 0.2
    }

    return Math.min(score, 1.0) // Cap at 1.0
  }

  private async getMockProperties(criteria: any): Promise<Property[]> {
    // Mock properties - in real app, this would query your database
    const mockProperties: Property[] = [
      {
        id: '1',
        title: 'Modern 2BHK Apartment in Thamel',
        description: 'Beautiful modern apartment with city views, fully furnished with modern amenities. Perfect for professionals and small families.',
        price: 25000,
        priceType: 'rent',
        propertyType: 'apartment',
        bedrooms: 2,
        bathrooms: 2,
        area: 800,
        areaUnit: 'sqft',
        location: {
          address: 'Thamel, Kathmandu',
          city: 'Kathmandu',
          district: 'Kathmandu',
          latitude: 27.7172,
          longitude: 85.3240
        },
        amenities: ['Parking', 'WiFi', 'Security', 'Elevator', 'Gym'],
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
        ownerId: 'owner1',
        ownerContact: {
          name: 'Ram Sharma',
          phone: '+977-9841234567',
          email: 'ram@example.com'
        },
        features: ['Furnished', 'City View', 'Modern Kitchen', 'Balcony'],
        nearbyPlaces: {
          schools: ['Kathmandu University School'],
          hospitals: ['Norvic Hospital'],
          markets: ['Asan Bazaar'],
          transport: ['Thamel Bus Stop']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        views: 45
      },
      {
        id: '2',
        title: 'Spacious 3BHK House in Lalitpur',
        description: 'Family-friendly house with garden, perfect for those seeking space and tranquility. Located in a quiet residential area.',
        price: 35000,
        priceType: 'rent',
        propertyType: 'house',
        bedrooms: 3,
        bathrooms: 3,
        area: 1200,
        areaUnit: 'sqft',
        location: {
          address: 'Pulchowk, Lalitpur',
          city: 'Lalitpur',
          district: 'Lalitpur',
          latitude: 27.6588,
          longitude: 85.3247
        },
        amenities: ['Garden', 'Parking', 'Security', 'Water Tank', 'Solar'],
        images: ['https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'],
        ownerId: 'owner2',
        ownerContact: {
          name: 'Sita Gurung',
          phone: '+977-9851234567',
          email: 'sita@example.com'
        },
        features: ['Garden', 'Quiet Area', 'Family Friendly', 'Pet Friendly'],
        nearbyPlaces: {
          schools: ['Pulchowk Campus'],
          hospitals: ['Patan Hospital'],
          markets: ['Mangal Bazaar'],
          transport: ['Pulchowk Bus Stop']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        views: 32
      },
      {
        id: '3',
        title: 'Luxury 1BHK Studio in Baneshwor',
        description: 'Modern studio apartment perfect for young professionals. Fully furnished with premium amenities and excellent connectivity.',
        price: 18000,
        priceType: 'rent',
        propertyType: 'apartment',
        bedrooms: 1,
        bathrooms: 1,
        area: 500,
        areaUnit: 'sqft',
        location: {
          address: 'Baneshwor, Kathmandu',
          city: 'Kathmandu',
          district: 'Kathmandu',
          latitude: 27.6892,
          longitude: 85.3448
        },
        amenities: ['WiFi', 'AC', 'Elevator', 'Security', 'Laundry'],
        images: ['https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800'],
        ownerId: 'owner3',
        ownerContact: {
          name: 'Hari Thapa',
          phone: '+977-9861234567',
          email: 'hari@example.com'
        },
        features: ['Furnished', 'Modern', 'Central Location', 'High Speed Internet'],
        nearbyPlaces: {
          schools: ['Baneshwor Campus'],
          hospitals: ['Grande Hospital'],
          markets: ['New Baneshwor Market'],
          transport: ['Baneshwor Bus Park']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        views: 67
      }
    ]

    // Filter based on criteria
    return mockProperties.filter(property => {
      if (criteria.propertyType && !criteria.propertyType.includes(property.propertyType)) {
        return false
      }
      if (criteria.priceRange && (property.price < criteria.priceRange.min || property.price > criteria.priceRange.max)) {
        return false
      }
      if (criteria.bedrooms && property.bedrooms !== criteria.bedrooms) {
        return false
      }
      return true
    })
  }

  async getCommuteInfo(property: Property, destinations: Array<{ name: string; lat: number; lng: number }>): Promise<any[]> {
    try {
      const commutePromises = destinations.map(async (dest) => {
        const [driving, walking, transit] = await Promise.all([
          googleMapsService.getDirections(
            { lat: property.location.latitude, lng: property.location.longitude },
            { lat: dest.lat, lng: dest.lng },
            'driving'
          ),
          googleMapsService.getDirections(
            { lat: property.location.latitude, lng: property.location.longitude },
            { lat: dest.lat, lng: dest.lng },
            'walking'
          ),
          googleMapsService.getDirections(
            { lat: property.location.latitude, lng: property.location.longitude },
            { lat: dest.lat, lng: dest.lng },
            'transit'
          )
        ])

        return {
          destination: dest.name,
          drivingTime: driving?.duration.text || 'N/A',
          walkingTime: walking?.duration.text || 'N/A',
          transitTime: transit?.duration.text || 'N/A'
        }
      })

      return await Promise.all(commutePromises)
    } catch (error) {
      console.error('Error getting commute info:', error)
      return []
    }
  }
}

export const propertyService = new PropertyService()