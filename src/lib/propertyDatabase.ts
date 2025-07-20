import { blink } from './blink'
import { Property } from '@/types'

export class PropertyDatabase {
  async getAllProperties(): Promise<Property[]> {
    try {
      const result = await blink.db.properties.list({
        where: { isActive: "1" },
        orderBy: { createdAt: 'desc' }
      })

      return result.map((dbProperty) => this.transformDbPropertyToProperty(dbProperty))
    } catch (error) {
      console.error('Error fetching properties:', error)
      return []
    }
  }

  async getPropertiesByFilters(filters: {
    priceType?: string
    propertyType?: string
    city?: string
    minPrice?: number
    maxPrice?: number
    bedrooms?: number
  }): Promise<Property[]> {
    try {
      const whereConditions: any = { isActive: "1" }

      if (filters.priceType) {
        whereConditions.priceType = filters.priceType
      }
      if (filters.propertyType) {
        whereConditions.propertyType = filters.propertyType
      }
      if (filters.city) {
        whereConditions.city = filters.city
      }
      if (filters.bedrooms) {
        whereConditions.bedrooms = filters.bedrooms
      }

      const result = await blink.db.properties.list({
        where: whereConditions,
        orderBy: { createdAt: 'desc' }
      })

      let properties = result.map((dbProperty) => this.transformDbPropertyToProperty(dbProperty))

      // Apply price range filter (SQLite doesn't support range queries easily)
      if (filters.minPrice || filters.maxPrice) {
        properties = properties.filter(property => {
          if (filters.minPrice && property.price < filters.minPrice) return false
          if (filters.maxPrice && property.price > filters.maxPrice) return false
          return true
        })
      }

      return properties
    } catch (error) {
      console.error('Error fetching filtered properties:', error)
      return []
    }
  }

  async getPropertyById(id: string): Promise<Property | null> {
    try {
      const result = await blink.db.properties.list({
        where: { id, isActive: "1" },
        limit: 1
      })

      if (result.length === 0) return null

      return this.transformDbPropertyToProperty(result[0])
    } catch (error) {
      console.error('Error fetching property by ID:', error)
      return null
    }
  }

  async searchProperties(query: string): Promise<Property[]> {
    try {
      // Simple text search in title and description
      const allProperties = await this.getAllProperties()
      
      const searchTerms = query.toLowerCase().split(' ')
      
      return allProperties.filter(property => {
        const searchableText = `${property.title} ${property.description} ${property.location.address} ${property.location.city}`.toLowerCase()
        
        return searchTerms.some(term => searchableText.includes(term))
      })
    } catch (error) {
      console.error('Error searching properties:', error)
      return []
    }
  }

  async incrementViews(propertyId: string): Promise<void> {
    try {
      const property = await this.getPropertyById(propertyId)
      if (property) {
        await blink.db.properties.update(propertyId, {
          views: property.views + 1,
          updatedAt: new Date().toISOString()
        })
      }
    } catch (error) {
      console.error('Error incrementing views:', error)
    }
  }

  private transformDbPropertyToProperty(dbProperty: any): Property {
    // Parse JSON fields
    const amenities = this.safeJsonParse(dbProperty.amenities, [])
    const images = this.safeJsonParse(dbProperty.images, [])
    const features = this.safeJsonParse(dbProperty.features, [])
    const nearbyPlaces = this.safeJsonParse(dbProperty.nearbyPlaces, {
      schools: [],
      hospitals: [],
      markets: [],
      transport: []
    })

    return {
      id: dbProperty.id,
      title: dbProperty.title,
      description: dbProperty.description || '',
      price: dbProperty.price,
      priceType: dbProperty.priceType as 'rent' | 'sale' | 'swap',
      propertyType: dbProperty.propertyType as 'apartment' | 'house' | 'commercial' | 'land',
      bedrooms: dbProperty.bedrooms || undefined,
      bathrooms: dbProperty.bathrooms || undefined,
      area: dbProperty.area,
      areaUnit: dbProperty.areaUnit as 'sqft' | 'sqm',
      location: {
        address: dbProperty.address,
        city: dbProperty.city,
        district: dbProperty.district,
        latitude: dbProperty.latitude,
        longitude: dbProperty.longitude
      },
      amenities,
      images,
      ownerId: dbProperty.ownerId,
      ownerContact: {
        name: dbProperty.ownerName,
        phone: dbProperty.ownerPhone,
        email: dbProperty.ownerEmail
      },
      features,
      nearbyPlaces,
      createdAt: dbProperty.createdAt,
      updatedAt: dbProperty.updatedAt,
      isActive: Number(dbProperty.isActive) > 0,
      views: dbProperty.views || 0,
      aiRecommendationScore: dbProperty.aiRecommendationScore || undefined,
      aiExplanation: dbProperty.aiExplanation || undefined
    }
  }

  private safeJsonParse(jsonString: string | null | undefined, defaultValue: any): any {
    if (!jsonString) return defaultValue
    
    try {
      return JSON.parse(jsonString)
    } catch (error) {
      console.warn('Failed to parse JSON:', jsonString)
      return defaultValue
    }
  }
}

export const propertyDatabase = new PropertyDatabase()