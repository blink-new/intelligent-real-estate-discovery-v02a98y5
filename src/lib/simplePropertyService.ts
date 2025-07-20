import { blink } from './blink'
import { Property } from '@/types'

export class SimplePropertyService {
  async getAllProperties(): Promise<Property[]> {
    try {
      const dbProperties = await blink.db.properties.list({
        where: { isActive: "1" },
        orderBy: { createdAt: 'desc' },
        limit: 50
      })

      return dbProperties.map((dbProp) => this.mapDbPropertyToProperty(dbProp))
    } catch (error) {
      console.error('Error fetching properties:', error)
      return this.getMockProperties()
    }
  }

  async searchProperties(query: string): Promise<Property[]> {
    try {
      const allProperties = await this.getAllProperties()
      
      if (!query.trim()) {
        return allProperties
      }
      
      const searchTerms = query.toLowerCase().split(' ')
      
      // Enhanced search with scoring
      const scoredProperties = allProperties.map(property => {
        let score = 0
        const searchableText = `
          ${property.title} 
          ${property.description} 
          ${property.location.address} 
          ${property.location.city}
          ${property.location.district}
          ${property.amenities.join(' ')}
          ${property.features.join(' ')}
          ${property.propertyType}
          ${property.priceType}
        `.toLowerCase()
        
        // Exact phrase match gets highest score
        if (searchableText.includes(query.toLowerCase())) {
          score += 10
        }
        
        // Individual term matches
        searchTerms.forEach(term => {
          if (searchableText.includes(term)) {
            score += 1
          }
          
          // Higher score for matches in title
          if (property.title.toLowerCase().includes(term)) {
            score += 3
          }
          
          // Higher score for location matches
          if (property.location.city.toLowerCase().includes(term) || 
              property.location.district.toLowerCase().includes(term) ||
              property.location.address.toLowerCase().includes(term)) {
            score += 2
          }
        })
        
        // Price range matching
        const priceMatch = query.match(/(\d+(?:,\d+)*)/g)
        if (priceMatch) {
          const queryPrice = parseInt(priceMatch[0].replace(/,/g, ''))
          const priceDiff = Math.abs(property.price - queryPrice)
          if (priceDiff < 5000) score += 5
          else if (priceDiff < 10000) score += 3
          else if (priceDiff < 20000) score += 1
        }
        
        // Bedroom matching
        const bedroomMatch = query.match(/(\d+)\s*(?:bhk|bedroom|br)/i)
        if (bedroomMatch && property.bedrooms === parseInt(bedroomMatch[1])) {
          score += 5
        }
        
        return { property, score }
      })
      
      // Filter properties with score > 0 and sort by score
      return scoredProperties
        .filter(item => item.score > 0)
        .sort((a, b) => b.score - a.score)
        .map(item => ({
          ...item.property,
          aiRecommendationScore: Math.min(item.score / 10, 1), // Normalize to 0-1
          aiExplanation: this.generateExplanation(item.property, query, item.score)
        }))
    } catch (error) {
      console.error('Error searching properties:', error)
      return this.getMockProperties()
    }
  }

  private generateExplanation(property: Property, query: string, score: number): string {
    const explanations = []
    
    if (property.title.toLowerCase().includes(query.toLowerCase())) {
      explanations.push("Perfect title match for your search")
    }
    
    if (query.toLowerCase().includes(property.location.city.toLowerCase())) {
      explanations.push(`Located in your preferred area: ${property.location.city}`)
    }
    
    const bedroomMatch = query.match(/(\d+)\s*(?:bhk|bedroom|br)/i)
    if (bedroomMatch && property.bedrooms === parseInt(bedroomMatch[1])) {
      explanations.push(`Exactly ${property.bedrooms} bedrooms as requested`)
    }
    
    const priceMatch = query.match(/(\d+(?:,\d+)*)/g)
    if (priceMatch) {
      const queryPrice = parseInt(priceMatch[0].replace(/,/g, ''))
      if (Math.abs(property.price - queryPrice) < 5000) {
        explanations.push("Price matches your budget perfectly")
      }
    }
    
    if (score > 8) {
      explanations.push("Excellent match for all your criteria")
    } else if (score > 5) {
      explanations.push("Good match with most of your requirements")
    }
    
    return explanations.length > 0 
      ? explanations.join(". ") + "."
      : "This property matches several aspects of your search criteria."
  }

  private mapDbPropertyToProperty(dbProp: any): Property {
    return {
      id: dbProp.id,
      title: dbProp.title,
      description: dbProp.description || '',
      price: dbProp.price,
      priceType: dbProp.priceType as 'rent' | 'sale',
      propertyType: dbProp.propertyType as 'apartment' | 'house' | 'commercial' | 'land',
      bedrooms: dbProp.bedrooms || 0,
      bathrooms: dbProp.bathrooms || 0,
      area: dbProp.area || 0,
      areaUnit: (dbProp.areaUnit || 'sqft') as 'sqft' | 'sqm',
      location: {
        address: dbProp.address || '',
        city: dbProp.city || '',
        district: dbProp.district || '',
        latitude: dbProp.latitude || 27.7172,
        longitude: dbProp.longitude || 85.3240
      },
      amenities: this.parseJsonField(dbProp.amenities) || [],
      features: this.parseJsonField(dbProp.features) || [],
      images: this.parseJsonField(dbProp.images) || ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
      ownerId: dbProp.ownerId || '',
      ownerContact: {
        name: dbProp.ownerName || 'Property Owner',
        phone: dbProp.ownerPhone || '+977-9841234567',
        email: dbProp.ownerEmail || 'owner@example.com'
      },
      nearbyPlaces: this.parseJsonField(dbProp.nearbyPlaces) || {
        schools: ['Local School'],
        hospitals: ['Nearby Hospital'],
        markets: ['Local Market'],
        transport: ['Bus Stop']
      },
      createdAt: dbProp.createdAt || new Date().toISOString(),
      updatedAt: dbProp.updatedAt || new Date().toISOString(),
      isActive: Number(dbProp.isActive) > 0,
      views: dbProp.views || 0,
      aiRecommendationScore: dbProp.aiRecommendationScore || 0.8,
      aiExplanation: dbProp.aiExplanation || 'This property matches your search criteria.'
    }
  }

  private parseJsonField(field: any): any {
    if (!field) return null
    if (typeof field === 'string') {
      try {
        return JSON.parse(field)
      } catch {
        return null
      }
    }
    return field
  }

  private getMockProperties(): Property[] {
    return [
      {
        id: 'mock1',
        title: '2BHK Modern Apartment in Kathmandu',
        description: 'Beautiful 2 bedroom apartment with modern amenities',
        price: 25000,
        priceType: 'rent' as const,
        propertyType: 'apartment' as const,
        bedrooms: 2,
        bathrooms: 2,
        area: 800,
        areaUnit: 'sqft' as const,
        location: {
          address: 'Thamel, Kathmandu',
          city: 'Kathmandu',
          district: 'Kathmandu',
          latitude: 27.7172,
          longitude: 85.3240
        },
        amenities: ['Parking', 'WiFi', 'Security'],
        features: ['Modern', 'Well-maintained'],
        images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
        ownerId: 'owner1',
        ownerContact: {
          name: 'Property Owner',
          phone: '+977-9841234567',
          email: 'owner@example.com'
        },
        nearbyPlaces: {
          schools: ['Local School'],
          hospitals: ['Nearby Hospital'],
          markets: ['Local Market'],
          transport: ['Bus Stop']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        views: 45,
        aiRecommendationScore: 0.9,
        aiExplanation: 'This property matches your criteria with excellent location and amenities.'
      },
      {
        id: 'mock2',
        title: '3BHK House in Lalitpur',
        description: 'Spacious family house with garden',
        price: 40000,
        priceType: 'rent' as const,
        propertyType: 'house' as const,
        bedrooms: 3,
        bathrooms: 3,
        area: 1200,
        areaUnit: 'sqft' as const,
        location: {
          address: 'Pulchowk, Lalitpur',
          city: 'Lalitpur',
          district: 'Lalitpur',
          latitude: 27.6792,
          longitude: 85.3168
        },
        amenities: ['Parking', 'Garden', 'Security'],
        features: ['Spacious', 'Family-friendly'],
        images: ['https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800'],
        ownerId: 'owner2',
        ownerContact: {
          name: 'House Owner',
          phone: '+977-9851234567',
          email: 'house@example.com'
        },
        nearbyPlaces: {
          schools: ['Pulchowk Campus'],
          hospitals: ['Patan Hospital'],
          markets: ['Local Market'],
          transport: ['Bus Stop']
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true,
        views: 32,
        aiRecommendationScore: 0.85,
        aiExplanation: 'Great family home with excellent amenities and location.'
      }
    ]
  }
}

export const simplePropertyService = new SimplePropertyService()