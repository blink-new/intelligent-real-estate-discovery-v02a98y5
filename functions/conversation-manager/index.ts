import { serve } from "https://deno.land/std@0.177.0/http/server.ts";

interface ConversationSession {
  id: string;
  userId?: string;
  situationNarrative: string;
  extractedPreferences: {
    location?: string[];
    budget?: { min?: number; max?: number };
    propertyType?: string[];
    mustHaves: string[];
    niceToHaves: string[];
    dealBreakers: string[];
  };
  clarificationHistory: Array<{
    question: string;
    answer: string;
    timestamp: number;
  }>;
  currentStep: 'initial' | 'clarifying' | 'searching' | 'refining';
  lastUpdated: number;
}

const sessions = new Map<string, ConversationSession>();

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  try {
    const { action, sessionId, userInput, userId } = await req.json();
    
    switch (action) {
      case 'start_session': {
        const newSessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const session: ConversationSession = {
          id: newSessionId,
          userId,
          situationNarrative: '',
          extractedPreferences: {
            mustHaves: [],
            niceToHaves: [],
            dealBreakers: []
          },
          clarificationHistory: [],
          currentStep: 'initial',
          lastUpdated: Date.now()
        };
        
        sessions.set(newSessionId, session);
        
        return new Response(JSON.stringify({
          sessionId: newSessionId,
          message: "Welcome! What's bringing you to your new home search? Share as much detail as you like about your situation and what you're looking for.",
          step: 'initial'
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'process_input': {
        const session = sessions.get(sessionId);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        // Call Gemini API to process the input
        const geminiResponse = await processWithGemini(userInput, session);
        
        // Update session with new information
        session.situationNarrative += (session.situationNarrative ? ' ' : '') + userInput;
        session.lastUpdated = Date.now();
        
        // Extract preferences from Gemini response
        if (geminiResponse.extractedPreferences) {
          session.extractedPreferences = {
            ...session.extractedPreferences,
            ...geminiResponse.extractedPreferences
          };
        }

        // Determine next step
        if (geminiResponse.needsClarification) {
          session.currentStep = 'clarifying';
        } else if (geminiResponse.readyToSearch) {
          session.currentStep = 'searching';
        }

        sessions.set(sessionId, session);

        return new Response(JSON.stringify({
          sessionId,
          message: geminiResponse.response,
          extractedPreferences: session.extractedPreferences,
          needsClarification: geminiResponse.needsClarification,
          clarificationQuestions: geminiResponse.clarificationQuestions,
          readyToSearch: geminiResponse.readyToSearch,
          step: session.currentStep
        }), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      case 'get_session': {
        const session = sessions.get(sessionId);
        if (!session) {
          return new Response(JSON.stringify({ error: 'Session not found' }), {
            status: 404,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        return new Response(JSON.stringify(session), {
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
    }
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }
});

async function processWithGemini(userInput: string, session: ConversationSession) {
  const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
  
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY not found');
  }

  const prompt = `
You are an AI assistant helping users find their ideal home in Nepal (Kathmandu Valley). 
Analyze the user's situation and extract structured preferences while maintaining a conversational tone.

Current conversation context:
- Previous narrative: "${session.situationNarrative}"
- Current step: ${session.currentStep}
- Current preferences: ${JSON.stringify(session.extractedPreferences)}

User's latest input: "${userInput}"

Please respond with a JSON object containing:
{
  "response": "Your conversational response to the user",
  "extractedPreferences": {
    "location": ["area names if mentioned"],
    "budget": {"min": number, "max": number},
    "propertyType": ["apartment", "house", etc.],
    "mustHaves": ["features that are non-negotiable"],
    "niceToHaves": ["preferred but flexible features"],
    "dealBreakers": ["things to avoid"]
  },
  "needsClarification": boolean,
  "clarificationQuestions": ["specific questions to ask if clarification needed"],
  "readyToSearch": boolean
}

Guidelines:
- Be empathetic and conversational
- Ask follow-up questions naturally when important details are missing
- Focus on understanding their life situation, not just property features
- Consider commute needs, lifestyle, family situation, pets, etc.
- Mark readyToSearch as true only when you have enough info for meaningful property recommendations
`;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        }
      })
    });

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
    // Try to parse JSON from the response
    try {
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error('Failed to parse Gemini JSON response:', parseError);
    }

    // Fallback response if JSON parsing fails
    return {
      response: generatedText || "I'd love to help you find the perfect home! Could you tell me more about your situation?",
      extractedPreferences: {},
      needsClarification: true,
      clarificationQuestions: ["What type of property are you looking for?", "What's your budget range?", "Which areas of Kathmandu are you considering?"],
      readyToSearch: false
    };

  } catch (error) {
    console.error('Gemini API error:', error);
    return {
      response: "I'm here to help you find your ideal home! Could you share more details about what you're looking for?",
      extractedPreferences: {},
      needsClarification: true,
      clarificationQuestions: ["What brings you to your home search?"],
      readyToSearch: false
    };
  }
}