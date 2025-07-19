import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { MessageCircle, Send, Edit3, MapPin, DollarSign, Home, Heart, X } from 'lucide-react';
import { toast } from 'sonner';

interface ExtractedPreferences {
  location?: string[];
  budget?: { min?: number; max?: number };
  propertyType?: string[];
  mustHaves: string[];
  niceToHaves: string[];
  dealBreakers: string[];
}

interface ConversationMessage {
  type: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface SituationBasedSearchProps {
  onSearch: (preferences: ExtractedPreferences, narrative: string) => void;
}

const SituationBasedSearch: React.FC<SituationBasedSearchProps> = ({ onSearch }) => {
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [currentInput, setCurrentInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [extractedPreferences, setExtractedPreferences] = useState<ExtractedPreferences>({
    mustHaves: [],
    niceToHaves: [],
    dealBreakers: []
  });
  const [showPreferences, setShowPreferences] = useState(false);
  const [readyToSearch, setReadyToSearch] = useState(false);

  // Sample prompts to inspire users
  const samplePrompts = [
    "I'm relocating to Kathmandu for work and need a one-bedroom apartment near public transit, pet-friendly, with a flexible budget.",
    "My family is growing and we need a house with a garden in a quiet neighborhood, good schools nearby, budget around 50 lakhs.",
    "I'm a student looking for affordable shared accommodation near universities, with good internet and study space.",
    "We're newlyweds seeking a cozy apartment in a safe area, modern amenities, within 30 minutes of Thamel."
  ];

  const [currentSampleIndex, setCurrentSampleIndex] = useState(0);

  useEffect(() => {
    // Rotate sample prompts every 4 seconds
    const interval = setInterval(() => {
      setCurrentSampleIndex((prev) => (prev + 1) % samplePrompts.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [samplePrompts.length]);

  const startSession = async () => {
    try {
      const response = await fetch('https://v02a98y5--conversation-manager.functions.blink.new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'start_session',
          userId: 'anonymous' // TODO: Replace with actual user ID when auth is implemented
        })
      });

      const data = await response.json();
      setSessionId(data.sessionId);
      
      // Add welcome message to conversation
      setConversation([{
        type: 'assistant',
        content: data.message,
        timestamp: Date.now()
      }]);
    } catch (error) {
      console.error('Failed to start session:', error);
      toast.error('Failed to start conversation. Please try again.');
    }
  };

  const processInput = async (input: string) => {
    if (!sessionId || !input.trim()) return;

    setIsLoading(true);
    
    // Add user message to conversation
    const userMessage: ConversationMessage = {
      type: 'user',
      content: input,
      timestamp: Date.now()
    };
    setConversation(prev => [...prev, userMessage]);
    setCurrentInput('');

    try {
      const response = await fetch('https://v02a98y5--conversation-manager.functions.blink.new', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'process_input',
          sessionId,
          userInput: input
        })
      });

      const data = await response.json();
      
      // Add assistant response to conversation
      const assistantMessage: ConversationMessage = {
        type: 'assistant',
        content: data.message,
        timestamp: Date.now()
      };
      setConversation(prev => [...prev, assistantMessage]);

      // Update extracted preferences
      if (data.extractedPreferences) {
        setExtractedPreferences(data.extractedPreferences);
        setShowPreferences(true);
      }

      // Check if ready to search
      if (data.readyToSearch) {
        setReadyToSearch(true);
      }

    } catch (error) {
      console.error('Failed to process input:', error);
      toast.error('Failed to process your message. Please try again.');
      
      // Add error message to conversation
      setConversation(prev => [...prev, {
        type: 'assistant',
        content: "I'm sorry, I had trouble processing that. Could you try rephrasing your message?",
        timestamp: Date.now()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentInput.trim()) {
      processInput(currentInput);
    }
  };

  const handleSampleClick = (sample: string) => {
    setCurrentInput(sample);
  };

  const handleSearch = () => {
    if (readyToSearch && extractedPreferences) {
      const narrative = conversation
        .filter(msg => msg.type === 'user')
        .map(msg => msg.content)
        .join(' ');
      onSearch(extractedPreferences, narrative);
    }
  };

  const removePrefItem = (category: keyof ExtractedPreferences, item: string) => {
    setExtractedPreferences(prev => ({
      ...prev,
      [category]: Array.isArray(prev[category]) 
        ? (prev[category] as string[]).filter(i => i !== item)
        : prev[category]
    }));
  };

  // Initialize session on component mount
  useEffect(() => {
    startSession();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Main Conversation Interface */}
      <Card className="border-2 border-primary/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-full">
              <MessageCircle className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-xl">Tell Us Your Story</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Share your situation and what you're looking for in your next home
              </p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Conversation History */}
          {conversation.length > 0 && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {conversation.map((message, index) => (
                <div
                  key={index}
                  className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] p-3 rounded-lg ${
                      message.type === 'user'
                        ? 'bg-primary text-white'
                        : 'bg-muted text-foreground'
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className={`text-xs mt-1 ${
                      message.type === 'user' ? 'text-primary-foreground/70' : 'text-muted-foreground'
                    }`}>
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-muted p-3 rounded-lg">
                    <div className="flex items-center gap-2">
                      <div className="animate-pulse flex space-x-1">
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                      <span className="text-xs text-muted-foreground">Thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <Textarea
                value={currentInput}
                onChange={(e) => setCurrentInput(e.target.value)}
                placeholder={`Example: "${samplePrompts[currentSampleIndex]}"`}
                className="min-h-[100px] pr-12 resize-none"
                disabled={isLoading}
              />
              <Button
                type="submit"
                size="sm"
                className="absolute bottom-3 right-3"
                disabled={isLoading || !currentInput.trim()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Sample Prompts */}
            {conversation.length === 1 && (
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Try one of these examples:</p>
                <div className="flex flex-wrap gap-2">
                  {samplePrompts.slice(0, 2).map((sample, index) => (
                    <Button
                      key={index}
                      variant="outline"
                      size="sm"
                      className="text-xs h-auto py-2 px-3 text-left hover:bg-primary/5 hover:border-primary/20"
                      onClick={() => handleSampleClick(sample)}
                    >
                      "{sample.substring(0, 60)}..."
                    </Button>
                  ))}
                </div>
              </div>
            )}
          </form>
        </CardContent>
      </Card>

      {/* Extracted Preferences Summary */}
      {showPreferences && (
        <Card className="border border-amber-200 bg-amber-50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit3 className="h-4 w-4 text-amber-600" />
                <CardTitle className="text-lg text-amber-800">What We Understood</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowPreferences(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          
          <CardContent className="space-y-4">
            {/* Location */}
            {extractedPreferences.location && extractedPreferences.location.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Preferred Areas</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedPreferences.location.map((loc, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {loc}
                      <button onClick={() => removePrefItem('location', loc)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Budget */}
            {extractedPreferences.budget && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Budget Range</span>
                </div>
                <Badge variant="secondary">
                  {extractedPreferences.budget.min && `Rs. ${extractedPreferences.budget.min.toLocaleString()}`}
                  {extractedPreferences.budget.min && extractedPreferences.budget.max && ' - '}
                  {extractedPreferences.budget.max && `Rs. ${extractedPreferences.budget.max.toLocaleString()}`}
                </Badge>
              </div>
            )}

            {/* Property Type */}
            {extractedPreferences.propertyType && extractedPreferences.propertyType.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Home className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">Property Type</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedPreferences.propertyType.map((type, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {type}
                      <button onClick={() => removePrefItem('propertyType', type)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Must Haves */}
            {extractedPreferences.mustHaves.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-red-500" />
                  <span className="text-sm font-medium">Must Haves</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedPreferences.mustHaves.map((item, index) => (
                    <Badge key={index} variant="destructive" className="gap-1">
                      {item}
                      <button onClick={() => removePrefItem('mustHaves', item)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Nice to Haves */}
            {extractedPreferences.niceToHaves.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Heart className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Nice to Haves</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedPreferences.niceToHaves.map((item, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {item}
                      <button onClick={() => removePrefItem('niceToHaves', item)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Deal Breakers */}
            {extractedPreferences.dealBreakers.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <X className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium">Deal Breakers</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {extractedPreferences.dealBreakers.map((item, index) => (
                    <Badge key={index} variant="outline" className="border-red-200 text-red-700 gap-1">
                      {item}
                      <button onClick={() => removePrefItem('dealBreakers', item)}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {readyToSearch && (
              <>
                <Separator />
                <div className="flex justify-center">
                  <Button onClick={handleSearch} className="bg-primary hover:bg-primary/90">
                    Find My Perfect Home
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Helpful Tips */}
      {conversation.length <= 1 && (
        <Card className="border-dashed border-2 border-muted">
          <CardContent className="pt-6">
            <div className="text-center space-y-3">
              <h3 className="font-medium text-foreground">💡 Tips for Better Results</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-muted-foreground">
                <div className="space-y-2">
                  <p><strong>Share your story:</strong> Tell us about your life situation, work, family, or lifestyle</p>
                  <p><strong>Mention priorities:</strong> What matters most - location, budget, space, amenities?</p>
                </div>
                <div className="space-y-2">
                  <p><strong>Include constraints:</strong> Commute needs, pet requirements, accessibility needs</p>
                  <p><strong>Be specific:</strong> The more details you share, the better we can help</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SituationBasedSearch;