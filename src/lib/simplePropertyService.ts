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
      // Simple search implementation
      const allProperties = await this.getAllProperties()
      
      const searchTerms = query.toLowerCase().split(' ')
      
      return allProperties.filter(property => {
        const searchableText = `
          ${property.title} 
          ${property.description} 
          ${property.location.address} 
          ${property.location.city}
          ${property.amenities.join(' ')}
          ${property.features.join(' ')}
        `.toLowerCase()
        
        return searchTerms.some(term => searchableText.includes(term))
      })
    } catch (error) {
      console.error('Error searching properties:', error)
      return this.getMockProperties()
    }
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