export interface Property {
  id: string
  title: string
  description: string
  price: number
  priceType: 'rent' | 'sale' | 'swap'
  propertyType: 'apartment' | 'house' | 'commercial' | 'land'
  bedrooms?: number
  bathrooms?: number
  area: number
  areaUnit: 'sqft' | 'sqm'
  location: {
    address: string
    city: string
    district: string
    latitude: number
    longitude: number
  }
  amenities: string[]
  images: string[]
  ownerId: string
  ownerContact: {
    name: string
    phone: string
    email: string
  }
  features: string[]
  nearbyPlaces: {
    schools: string[]
    hospitals: string[]
    markets: string[]
    transport: string[]
  }
  createdAt: string
  updatedAt: string
  isActive: boolean
  views: number
  aiRecommendationScore?: number
  aiExplanation?: string
}

export interface SearchFilters {
  priceRange: {
    min: number
    max: number
  }
  propertyType: string[]
  bedrooms?: number
  bathrooms?: number
  areaRange: {
    min: number
    max: number
  }
  amenities: string[]
  location?: {
    latitude: number
    longitude: number
    radius: number
  }
}

export interface User {
  id: string
  email: string
  displayName: string
  phone?: string
  preferences: {
    searchHistory: string[]
    favoriteProperties: string[]
    priceRange: {
      min: number
      max: number
    }
    preferredAreas: string[]
    propertyTypes: string[]
  }
  createdAt: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  properties?: Property[]
  searchFilters?: SearchFilters
}

export interface MapViewport {
  center: [number, number]
  zoom: number
  bounds?: [[number, number], [number, number]]
}

export interface NeighborhoodInsight {
  area: string
  averagePrice: number
  priceGrowth: number
  amenityScore: number
  transportScore: number
  safetyScore: number
  description: string
  keyFeatures: string[]
}