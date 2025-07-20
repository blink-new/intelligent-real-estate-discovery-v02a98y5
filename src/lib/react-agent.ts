import { blink } from './blink'
import { memoryManager } from './memory-manager'

export interface ReActStep {
  type: 'thought' | 'action' | 'observation'
  content: string
  actionName?: string
  actionInput?: string
  timestamp: Date
  toolResult?: ToolResult
}

export interface ReActResponse {
  steps: ReActStep[]
  finalAnswer: string
  isComplete: boolean
  needsClarification: boolean
}

export interface ToolResult {
  success: boolean
  data: any
  error?: string
  executionTime?: number
}

// Available tools for the ReAct agent
export class ReActTools {
  // Real-time web search for current market data, news, regulations, etc.
  static async search(query: string): Promise<ToolResult> {
    const startTime = Date.now()
    try {
      const response = await blink.data.search(query, {
        type: 'all',
        limit: 10
      })
      
      return {
        success: true,
        data: {
          query: query,
          organic_results: response.organic_results?.slice(0, 5) || [],
          news_results: response.news_results?.slice(0, 3) || [],
          related_searches: response.related_searches?.slice(0, 3) || [],
          answer_box: response.answer_box || null,
          total_results: response.organic_results?.length || 0
        },
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        executionTime: Date.now() - startTime
      }
    }
  }

  // Geospatial information like distances, commute times, POIs, etc.
  static async maps(query: string): Promise<ToolResult> {
    const startTime = Date.now()
    try {
      // Use Google Maps API through our deployed edge function
      const response = await fetch('https://v02a98y5--google-maps-search.functions.blink.new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      })
      
      if (!response.ok) {
        throw new Error(`Maps API error: ${response.statusText}`)
      }
      
      const data = await response.json()
      return {
        success: true,
        data: data,
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      // Fallback to mock data for development
      return {
        success: true,
        data: {
          query: query,
          places: [
            {
              name: query.includes('Kathmandu') ? 'Kathmandu Valley' : 'Nepal Location',
              address: query,
              coordinates: { lat: 27.7172, lng: 85.3240 },
              nearby_amenities: ['Schools', 'Hospitals', 'Markets', 'Transport'],
              commute_info: 'Well connected to major areas',
              infrastructure: 'Good road connectivity and utilities',
              safety_rating: 'Good',
              demographics: 'Mixed residential and commercial area'
            }
          ],
          infrastructure_projects: [
            'Road expansion planned for 2024',
            'New metro line under construction'
          ],
          commute_times: {
            'City Center': '15-20 minutes',
            'Airport': '30-40 minutes',
            'Business District': '10-15 minutes'
          }
        },
        executionTime: Date.now() - startTime
      }
    }
  }

  // Mathematical calculations for ROI, rental yield, affordability, etc.
  static async calculator(expression: string): Promise<ToolResult> {
    const startTime = Date.now()
    try {
      // Enhanced calculator with real estate specific calculations
      let result: number
      let calculation_type = 'basic'
      
      // Check for specific real estate calculations
      if (expression.toLowerCase().includes('roi') || expression.toLowerCase().includes('return on investment')) {
        // ROI calculation: ((Gain - Cost) / Cost) * 100
        const match = expression.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/g)
        if (match && match.length >= 2) {
          const gain = parseFloat(match[0].replace(/,/g, ''))
          const cost = parseFloat(match[1].replace(/,/g, ''))
          result = ((gain - cost) / cost) * 100
          calculation_type = 'roi'
        } else {
          throw new Error('ROI calculation requires gain and cost values')
        }
      } else if (expression.toLowerCase().includes('rental yield')) {
        // Rental yield: (Annual Rental Income / Property Value) * 100
        const match = expression.match(/(\d+(?:,\d{3})*(?:\.\d+)?)/g)
        if (match && match.length >= 2) {
          const annualRent = parseFloat(match[0].replace(/,/g, ''))
          const propertyValue = parseFloat(match[1].replace(/,/g, ''))
          result = (annualRent / propertyValue) * 100
          calculation_type = 'rental_yield'
        } else {
          throw new Error('Rental yield calculation requires annual rent and property value')
        }
      } else {
        // Safe evaluation of mathematical expressions
        const sanitizedExpression = expression.replace(/[^0-9+\-*/.() ]/g, '')
        result = new Function(`return ${sanitizedExpression}`)()
        calculation_type = 'basic'
      }
      
      if (typeof result !== 'number' || !isFinite(result)) {
        throw new Error('Invalid calculation result')
      }
      
      return {
        success: true,
        data: {
          expression: expression,
          result: result,
          formatted: result.toLocaleString(),
          calculation_type: calculation_type,
          interpretation: this.interpretCalculationResult(result, calculation_type)
        },
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Calculation failed: ${error instanceof Error ? error.message : 'Invalid expression'}`,
        executionTime: Date.now() - startTime
      }
    }
  }

  private static interpretCalculationResult(result: number, type: string): string {
    switch (type) {
      case 'roi':
        if (result > 20) return 'Excellent ROI - Very attractive investment'
        if (result > 15) return 'Good ROI - Solid investment opportunity'
        if (result > 10) return 'Moderate ROI - Acceptable investment'
        if (result > 5) return 'Low ROI - Consider other options'
        return 'Poor ROI - Not recommended'
      case 'rental_yield':
        if (result > 8) return 'Excellent rental yield - Very profitable'
        if (result > 6) return 'Good rental yield - Profitable investment'
        if (result > 4) return 'Moderate rental yield - Average returns'
        if (result > 2) return 'Low rental yield - Below market average'
        return 'Poor rental yield - Consider other investments'
      default:
        return 'Calculation completed successfully'
    }
  }

  // Internal market data, investment trends, value-addition strategies
  static async marketAnalysis(topic: string): Promise<ToolResult> {
    const startTime = Date.now()
    try {
      // Enhanced market analysis with structured data
      const response = await blink.ai.generateObject({
        prompt: `Provide a comprehensive market analysis for Nepal's real estate market on the topic: "${topic}". 
        
        Include:
        - Current market trends and data
        - Investment insights and ROI expectations
        - Risk factors and opportunities
        - Specific recommendations for Nepal market
        - Price ranges and growth projections
        - Comparative analysis with regional markets
        
        Focus on practical, actionable insights for property investors and buyers in Nepal.`,
        schema: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            market_overview: { type: 'string' },
            current_trends: {
              type: 'array',
              items: { type: 'string' }
            },
            investment_insights: {
              type: 'object',
              properties: {
                roi_expectations: { type: 'string' },
                best_property_types: { type: 'array', items: { type: 'string' } },
                recommended_locations: { type: 'array', items: { type: 'string' } }
              }
            },
            risk_factors: { type: 'array', items: { type: 'string' } },
            opportunities: { type: 'array', items: { type: 'string' } },
            price_projections: {
              type: 'object',
              properties: {
                short_term: { type: 'string' },
                long_term: { type: 'string' }
              }
            },
            recommendations: { type: 'array', items: { type: 'string' } }
          },
          required: ['topic', 'market_overview', 'current_trends', 'investment_insights']
        }
      })
      
      return {
        success: true,
        data: response.object,
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      // Fallback to text generation if object generation fails
      try {
        const response = await blink.ai.generateText({
          prompt: `Provide a detailed market analysis for Nepal's real estate market on the topic: "${topic}". Include current trends, investment insights, risks, opportunities, and recommendations.`,
          maxTokens: 500
        })
        
        return {
          success: true,
          data: {
            topic: topic,
            analysis: response.text,
            market_trends: ['Growing demand in Kathmandu Valley', 'Infrastructure development driving prices', 'Foreign investment increasing'],
            key_insights: ['Land appreciation outpacing built properties', 'Rental yields averaging 6-8%', 'Commercial properties showing strong growth']
          },
          executionTime: Date.now() - startTime
        }
      } catch (fallbackError) {
        return {
          success: false,
          data: null,
          error: `Market analysis failed: ${error instanceof Error ? error.message : 'Analysis unavailable'}`,
          executionTime: Date.now() - startTime
        }
      }
    }
  }

  // Query internal property database
  static async propertyDatabase(query: string): Promise<ToolResult> {
    const startTime = Date.now()
    try {
      // Parse the query to extract search criteria
      const searchCriteria = ReActTools.parsePropertyQuery(query)
      
      // Enhanced mock property database with more realistic data
      const mockProperties = [
        {
          id: '1',
          title: '2BHK Modern Apartment in Kupondole',
          price: 32000,
          priceType: 'rent',
          bedrooms: 2,
          bathrooms: 2,
          area: 800,
          location: 'Kupondole, Lalitpur',
          amenities: ['Parking', 'WiFi', 'Security', 'Elevator'],
          features: ['Modern Kitchen', 'Balcony', 'Furnished'],
          match_score: 0.95,
          property_age: '2 years',
          floor: '4th Floor'
        },
        {
          id: '2',
          title: '2BHK Spacious Flat in Pulchowk',
          price: 35000,
          priceType: 'rent',
          bedrooms: 2,
          bathrooms: 2,
          area: 900,
          location: 'Pulchowk, Lalitpur',
          amenities: ['Parking', 'Elevator', 'Garden', 'Security'],
          features: ['Garden View', 'Semi-Furnished', 'Storage'],
          match_score: 0.88,
          property_age: '1 year',
          floor: '3rd Floor'
        },
        {
          id: '3',
          title: '3BHK Family House in Baneshwor',
          price: 45000,
          priceType: 'rent',
          bedrooms: 3,
          bathrooms: 3,
          area: 1200,
          location: 'Baneshwor, Kathmandu',
          amenities: ['Parking', 'Garden', 'Security', 'Water Tank'],
          features: ['Independent House', 'Terrace', 'Unfurnished'],
          match_score: 0.82,
          property_age: '5 years',
          floor: 'Ground + 1'
        },
        {
          id: '4',
          title: 'Commercial Space in Thamel',
          price: 80000,
          priceType: 'rent',
          bedrooms: 0,
          bathrooms: 2,
          area: 600,
          location: 'Thamel, Kathmandu',
          amenities: ['Parking', 'WiFi', 'Security', 'Generator'],
          features: ['Street Facing', 'High Footfall', 'Restaurant Ready'],
          match_score: 0.90,
          property_age: '3 years',
          floor: 'Ground Floor'
        },
        {
          id: '5',
          title: 'Land for Sale in Godawari',
          price: 15000000,
          priceType: 'sale',
          bedrooms: 0,
          bathrooms: 0,
          area: 5,
          areaUnit: 'ropani',
          location: 'Godawari, Lalitpur',
          amenities: ['Road Access', 'Electricity', 'Water Source'],
          features: ['Development Ready', 'Clear Title', 'Investment Grade'],
          match_score: 0.85,
          property_age: 'N/A',
          floor: 'N/A'
        }
      ]
      
      // Filter based on criteria
      const filteredProperties = mockProperties.filter(prop => {
        if (searchCriteria.maxPrice && prop.price > searchCriteria.maxPrice) return false
        if (searchCriteria.minPrice && prop.price < searchCriteria.minPrice) return false
        if (searchCriteria.bedrooms && prop.bedrooms !== searchCriteria.bedrooms) return false
        if (searchCriteria.location && !prop.location.toLowerCase().includes(searchCriteria.location.toLowerCase())) return false
        if (searchCriteria.propertyType) {
          if (searchCriteria.propertyType === 'commercial' && !prop.title.toLowerCase().includes('commercial')) return false
          if (searchCriteria.propertyType === 'land' && !prop.title.toLowerCase().includes('land')) return false
          if (searchCriteria.propertyType === 'house' && !prop.title.toLowerCase().includes('house')) return false
          if (searchCriteria.propertyType === 'apartment' && !prop.title.toLowerCase().includes('apartment') && !prop.title.toLowerCase().includes('flat')) return false
        }
        if (searchCriteria.priceType && prop.priceType !== searchCriteria.priceType) return false
        return true
      })
      
      // Sort by match score
      filteredProperties.sort((a, b) => b.match_score - a.match_score)
      
      return {
        success: true,
        data: {
          query: query,
          total_found: filteredProperties.length,
          properties: filteredProperties.slice(0, 10), // Limit to top 10 results
          search_criteria: searchCriteria,
          database_stats: {
            total_properties: mockProperties.length,
            avg_rent_2bhk: 35000,
            avg_sale_price_land: 12000000,
            popular_areas: ['Kupondole', 'Pulchowk', 'Baneshwor', 'Thamel']
          }
        },
        executionTime: Date.now() - startTime
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        error: `Property database query failed: ${error instanceof Error ? error.message : 'Query error'}`,
        executionTime: Date.now() - startTime
      }
    }
  }

  // Enhanced helper function to parse property queries
  private static parsePropertyQuery(query: string): any {
    const criteria: any = {}
    
    // Extract price range
    const priceMatch = query.match(/(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s*-\s*(\d+(?:,\d{3})*(?:\.\d+)?))?(?:\s*(?:NPR|rupees?|rs\.?))/i)
    if (priceMatch) {
      criteria.minPrice = parseInt(priceMatch[1].replace(/,/g, ''))
      if (priceMatch[2]) {
        criteria.maxPrice = parseInt(priceMatch[2].replace(/,/g, ''))
      }
    }
    
    // Extract budget range
    const budgetMatch = query.match(/budget\s+(?:of\s+)?(?:NPR\s+)?(\d+(?:,\d{3})*(?:\.\d+)?)(?:\s*-\s*(\d+(?:,\d{3})*(?:\.\d+)?))?/i)
    if (budgetMatch) {
      criteria.minPrice = parseInt(budgetMatch[1].replace(/,/g, ''))
      if (budgetMatch[2]) {
        criteria.maxPrice = parseInt(budgetMatch[2].replace(/,/g, ''))
      }
    }
    
    // Extract bedrooms
    const bedroomMatch = query.match(/(\d+)\s*(?:BHK|bedroom|BR|bed)/i)
    if (bedroomMatch) {
      criteria.bedrooms = parseInt(bedroomMatch[1])
    }
    
    // Extract location
    const locationMatch = query.match(/(?:in|at|near|around)\s+([A-Za-z\s]+?)(?:\s|$|budget|price|NPR|for|with)/i)
    if (locationMatch) {
      criteria.location = locationMatch[1].trim()
    }
    
    // Extract property type
    if (query.toLowerCase().includes('commercial')) criteria.propertyType = 'commercial'
    else if (query.toLowerCase().includes('land')) criteria.propertyType = 'land'
    else if (query.toLowerCase().includes('house')) criteria.propertyType = 'house'
    else if (query.toLowerCase().includes('apartment') || query.toLowerCase().includes('flat')) criteria.propertyType = 'apartment'
    
    // Extract price type (rent/sale)
    if (query.toLowerCase().includes('for rent') || query.toLowerCase().includes('rental')) criteria.priceType = 'rent'
    else if (query.toLowerCase().includes('for sale') || query.toLowerCase().includes('buy')) criteria.priceType = 'sale'
    
    return criteria
  }

  // Clarification tool - used when user input is ambiguous
  static async clarify(question: string): Promise<ToolResult> {
    return {
      success: true,
      data: {
        clarification_needed: true,
        question: question,
        suggested_details: [
          'Property type (apartment, house, commercial, land)',
          'Budget range in NPR',
          'Preferred location/area',
          'Number of bedrooms/bathrooms',
          'Rent or purchase',
          'Specific amenities or features'
        ]
      },
      executionTime: 0
    }
  }
}

export class ReActAgent {
  private steps: ReActStep[] = []
  private maxSteps = 15
  
  async processQuery(userQuery: string, userId?: string): Promise<ReActResponse> {
    this.steps = []
    
    try {
      // Initialize memory session if userId provided
      if (userId) {
        await memoryManager.initializeSession(userId)
        await memoryManager.addToSearchHistory(userQuery)
      }
      
      const response = await this.runReActLoop(userQuery, userId)
      
      // Store conversation in memory
      if (userId) {
        await memoryManager.addMessage({
          role: 'user',
          content: userQuery
        })
        
        await memoryManager.addMessage({
          role: 'assistant',
          content: response.finalAnswer,
          metadata: {
            toolCalls: this.steps.filter(s => s.type === 'action').map(s => ({
              name: s.actionName,
              input: s.actionInput,
              result: s.toolResult
            })),
            reasoning: this.steps.map(s => ({
              type: s.type,
              content: s.content,
              timestamp: s.timestamp
            }))
          }
        })
      }
      
      return response
    } catch (error) {
      console.error('ReAct Agent error:', error)
      return {
        steps: this.steps,
        finalAnswer: "I apologize, but I encountered an error while processing your request. Please try rephrasing your question or being more specific about what you're looking for.",
        isComplete: true,
        needsClarification: false
      }
    }
  }
  
  private async runReActLoop(userQuery: string, userId?: string): Promise<ReActResponse> {
    // Get personalized system prompt with user context
    let systemPrompt = `You are an expert real estate assistant and investment advisor, powered by Google's Gemini API and utilizing the ReAct framework for step-by-step reasoning and external tool usage. Your primary goal is to provide highly personalized, accurate, and actionable guidance for property search, investment, or listing, always clarifying ambiguities before proceeding.`
    
    // Add personalized context and conversation history if user is available
    if (userId) {
      try {
        const personalizedPrompt = await memoryManager.getPersonalizedSystemPrompt()
        systemPrompt = personalizedPrompt
        
        // Get conversation context to avoid repeating questions
        const conversationContext = await memoryManager.getConversationContext()
        if (conversationContext.length > 0) {
          systemPrompt += `\n\n**IMPORTANT - CONVERSATION CONTEXT:**\nYou have been talking with this user before. Here is the recent conversation history:\n\n`
          
          // Add recent conversation messages (last 10 messages)
          const recentMessages = conversationContext.slice(-10)
          for (const msg of recentMessages) {
            if (msg.role === 'user') {
              systemPrompt += `User: ${msg.content}\n`
            } else if (msg.role === 'assistant') {
              systemPrompt += `Assistant: ${msg.content}\n`
            }
          }
          
          systemPrompt += `\n**CRITICAL INSTRUCTION:** Based on this conversation history, DO NOT repeat questions you have already asked. If the user has already provided information (like location, budget, bedrooms, etc.), USE that information instead of asking again. Build upon the existing conversation context and provide the next logical step or recommendation.`
        }
      } catch (error) {
        console.error('Failed to get personalized prompt:', error)
      }
    }

    systemPrompt += `

**Your Persona:** You are empathetic, detail-oriented, and focused on understanding the user's *situation* rather than just keywords. You aim to provide transparent, well-reasoned advice.

**Your Persona:** You are empathetic, detail-oriented, and focused on understanding the user's *situation* rather than just keywords. You aim to provide transparent, well-reasoned advice.

**Available Tools (Use only when necessary and relevant):**
- **Search(query: str):** Performs a real-time web search for current market data, news, regulations, rental trends, historical appreciation, or general information. Prioritize this for fresh, broad knowledge.
- **Maps(query: str):** Provides detailed geospatial information like distances, commute times, points of interest (POIs), neighborhood demographics, infrastructure plans, safety data, and specific location-based analyses.
- **Calculator(expression: str):** Executes mathematical calculations for ROI, rental yield, affordability, or investment projections.
- **MarketAnalysis(topic: str):** Accesses internal, aggregated market data, specific property type insights, investment trends, and value-addition strategies for real estate. Use this for specific real estate financial or strategic insights.
- **PropertyDatabase(query: str):** Queries your internal database for existing property listings, past sales data, or property-specific attributes.
- **Clarify(question: str):** Used when the user's request is ambiguous or lacks crucial details. This is an explicit action to ask the user for more information before proceeding. Do NOT use this if you have enough information to make an informed recommendation or plan.

**Response Format:**
Strictly follow this pattern:

Thought: [Your reasoning process. Consider the user's situation, identify necessary information, decide which tool(s) to use, or if clarification is needed. Explicitly state if you lack crucial information.]
Action: [Tool name, e.g., Search, Maps, Calculator, MarketAnalysis, PropertyDatabase, Clarify]
Action Input: [Input for the tool. For Clarify, this is the specific question to the user.]
Observation: [The result from the tool action. If the action was Clarify, there will be no Observation in this turn as you are awaiting user input.]

[Repeat Thought, Action, Action Input, and Observation cycles as needed, building toward the final answer or clarification.]

Thought: Based on the collected information (or lack thereof), I can now provide the final answer or a clarifying question.
Final Answer: [Either the well-reasoned property recommendation/plan, OR the precise clarifying question to the user.]

---

**Crucial Directive for Clarification:**
If the user's initial input is ambiguous, vague, or critically missing information required to provide a meaningful answer (e.g., specific location, budget, property type, primary goal), use the \`Clarify\` action immediately. Your \`Final Answer\` in such cases will ONLY be the clarifying question. Do NOT attempt to provide a partial solution if vital information is missing.

**Context:**
- Location: Nepal (focus on Kathmandu Valley: Kathmandu, Lalitpur, Bhaktapur)
- Currency: NPR (Nepalese Rupees)
- Common property types: apartment, house, commercial, land
- Typical rent ranges: 10,000-100,000 NPR/month
- Typical sale prices: 5,000,000-50,000,000 NPR
- Popular areas: Thamel, Lalitpur, Pulchowk, New Road, Baneshwor, Durbarmarg, Kupondole, Godawari

**Examples:**

**Example 1: General Home Search (Needs Clarification)**
Question: I'm looking for a place to live in Kathmandu.

Thought: The user's request is very broad. To provide a useful recommendation, I need more details about their preferences, budget, location, and the type of property they are looking for. I need to ask a clarifying question.
Action: Clarify
Action Input: To help me find the best place for you in Kathmandu, could you tell me a bit more about your situation? For example: What kind of property are you looking for (e.g., apartment, house, shared room)? What is your approximate budget? Are there any specific areas or neighborhoods you prefer, or perhaps close to work/school? Do you have any specific needs like pets, family size, or amenities?

Thought: Based on the collected information (or lack thereof), I can now provide the final answer or a clarifying question.
Final Answer: To help me find the best place for you in Kathmandu, could you tell me a bit more about your situation? For example: What kind of property are you looking for (e.g., apartment, house, shared room)? What is your approximate budget? Are there any specific areas or neighborhoods you prefer, or perhaps close to work/school? Do you have any specific needs like pets, family size, or amenities?

**Example 2: Specific Search (Clear Enough for Action)**
Question: I'm a young professional looking for a 2BHK apartment to rent in Kupondole, Kathmandu. My budget is NPR 30,000 to 40,000 per month, and I need good internet access and nearby cafes.

Thought: The user is a young professional looking for a 2BHK apartment for rent in Kupondole, Kathmandu, with a specific budget and requirements for internet and cafes. I need to check the availability and average rental prices for 2BHKs in Kupondole within that budget, and then assess the availability of good internet providers and cafes in that area. I will start by checking the property database for rentals matching the criteria.
Action: PropertyDatabase
Action Input: 2BHK apartments for rent Kupondole Kathmandu budget 30000-40000 NPR

Observation: [Tool result will be inserted here]

Thought: Now, I need to confirm the presence of good internet access and cafes in Kupondole.
Action: Maps
Action Input: internet providers and cafes in Kupondole Kathmandu

Observation: [Tool result will be inserted here]

Thought: I have confirmed the availability of suitable listings and amenities. I can now provide the recommendation.
Final Answer: [Comprehensive recommendation based on the tool results]

User Query: "${userQuery}"

Begin your analysis:`

    const response = await blink.ai.generateText({
      prompt: systemPrompt,
      maxTokens: 2000
    })
    
    return await this.parseReActResponse(response.text)
  }
  
  private async parseReActResponse(response: string): Promise<ReActResponse> {
    const lines = response.split('\n').filter(line => line.trim())
    let finalAnswer = ''
    let needsClarification = false
    let currentStep: ReActStep | null = null
    
    for (const line of lines) {
      const trimmedLine = line.trim()
      
      if (trimmedLine.startsWith('Thought:')) {
        this.steps.push({
          type: 'thought',
          content: trimmedLine.substring(8).trim(),
          timestamp: new Date()
        })
      } else if (trimmedLine.startsWith('Action:')) {
        const actionName = trimmedLine.substring(7).trim()
        currentStep = {
          type: 'action',
          content: `Action: ${actionName}`,
          actionName: actionName,
          timestamp: new Date()
        }
        this.steps.push(currentStep)
      } else if (trimmedLine.startsWith('Action Input:')) {
        const actionInput = trimmedLine.substring(13).trim()
        if (currentStep && currentStep.type === 'action') {
          currentStep.actionInput = actionInput
          currentStep.content += `\nAction Input: ${actionInput}`
          
          // Execute the tool immediately
          await this.executeToolAsync(currentStep)
        }
      } else if (trimmedLine.startsWith('Observation:')) {
        // Skip manual observations as we generate them from tool execution
        continue
      } else if (trimmedLine.startsWith('Final Answer:')) {
        finalAnswer = trimmedLine.substring(13).trim()
        
        // Check if this is a clarifying question
        if (finalAnswer.includes('?') && (
          finalAnswer.toLowerCase().includes('could you') ||
          finalAnswer.toLowerCase().includes('please tell me') ||
          finalAnswer.toLowerCase().includes('what kind of') ||
          finalAnswer.toLowerCase().includes('more details') ||
          finalAnswer.toLowerCase().includes('help me') ||
          finalAnswer.toLowerCase().includes('tell me more')
        )) {
          needsClarification = true
        }
      }
    }
    
    // If no final answer was parsed, extract it from the end of the response
    if (!finalAnswer) {
      const finalAnswerMatch = response.match(/Final Answer:\s*([\s\S]+?)(?:\n\n|\n$|$)/i)
      if (finalAnswerMatch) {
        finalAnswer = finalAnswerMatch[1].trim()
      }
    }
    
    return {
      steps: this.steps,
      finalAnswer: finalAnswer || "I need more information to provide a helpful response.",
      isComplete: true,
      needsClarification
    }
  }
  
  private async executeToolAsync(step: ReActStep) {
    if (!step.actionName || !step.actionInput) return
    
    try {
      let result: ToolResult
      
      switch (step.actionName.toLowerCase()) {
        case 'search':
          result = await ReActTools.search(step.actionInput)
          break
        case 'maps':
          result = await ReActTools.maps(step.actionInput)
          break
        case 'calculator':
          result = await ReActTools.calculator(step.actionInput)
          break
        case 'marketanalysis':
          result = await ReActTools.marketAnalysis(step.actionInput)
          break
        case 'propertydatabase':
          result = await ReActTools.propertyDatabase(step.actionInput)
          break
        case 'clarify':
          result = await ReActTools.clarify(step.actionInput)
          break
        default:
          result = {
            success: false,
            data: null,
            error: `Unknown tool: ${step.actionName}`,
            executionTime: 0
          }
      }
      
      // Store tool result in the step
      step.toolResult = result
      
      // Add observation step with tool result
      const observationContent = result.success 
        ? `Tool executed successfully in ${result.executionTime}ms. Result: ${JSON.stringify(result.data, null, 2)}`
        : `Tool execution failed: ${result.error}`
      
      this.steps.push({
        type: 'observation',
        content: observationContent,
        timestamp: new Date(),
        toolResult: result
      })
    } catch (error) {
      this.steps.push({
        type: 'observation',
        content: `Tool execution error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: new Date()
      })
    }
  }
}

export const reactAgent = new ReActAgent()