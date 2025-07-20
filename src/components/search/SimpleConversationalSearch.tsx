import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Brain,
  MessageSquare,
  Loader2,
  MapPin,
  DollarSign,
  Bed,
  Bath,
  Square,
  Heart,
  Phone
} from 'lucide-react'
import { ChatMessage, Property } from '@/types'
import { blink } from '@/lib/blink'
import { simplePropertyService } from '@/lib/simplePropertyService'

interface SimpleConversationalSearchProps {
  onPropertiesFound: (properties: Property[]) => void
  onClose: () => void
}

export function SimpleConversationalSearch({ onPropertiesFound, onClose }: SimpleConversationalSearchProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Set welcome message
    setMessages([{
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI real estate assistant for Nepal. I can help you find properties, analyze market trends, and answer questions about real estate in Kathmandu Valley.\n\n**Try asking:**\n• 'Find me a 2BHK apartment in Kathmandu under NPR 30,000'\n• 'Show me properties in Lalitpur for investment'\n• 'I want to list my house for rent'\n\nWhat can I help you find today?",
      timestamp: new Date().toISOString()
    }])
  }, [])

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
    const currentQuery = inputValue
    setInputValue('')
    setIsLoading(true)

    try {
      // First, search for properties based on the query
      const foundProperties = await simplePropertyService.searchProperties(currentQuery)
      
      // Use Blink AI to analyze the query and provide intelligent response
      const aiPrompt = `You are an expert real estate assistant for Nepal, specifically the Kathmandu Valley. 

User Query: "${currentQuery}"

${foundProperties.length > 0 ? `
I found ${foundProperties.length} properties that match the query. Here are the details:

${foundProperties.slice(0, 3).map((prop, index) => `
${index + 1}. ${prop.title}
   - Price: NPR ${prop.price.toLocaleString()} (${prop.priceType})
   - Type: ${prop.propertyType} | ${prop.bedrooms}BR/${prop.bathrooms}BA | ${prop.area} ${prop.areaUnit}
   - Location: ${prop.location.address}, ${prop.location.city}
   - Amenities: ${prop.amenities.join(', ')}
   - Features: ${prop.features.join(', ')}
`).join('')}

${foundProperties.length > 3 ? `... and ${foundProperties.length - 3} more properties.` : ''}

Please provide:
1. A brief analysis of why these properties match the user's query
2. Highlight the best options and explain why
3. Mention key features that make them attractive
4. Provide any relevant market insights for the areas
5. Suggest what the user should consider when choosing

` : `
I couldn't find properties that exactly match the query. Please provide:
1. Helpful suggestions on how to refine their search
2. Alternative options they might consider
3. General market insights for Nepal real estate
4. Tips for property hunting in Kathmandu Valley
`}

Keep your response conversational, informative, and focused on helping the user make the best decision. Use emojis sparingly and maintain a professional yet friendly tone.`

      const response = await blink.ai.generateText({
        prompt: aiPrompt,
        maxTokens: 500
      })

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString(),
        properties: foundProperties.length > 0 ? foundProperties : undefined
      }

      setMessages(prev => [...prev, assistantMessage])

      // Update the main view with found properties
      if (foundProperties.length > 0) {
        onPropertiesFound(foundProperties)
      }

    } catch (error) {
      console.error('Error processing query:', error)
      
      // Fallback to basic search if AI fails
      try {
        const foundProperties = await simplePropertyService.searchProperties(currentQuery)
        const fallbackMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: foundProperties.length > 0 
            ? `I found ${foundProperties.length} properties matching your search. While I'm experiencing some technical issues with my AI analysis, I can still show you these relevant properties. Please let me know if you'd like more details about any of them!`
            : "I'm currently experiencing some technical difficulties, but I'm still here to help! Could you try rephrasing your search or being more specific about what you're looking for? For example, mention the area, budget range, or property type.",
          timestamp: new Date().toISOString(),
          properties: foundProperties.length > 0 ? foundProperties : undefined
        }
        setMessages(prev => [...prev, fallbackMessage])
        
        if (foundProperties.length > 0) {
          onPropertiesFound(foundProperties)
        }
      } catch (searchError) {
        const errorMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I apologize, but I'm experiencing technical difficulties right now. Please try again in a moment, or try browsing all available properties using the button in the main area.",
          timestamp: new Date().toISOString()
        }
        setMessages(prev => [...prev, errorMessage])
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const quickPrompts = [
    "Find me a 2BHK apartment in Kathmandu",
    "Show me properties under NPR 30,000",
    "I'm looking for investment properties",
    "Commercial spaces in Thamel"
  ]

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-primary/5 to-accent/5">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-accent rounded-full flex items-center justify-center">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">AI Assistant</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Real Estate Expert for Nepal</span>
            </div>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
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
                
                {/* Property Cards for AI responses */}
                {message.properties && message.properties.length > 0 && (
                  <div className="mt-3 space-y-3">
                    {message.properties.slice(0, 3).map((property) => (
                      <Card key={property.id} className="border-l-4 border-l-accent shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between mb-2">
                            <h4 className="font-medium text-sm text-foreground">{property.title}</h4>
                            {property.aiRecommendationScore && (
                              <div className="flex items-center space-x-1 bg-primary/10 px-2 py-1 rounded-full">
                                <Sparkles className="w-3 h-3 text-primary" />
                                <span className="text-xs font-medium text-primary">
                                  {Math.round(property.aiRecommendationScore * 100)}% match
                                </span>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex items-center space-x-4 mb-2 text-xs text-muted-foreground">
                            <div className="flex items-center space-x-1">
                              <DollarSign className="w-3 h-3" />
                              <span className="font-medium text-foreground">NPR {property.price.toLocaleString()}</span>
                              <span>/{property.priceType === 'rent' ? 'month' : 'total'}</span>
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
                            <div className="bg-primary/5 border border-primary/20 rounded-lg p-2 mb-3">
                              <p className="text-xs text-primary">
                                <span className="font-medium">🤖 AI Insight:</span> {property.aiExplanation}
                              </p>
                            </div>
                          )}
                          
                          <div className="flex items-center space-x-2">
                            <Button
                              size="sm"
                              onClick={() => onPropertiesFound([property])}
                              className="flex-1 h-8 text-xs"
                            >
                              View Details
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Heart className="w-3 h-3" />
                            </Button>
                            <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                              <Phone className="w-3 h-3" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                    
                    {message.properties.length > 3 && (
                      <div className="text-center">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onPropertiesFound(message.properties!)}
                          className="text-xs"
                        >
                          View All {message.properties.length} Properties
                        </Button>
                      </div>
                    )}
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
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      {messages.length <= 1 && (
        <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-accent/5">
          <p className="text-sm text-muted-foreground mb-3 font-medium">🚀 Try these searches:</p>
          <div className="grid grid-cols-1 gap-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputValue(prompt)}
                className="text-xs justify-start hover:bg-primary/5 hover:border-primary/20"
              >
                <MessageSquare className="w-3 h-3 mr-2" />
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
            placeholder="Ask me about properties in Nepal..."
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
          AI-powered real estate assistant for Nepal
        </div>
      </div>
    </div>
  )
}