/* eslint-disable @typescript-eslint/no-use-before-define */
import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import { blink } from '@/lib/blink'
import { Property } from '@/types'
import { 
  X, 
  Upload, 
  MapPin, 
  DollarSign, 
  Home, 
  Bed, 
  Bath, 
  Square,
  Plus,
  Trash2,
  Check,
  Loader2,
  Sparkles
} from 'lucide-react'
import { toast } from '@/hooks/use-toast'

interface PropertyListingProps {
  onClose: () => void
  onPropertyListed?: (property: Property) => void
}

const AMENITIES_OPTIONS = [
  'Parking', 'WiFi', 'Security', 'Elevator', 'Gym', 'Swimming Pool',
  'Garden', 'Balcony', 'Terrace', 'AC', 'Heating', 'Laundry',
  'Furnished', 'Semi-Furnished', 'Water Tank', 'Solar', 'Generator'
]

const FEATURES_OPTIONS = [
  'City View', 'Mountain View', 'Garden View', 'Modern Kitchen', 
  'Spacious Rooms', 'High Ceilings', 'Natural Light', 'Quiet Area',
  'Family Friendly', 'Pet Friendly', 'Student Friendly', 'Executive Housing',
  'Traditional Architecture', 'Modern Design', 'Earthquake Resistant'
]

export function PropertyListing({ onClose, onPropertyListed }: PropertyListingProps) {
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    price: '',
    priceType: 'rent' as 'rent' | 'sale' | 'swap',
    propertyType: 'apartment' as 'apartment' | 'house' | 'commercial' | 'land',
    bedrooms: '',
    bathrooms: '',
    area: '',
    areaUnit: 'sqft' as 'sqft' | 'sqm',
    address: '',
    city: 'Kathmandu',
    district: 'Kathmandu',
    ownerName: '',
    ownerPhone: '',
    ownerEmail: '',
    amenities: [] as string[],
    features: [] as string[],
    images: [] as string[]
  })

  // Get user info
  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      if (state.user) {
        setUser(state.user)
        setFormData(prev => ({
          ...prev,
          ownerName: state.user.displayName || '',
          ownerEmail: state.user.email || ''
        }))
      }
    })
    return unsubscribe
  }, [])

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAmenityToggle = (amenity: string) => {
    setFormData(prev => ({
      ...prev,
      amenities: prev.amenities.includes(amenity)
        ? prev.amenities.filter(a => a !== amenity)
        : [...prev.amenities, amenity]
    }))
  }

  const handleFeatureToggle = (feature: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.includes(feature)
        ? prev.features.filter(f => f !== feature)
        : [...prev.features, feature]
    }))
  }

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (!files) return

    setLoading(true)
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const { publicUrl } = await blink.storage.upload(
          file,
          `properties/${user.id}/${Date.now()}-${file.name}`,
          { upsert: true }
        )
        return publicUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedUrls]
      }))
      
      toast({
        title: "Images uploaded successfully",
        description: `${uploadedUrls.length} image(s) added to your listing`
      })
    } catch (error) {
      console.error('Error uploading images:', error)
      toast({
        title: "Upload failed",
        description: "Failed to upload images. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const validateStep = (stepNumber: number): boolean => {
    switch (stepNumber) {
      case 1:
        return !!(formData.title && formData.description && formData.propertyType)
      case 2:
        return !!(formData.price && formData.area && formData.address)
      case 3:
        return !!(formData.ownerName && formData.ownerPhone && formData.ownerEmail)
      default:
        return true
    }
  }

  const handleNext = () => {
    if (validateStep(step)) {
      setStep(prev => prev + 1)
    } else {
      toast({
        title: "Please fill required fields",
        description: "All required fields must be completed before proceeding.",
        variant: "destructive"
      })
    }
  }

  const handleSubmit = async () => {
    if (!user) return

    setLoading(true)
    try {
      // Generate coordinates (in real app, use geocoding API)
      const coordinates = getCoordinatesForAddress(formData.address, formData.city)
      
      const propertyData = {
        id: `prop_${Date.now()}`,
        title: formData.title,
        description: formData.description,
        price: parseInt(formData.price),
        priceType: formData.priceType,
        propertyType: formData.propertyType,
        bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : null,
        bathrooms: formData.bathrooms ? parseInt(formData.bathrooms) : null,
        area: parseInt(formData.area),
        areaUnit: formData.areaUnit,
        address: formData.address,
        city: formData.city,
        district: formData.district,
        latitude: coordinates.lat,
        longitude: coordinates.lng,
        amenities: JSON.stringify(formData.amenities),
        images: JSON.stringify(formData.images),
        ownerId: user.id,
        ownerName: formData.ownerName,
        ownerPhone: formData.ownerPhone,
        ownerEmail: formData.ownerEmail,
        features: JSON.stringify(formData.features),
        nearbyPlaces: JSON.stringify({
          schools: [],
          hospitals: [],
          markets: [],
          transport: []
        }),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: 1,
        views: 0,
        userId: user.id
      }

      // Insert into database
      await blink.db.properties.create(propertyData)

      toast({
        title: "Property listed successfully!",
        description: "Your property is now live and visible to potential buyers/renters."
      })

      // Convert to Property type for callback
      const property: Property = {
        id: propertyData.id,
        title: propertyData.title,
        description: propertyData.description,
        price: propertyData.price,
        priceType: propertyData.priceType,
        propertyType: propertyData.propertyType,
        bedrooms: propertyData.bedrooms || undefined,
        bathrooms: propertyData.bathrooms || undefined,
        area: propertyData.area,
        areaUnit: propertyData.areaUnit,
        location: {
          address: propertyData.address,
          city: propertyData.city,
          district: propertyData.district,
          latitude: propertyData.latitude,
          longitude: propertyData.longitude
        },
        amenities: formData.amenities,
        images: formData.images,
        ownerId: propertyData.ownerId,
        ownerContact: {
          name: propertyData.ownerName,
          phone: propertyData.ownerPhone,
          email: propertyData.ownerEmail
        },
        features: formData.features,
        nearbyPlaces: {
          schools: [],
          hospitals: [],
          markets: [],
          transport: []
        },
        createdAt: propertyData.createdAt,
        updatedAt: propertyData.updatedAt,
        isActive: true,
        views: 0
      }

      onPropertyListed?.(property)
      onClose()
    } catch (error) {
      console.error('Error listing property:', error)
      toast({
        title: "Failed to list property",
        description: "There was an error listing your property. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Simple coordinate mapping for demo (in real app, use geocoding)
  const getCoordinatesForAddress = (address: string, city: string) => {
    const cityCoords: Record<string, { lat: number; lng: number }> = {
      'Kathmandu': { lat: 27.7172, lng: 85.3240 },
      'Lalitpur': { lat: 27.6588, lng: 85.3247 },
      'Bhaktapur': { lat: 27.6710, lng: 85.4298 },
      'Pokhara': { lat: 28.2096, lng: 83.9856 }
    }
    
    const baseCoords = cityCoords[city] || cityCoords['Kathmandu']
    // Add small random offset for demo
    return {
      lat: baseCoords.lat + (Math.random() - 0.5) * 0.01,
      lng: baseCoords.lng + (Math.random() - 0.5) * 0.01
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 flex-shrink-0">
          <div>
            <CardTitle className="text-2xl flex items-center space-x-2">
              <Sparkles className="w-6 h-6 text-primary" />
              <span>List Your Property</span>
            </CardTitle>
            <p className="text-muted-foreground mt-1">
              Step {step} of 4 - Let AI help you create the perfect listing
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </CardHeader>

        <div className="flex-1 min-h-0">
          <ScrollArea className="h-full">
            <CardContent className="space-y-6">
            {/* Progress Bar */}
            <div className="w-full bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${(step / 4) * 100}%` }}
              />
            </div>

            {/* Step 1: Basic Information */}
            {step === 1 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Basic Property Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <Label htmlFor="title">Property Title *</Label>
                      <Input
                        id="title"
                        placeholder="e.g., Modern 2BHK Apartment in Thamel"
                        value={formData.title}
                        onChange={(e) => handleInputChange('title', e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        placeholder="Describe your property, its features, and what makes it special..."
                        value={formData.description}
                        onChange={(e) => handleInputChange('description', e.target.value)}
                        rows={4}
                      />
                    </div>

                    <div>
                      <Label htmlFor="propertyType">Property Type *</Label>
                      <Select value={formData.propertyType} onValueChange={(value) => handleInputChange('propertyType', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="apartment">Apartment</SelectItem>
                          <SelectItem value="house">House</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                          <SelectItem value="land">Land</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="priceType">Listing Type *</Label>
                      <Select value={formData.priceType} onValueChange={(value) => handleInputChange('priceType', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="rent">For Rent</SelectItem>
                          <SelectItem value="sale">For Sale</SelectItem>
                          <SelectItem value="swap">For Swap</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Property Details */}
            {step === 2 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Property Details & Location</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="price">Price (NPR) *</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="price"
                          type="number"
                          placeholder="25000"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="area">Area *</Label>
                      <div className="flex space-x-2">
                        <div className="relative flex-1">
                          <Square className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            id="area"
                            type="number"
                            placeholder="800"
                            value={formData.area}
                            onChange={(e) => handleInputChange('area', e.target.value)}
                            className="pl-10"
                          />
                        </div>
                        <Select value={formData.areaUnit} onValueChange={(value) => handleInputChange('areaUnit', value)}>
                          <SelectTrigger className="w-20">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="sqft">sqft</SelectItem>
                            <SelectItem value="sqm">sqm</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    {formData.propertyType !== 'land' && (
                      <>
                        <div>
                          <Label htmlFor="bedrooms">Bedrooms</Label>
                          <div className="relative">
                            <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="bedrooms"
                              type="number"
                              placeholder="2"
                              value={formData.bedrooms}
                              onChange={(e) => handleInputChange('bedrooms', e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>

                        <div>
                          <Label htmlFor="bathrooms">Bathrooms</Label>
                          <div className="relative">
                            <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                              id="bathrooms"
                              type="number"
                              placeholder="2"
                              value={formData.bathrooms}
                              onChange={(e) => handleInputChange('bathrooms', e.target.value)}
                              className="pl-10"
                            />
                          </div>
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2">
                      <Label htmlFor="address">Address *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                          id="address"
                          placeholder="e.g., Thamel-26, Kathmandu"
                          value={formData.address}
                          onChange={(e) => handleInputChange('address', e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="city">City</Label>
                      <Select value={formData.city} onValueChange={(value) => handleInputChange('city', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Kathmandu">Kathmandu</SelectItem>
                          <SelectItem value="Lalitpur">Lalitpur</SelectItem>
                          <SelectItem value="Bhaktapur">Bhaktapur</SelectItem>
                          <SelectItem value="Pokhara">Pokhara</SelectItem>
                          <SelectItem value="Chitwan">Chitwan</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="district">District</Label>
                      <Input
                        id="district"
                        value={formData.district}
                        onChange={(e) => handleInputChange('district', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Contact Information */}
            {step === 3 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="ownerName">Your Name *</Label>
                      <Input
                        id="ownerName"
                        value={formData.ownerName}
                        onChange={(e) => handleInputChange('ownerName', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="ownerPhone">Phone Number *</Label>
                      <Input
                        id="ownerPhone"
                        placeholder="+977-9841234567"
                        value={formData.ownerPhone}
                        onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <Label htmlFor="ownerEmail">Email Address *</Label>
                      <Input
                        id="ownerEmail"
                        type="email"
                        value={formData.ownerEmail}
                        onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Amenities, Features & Images */}
            {step === 4 && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold mb-4">Amenities & Features</h3>
                  
                  <div className="space-y-6">
                    <div>
                      <Label className="text-base font-medium">Amenities</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {AMENITIES_OPTIONS.map((amenity) => (
                          <div key={amenity} className="flex items-center space-x-2">
                            <Checkbox
                              id={`amenity-${amenity}`}
                              checked={formData.amenities.includes(amenity)}
                              onCheckedChange={() => handleAmenityToggle(amenity)}
                            />
                            <Label htmlFor={`amenity-${amenity}`} className="text-sm">
                              {amenity}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base font-medium">Features</Label>
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2">
                        {FEATURES_OPTIONS.map((feature) => (
                          <div key={feature} className="flex items-center space-x-2">
                            <Checkbox
                              id={`feature-${feature}`}
                              checked={formData.features.includes(feature)}
                              onCheckedChange={() => handleFeatureToggle(feature)}
                            />
                            <Label htmlFor={`feature-${feature}`} className="text-sm">
                              {feature}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <Label className="text-base font-medium">Property Images</Label>
                      <div className="mt-2">
                        <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground mb-2">
                            Upload property images (JPG, PNG)
                          </p>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                          />
                          <Button
                            variant="outline"
                            onClick={() => document.getElementById('image-upload')?.click()}
                            disabled={loading}
                          >
                            {loading ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Uploading...
                              </>
                            ) : (
                              <>
                                <Plus className="w-4 h-4 mr-2" />
                                Choose Images
                              </>
                            )}
                          </Button>
                        </div>

                        {formData.images.length > 0 && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                            {formData.images.map((image, index) => (
                              <div key={index} className="relative group">
                                <img
                                  src={image}
                                  alt={`Property ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => removeImage(index)}
                                >
                                  <Trash2 className="w-3 h-3" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => step > 1 ? setStep(prev => prev - 1) : onClose()}
              >
                {step > 1 ? 'Previous' : 'Cancel'}
              </Button>

              {step < 4 ? (
                <Button onClick={handleNext} disabled={!validateStep(step)}>
                  Next
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Listing Property...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      List Property
                    </>
                  )}
                </Button>
              )}
            </div>
            </CardContent>
          </ScrollArea>
        </div>
      </Card>
    </div>
  )
}