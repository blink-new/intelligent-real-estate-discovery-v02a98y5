/* eslint-disable @typescript-eslint/no-use-before-define */
import { useState, useEffect, useCallback } from 'react'
import { Header } from '@/components/layout/Header'
import { ConversationalOnboarding } from '@/components/onboarding/ConversationalOnboarding'
import { ReActConversationalSearchWithMemory } from '@/components/search/ReActConversationalSearchWithMemory'
import { GoogleMap } from '@/components/map/GoogleMap'
import { InteractiveMap } from '@/components/map/InteractiveMap'
import { PropertyCard } from '@/components/property/PropertyCard'
import { PropertyListing } from '@/components/property/PropertyListing'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Property } from '@/types'
import { blink } from '@/lib/blink'
import { simplePropertyService } from '@/lib/simplePropertyService'
import { useAppStore } from '@/store/appStore'
import { 
  Map, 
  List, 
  Filter, 
  SortAsc, 
  MessageSquare, 
  Sparkles,
  MapPin,
  TrendingUp,
  Users,
  Clock,
  Loader2
} from 'lucide-react'

function App() {
  const {
    // State from store
    properties,
    allProperties,
    selectedProperty,
    activeView,
    mapProvider,
    propertiesLoading,
    showOnboarding,
    userPreferences,
    // Actions from store
    setProperties,
    setAllProperties,
    setSelectedProperty,
    setActiveView,
    setMapProvider,
    setPropertiesLoading,
    setShowOnboarding,
    setUserPreferences,
    addProperty
  } = useAppStore()

  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [showPropertyListing, setShowPropertyListing] = useState(false)

  // Define loadAllProperties function first
  const loadAllProperties = useCallback(async () => {
    setPropertiesLoading(true)
    try {
      const allProps = await simplePropertyService.getAllProperties()
      setAllProperties(allProps)
      setProperties(allProps)
    } catch (error) {
      console.error('Error loading properties:', error)
    } finally {
      setPropertiesLoading(false)
    }
  }, [setPropertiesLoading, setAllProperties, setProperties])

  // Auth state management
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user)
      setLoading(state.isLoading)
    })
    return unsubscribe
  }, [])

  // Load all properties when user is authenticated
  useEffect(() => {
    const checkUserOnboardingStatus = async () => {
      try {
        // Check if user has completed onboarding before
        const hasCompletedOnboarding = localStorage.getItem(`onboarding_completed_${user.id}`)
        if (!hasCompletedOnboarding) {
          setShowOnboarding(true)
        }
      } catch (error) {
        console.error('Error checking onboarding status:', error)
      }
    }

    if (user && !loading) {
      loadAllProperties()
      // Check if user is new (no preferences stored)
      checkUserOnboardingStatus()
    }
  }, [user, loading, setShowOnboarding, loadAllProperties])



  const handlePropertiesFound = (foundProperties: Property[]) => {
    setProperties(foundProperties)
    // Don't close search automatically to allow continued conversation
  }

  const handlePropertySelect = (property: Property) => {
    setSelectedProperty(property)
  }

  const handleAddProperty = () => {
    setShowPropertyListing(true)
  }

  const handlePropertyListed = (newProperty: Property) => {
    setAllProperties(prev => [newProperty, ...prev])
    setProperties(prev => [newProperty, ...prev])
  }

  const handleFavorite = (property: Property) => {
    // TODO: Implement favorite functionality
    console.log('Favorite property:', property.id)
  }

  const handleContact = (property: Property) => {
    // TODO: Implement contact functionality
    console.log('Contact for property:', property.id)
  }

  const handleOnboardingComplete = (preferences: any) => {
    setUserPreferences(preferences)
    setShowOnboarding(false)
    // Mark onboarding as completed
    localStorage.setItem(`onboarding_completed_${user.id}`, 'true')
    
    // Trigger search based on preferences
    if (preferences.location || preferences.intent) {
      const searchQuery = buildSearchQueryFromPreferences(preferences)
      // You can trigger the search here or pass to the search component
      console.log('Search query from onboarding:', searchQuery)
    }
  }

  const handleOnboardingSkip = () => {
    setShowOnboarding(false)
    // Mark as skipped but don't prevent showing again
  }

  const handleStartOnboarding = () => {
    setShowOnboarding(true)
  }

  const buildSearchQueryFromPreferences = (preferences: any) => {
    const parts = []
    
    if (preferences.intent === 'rent') {
      parts.push('looking for rental')
    } else if (preferences.intent === 'buy') {
      parts.push('looking to buy')
    }
    
    if (preferences.bedrooms) {
      parts.push(`${preferences.bedrooms} bedroom${preferences.bedrooms > 1 ? 's' : ''}`)
    }
    
    if (preferences.location) {
      parts.push(`in ${preferences.location}`)
    }
    
    if (preferences.budget) {
      const budgetType = preferences.budgetType === 'rent' ? 'monthly rent' : 'budget'
      parts.push(`${budgetType} around NPR ${preferences.budget.toLocaleString()}`)
    }
    
    if (preferences.amenities && preferences.amenities.length > 0) {
      parts.push(`with ${preferences.amenities.join(', ')}`)
    }
    
    return parts.join(' ')
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin className="w-6 h-6 text-white animate-pulse" />
          </div>
          <h2 className="text-xl font-semibold mb-2">RealEstate AI</h2>
          <p className="text-muted-foreground">Loading your property discovery platform...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/5 via-background to-accent/5 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-6">
              <Sparkles className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-bold mb-2">Welcome to RealEstate AI</h1>
            <p className="text-muted-foreground mb-6">
              Discover your perfect property in Nepal with AI-powered search and transparent recommendations.
            </p>
            <Button onClick={() => blink.auth.login()} className="w-full">
              Sign In to Get Started
            </Button>
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-primary">1000+</div>
                <div className="text-xs text-muted-foreground">Properties</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">50+</div>
                <div className="text-xs text-muted-foreground">Areas</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-primary">24/7</div>
                <div className="text-xs text-muted-foreground">AI Support</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        onAddProperty={handleAddProperty}
        onStartOnboarding={handleStartOnboarding}
        user={user}
      />

      <div className="relative h-[calc(100vh-4rem)]">
        {/* Main Content Layout */}
        <div className="flex h-full">
          {/* AI Chatbot Sidebar - Left */}
          <div className="w-96 border-r bg-white flex-shrink-0">
            <div className="h-full">
              <ReActConversationalSearchWithMemory
                onPropertiesFound={handlePropertiesFound}
                onClose={() => {}} // No close button needed in sidebar
              />
            </div>
          </div>

          {/* Map/Content Area - Center */}
          <div className="flex-1 relative min-w-0">
            {activeView === 'map' && properties.length > 0 ? (
              <div className="h-full relative">
                {mapProvider === 'google' ? (
                  <GoogleMap
                    properties={properties}
                    selectedProperty={selectedProperty}
                    onPropertySelect={handlePropertySelect}
                  />
                ) : (
                  <InteractiveMap
                    properties={properties}
                    selectedProperty={selectedProperty}
                    onPropertySelect={handlePropertySelect}
                  />
                )}
                
                {/* Map Provider Toggle */}
                <div className="absolute top-4 right-20 bg-white rounded-lg shadow-lg p-2 z-10">
                  <div className="flex items-center space-x-1">
                    <Button
                      variant={mapProvider === 'google' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMapProvider('google')}
                      className="text-xs"
                    >
                      Google
                    </Button>
                    <Button
                      variant={mapProvider === 'osm' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setMapProvider('osm')}
                      className="text-xs"
                    >
                      OpenStreet
                    </Button>
                  </div>
                </div>
              </div>
            ) : properties.length > 0 ? (
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onSelect={handlePropertySelect}
                      onFavorite={handleFavorite}
                      onContact={handleContact}
                    />
                  ))}
                </div>
              </div>
            ) : propertiesLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-4" />
                  <p className="text-muted-foreground">Loading properties...</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center max-w-md">
                  <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                    <MessageSquare className="w-10 h-10 text-primary" />
                  </div>
                  <h2 className="text-2xl font-bold mb-4">Welcome to RealEstate AI</h2>
                  <p className="text-muted-foreground mb-6">
                    Use the AI chatbot on the left to search for your perfect property in Nepal, 
                    or browse all available properties below.
                  </p>
                  <div className="flex justify-center">
                    <Button 
                      variant="outline" 
                      size="lg"
                      onClick={() => loadAllProperties()}
                      disabled={propertiesLoading}
                    >
                      {propertiesLoading ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        <>
                          <MapPin className="w-5 h-5 mr-2" />
                          Browse All Properties
                        </>
                      )}
                    </Button>
                  </div>

                  {/* Quick Stats */}
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
                        <TrendingUp className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-sm font-medium">Smart Matching</div>
                      <div className="text-xs text-muted-foreground">AI-powered recommendations</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
                        <Users className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-sm font-medium">Verified Owners</div>
                      <div className="text-xs text-muted-foreground">Direct contact</div>
                    </div>
                    <div className="text-center">
                      <div className="flex items-center justify-center w-12 h-12 bg-primary/10 rounded-full mx-auto mb-2">
                        <Clock className="w-6 h-6 text-primary" />
                      </div>
                      <div className="text-sm font-medium">Real-time Data</div>
                      <div className="text-xs text-muted-foreground">Always up to date</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Properties Sidebar - Right */}
          {properties.length > 0 && (
            <div className="w-96 border-l bg-white flex-shrink-0">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold">
                    {properties.length} Properties Found
                  </h2>
                  <div className="flex items-center space-x-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4 mr-1" />
                      Filter
                    </Button>
                    <Button variant="outline" size="sm">
                      <SortAsc className="w-4 h-4 mr-1" />
                      Sort
                    </Button>
                  </div>
                </div>

                <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'map' | 'list')}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="map" className="flex items-center space-x-1">
                      <Map className="w-4 h-4" />
                      <span>Map</span>
                    </TabsTrigger>
                    <TabsTrigger value="list" className="flex items-center space-x-1">
                      <List className="w-4 h-4" />
                      <span>List</span>
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <ScrollArea className="h-[calc(100vh-12rem)]">
                <div className="p-4 space-y-4">
                  {properties.map((property) => (
                    <PropertyCard
                      key={property.id}
                      property={property}
                      onSelect={handlePropertySelect}
                      onFavorite={handleFavorite}
                      onContact={handleContact}
                      className={selectedProperty?.id === property.id ? 'ring-2 ring-primary' : ''}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>
      </div>

      {/* Property Listing Modal */}
      {showPropertyListing && (
        <PropertyListing
          onClose={() => setShowPropertyListing(false)}
          onPropertyListed={handlePropertyListed}
        />
      )}

      {/* Conversational Onboarding Modal */}
      {showOnboarding && (
        <ConversationalOnboarding
          onComplete={handleOnboardingComplete}
          onSkip={handleOnboardingSkip}
        />
      )}
    </div>
  )
}

export default App