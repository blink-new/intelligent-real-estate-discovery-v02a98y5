import { blink } from './blink'

export interface ConversationMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  metadata?: {
    toolCalls?: any[]
    reasoning?: any[]
    properties?: any[]
  }
}

export interface UserPreferences {
  id: string
  userId: string
  propertyType?: string[]
  priceRange?: { min: number; max: number }
  locations?: string[]
  bedrooms?: number
  amenities?: string[]
  searchHistory?: string[]
  viewedProperties?: string[]
  favoriteProperties?: string[]
  communicationStyle?: 'detailed' | 'concise' | 'technical'
  language?: 'en' | 'ne'
  updatedAt: number
}

export interface ConversationSession {
  id: string
  userId: string
  title: string
  messages: ConversationMessage[]
  context: {
    currentSearch?: any
    extractedPreferences?: Partial<UserPreferences>
    lastActivity: number
  }
  createdAt: number
  updatedAt: number
}

export class MemoryManager {
  private currentSession: ConversationSession | null = null
  private userPreferences: UserPreferences | null = null
  private maxMessagesInMemory = 20
  private maxTokensEstimate = 8000

  async initializeSession(userId: string): Promise<ConversationSession> {
    try {
      // Load user preferences
      await this.loadUserPreferences(userId)
      
      // Create or load current session
      const sessions = await blink.db.conversationSessions.list({
        where: { userId },
        orderBy: { updatedAt: 'desc' },
        limit: 1
      })

      if (sessions.length > 0 && this.isRecentSession(sessions[0])) {
        // Map database format to interface format
        const dbSession = sessions[0]
        this.currentSession = {
          id: dbSession.id,
          userId: dbSession.userId,
          title: dbSession.title,
          messages: this.parseJsonField(dbSession.messages) || [],
          context: this.parseJsonField(dbSession.context) || { lastActivity: Date.now() },
          createdAt: dbSession.createdAt,
          updatedAt: dbSession.updatedAt
        }
      } else {
        this.currentSession = await this.createNewSession(userId)
      }

      return this.currentSession
    } catch (error) {
      console.error('Failed to initialize session:', error)
      // Fallback to in-memory session
      return this.createFallbackSession(userId)
    }
  }

  async addMessage(message: Omit<ConversationMessage, 'id' | 'timestamp'>): Promise<void> {
    if (!this.currentSession) {
      throw new Error('No active session')
    }

    const newMessage: ConversationMessage = {
      ...message,
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now()
    }

    this.currentSession.messages.push(newMessage)
    this.currentSession.updatedAt = Date.now()
    this.currentSession.context.lastActivity = Date.now()

    // Extract preferences from user messages
    if (message.role === 'user') {
      await this.extractAndUpdatePreferences(message.content)
    }

    // Manage memory size
    this.trimMemoryIfNeeded()

    // Persist to database
    await this.persistSession()
  }

  async getConversationContext(): Promise<ConversationMessage[]> {
    if (!this.currentSession) {
      return []
    }

    // Return optimized message history for AI context
    return this.optimizeMessagesForContext(this.currentSession.messages)
  }

  async getUserPreferences(): Promise<UserPreferences | null> {
    return this.userPreferences
  }

  async updateUserPreferences(updates: Partial<UserPreferences>): Promise<void> {
    if (!this.userPreferences) {
      return
    }

    this.userPreferences = {
      ...this.userPreferences,
      ...updates,
      updatedAt: Date.now()
    }

    try {
      // Map interface format to database format
      const dbUpdates: any = {
        updatedAt: this.userPreferences.updatedAt
      }

      if (updates.propertyType !== undefined) {
        dbUpdates.propertyType = JSON.stringify(this.userPreferences.propertyType)
      }
      if (updates.priceRange !== undefined) {
        dbUpdates.priceRangeMin = this.userPreferences.priceRange?.min
        dbUpdates.priceRangeMax = this.userPreferences.priceRange?.max
      }
      if (updates.locations !== undefined) {
        dbUpdates.locations = JSON.stringify(this.userPreferences.locations)
      }
      if (updates.bedrooms !== undefined) {
        dbUpdates.bedrooms = this.userPreferences.bedrooms
      }
      if (updates.amenities !== undefined) {
        dbUpdates.amenities = JSON.stringify(this.userPreferences.amenities)
      }
      if (updates.searchHistory !== undefined) {
        dbUpdates.searchHistory = JSON.stringify(this.userPreferences.searchHistory)
      }
      if (updates.viewedProperties !== undefined) {
        dbUpdates.viewedProperties = JSON.stringify(this.userPreferences.viewedProperties)
      }
      if (updates.favoriteProperties !== undefined) {
        dbUpdates.favoriteProperties = JSON.stringify(this.userPreferences.favoriteProperties)
      }
      if (updates.communicationStyle !== undefined) {
        dbUpdates.communicationStyle = this.userPreferences.communicationStyle
      }
      if (updates.language !== undefined) {
        dbUpdates.language = this.userPreferences.language
      }

      await blink.db.userPreferences.update(this.userPreferences.id, dbUpdates)
    } catch (error) {
      console.error('Failed to update preferences:', error)
      // If update fails, try to recreate the preferences
      if (error.message?.includes('NOT NULL constraint') || error.message?.includes('no such rowid')) {
        console.log('Attempting to recreate user preferences...')
        try {
          const now = Date.now()
          const recreatePrefs = {
            id: this.userPreferences.id,
            userId: this.userPreferences.userId,
            searchHistory: JSON.stringify(this.userPreferences.searchHistory || []),
            viewedProperties: JSON.stringify(this.userPreferences.viewedProperties || []),
            favoriteProperties: JSON.stringify(this.userPreferences.favoriteProperties || []),
            propertyType: JSON.stringify(this.userPreferences.propertyType || []),
            locations: JSON.stringify(this.userPreferences.locations || []),
            amenities: JSON.stringify(this.userPreferences.amenities || []),
            communicationStyle: this.userPreferences.communicationStyle || 'detailed',
            language: this.userPreferences.language || 'en',
            bedrooms: this.userPreferences.bedrooms,
            priceRangeMin: this.userPreferences.priceRange?.min,
            priceRangeMax: this.userPreferences.priceRange?.max,
            createdAt: now,
            updatedAt: now
          }
          await blink.db.userPreferences.create(recreatePrefs)
        } catch (recreateError) {
          console.error('Failed to recreate preferences:', recreateError)
        }
      }
    }
  }

  async getSearchHistory(limit: number = 10): Promise<string[]> {
    return this.userPreferences?.searchHistory?.slice(-limit) || []
  }

  async addToSearchHistory(query: string): Promise<void> {
    if (!this.userPreferences) return

    const searchHistory = this.userPreferences.searchHistory || []
    searchHistory.push(query)
    
    // Keep only last 50 searches
    if (searchHistory.length > 50) {
      searchHistory.splice(0, searchHistory.length - 50)
    }

    await this.updateUserPreferences({ searchHistory })
  }

  async getPersonalizedSystemPrompt(): Promise<string> {
    const preferences = this.userPreferences
    const recentSearches = await this.getSearchHistory(5)
    
    let personalizedPrompt = `You are an AI real estate assistant for Nepal. `

    if (preferences) {
      personalizedPrompt += `\n\nUser Profile:
- Preferred property types: ${preferences.propertyType?.join(', ') || 'Not specified'}
- Budget range: NPR ${preferences.priceRange?.min?.toLocaleString()} - ${preferences.priceRange?.max?.toLocaleString() || 'Not specified'}
- Preferred locations: ${preferences.locations?.join(', ') || 'Not specified'}
- Bedrooms: ${preferences.bedrooms || 'Not specified'}
- Communication style: ${preferences.communicationStyle || 'balanced'}
- Language: ${preferences.language === 'ne' ? 'Nepali' : 'English'}`

      if (recentSearches.length > 0) {
        personalizedPrompt += `\n- Recent searches: ${recentSearches.join(', ')}`
      }

      if (preferences.viewedProperties?.length) {
        personalizedPrompt += `\n- Has viewed ${preferences.viewedProperties.length} properties recently`
      }
    }

    personalizedPrompt += `\n\nUse this context to provide more relevant and personalized responses. Reference their preferences when appropriate and avoid asking for information you already know.`

    return personalizedPrompt
  }

  private async loadUserPreferences(userId: string): Promise<void> {
    try {
      const preferences = await blink.db.userPreferences.list({
        where: { userId },
        limit: 1
      })

      if (preferences.length > 0) {
        // Map database fields to interface format
        const dbPref = preferences[0]
        this.userPreferences = {
          id: dbPref.id,
          userId: dbPref.userId,
          propertyType: this.parseJsonField(dbPref.propertyType) || [],
          priceRange: dbPref.priceRangeMin || dbPref.priceRangeMax ? {
            min: dbPref.priceRangeMin || 0,
            max: dbPref.priceRangeMax || 0
          } : undefined,
          locations: this.parseJsonField(dbPref.locations) || [],
          bedrooms: dbPref.bedrooms,
          amenities: this.parseJsonField(dbPref.amenities) || [],
          searchHistory: this.parseJsonField(dbPref.searchHistory) || [],
          viewedProperties: this.parseJsonField(dbPref.viewedProperties) || [],
          favoriteProperties: this.parseJsonField(dbPref.favoriteProperties) || [],
          communicationStyle: dbPref.communicationStyle || 'detailed',
          language: dbPref.language || 'en',
          updatedAt: dbPref.updatedAt || Date.now()
        }
      } else {
        // Create default preferences with proper database mapping
        const now = Date.now()
        const defaultPrefs = {
          userId,
          searchHistory: JSON.stringify([]),
          viewedProperties: JSON.stringify([]),
          favoriteProperties: JSON.stringify([]),
          propertyType: JSON.stringify([]),
          locations: JSON.stringify([]),
          amenities: JSON.stringify([]),
          communicationStyle: 'detailed',
          language: 'en',
          createdAt: now,
          updatedAt: now
        }
        
        const created = await blink.db.userPreferences.create(defaultPrefs)
        
        this.userPreferences = {
          id: created.id,
          userId,
          propertyType: [],
          locations: [],
          amenities: [],
          searchHistory: [],
          viewedProperties: [],
          favoriteProperties: [],
          communicationStyle: 'detailed',
          language: 'en',
          updatedAt: Date.now()
        }
      }
    } catch (error) {
      console.error('Failed to load user preferences:', error)
      // Create fallback preferences
      this.userPreferences = {
        id: `pref_${userId}`,
        userId,
        propertyType: [],
        locations: [],
        amenities: [],
        searchHistory: [],
        viewedProperties: [],
        favoriteProperties: [],
        communicationStyle: 'detailed',
        language: 'en',
        updatedAt: Date.now()
      }
    }
  }

  private async createNewSession(userId: string): Promise<ConversationSession> {
    const now = Date.now()
    const session: ConversationSession = {
      id: `session_${now}_${Math.random().toString(36).substr(2, 9)}`,
      userId,
      title: 'New Property Search',
      messages: [],
      context: {
        lastActivity: now
      },
      createdAt: now,
      updatedAt: now
    }

    try {
      // Map to database format
      const dbSession = {
        id: session.id,
        userId: session.userId,
        title: session.title,
        messages: JSON.stringify(session.messages),
        context: JSON.stringify(session.context),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      }
      await blink.db.conversationSessions.create(dbSession)
    } catch (error) {
      console.error('Failed to create session in database:', error)
    }

    return session
  }

  private createFallbackSession(userId: string): ConversationSession {
    return {
      id: `fallback_${Date.now()}`,
      userId,
      title: 'Property Search Session',
      messages: [],
      context: {
        lastActivity: Date.now()
      },
      createdAt: Date.now(),
      updatedAt: Date.now()
    }
  }

  private isRecentSession(session: ConversationSession): boolean {
    const oneHour = 60 * 60 * 1000
    return Date.now() - session.context.lastActivity < oneHour
  }

  private async extractAndUpdatePreferences(userMessage: string): Promise<void> {
    if (!this.userPreferences) return

    const message = userMessage.toLowerCase()
    const updates: Partial<UserPreferences> = {}

    // Extract budget information
    const budgetMatch = message.match(/(?:under|below|maximum|max|budget|afford)\s*(?:npr|rs)?\s*([0-9,]+)/i)
    if (budgetMatch) {
      const maxBudget = parseInt(budgetMatch[1].replace(/,/g, ''))
      updates.priceRange = { 
        min: this.userPreferences.priceRange?.min || 0, 
        max: maxBudget 
      }
    }

    // Extract bedroom preferences
    const bedroomMatch = message.match(/(\d+)\s*(?:bed|bedroom|bhk)/i)
    if (bedroomMatch) {
      updates.bedrooms = parseInt(bedroomMatch[1])
    }

    // Extract location preferences
    const locations = ['kathmandu', 'lalitpur', 'bhaktapur', 'pokhara', 'chitwan', 'butwal']
    const mentionedLocations = locations.filter(loc => message.includes(loc))
    if (mentionedLocations.length > 0) {
      const currentLocations = this.userPreferences.locations || []
      updates.locations = [...new Set([...currentLocations, ...mentionedLocations])]
    }

    // Extract property type preferences
    const propertyTypes = ['apartment', 'house', 'flat', 'villa', 'studio', 'penthouse']
    const mentionedTypes = propertyTypes.filter(type => message.includes(type))
    if (mentionedTypes.length > 0) {
      const currentTypes = this.userPreferences.propertyType || []
      updates.propertyType = [...new Set([...currentTypes, ...mentionedTypes])]
    }

    if (Object.keys(updates).length > 0) {
      await this.updateUserPreferences(updates)
    }
  }

  private trimMemoryIfNeeded(): void {
    if (!this.currentSession) return

    // Keep system message + recent messages within limits
    const messages = this.currentSession.messages
    if (messages.length > this.maxMessagesInMemory) {
      const systemMessages = messages.filter(m => m.role === 'system')
      const otherMessages = messages.filter(m => m.role !== 'system')
      
      this.currentSession.messages = [
        ...systemMessages,
        ...otherMessages.slice(-this.maxMessagesInMemory + systemMessages.length)
      ]
    }
  }

  private optimizeMessagesForContext(messages: ConversationMessage[]): ConversationMessage[] {
    // Estimate tokens (rough approximation: 1 token ≈ 4 characters)
    let totalTokens = 0
    const optimizedMessages: ConversationMessage[] = []

    // Always include system messages
    const systemMessages = messages.filter(m => m.role === 'system')
    optimizedMessages.push(...systemMessages)
    totalTokens += systemMessages.reduce((sum, m) => sum + m.content.length / 4, 0)

    // Add recent messages in reverse order until token limit
    const otherMessages = messages.filter(m => m.role !== 'system').reverse()
    
    for (const message of otherMessages) {
      const messageTokens = message.content.length / 4
      if (totalTokens + messageTokens > this.maxTokensEstimate) {
        break
      }
      
      optimizedMessages.unshift(message)
      totalTokens += messageTokens
    }

    return optimizedMessages
  }

  private async persistSession(): Promise<void> {
    if (!this.currentSession) return

    try {
      // Map to database format
      const dbSession = {
        id: this.currentSession.id,
        userId: this.currentSession.userId,
        title: this.currentSession.title,
        messages: JSON.stringify(this.currentSession.messages),
        context: JSON.stringify(this.currentSession.context),
        createdAt: this.currentSession.createdAt,
        updatedAt: this.currentSession.updatedAt
      }
      await blink.db.conversationSessions.update(this.currentSession.id, dbSession)
    } catch (error) {
      console.error('Failed to persist session:', error)
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
    if (Array.isArray(field) || typeof field === 'object') return field
    return null
  }

  async getConversationHistory(limit: number = 5): Promise<ConversationSession[]> {
    if (!this.currentSession) return []

    try {
      const dbSessions = await blink.db.conversationSessions.list({
        where: { userId: this.currentSession.userId },
        orderBy: { updatedAt: 'desc' },
        limit
      })
      
      // Map database format to interface format
      return dbSessions.map(dbSession => ({
        id: dbSession.id,
        userId: dbSession.userId,
        title: dbSession.title,
        messages: this.parseJsonField(dbSession.messages) || [],
        context: this.parseJsonField(dbSession.context) || { lastActivity: Date.now() },
        createdAt: dbSession.createdAt,
        updatedAt: dbSession.updatedAt
      }))
    } catch (error) {
      console.error('Failed to load conversation history:', error)
      return []
    }
  }

  async loadSession(sessionId: string): Promise<void> {
    try {
      const sessions = await blink.db.conversationSessions.list({
        where: { id: sessionId },
        limit: 1
      })

      if (sessions.length > 0) {
        // Map database format to interface format
        const dbSession = sessions[0]
        this.currentSession = {
          id: dbSession.id,
          userId: dbSession.userId,
          title: dbSession.title,
          messages: this.parseJsonField(dbSession.messages) || [],
          context: this.parseJsonField(dbSession.context) || { lastActivity: Date.now() },
          createdAt: dbSession.createdAt,
          updatedAt: dbSession.updatedAt
        }
      }
    } catch (error) {
      console.error('Failed to load session:', error)
    }
  }
}

export const memoryManager = new MemoryManager()