import { blink } from './blink'

export interface TavilySearchRequest {
  query: string
  location?: string
  maxResults?: number
  includeImages?: boolean
  includeAnswer?: boolean
}

export interface TavilySearchResult {
  title: string
  url: string
  content: string
  score: number
  publishedDate?: string
}

export interface TavilyResponse {
  query: string
  followUpQuestions?: string[]
  answer?: string
  results: TavilySearchResult[]
  images?: Array<{
    url: string
    description: string
  }>
}

export class TavilyRealTimeSearch {
  async searchRealEstateData(request: TavilySearchRequest): Promise<TavilyResponse> {
    try {
      // Use Blink's data.search for real-time web search
      const searchResults = await blink.data.search(request.query, {
        location: request.location,
        limit: request.maxResults || 10
      })

      // Transform the results to match our interface
      const results: TavilySearchResult[] = searchResults.organic_results?.map((result: any, index: number) => ({
        title: result.title || '',
        url: result.link || '',
        content: result.snippet || '',
        score: 1 - (index * 0.1), // Simple scoring based on position
        publishedDate: result.date
      })) || []

      return {
        query: request.query,
        followUpQuestions: searchResults.related_searches?.slice(0, 3) || [],
        answer: searchResults.answer_box?.answer || undefined,
        results,
        images: searchResults.image_results?.slice(0, 5).map((img: any) => ({
          url: img.original || img.thumbnail,
          description: img.title || ''
        })) || []
      }
    } catch (error) {
      console.error('Tavily search error:', error)
      throw new Error('Failed to fetch real-time data')
    }
  }

  async getNeighborhoodInsights(area: string, city: string = 'Kathmandu'): Promise<any> {
    const query = `${area} ${city} Nepal real estate market prices amenities transportation 2024`
    
    try {
      const searchResults = await this.searchRealEstateData({
        query,
        location: `${city}, Nepal`,
        maxResults: 5,
        includeAnswer: true
      })

      // Extract insights from search results
      const insights = {
        area: `${area}, ${city}`,
        marketTrends: searchResults.answer || 'Market data not available',
        recentNews: searchResults.results.slice(0, 3).map(r => ({
          title: r.title,
          summary: r.content,
          url: r.url,
          date: r.publishedDate
        })),
        relatedQueries: searchResults.followUpQuestions || [],
        lastUpdated: new Date().toISOString()
      }

      return insights
    } catch (error) {
      console.error('Error fetching neighborhood insights:', error)
      return {
        area: `${area}, ${city}`,
        marketTrends: 'Unable to fetch current market data',
        recentNews: [],
        relatedQueries: [],
        lastUpdated: new Date().toISOString()
      }
    }
  }

  async getPropertyMarketData(propertyType: string, location: string): Promise<any> {
    const query = `${propertyType} for rent sale ${location} Nepal current prices market trends 2024`
    
    try {
      const searchResults = await this.searchRealEstateData({
        query,
        location: `${location}, Nepal`,
        maxResults: 8,
        includeAnswer: true
      })

      return {
        propertyType,
        location,
        marketOverview: searchResults.answer || 'Market overview not available',
        currentListings: searchResults.results.filter(r => 
          r.title.toLowerCase().includes('rent') || 
          r.title.toLowerCase().includes('sale') ||
          r.title.toLowerCase().includes('property')
        ).slice(0, 5),
        priceInsights: searchResults.results.filter(r =>
          r.content.toLowerCase().includes('price') ||
          r.content.toLowerCase().includes('cost') ||
          r.content.toLowerCase().includes('npr')
        ).slice(0, 3),
        lastUpdated: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error fetching market data:', error)
      return {
        propertyType,
        location,
        marketOverview: 'Market data temporarily unavailable',
        currentListings: [],
        priceInsights: [],
        lastUpdated: new Date().toISOString()
      }
    }
  }

  async validatePropertyInfo(property: any): Promise<any> {
    const query = `"${property.location.address}" ${property.location.city} Nepal property verification current status`
    
    try {
      const searchResults = await this.searchRealEstateData({
        query,
        maxResults: 3
      })

      return {
        propertyId: property.id,
        verificationStatus: searchResults.results.length > 0 ? 'found_references' : 'no_references',
        relatedInfo: searchResults.results.slice(0, 2),
        lastChecked: new Date().toISOString()
      }
    } catch (error) {
      console.error('Error validating property info:', error)
      return {
        propertyId: property.id,
        verificationStatus: 'verification_failed',
        relatedInfo: [],
        lastChecked: new Date().toISOString()
      }
    }
  }
}

export const tavilySearch = new TavilyRealTimeSearch()