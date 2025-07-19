import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Brain,
  MessageSquare,
  Loader2
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
    setInputValue('')
    setIsLoading(true)

    try {
      // Use Blink AI to process the query
      const response = await blink.ai.generateText({
        prompt: `You are a helpful real estate assistant for Nepal. The user is asking: "${inputValue}"

Please provide a helpful response about real estate in Nepal, focusing on:
- Property search and recommendations
- Market insights for Kathmandu Valley
- Rental and purchase guidance
- Investment advice

Keep your response conversational and helpful. If they're looking for specific properties, acknowledge their request and suggest they can browse available properties.`,
        maxTokens: 300
      })

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.text,
        timestamp: new Date().toISOString()
      }

      setMessages(prev => [...prev, assistantMessage])

      // If the query seems to be about finding properties, trigger property search
      if (inputValue.toLowerCase().includes('find') || 
          inputValue.toLowerCase().includes('search') || 
          inputValue.toLowerCase().includes('looking for') ||
          inputValue.toLowerCase().includes('apartment') ||
          inputValue.toLowerCase().includes('house') ||
          inputValue.toLowerCase().includes('property') ||
          inputValue.toLowerCase().includes('rent') ||
          inputValue.toLowerCase().includes('buy')) {
        
        // Search for actual properties
        setTimeout(async () => {
          try {
            const foundProperties = await simplePropertyService.searchProperties(inputValue)
            if (foundProperties.length > 0) {
              onPropertiesFound(foundProperties)
            }
          } catch (error) {
            console.error('Error searching properties:', error)
          }
        }, 1000)
      }

    } catch (error) {
      console.error('Error processing query:', error)
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "I apologize, but I encountered an error while processing your request. Please try again or rephrase your question.",
        timestamp: new Date().toISOString()
      }
      setMessages(prev => [...prev, errorMessage])
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