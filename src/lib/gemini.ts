import { blink } from './blink'

export interface GeminiSearchRequest {
  query: string
  location?: {
    latitude: number
    longitude: number
    radius?: number
  }
  userPreferences?: {
    budget?: { min: number; max: number }
    propertyType?: string[]
    bedrooms?: number
    amenities?: string[]
  }
}

export interface GeminiSearchResponse {
  interpretation: string
  searchCriteria: {
    propertyType?: string[]
    priceRange?: { min: number; max: number }
    bedrooms?: number
    bathrooms?: number
    location?: {
      areas: string[]
      coordinates?: { lat: number; lng: number; radius: number }
    }
    amenities?: string[]
    features?: string[]
  }
  explanation: string
  confidence: number
  suggestedRefinements?: string[]
}

export class GeminiPropertySearch {
  private async callGeminiAPI(prompt: string): Promise<any> {
    try {
      const response = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            interpretation: { type: 'string' },
            searchCriteria: {
              type: 'object',
              properties: {
                propertyType: { type: 'array', items: { type: 'string' } },
                priceRange: {
                  type: 'object',
                  properties: {
                    min: { type: 'number' },
                    max: { type: 'number' }
                  }
                },
                bedrooms: { type: 'number' },
                bathrooms: { type: 'number' },
                location: {
                  type: 'object',
                  properties: {
                    areas: { type: 'array', items: { type: 'string' } },
                    coordinates: {
                      type: 'object',
                      properties: {
                        lat: { type: 'number' },
                        lng: { type: 'number' },
                        radius: { type: 'number' }
                      }
                    }
                  }
                },
                amenities: { type: 'array', items: { type: 'string' } },
                features: { type: 'array', items: { type: 'string' } }
              }
            },
            explanation: { type: 'string' },
            confidence: { type: 'number' },
            suggestedRefinements: { type: 'array', items: { type: 'string' } }
          },
          required: ['interpretation', 'searchCriteria', 'explanation', 'confidence']
        }
      })
      
      return response.object
    } catch (error) {
      console.error('Gemini API error:', error)
      throw new Error('Failed to process search query with AI')
    }
  }

  async interpretSearch(request: GeminiSearchRequest): Promise<GeminiSearchResponse> {
    const prompt = `
You are an expert real estate AI assistant for Nepal's property market. Analyze this natural language property search query and extract structured search criteria.

User Query: "${request.query}"

Context:
- Location: Nepal (focus on Kathmandu Valley: Kathmandu, Lalitpur, Bhaktapur)
- Currency: NPR (Nepalese Rupees)
- Common property types: apartment, house, commercial, land
- Typical rent ranges: 10,000-100,000 NPR/month
- Typical sale prices: 5,000,000-50,000,000 NPR
- Popular areas: Thamel, Lalitpur, Pulchowk, New Road, Baneshwor, Durbarmarg

${request.userPreferences ? `
User Preferences:
- Budget: ${request.userPreferences.budget ? `NPR ${request.userPreferences.budget.min}-${request.userPreferences.budget.max}` : 'Not specified'}
- Property Types: ${request.userPreferences.propertyType?.join(', ') || 'Any'}
- Bedrooms: ${request.userPreferences.bedrooms || 'Any'}
- Preferred Amenities: ${request.userPreferences.amenities?.join(', ') || 'None specified'}
` : ''}

${request.location ? `
Current Location: ${request.location.latitude}, ${request.location.longitude}
Search Radius: ${request.location.radius || 5}km
` : ''}

Instructions:
1. Interpret the user's intent and extract specific search criteria
2. Convert any price mentions to NPR if needed
3. Map location names to known Nepal areas
4. Identify property type, size requirements, and amenities
5. Provide confidence score (0-1) for your interpretation
6. Suggest refinements if the query is ambiguous
7. Give a clear explanation of what you understood

Focus on Nepal's real estate market context and local terminology.
`

    return await this.callGeminiAPI(prompt)
  }

  async generatePropertyRecommendation(properties: any[], userQuery: string): Promise<string> {
    const prompt = `
You are a real estate AI assistant. Based on the user's search query and the found properties, provide a personalized explanation of why these properties are good matches.

User Query: "${userQuery}"

Properties Found: ${JSON.stringify(properties.map(p => ({
  title: p.title,
  price: p.price,
  priceType: p.priceType,
  bedrooms: p.bedrooms,
  bathrooms: p.bathrooms,
  area: p.area,
  location: p.location.address,
  amenities: p.amenities,
  features: p.features
})), null, 2)}

Provide a conversational, helpful response that:
1. Acknowledges what the user was looking for
2. Explains why these specific properties match their criteria
3. Highlights key benefits and features
4. Mentions any trade-offs or considerations
5. Suggests next steps or refinements

Keep it natural, informative, and focused on the Nepal real estate market.
`

    try {
      const response = await blink.ai.generateText({
        prompt,
        maxTokens: 500
      })
      return response.text
    } catch (error) {
      console.error('Error generating recommendation:', error)
      return "I found some great properties that match your search criteria. Each property has been carefully selected based on your requirements for location, budget, and amenities."
    }
  }

  async explainPropertyMatch(property: any, userQuery: string): Promise<string> {
    const prompt = `
Explain why this specific property is a good match for the user's search query.

User Query: "${userQuery}"

Property Details:
- Title: ${property.title}
- Price: NPR ${property.price} (${property.priceType})
- Type: ${property.propertyType}
- Size: ${property.bedrooms}BR/${property.bathrooms}BA, ${property.area} ${property.areaUnit}
- Location: ${property.location.address}
- Amenities: ${property.amenities.join(', ')}
- Features: ${property.features.join(', ')}

Provide a brief, specific explanation (1-2 sentences) of why this property matches the user's needs. Focus on the most relevant matching criteria.
`

    try {
      const response = await blink.ai.generateText({
        prompt,
        maxTokens: 150
      })
      return response.text
    } catch (error) {
      console.error('Error explaining property match:', error)
      return "This property matches your search criteria with the right location, size, and amenities for your needs."
    }
  }
}

export const geminiSearch = new GeminiPropertySearch()