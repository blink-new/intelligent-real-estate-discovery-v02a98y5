/* eslint-disable @typescript-eslint/no-use-before-define */
import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Brain, 
  Zap, 
  Search as SearchIcon,
  Map,
  Calculator,
  TrendingUp,
  Database,
  HelpCircle,
  ChevronDown,
  ChevronRight,
  Clock,
  CheckCircle,
  AlertCircle,
  Activity,
  Target,
  Eye,
  Timer,
  BarChart3
} from 'lucide-react'
import { ChatMessage, Property } from '@/types'
import { reactAgent, ReActStep, ReActResponse, ToolResult } from '@/lib/react-agent'

interface ReActConversationalSearchProps {
  onPropertiesFound: (properties: Property[]) => void
  onClose: () => void
}

interface ReActMessage extends ChatMessage {
  reactResponse?: ReActResponse
  isProcessing?: boolean
}

export function ReActConversationalSearch({ onPropertiesFound, onClose }: ReActConversationalSearchProps) {
  const [messages, setMessages] = useState<ReActMessage[]>([
    {
      id: '1',
      role: 'assistant',
      content: "Hi! I'm your AI real estate assistant powered by the **ReAct Framework** and **Gemini AI**. I use step-by-step reasoning and real-time tools to help you find the perfect property in Nepal.\\n\\n🧠 **ReAct Framework** - Transparent reasoning process\\n🔍 **Real-time Search** - Current market data via Tavily API\\n🗺️ **Maps Integration** - Location insights via Google Maps\\n📊 **Market Analysis** - Investment insights and ROI calculations\\n🏠 **Property Database** - Comprehensive listings search\\n❓ **Smart Clarification** - Asks the right questions when needed\\n\\nI'll show you my complete thinking process as I work through your request. You'll see every thought, action, and observation.\\n\\n**Try asking:**\\n• 'Find me a 2BHK apartment in Kathmandu under NPR 30,000'\\n• 'I'm an investor looking for high-ROI properties in Lalitpur'\\n• 'Show me commercial spaces in Thamel for my restaurant'\\n• 'I want to list my house for rent'\\n\\nWhat can I help you find today?",
      timestamp: new Date().toISOString()
    }
  ])
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [expandedSteps, setExpandedSteps] = useState<{ [key: string]: boolean }>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return

    const userMessage: ReActMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toISOString()
    }

    setMessages(prev => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    // Add processing message
    const processingMessage: ReActMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant',
      content: '🧠 Analyzing your request using ReAct framework...\\n\\nI will think step-by-step, use appropriate tools, and show you my complete reasoning process.',
      timestamp: new Date().toISOString(),
      isProcessing: true
    }

    setMessages(prev => [...prev, processingMessage])

    try {
      const reactResponse = await reactAgent.processQuery(inputValue)
      
      // Remove processing message and add final response
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isProcessing)
        
        const assistantMessage: ReActMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: reactResponse.finalAnswer,
          timestamp: new Date().toISOString(),
          reactResponse: reactResponse
        }

        return [...filtered, assistantMessage]
      })
      
      // Extract properties from the response if any
      const properties = extractPropertiesFromResponse(reactResponse)
      if (properties && properties.length > 0) {
        onPropertiesFound(properties)
      }
    } catch (error) {
      console.error('Error processing ReAct query:', error)
      setMessages(prev => {
        const filtered = prev.filter(msg => !msg.isProcessing)
        
        const errorMessage: ReActMessage = {
          id: (Date.now() + 2).toString(),
          role: 'assistant',
          content: "I apologize, but I encountered an error while processing your request. Please try rephrasing your question or being more specific about what you're looking for.",
          timestamp: new Date().toISOString()
        }
        
        return [...filtered, errorMessage]
      })
    } finally {
      setIsLoading(false)
    }
  }

  const extractPropertiesFromResponse = (reactResponse: ReActResponse): Property[] | null => {
    // Look for property data in the observation steps
    for (const step of reactResponse.steps) {
      if (step.type === 'observation' && step.toolResult?.success && step.toolResult.data?.properties) {
        try {
          const properties = step.toolResult.data.properties
          if (Array.isArray(properties)) {
            // Convert to full Property objects
            return properties.map((prop: any) => ({
              ...prop,
              description: `${prop.bedrooms}BHK ${prop.priceType === 'rent' ? 'rental' : 'property'} in ${prop.location}`,
              propertyType: prop.propertyType || 'apartment' as const,
              areaUnit: prop.areaUnit || 'sqft' as const,
              location: {
                address: prop.location,
                city: prop.location.split(',')[1]?.trim() || 'Kathmandu',
                district: prop.location.split(',')[1]?.trim() || 'Kathmandu',
                latitude: 27.7172,
                longitude: 85.3240
              },
              images: ['https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800'],
              ownerId: 'owner1',
              ownerContact: {
                name: 'Property Owner',
                phone: '+977-9841234567',
                email: 'owner@example.com'
              },
              features: prop.features || ['Modern', 'Well-maintained'],
              nearbyPlaces: {
                schools: ['Local School'],
                hospitals: ['Nearby Hospital'],
                markets: ['Local Market'],
                transport: ['Bus Stop']
              },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isActive: true,
              views: Math.floor(Math.random() * 100),
              aiRecommendationScore: prop.match_score || 0.9,
              aiExplanation: `This property matches your criteria with a ${Math.round((prop.match_score || 0.9) * 100)}% match score.`
            }))
          }
        } catch (error) {
          console.error('Error parsing properties from response:', error)
        }
      }
    }
    return null
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const toggleStepExpansion = (messageId: string, stepIndex: number) => {
    const key = `${messageId}-${stepIndex}`
    setExpandedSteps(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const getStepIcon = (step: ReActStep) => {
    switch (step.type) {
      case 'thought':
        return <Brain className="w-4 h-4 text-blue-500" />
      case 'action':
        switch (step.actionName?.toLowerCase()) {
          case 'search':
            return <SearchIcon className="w-4 h-4 text-green-500" />
          case 'maps':
            return <Map className="w-4 h-4 text-red-500" />
          case 'calculator':
            return <Calculator className="w-4 h-4 text-purple-500" />
          case 'marketanalysis':
            return <TrendingUp className="w-4 h-4 text-orange-500" />
          case 'propertydatabase':
            return <Database className="w-4 h-4 text-indigo-500" />
          case 'clarify':
            return <HelpCircle className="w-4 h-4 text-yellow-500" />
          default:
            return <Zap className="w-4 h-4 text-gray-500" />
        }
      case 'observation':
        return step.toolResult?.success ? 
          <CheckCircle className="w-4 h-4 text-green-600" /> : 
          <AlertCircle className="w-4 h-4 text-red-600" />
      default:
        return <Activity className="w-4 h-4 text-gray-500" />
    }
  }

  const getStepColor = (step: ReActStep) => {
    switch (step.type) {
      case 'thought':
        return 'border-l-blue-500 bg-blue-50 hover:bg-blue-100'
      case 'action':
        return 'border-l-green-500 bg-green-50 hover:bg-green-100'
      case 'observation':
        return step.toolResult?.success ? 
          'border-l-emerald-500 bg-emerald-50 hover:bg-emerald-100' :
          'border-l-red-500 bg-red-50 hover:bg-red-100'
      default:
        return 'border-l-gray-500 bg-gray-50 hover:bg-gray-100'
    }
  }

  const formatToolResult = (toolResult: ToolResult) => {
    if (!toolResult.success) {
      return (
        <div className="text-red-600 text-sm">
          <div className="font-medium">❌ Tool execution failed</div>
          <div className="text-xs mt-1">{toolResult.error}</div>
        </div>
      )
    }

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <div className="text-green-600 text-sm font-medium">✅ Tool executed successfully</div>
          {toolResult.executionTime && (
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Timer className="w-3 h-3" />
              <span>{toolResult.executionTime}ms</span>
            </div>
          )}
        </div>
        
        {/* Special formatting for different tool types */}
        {toolResult.data && (
          <div className="text-xs">
            {toolResult.data.properties && (
              <div className="bg-white rounded p-2 border">
                <div className="font-medium text-indigo-600 mb-1">
                  🏠 Found {toolResult.data.total_found} properties
                </div>
                {toolResult.data.properties.slice(0, 3).map((prop: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-600 mb-1">
                    • {prop.title} - NPR {prop.price.toLocaleString()}/{prop.priceType}
                  </div>
                ))}
              </div>
            )}
            
            {toolResult.data.organic_results && (
              <div className="bg-white rounded p-2 border">
                <div className="font-medium text-green-600 mb-1">
                  🔍 Search Results ({toolResult.data.total_results} found)
                </div>
                {toolResult.data.organic_results.slice(0, 2).map((result: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-600 mb-1">
                    • {result.title}
                  </div>
                ))}
              </div>
            )}
            
            {toolResult.data.places && (
              <div className="bg-white rounded p-2 border">
                <div className="font-medium text-red-600 mb-1">
                  🗺️ Location Analysis
                </div>
                {toolResult.data.places.map((place: any, idx: number) => (
                  <div key={idx} className="text-xs text-gray-600 mb-1">
                    • {place.name}: {place.commute_info}
                  </div>
                ))}
              </div>
            )}
            
            {toolResult.data.result !== undefined && (
              <div className="bg-white rounded p-2 border">
                <div className="font-medium text-purple-600 mb-1">
                  🧮 Calculation Result
                </div>
                <div className="text-xs text-gray-600">
                  {toolResult.data.expression} = {toolResult.data.formatted}
                </div>
                {toolResult.data.interpretation && (
                  <div className="text-xs text-blue-600 mt-1">
                    💡 {toolResult.data.interpretation}
                  </div>
                )}
              </div>
            )}
            
            {toolResult.data.market_overview && (
              <div className="bg-white rounded p-2 border">
                <div className="font-medium text-orange-600 mb-1">
                  📊 Market Analysis
                </div>
                <div className="text-xs text-gray-600">
                  {toolResult.data.market_overview.substring(0, 150)}...
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  const quickPrompts = [
    "I'm looking for a place to live in Kathmandu",
    "Find me a 2BHK apartment under NPR 30,000 in Lalitpur",
    "I'm an investor looking for high-ROI properties",
    "Show me commercial spaces in Thamel",
    "Calculate ROI for a property worth NPR 10,000,000 with NPR 60,000 monthly rent",
    "I want to list my house for rent"
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
            <h3 className="font-semibold text-lg">ReAct AI Assistant</h3>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Sparkles className="w-3 h-3" />
              <span>Reasoning + Acting Framework</span>
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
                    {message.isProcessing && (
                      <div className="mt-2 flex items-center space-x-2">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                        <span className="text-xs text-muted-foreground">Thinking step by step...</span>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* ReAct Steps */}
                {message.reactResponse && message.reactResponse.steps.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 text-sm font-medium text-muted-foreground">
                        <Brain className="w-4 h-4" />
                        <span>AI Reasoning Process</span>
                        <Badge variant="outline" className="text-xs">
                          {message.reactResponse.steps.length} steps
                        </Badge>
                      </div>
                      <div className="flex items-center space-x-2 text-xs text-muted-foreground">
                        <BarChart3 className="w-3 h-3" />
                        <span>
                          {message.reactResponse.steps.filter(s => s.type === 'thought').length} thoughts,{' '}
                          {message.reactResponse.steps.filter(s => s.type === 'action').length} actions,{' '}
                          {message.reactResponse.steps.filter(s => s.type === 'observation').length} observations
                        </span>
                      </div>
                    </div>
                    
                    {message.reactResponse.steps.map((step, index) => {
                      const key = `${message.id}-${index}`
                      const isExpanded = expandedSteps[key]
                      
                      return (
                        <Collapsible key={index} open={isExpanded} onOpenChange={() => toggleStepExpansion(message.id, index)}>
                          <CollapsibleTrigger asChild>
                            <Card className={`cursor-pointer transition-all duration-200 border-l-4 ${getStepColor(step)}`}>
                              <CardContent className="p-3">
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center space-x-2">
                                    {getStepIcon(step)}
                                    <span className="text-sm font-medium capitalize">{step.type}</span>
                                    {step.actionName && (
                                      <Badge variant="outline" className="text-xs">
                                        {step.actionName}
                                      </Badge>
                                    )}
                                    {step.toolResult?.executionTime && (
                                      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                        <Timer className="w-3 h-3" />
                                        <span>{step.toolResult.executionTime}ms</span>
                                      </div>
                                    )}
                                    <div className="flex items-center space-x-1 text-xs text-muted-foreground">
                                      <Clock className="w-3 h-3" />
                                      <span>{step.timestamp.toLocaleTimeString()}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    {step.toolResult && (
                                      <div className={`w-2 h-2 rounded-full ${step.toolResult.success ? 'bg-green-500' : 'bg-red-500'}`} />
                                    )}
                                    {isExpanded ? (
                                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                    )}
                                  </div>
                                </div>
                                {!isExpanded && (
                                  <p className="text-xs text-muted-foreground mt-1 truncate">
                                    {step.content.length > 100 ? `${step.content.substring(0, 100)}...` : step.content}
                                  </p>
                                )}
                              </CardContent>
                            </Card>
                          </CollapsibleTrigger>
                          <CollapsibleContent>
                            <Card className="mt-1 ml-6">
                              <CardContent className="p-3 space-y-3">
                                <div className="text-xs whitespace-pre-wrap text-muted-foreground font-mono">
                                  {step.content}
                                </div>
                                
                                {/* Tool Result Display */}
                                {step.toolResult && (
                                  <div className="border-t pt-2">
                                    {formatToolResult(step.toolResult)}
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          </CollapsibleContent>
                        </Collapsible>
                      )
                    })}

                    {message.reactResponse.needsClarification && (
                      <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
                        <CardContent className="p-3">
                          <div className="flex items-center space-x-2">
                            <HelpCircle className="w-4 h-4 text-yellow-600" />
                            <span className="text-sm font-medium text-yellow-800">Clarification Needed</span>
                          </div>
                          <p className="text-sm text-yellow-700 mt-1">
                            The AI needs more information to provide a complete answer.
                          </p>
                        </CardContent>
                      </Card>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Quick Prompts */}
      {messages.length === 1 && (
        <div className="p-4 border-t bg-gradient-to-r from-primary/5 to-accent/5">
          <p className="text-sm text-muted-foreground mb-3 font-medium">🚀 Try these ReAct-powered searches:</p>
          <div className="grid grid-cols-1 gap-2">
            {quickPrompts.map((prompt, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => setInputValue(prompt)}
                className="text-xs justify-start hover:bg-primary/5 hover:border-primary/20"
              >
                <Brain className="w-3 h-3 mr-2" />
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
          Powered by ReAct Framework • Gemini AI • Real-time Tools • Transparent Reasoning
        </div>
      </div>
    </div>
  )
}