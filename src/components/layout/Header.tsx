import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Badge } from '@/components/ui/badge'
import { Search, MapPin, User, Settings, LogOut, Plus, Heart, MessageSquare } from 'lucide-react'
import { blink } from '@/lib/blink'

interface HeaderProps {
  onAddProperty: () => void
  onStartOnboarding?: () => void
  user: any
}

export function Header({ onAddProperty, onStartOnboarding, user }: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const handleLogout = () => {
    blink.auth.logout()
  }

  return (
    <header className="bg-white border-b border-border shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">RealEstate AI</h1>
                <p className="text-xs text-muted-foreground">Nepal Property Discovery</p>
              </div>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Use the AI chatbot on the left to search properties"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                disabled
                className="pl-10 pr-4 py-2 w-full bg-muted/50 border-0 cursor-not-allowed"
              />
              <Badge variant="secondary" className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs">
                AI Chatbot
              </Badge>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center space-x-3">
            <Button
              variant="outline"
              size="sm"
              onClick={onAddProperty}
              className="hidden sm:flex items-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>List Property</span>
            </Button>

            <Button variant="ghost" size="sm" className="relative">
              <Heart className="w-4 h-4" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center">
                3
              </Badge>
            </Button>

            <Button variant="ghost" size="sm" className="relative">
              <MessageSquare className="w-4 h-4" />
              <Badge variant="destructive" className="absolute -top-1 -right-1 w-5 h-5 text-xs p-0 flex items-center justify-center">
                2
              </Badge>
            </Button>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatar} alt={user?.displayName} />
                    <AvatarFallback>
                      {user?.displayName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user?.displayName || 'User'}</p>
                    <p className="w-[200px] truncate text-sm text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                </div>
                <DropdownMenuItem>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </DropdownMenuItem>
                {onStartOnboarding && (
                  <DropdownMenuItem onClick={onStartOnboarding}>
                    <MessageSquare className="mr-2 h-4 w-4" />
                    <span>Start Onboarding</span>
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  )
}