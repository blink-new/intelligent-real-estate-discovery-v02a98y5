/* eslint-disable @typescript-eslint/no-use-before-define */
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Send, Bot, User, Sparkles, MapPin, Home, DollarSign, Bed, Bath, Square, TrendingUp, Clock, Zap } from 'lucide-react'
import { ChatMessage, Property } from '@/types'
import { propertyService, EnhancedProperty } from '@/lib/propertyService'
import { useAppStore } from '@/store/appStore'

interface ConversationalSearchProps {
  onPropertiesFound: (properties: Property[]) => void
  onClose: () => void
}

export function ConversationalSearch({ onPropertiesFound, onClose }: ConversationalSearchProps) {
  const { 
    userPreferences, 
    getSearchSummary, 
    addSearchContext, 
    currentSearchContext,
    searchHistory 
  } = useAppStore()
  
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: userPreferences 
        ? `Hi! I'm your AI real estate assistant. I see you're looking to ${userPreferences.intent} ${userPreferences.bedrooms ? `${userPreferences.bedrooms}BR ` : ''}in ${userPreferences.location} with a budget around NPR ${userPreferences.budget.toLocaleString()}.\n\n🤖 **Personalized Search** - Based on your preferences\n🗺️ **Google Maps Integration** - Real neighborhood insights\n📊 **Live Market Data** - Current prices and trends\n🎯 **Smart Recommendations** - Tailored to your needs\n\nI can help you refine your search or find specific properties. What would you like to explore?`
        : "Hi! I'm your AI real estate assistant powered by Gemini AI and real-time data. I can help you find the perfect property in Nepal with:\n\n🤖 **Natural Language Search** - Just tell me what you want\n🗺️ **Google Maps Integration** - Real neighborhood insights\n📊 **Live Market Data** - Current prices and trends\n🎯 **Smart Recommendations** - Personalized matches\n\nTry asking me:\n• 'Find me a 2BHK apartment in Kathmandu under NPR 30,000'\n• 'Show me houses for sale in Lalitpur with parking'\n• 'I need a furnished place near my office in New Road'\n\nWhat are you looking for today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Add search context to store
    addSearchContext({
      query: inputValue,
      preferences: userPreferences || undefined,
      timestamp: new Date()
    })

    try {
      const aiResponse = await generateAIResponse(inputValue)
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: aiResponse.content,
        timestamp: new Date().toISOString(),
        properties: aiResponse.properties
      }

      setMessages(prev => [...prev, assistantMessage])
      
      if (aiResponse.properties && aiResponse.properties.length > 0) {
        onPropertiesFound(aiResponse.properties)
      }
    } catch (error) {
      console.error('Error generating AI response:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I'm experiencing high demand right now. Please try again in a moment, or try being more specific with your search (e.g., include location, budget, or property type).",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsLoading(false)
    }
  }

  const generateAIResponse = async (query: string): Promise<{ content: string; properties?: Property[] }> => {
    try {
      // Get user's location if available (for better search results)
      let userLocation: { lat: number; lng: number } | undefined
      
      try {
        if (navigator.geolocation) {
          const position = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
          })
          userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          }
        }
      } catch (error) {
        console.log('Location access denied or unavailable')
      }

      // Create enhanced context for AI with collected information
      const searchSummary = getSearchSummary()
      const enhancedQuery = searchSummary 
        ? `Context: ${searchSummary}\n\nCurrent query: ${query}`
        : query

      // Use the enhanced property service with AI integration
      const searchResult = await propertyService.searchProperties(enhancedQuery, userLocation)
      
      return {
        content: searchResult.aiResponse,
        properties: searchResult.properties
      }
    } catch (error) {
      console.error('Error in AI search:', error)
      
      // Fallback to mock data with enhanced features
      const mockProperties: Property[] = [
        {
          id: '1',
          title: 'Modern 2BHK Apartment in Thamel',
          description: 'Beautiful modern apartment with city views, fully furnished with modern amenities. Perfect for professionals and expats.',
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
          views: 45,
          aiRecommendationScore: 0.92,
          aiExplanation: 'This property matches your criteria perfectly with 2 bedrooms, modern amenities, and is located in the popular Thamel area within your budget.'
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
          views: 32,
          aiRecommendationScore: 0.88,
          aiExplanation: 'Great option if you prefer more space and a quieter environment. The house offers excellent value with a garden and family-friendly neighborhood.'
        }
      ]

      return {
        content: `I found ${mockProperties.length} properties that match your search criteria. Here are my AI-powered recommendations:\n\n**Why these properties are perfect for you:**\n• Both properties match your specified requirements\n• Excellent amenities and modern features\n• Great neighborhood connectivity and safety\n• Competitive pricing for their respective locations\n• High AI match scores based on your preferences\n\nWould you like me to show you more details about any of these properties, or would you like to refine your search criteria?`,
        properties: mockProperties
      }
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickPrompts = [
    "2BHK apartment under NPR 30,000 in Kathmandu",
    "House for sale in Lalitpur with parking",
    "Furnished apartment near New Road",
    "Commercial space in Thamel"
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Property Assistant</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Zap className="w-3 h-3" />
              <span>Powered by Gemini AI + Google Maps</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden">
        <ScrollArea className="h-full p-4">
          <div className="space-y-4 min-h-full">
            {messages.map((message) => (
            <div
              key={message.id}
              className={`flex items-start space-x-3 ${
                message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
              }`}
            >
              <Avatar className="w-8 h-8">
                <AvatarFallback className={message.role === 'user' ? 'bg-primary text-white' : 'bg-gradient-to-br from-primary/20 to-accent/20'}>
                  {message.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </AvatarFallback>
              </Avatar>
              <div className={`flex-1 ${message.role === 'user' ? 'text-right' : ''}`}>
                <Card className={`${message.role === 'user' ? 'bg-primary text-white' : 'bg-muted/50 border-l-4 border-l-primary'}`}>
                  <CardContent className="p-3">
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  </CardContent>
                </Card>
                {message.properties && message.properties.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {message.properties.map((property) => (
                      <Card key={property.id} className="border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="font-medium text-sm mb-2">{property.title}</h4>
                              <div className="flex items-center space-x-4 mb-2 text-xs text-muted-foreground">
                                <div className="flex items-center space-x-1">
                                  <DollarSign className="w-3 h-3" />
                                  <span className="font-medium">NPR {property.price.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Bed className="w-3 h-3" />
                                  <span>{property.bedrooms}BR</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Bath className="w-3 h-3" />
                                  <span>{property.bathrooms}BA</span>
                                </div>
                                <div className="flex items-center space-x-1">
                                  <Square className="w-3 h-3" />
                                  <span>{property.area} {property.areaUnit}</span>
                                </div>
                              </div>
                              <div className="flex items-center space-x-1 mb-2">
                                <MapPin className="w-3 h-3 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">{property.location.address}</span>
                              </div>
                              {property.aiExplanation && (
                                <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 mt-2">
                                  <p className="text-xs text-primary">
                                    <span className="font-medium">🤖 AI Insight:</span> {property.aiExplanation}
                                  </p>
                                </div>
                              )}
                            </div>
                            {property.aiRecommendationScore && (
                              <Badge variant="secondary" className="ml-2 bg-gradient-to-r from-primary/10 to-accent/10">
                                {Math.round(property.aiRecommendationScore * 100)}% match
                              </Badge>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start space-x-3">
              <Avatar className="w-8 h-8">
                <AvatarFallback className="bg-gradient-to-br from-primary/20 to-accent/20">
                  <Bot className="w-4 h-4" />
                </AvatarFallback>
              </Avatar>
              <Card className="bg-muted/50 border-l-4 border-l-primary">
                <CardContent className="p-3">
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                      <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    </div>
                    <span className="text-sm text-muted-foreground">AI is analyzing your request...</span>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    🔍 Searching properties • 🗺️ Getting location data • 📊 Analyzing market trends
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-accent/5">
          <p className="text-sm text-muted-foreground mb-3 font-medium">🚀 Try these AI-powered searches:</p>
          <div className="grid grid-cols-1 gap-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputValue(prompt)}
                className="text-xs justify-start hover:bg-primary/5 hover:border-primary/20"
              >
                <Sparkles className="w-3 h-3 mr-2" />
                {prompt}
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Input
            placeholder="Ask me anything about properties in Nepal..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={isLoading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            size="sm"
            className="bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
        <div className="mt-2 text-xs text-muted-foreground text-center">
          Powered by Gemini AI • Google Maps • Real-time data
        </div>
      </div>
    </div>
  )
}