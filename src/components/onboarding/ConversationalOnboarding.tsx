/* eslint-disable @typescript-eslint/no-use-before-define */
import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Slider } from '@/components/ui/slider'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { blink } from '@/lib/blink'
import { useAppStore, UserPreferences } from '@/store/appStore'
import { 
  Bot, 
  User, 
  Sparkles, 
  ArrowRight, 
  Edit3,
  Home,
  Search,
  TrendingUp,
  Users,
  Heart,
  Car,
  Leaf,
  Sofa,
  Accessibility,
  Dumbbell,
  Wifi,
  Shield,
  MapPin,
  Loader2
} from 'lucide-react'

interface OnboardingStep {
  id: string
  type: 'welcome' | 'choice' | 'text' | 'slider' | 'tags' | 'summary'
  question: string
  options?: Array<{
    id: string
    label: string
    icon?: string
    emoji?: string
  }>
  placeholder?: string
  min?: number
  max?: number
  unit?: string
  maxSelections?: number
}



interface ConversationalOnboardingProps {
  onComplete: (preferences: UserPreferences) => void
  onSkip: () => void
}

export function ConversationalOnboarding({ onComplete, onSkip }: ConversationalOnboardingProps) {
  const { setUserPreferences, addSearchContext } = useAppStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [preferences, setPreferences] = useState<Partial<UserPreferences>>({})
  const [isGeneratingQuestion, setIsGeneratingQuestion] = useState(false)
  const [steps, setSteps] = useState<OnboardingStep[]>([])
  const [chatHistory, setChatHistory] = useState<Array<{
    role: 'user' | 'assistant'
    content: string
    timestamp: Date
  }>>([])
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initialize with welcome step
  useEffect(() => {
    initializeOnboarding()
  }, [])

  // Auto-scroll to bottom when chat updates
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [chatHistory, currentStep])

  const initializeOnboarding = async () => {
    const welcomeStep: OnboardingStep = {
      id: 'welcome',
      type: 'welcome',
      question: "Let's find your perfect place.",
    }

    const intentStep: OnboardingStep = {
      id: 'intent',
      type: 'choice',
      question: "Welcome! To start, what brings you here today?",
      options: [
        { id: 'rent', label: "I'm looking for a place to rent", emoji: '🔍' },
        { id: 'buy', label: "I'm looking to buy a home", emoji: '🏠' },
        { id: 'invest', label: "I'm exploring investment properties", emoji: '📈' },
        { id: 'list', label: "I want to list my property", emoji: '✍️' }
      ]
    }

    setSteps([welcomeStep, intentStep])
    setChatHistory([{
      role: 'assistant',
      content: "Hi! I'm your AI property assistant. I'll help you find the perfect place by asking a few quick questions. No long forms, I promise! 😊",
      timestamp: new Date()
    }])
  }

  const generateNextQuestion = async (userResponse: string, currentPrefs: Partial<UserPreferences>) => {
    setIsGeneratingQuestion(true)
    
    try {
      const context = {
        currentPreferences: currentPrefs,
        chatHistory: chatHistory.slice(-6), // Last 6 messages for context
        userResponse,
        stepNumber: currentStep + 1
      }

      const prompt = `
You are an expert real estate onboarding assistant for Nepal's property market. Based on the user's response and current preferences, generate the next logical question in the onboarding flow.

Current Context:
- User Response: "${userResponse}"
- Current Preferences: ${JSON.stringify(currentPrefs)}
- Step Number: ${context.stepNumber}

Guidelines:
1. Ask ONE focused question at a time
2. Use dynamic branching based on previous answers
3. Keep questions conversational and friendly
4. For Nepal context: focus on Kathmandu Valley areas
5. Use appropriate input types: choice, text, slider, or tags

Generate the next question with this structure:
{
  "question": "The question text",
  "type": "choice|text|slider|tags",
  "options": [...] // if type is choice or tags
  "placeholder": "..." // if type is text
  "min": 0, "max": 100, "unit": "NPR" // if type is slider
  "maxSelections": 3 // if type is tags
}

Common question flow:
1. Intent (rent/buy/invest/list)
2. Household type (solo/couple/family/roommates) 
3. Bedrooms (if family selected)
4. Location preferences (text input)
5. Must-have amenities (tags)
6. Budget (slider)
7. Summary

Focus on Nepal real estate context and local areas like Thamel, Lalitpur, Patan, etc.
`

      const response = await blink.ai.generateObject({
        prompt,
        schema: {
          type: 'object',
          properties: {
            question: { type: 'string' },
            type: { type: 'string', enum: ['choice', 'text', 'slider', 'tags', 'summary'] },
            options: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  id: { type: 'string' },
                  label: { type: 'string' },
                  emoji: { type: 'string' }
                }
              }
            },
            placeholder: { type: 'string' },
            min: { type: 'number' },
            max: { type: 'number' },
            unit: { type: 'string' },
            maxSelections: { type: 'number' }
          },
          required: ['question', 'type']
        }
      })

      const nextStep: OnboardingStep = {
        id: `step-${Date.now()}`,
        ...response.object
      }

      setSteps(prev => [...prev, nextStep])
      
    } catch (error) {
      console.error('Error generating next question:', error)
      // Fallback to predefined questions
      generateFallbackQuestion(currentPrefs)
    } finally {
      setIsGeneratingQuestion(false)
    }
  }

  const generateFallbackQuestion = (currentPrefs: Partial<UserPreferences>) => {
    let nextStep: OnboardingStep

    if (!currentPrefs.householdType) {
      nextStep = {
        id: 'household',
        type: 'choice',
        question: "Great! Who will be living there?",
        options: [
          { id: 'solo', label: 'Just me', emoji: '👤' },
          { id: 'couple', label: 'Me and a partner', emoji: '💑' },
          { id: 'family', label: 'A family with kids', emoji: '👨‍👩‍👧‍👦' },
          { id: 'roommates', label: 'Roommates', emoji: '👥' }
        ]
      }
    } else if (!currentPrefs.location) {
      nextStep = {
        id: 'location',
        type: 'text',
        question: "Do you have a specific area in mind? You can type a neighborhood, or tell me about your commute.",
        placeholder: "e.g., 'Thamel', 'near my office in Patan', or 'somewhere quiet'"
      }
    } else if (!currentPrefs.amenities) {
      nextStep = {
        id: 'amenities',
        type: 'tags',
        question: "Let's talk priorities. What are your absolute must-haves? (Select up to 3)",
        maxSelections: 3,
        options: [
          { id: 'pet-friendly', label: 'Pet-Friendly', emoji: '🐾' },
          { id: 'parking', label: 'Parking Included', emoji: '🚗' },
          { id: 'balcony', label: 'Balcony or Garden', emoji: '🌿' },
          { id: 'furnished', label: 'Furnished', emoji: '🛋️' },
          { id: 'accessible', label: 'Accessible', emoji: '♿' },
          { id: 'gym', label: 'Gym Access', emoji: '🏋️' },
          { id: 'wifi', label: 'High-Speed Internet', emoji: '📶' },
          { id: 'security', label: '24/7 Security', emoji: '🛡️' }
        ]
      }
    } else if (!currentPrefs.budget) {
      const isRent = currentPrefs.intent === 'rent'
      nextStep = {
        id: 'budget',
        type: 'slider',
        question: `Last key question: What's your monthly ${isRent ? 'rental' : 'purchase'} budget?`,
        min: isRent ? 15000 : 5000000,
        max: isRent ? 100000 : 50000000,
        unit: 'NPR'
      }
    } else {
      nextStep = {
        id: 'summary',
        type: 'summary',
        question: "Perfect! Let me summarize what you're looking for:"
      }
    }

    setSteps(prev => [...prev, nextStep])
  }

  const handleStepResponse = async (response: any) => {
    const currentStepData = steps[currentStep]
    let userMessage = ''

    // Create updated preferences based on step type
    const newPreferences = (() => {
      const updated = { ...preferences }
      
      switch (currentStepData.id) {
        case 'intent':
          updated.intent = response
          updated.budgetType = response === 'rent' ? 'rent' : 'buy'
          userMessage = currentStepData.options?.find(opt => opt.id === response)?.label || response
          break
        case 'household':
          updated.householdType = response
          userMessage = currentStepData.options?.find(opt => opt.id === response)?.label || response
          // Auto-generate bedroom question for families
          if (response === 'family') {
            setTimeout(() => {
              const bedroomStep: OnboardingStep = {
                id: 'bedrooms',
                type: 'choice',
                question: "Got it. How many bedrooms do you think you'll need?",
                options: [
                  { id: '1', label: '1 bedroom', emoji: '1️⃣' },
                  { id: '2', label: '2 bedrooms', emoji: '2️⃣' },
                  { id: '3', label: '3 bedrooms', emoji: '3️⃣' },
                  { id: '4', label: '4+ bedrooms', emoji: '4️⃣' }
                ]
              }
              setSteps(prev => [...prev, bedroomStep])
            }, 500)
          }
          break
        case 'bedrooms':
          updated.bedrooms = parseInt(response)
          userMessage = `${response} bedroom${response !== '1' ? 's' : ''}`
          break
        case 'location':
          updated.location = response
          userMessage = response
          break
        case 'amenities':
          updated.amenities = response
          userMessage = response.map((id: string) => 
            currentStepData.options?.find(opt => opt.id === id)?.label
          ).join(', ')
          break
        case 'budget':
          updated.budget = response
          userMessage = `NPR ${response.toLocaleString()}`
          break
        default:
          if (currentStepData.type === 'choice') {
            userMessage = currentStepData.options?.find(opt => opt.id === response)?.label || response
          } else {
            userMessage = Array.isArray(response) ? response.join(', ') : response.toString()
          }
      }
      
      return updated
    })()

    setPreferences(newPreferences)

    // Add user message to chat
    setChatHistory(prev => [...prev, {
      role: 'user',
      content: userMessage,
      timestamp: new Date()
    }])

    // Move to next step or generate one
    if (currentStep + 1 < steps.length) {
      setCurrentStep(currentStep + 1)
    } else if (currentStepData.type !== 'summary') {
      await generateNextQuestion(userMessage, newPreferences)
      setCurrentStep(currentStep + 1)
    }

    // Add AI response
    setTimeout(() => {
      if (currentStepData.type !== 'summary') {
        setChatHistory(prev => [...prev, {
          role: 'assistant',
          content: steps[currentStep + 1]?.question || "Let me think of the next question...",
          timestamp: new Date()
        }])
      }
    }, 800)
  }

  const handleComplete = () => {
    if (preferences.intent && preferences.householdType && preferences.location) {
      const completePreferences = preferences as UserPreferences
      
      // Store preferences in global state
      setUserPreferences(completePreferences)
      
      // Create initial search context from preferences
      const searchQuery = buildSearchQueryFromPreferences(completePreferences)
      addSearchContext({
        query: searchQuery,
        preferences: completePreferences,
        timestamp: new Date()
      })
      
      onComplete(completePreferences)
    }
  }

  const buildSearchQueryFromPreferences = (prefs: UserPreferences) => {
    const parts = []
    
    if (prefs.intent === 'rent') {
      parts.push('looking for rental')
    } else if (prefs.intent === 'buy') {
      parts.push('looking to buy')
    }
    
    if (prefs.bedrooms) {
      parts.push(`${prefs.bedrooms} bedroom${prefs.bedrooms > 1 ? 's' : ''}`)
    }
    
    if (prefs.location) {
      parts.push(`in ${prefs.location}`)
    }
    
    if (prefs.budget) {
      const budgetType = prefs.budgetType === 'rent' ? 'monthly rent' : 'budget'
      parts.push(`${budgetType} around NPR ${prefs.budget.toLocaleString()}`)
    }
    
    if (prefs.amenities && prefs.amenities.length > 0) {
      parts.push(`with ${prefs.amenities.join(', ')}`)
    }
    
    return parts.join(' ')
  }

  const handleEdit = (stepId: string) => {
    const stepIndex = steps.findIndex(step => step.id === stepId)
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex)
    }
  }

  const currentStepData = steps[currentStep]
  const progress = Math.min((currentStep / Math.max(steps.length - 1, 1)) * 100, 100)

  if (!currentStepData) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <CardContent className="p-0 flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b flex-shrink-0">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold">Find Your Perfect Place</h2>
                  <p className="text-sm text-muted-foreground">AI-powered property discovery</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={onSkip}>
                Skip for now
              </Button>
            </div>
            
            {currentStepData.type !== 'welcome' && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}
          </div>

          {/* Chat Area */}
          <div className="flex-1 min-h-0">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-4">
                {chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`flex items-start space-x-2 max-w-[80%] ${
                      message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                    }`}>
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                        message.role === 'user' 
                          ? 'bg-primary text-white' 
                          : 'bg-muted text-muted-foreground'
                      }`}>
                        {message.role === 'user' ? (
                          <User className="w-4 h-4" />
                        ) : (
                          <Bot className="w-4 h-4" />
                        )}
                      </div>
                      <div className={`rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-white'
                          : 'bg-muted'
                      }`}>
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      </div>
                    </div>
                  </div>
                ))}

                {isGeneratingQuestion && (
                  <div className="flex justify-start">
                    <div className="flex items-start space-x-2 max-w-[80%]">
                      <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                        <Bot className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Thinking of the next question...</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={scrollRef} />
              </div>
            </ScrollArea>
          </div>

          {/* Input Area */}
          {currentStepData && !isGeneratingQuestion && (
            <div className="p-6 border-t flex-shrink-0">
              {currentStepData.type === 'welcome' && (
                <div className="text-center space-y-4">
                  <p className="text-muted-foreground">
                    Answer a few quick questions, and I'll find personalized listings for you. No long forms, I promise!
                  </p>
                  <Button onClick={() => setCurrentStep(1)} size="lg" className="w-full">
                    Let's Get Started
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              )}

              {currentStepData.type === 'choice' && (
                <div className="space-y-3">
                  <p className="font-medium">{currentStepData.question}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {currentStepData.options?.map((option) => (
                      <Button
                        key={option.id}
                        variant="outline"
                        className="justify-start h-auto p-4 text-left"
                        onClick={() => handleStepResponse(option.id)}
                      >
                        <span className="text-lg mr-3">{option.emoji}</span>
                        <span>{option.label}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {currentStepData.type === 'text' && (
                <div className="space-y-3">
                  <p className="font-medium">{currentStepData.question}</p>
                  <div className="flex space-x-2">
                    <Input
                      placeholder={currentStepData.placeholder}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                          handleStepResponse(e.currentTarget.value.trim())
                          e.currentTarget.value = ''
                        }
                      }}
                      className="flex-1"
                    />
                    <Button
                      onClick={(e) => {
                        const input = e.currentTarget.previousElementSibling as HTMLInputElement
                        if (input.value.trim()) {
                          handleStepResponse(input.value.trim())
                          input.value = ''
                        }
                      }}
                    >
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}

              {currentStepData.type === 'tags' && (
                <TagSelector
                  question={currentStepData.question}
                  options={currentStepData.options || []}
                  maxSelections={currentStepData.maxSelections || 3}
                  onSelect={handleStepResponse}
                />
              )}

              {currentStepData.type === 'slider' && (
                <BudgetSlider
                  question={currentStepData.question}
                  min={currentStepData.min || 0}
                  max={currentStepData.max || 100}
                  unit={currentStepData.unit || ''}
                  onSelect={handleStepResponse}
                />
              )}

              {currentStepData.type === 'summary' && (
                <div className="max-h-96 overflow-y-auto">
                  <SummaryStep
                    preferences={preferences}
                    onEdit={handleEdit}
                    onComplete={handleComplete}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// Tag Selector Component
function TagSelector({ 
  question, 
  options, 
  maxSelections, 
  onSelect 
}: {
  question: string
  options: Array<{ id: string; label: string; emoji?: string }>
  maxSelections: number
  onSelect: (selected: string[]) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  const toggleSelection = (id: string) => {
    setSelected(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id)
      } else if (prev.length < maxSelections) {
        return [...prev, id]
      }
      return prev
    })
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{question}</p>
      <div className="grid grid-cols-2 gap-2">
        {options.map((option) => (
          <Button
            key={option.id}
            variant={selected.includes(option.id) ? "default" : "outline"}
            className="justify-start h-auto p-3 text-left"
            onClick={() => toggleSelection(option.id)}
            disabled={!selected.includes(option.id) && selected.length >= maxSelections}
          >
            <span className="text-lg mr-2">{option.emoji}</span>
            <span className="text-sm">{option.label}</span>
          </Button>
        ))}
      </div>
      {selected.length > 0 && (
        <div className="flex justify-between items-center">
          <p className="text-sm text-muted-foreground">
            {selected.length}/{maxSelections} selected
          </p>
          <Button onClick={() => onSelect(selected)}>
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      )}
    </div>
  )
}

// Budget Slider Component
function BudgetSlider({
  question,
  min,
  max,
  unit,
  onSelect
}: {
  question: string
  min: number
  max: number
  unit: string
  onSelect: (value: number) => void
}) {
  const [value, setValue] = useState([min + (max - min) * 0.3])
  const [customValue, setCustomValue] = useState('')

  const formatValue = (val: number) => {
    if (unit === 'NPR') {
      return `NPR ${val.toLocaleString()}`
    }
    return `${val} ${unit}`
  }

  return (
    <div className="space-y-4">
      <p className="font-medium">{question}</p>
      
      <div className="space-y-4">
        <div className="px-2">
          <Slider
            value={value}
            onValueChange={setValue}
            max={max}
            min={min}
            step={unit === 'NPR' ? (max > 1000000 ? 100000 : 1000) : 1}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-muted-foreground mt-2">
            <span>{formatValue(min)}</span>
            <span className="font-medium text-foreground">{formatValue(value[0])}</span>
            <span>{formatValue(max)}+</span>
          </div>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          Or enter a specific amount:
        </div>

        <div className="flex space-x-2">
          <Input
            placeholder={`e.g., ${unit === 'NPR' ? '45000' : '50'}`}
            value={customValue}
            onChange={(e) => setCustomValue(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && customValue) {
                const numValue = parseInt(customValue.replace(/,/g, ''))
                if (!isNaN(numValue)) {
                  onSelect(numValue)
                }
              }
            }}
          />
          <Button
            onClick={() => {
              if (customValue) {
                const numValue = parseInt(customValue.replace(/,/g, ''))
                if (!isNaN(numValue)) {
                  onSelect(numValue)
                }
              } else {
                onSelect(value[0])
              }
            }}
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  )
}

// Summary Step Component
function SummaryStep({
  preferences,
  onEdit,
  onComplete
}: {
  preferences: Partial<UserPreferences>
  onEdit: (stepId: string) => void
  onComplete: () => void
}) {
  const formatBudget = (budget: number, type: string) => {
    const formatted = `NPR ${budget.toLocaleString()}`
    return type === 'rent' ? `${formatted}/month` : formatted
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg mb-4">Perfect! Let's recap what you're looking for:</h3>
        
        <div className="space-y-3">
          {preferences.intent && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  {preferences.intent === 'rent' ? '🔍' : preferences.intent === 'buy' ? '🏠' : '📈'}
                </div>
                <div>
                  <p className="font-medium">Looking to {preferences.intent}</p>
                  <p className="text-sm text-muted-foreground">Property search intent</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit('intent')}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {preferences.householdType && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  👥
                </div>
                <div>
                  <p className="font-medium">{preferences.householdType === 'solo' ? 'Just me' : 
                    preferences.householdType === 'couple' ? 'Me and a partner' :
                    preferences.householdType === 'family' ? 'Family with kids' : 'Roommates'}</p>
                  {preferences.bedrooms && (
                    <p className="text-sm text-muted-foreground">{preferences.bedrooms} bedroom{preferences.bedrooms !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit('household')}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {preferences.location && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{preferences.location}</p>
                  <p className="text-sm text-muted-foreground">Preferred location</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit('location')}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {preferences.amenities && preferences.amenities.length > 0 && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  ⭐
                </div>
                <div>
                  <p className="font-medium">Must-have amenities</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {preferences.amenities.slice(0, 3).map((amenity, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {amenity}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit('amenities')}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}

          {preferences.budget && (
            <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                  💰
                </div>
                <div>
                  <p className="font-medium">{formatBudget(preferences.budget, preferences.budgetType || 'rent')}</p>
                  <p className="text-sm text-muted-foreground">Budget range</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={() => onEdit('budget')}>
                <Edit3 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <Button onClick={onComplete} size="lg" className="w-full">
        <Sparkles className="w-5 h-5 mr-2" />
        Show Me My Matches!
      </Button>
    </div>
  )
}