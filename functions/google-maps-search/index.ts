import { serve } from "https://deno.land/std@0.177.0/http/server.ts"

serve(async (req) => {
  // Handle CORS for frontend calls
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }

  try {
    const { query } = await req.json()
    
    if (!query) {
      return new Response(JSON.stringify({ error: 'Query parameter is required' }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    const apiKey = Deno.env.get('GOOGLE_MAPS_API_KEY')
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'Google Maps API key not configured' }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      })
    }

    // Use Google Places API to search for locations
    const placesUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${apiKey}`
    
    const response = await fetch(placesUrl)
    const data = await response.json()

    if (!response.ok) {
      throw new Error(`Google Maps API error: ${data.error_message || response.statusText}`)
    }

    // Transform the response to our format
    const places = data.results?.slice(0, 5).map((place: any) => ({
      name: place.name,
      address: place.formatted_address,
      coordinates: {
        lat: place.geometry.location.lat,
        lng: place.geometry.location.lng
      },
      rating: place.rating,
      types: place.types,
      place_id: place.place_id,
      nearby_amenities: place.types.filter((type: string) => 
        ['school', 'hospital', 'shopping_mall', 'restaurant', 'bank', 'pharmacy'].includes(type)
      ),
      commute_info: 'Location data available via Google Maps',
      infrastructure: place.business_status === 'OPERATIONAL' ? 'Active location' : 'Location status unknown'
    })) || []

    // Add some Nepal-specific context if the query is about Nepal locations
    const isNepalQuery = query.toLowerCase().includes('nepal') || 
                        query.toLowerCase().includes('kathmandu') || 
                        query.toLowerCase().includes('lalitpur') || 
                        query.toLowerCase().includes('bhaktapur')

    let contextualInfo = {}
    if (isNepalQuery) {
      contextualInfo = {
        market_context: {
          currency: 'NPR',
          typical_rent_range: '10,000-100,000 NPR/month',
          popular_areas: ['Thamel', 'Lalitpur', 'Pulchowk', 'New Road', 'Baneshwor'],
          infrastructure_notes: 'Kathmandu Valley has good connectivity, ongoing road development projects'
        }
      }
    }

    const result = {
      query: query,
      places: places,
      total_results: data.results?.length || 0,
      ...contextualInfo
    }

    return new Response(JSON.stringify(result), {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })

  } catch (error) {
    console.error('Google Maps search error:', error)
    
    return new Response(JSON.stringify({ 
      error: 'Failed to search locations',
      details: error.message 
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
    })
  }
})