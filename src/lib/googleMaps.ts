import { blink } from './blink'

export interface GoogleMapsPlace {
  placeId: string
  name: string
  address: string
  location: {
    lat: number
    lng: number
  }
  rating?: number
  priceLevel?: number
  types: string[]
  photos?: string[]
  openingHours?: {
    openNow: boolean
    periods: Array<{
      open: { day: number; time: string }
      close: { day: number; time: string }
    }>
  }
}

export interface RouteInfo {
  distance: {
    text: string
    value: number // in meters
  }
  duration: {
    text: string
    value: number // in seconds
  }
  steps: Array<{
    instruction: string
    distance: { text: string; value: number }
    duration: { text: string; value: number }
  }>
}

export interface NearbyPlacesRequest {
  location: { lat: number; lng: number }
  radius: number // in meters
  type: string // e.g., 'school', 'hospital', 'restaurant', 'bank'
  keyword?: string
}

export class GoogleMapsService {
  private async callGoogleMapsAPI(endpoint: string, params: Record<string, any>): Promise<any> {
    try {
      // Use Blink's secure API proxy to call Google Maps API
      const response = await blink.data.fetch({
        url: `https://maps.googleapis.com/maps/api/place/${endpoint}/json`,
        method: 'GET',
        query: {
          ...params,
          key: '{{GOOGLE_MAPS_API_KEY}}' // Secret substitution
        }
      })

      if (response.status !== 200) {
        throw new Error(`Google Maps API error: ${response.status}`)
      }

      return response.body
    } catch (error) {
      console.error('Google Maps API error:', error)
      throw new Error('Failed to fetch data from Google Maps')
    }
  }

  async findNearbyPlaces(request: NearbyPlacesRequest): Promise<GoogleMapsPlace[]> {
    try {
      const params = {
        location: `${request.location.lat},${request.location.lng}`,
        radius: request.radius.toString(),
        type: request.type,
        ...(request.keyword && { keyword: request.keyword })
      }

      const response = await this.callGoogleMapsAPI('nearbysearch', params)
      
      if (response.status !== 'OK') {
        console.warn('Google Maps API warning:', response.status)
        return []
      }

      return response.results.map((place: any) => ({
        placeId: place.place_id,
        name: place.name,
        address: place.vicinity || place.formatted_address || '',
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types || [],
        photos: place.photos?.map((photo: any) => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key={{GOOGLE_MAPS_API_KEY}}`
        ) || []
      }))
    } catch (error) {
      console.error('Error finding nearby places:', error)
      return []
    }
  }

  async getPlaceDetails(placeId: string): Promise<GoogleMapsPlace | null> {
    try {
      const params = {
        place_id: placeId,
        fields: 'name,formatted_address,geometry,rating,price_level,types,photos,opening_hours'
      }

      const response = await this.callGoogleMapsAPI('details', params)
      
      if (response.status !== 'OK' || !response.result) {
        return null
      }

      const place = response.result
      return {
        placeId: place.place_id,
        name: place.name,
        address: place.formatted_address || '',
        location: {
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng
        },
        rating: place.rating,
        priceLevel: place.price_level,
        types: place.types || [],
        photos: place.photos?.map((photo: any) => 
          `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photo.photo_reference}&key={{GOOGLE_MAPS_API_KEY}}`
        ) || [],
        openingHours: place.opening_hours ? {
          openNow: place.opening_hours.open_now,
          periods: place.opening_hours.periods || []
        } : undefined
      }
    } catch (error) {
      console.error('Error getting place details:', error)
      return null
    }
  }

  async getDirections(
    origin: { lat: number; lng: number },
    destination: { lat: number; lng: number },
    mode: 'driving' | 'walking' | 'transit' = 'driving'
  ): Promise<RouteInfo | null> {
    try {
      const response = await blink.data.fetch({
        url: 'https://maps.googleapis.com/maps/api/directions/json',
        method: 'GET',
        query: {
          origin: `${origin.lat},${origin.lng}`,
          destination: `${destination.lat},${destination.lng}`,
          mode,
          key: '{{GOOGLE_MAPS_API_KEY}}'
        }
      })

      if (response.status !== 200 || response.body.status !== 'OK') {
        return null
      }

      const route = response.body.routes[0]
      const leg = route.legs[0]

      return {
        distance: leg.distance,
        duration: leg.duration,
        steps: leg.steps.map((step: any) => ({
          instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Strip HTML
          distance: step.distance,
          duration: step.duration
        }))
      }
    } catch (error) {
      console.error('Error getting directions:', error)
      return null
    }
  }

  async geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
    try {
      const response = await blink.data.fetch({
        url: 'https://maps.googleapis.com/maps/api/geocode/json',
        method: 'GET',
        query: {
          address: `${address}, Nepal`,
          key: '{{GOOGLE_MAPS_API_KEY}}'
        }
      })

      if (response.status !== 200 || response.body.status !== 'OK') {
        return null
      }

      const location = response.body.results[0]?.geometry?.location
      return location ? { lat: location.lat, lng: location.lng } : null
    } catch (error) {
      console.error('Error geocoding address:', error)
      return null
    }
  }

  async reverseGeocode(lat: number, lng: number): Promise<string | null> {
    try {
      const response = await blink.data.fetch({
        url: 'https://maps.googleapis.com/maps/api/geocode/json',
        method: 'GET',
        query: {
          latlng: `${lat},${lng}`,
          key: '{{GOOGLE_MAPS_API_KEY}}'
        }
      })

      if (response.status !== 200 || response.body.status !== 'OK') {
        return null
      }

      return response.body.results[0]?.formatted_address || null
    } catch (error) {
      console.error('Error reverse geocoding:', error)
      return null
    }
  }

  async getNeighborhoodContext(location: { lat: number; lng: number }): Promise<{
    schools: GoogleMapsPlace[]
    hospitals: GoogleMapsPlace[]
    restaurants: GoogleMapsPlace[]
    banks: GoogleMapsPlace[]
    transport: GoogleMapsPlace[]
    shopping: GoogleMapsPlace[]
  }> {
    const radius = 2000 // 2km radius

    try {
      const [schools, hospitals, restaurants, banks, transport, shopping] = await Promise.all([
        this.findNearbyPlaces({ location, radius, type: 'school' }),
        this.findNearbyPlaces({ location, radius, type: 'hospital' }),
        this.findNearbyPlaces({ location, radius, type: 'restaurant' }),
        this.findNearbyPlaces({ location, radius, type: 'bank' }),
        this.findNearbyPlaces({ location, radius, type: 'bus_station' }),
        this.findNearbyPlaces({ location, radius, type: 'shopping_mall' })
      ])

      return {
        schools: schools.slice(0, 5),
        hospitals: hospitals.slice(0, 3),
        restaurants: restaurants.slice(0, 5),
        banks: banks.slice(0, 3),
        transport: transport.slice(0, 5),
        shopping: shopping.slice(0, 3)
      }
    } catch (error) {
      console.error('Error getting neighborhood context:', error)
      return {
        schools: [],
        hospitals: [],
        restaurants: [],
        banks: [],
        transport: [],
        shopping: []
      }
    }
  }
}

export const googleMapsService = new GoogleMapsService()