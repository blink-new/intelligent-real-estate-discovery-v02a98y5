import { create } from 'zustand'
import { Property } from '@/types'

interface UserPreferences {
  intent: string
  householdType: string
  bedrooms?: number
  location: string
  amenities: string[]
  budget: number
  budgetType: 'rent' | 'buy'
}

interface SearchContext {
  query: string
  preferences?: UserPreferences
  timestamp: Date
  results?: Property[]
}

interface AppState {
  // Map state
  mapCenter: { lat: number; lng: number }
  zoomLevel: number
  activeListingId: string | null
  
  // UI state
  isFilterPanelOpen: boolean
  activeView: 'map' | 'list'
  mapProvider: 'google' | 'osm'
  
  // Search and conversation state
  searchHistory: SearchContext[]
  currentSearchContext: SearchContext | null
  userPreferences: UserPreferences | null
  
  // Properties state
  properties: Property[]
  allProperties: Property[]
  selectedProperty: Property | null
  propertiesLoading: boolean
  
  // Onboarding state
  showOnboarding: boolean
  onboardingCompleted: boolean
  
  // Actions
  setMapCenter: (center: { lat: number; lng: number }) => void
  setZoomLevel: (zoom: number) => void
  setActiveListing: (id: string | null) => void
  toggleFilterPanel: () => void
  setActiveView: (view: 'map' | 'list') => void
  setMapProvider: (provider: 'google' | 'osm') => void
  
  // Search actions
  addSearchContext: (context: SearchContext) => void
  setCurrentSearchContext: (context: SearchContext | null) => void
  setUserPreferences: (preferences: UserPreferences | null) => void
  
  // Properties actions
  setProperties: (properties: Property[]) => void
  setAllProperties: (properties: Property[]) => void
  setSelectedProperty: (property: Property | null) => void
  setPropertiesLoading: (loading: boolean) => void
  addProperty: (property: Property) => void
  
  // Onboarding actions
  setShowOnboarding: (show: boolean) => void
  setOnboardingCompleted: (completed: boolean) => void
  
  // Utility actions
  reset: () => void
  getSearchSummary: () => string
}

const initialState = {
  mapCenter: { lat: 27.7172, lng: 85.3240 }, // Default to Kathmandu
  zoomLevel: 12,
  activeListingId: null,
  isFilterPanelOpen: false,
  activeView: 'map' as const,
  mapProvider: 'google' as const,
  searchHistory: [],
  currentSearchContext: null,
  userPreferences: null,
  properties: [],
  allProperties: [],
  selectedProperty: null,
  propertiesLoading: false,
  showOnboarding: false,
  onboardingCompleted: false,
}

export const useAppStore = create<AppState>((set, get) => ({
  ...initialState,

  // Map actions
  setMapCenter: (center) => set({ mapCenter: center }),
  setZoomLevel: (zoom) => set({ zoomLevel: zoom }),
  setActiveListing: (id) => set({ activeListingId: id }),
  
  // UI actions
  toggleFilterPanel: () => set((state) => ({ isFilterPanelOpen: !state.isFilterPanelOpen })),
  setActiveView: (view) => set({ activeView: view }),
  setMapProvider: (provider) => set({ mapProvider: provider }),
  
  // Search actions
  addSearchContext: (context) => set((state) => ({
    searchHistory: [...state.searchHistory, context],
    currentSearchContext: context
  })),
  
  setCurrentSearchContext: (context) => set({ currentSearchContext: context }),
  
  setUserPreferences: (preferences) => set({ userPreferences: preferences }),
  
  // Properties actions
  setProperties: (properties) => set({ properties }),
  setAllProperties: (properties) => set({ allProperties: properties }),
  setSelectedProperty: (property) => set({ selectedProperty: property }),
  setPropertiesLoading: (loading) => set({ propertiesLoading: loading }),
  
  addProperty: (property) => set((state) => ({
    properties: [property, ...state.properties],
    allProperties: [property, ...state.allProperties]
  })),
  
  // Onboarding actions
  setShowOnboarding: (show) => set({ showOnboarding: show }),
  setOnboardingCompleted: (completed) => set({ onboardingCompleted: completed }),
  
  // Utility actions
  reset: () => set(initialState),
  
  getSearchSummary: () => {
    const state = get()
    const { userPreferences, searchHistory, currentSearchContext } = state
    
    let summary = ''
    
    if (userPreferences) {
      summary += `User Profile: Looking to ${userPreferences.intent} `
      if (userPreferences.bedrooms) {
        summary += `${userPreferences.bedrooms}BR `
      }
      summary += `in ${userPreferences.location} `
      summary += `with budget NPR ${userPreferences.budget.toLocaleString()} `
      if (userPreferences.amenities.length > 0) {
        summary += `preferring ${userPreferences.amenities.join(', ')} `
      }
      summary += '. '
    }
    
    if (currentSearchContext) {
      summary += `Current search: "${currentSearchContext.query}". `
    }
    
    if (searchHistory.length > 1) {
      const recentSearches = searchHistory.slice(-3).map(searchItem => `"${searchItem.query}"`)
      summary += `Previous searches: ${recentSearches.join(', ')}. `
    }
    
    return summary.trim()
  }
}))

export type { UserPreferences, SearchContext }