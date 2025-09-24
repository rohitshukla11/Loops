'use client'

import React, { useState, useEffect } from 'react'
import { Calendar, Plus, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { CalendarEvent, getGoogleCalendarClient } from '@/lib/google-calendar-client'

interface CalendarInterfaceProps {
  onEventCreate?: (event: CalendarEvent) => void
  onEventUpdate?: (eventId: string, event: Partial<CalendarEvent>) => void
  onEventDelete?: (eventId: string) => void
}

export default function CalendarInterface({
  onEventCreate,
  onEventUpdate,
  onEventDelete
}: CalendarInterfaceProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [newEvent, setNewEvent] = useState<Partial<CalendarEvent>>({
    summary: '',
    description: '',
    start: { dateTime: '', timeZone: 'UTC' },
    end: { dateTime: '', timeZone: 'UTC' },
    location: '',
    attendees: []
  })

  const calendarService = getGoogleCalendarClient()

  useEffect(() => {
    initializeCalendar()
    handleAuthCallback()
  }, [])

  // Reload events when selectedDate changes (for programmatic changes)
  useEffect(() => {
    if (isAuthenticated && selectedDate) {
      loadEvents(selectedDate)
    }
  }, [selectedDate, isAuthenticated])

  const handleAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search)
    const authStatus = urlParams.get('calendar_auth')
    const tokens = urlParams.get('tokens')
    const error = urlParams.get('error')

    if (authStatus === 'success' && tokens) {
      try {
        const tokenData = JSON.parse(decodeURIComponent(tokens))
        // Store tokens in the calendar service
        calendarService.setTokens(tokenData)
        setIsAuthenticated(true)
        loadEvents()
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname)
      } catch (error) {
        console.error('Failed to parse tokens:', error)
      }
    } else if (error) {
      console.error('OAuth error:', error)
    }
  }

  const initializeCalendar = async () => {
    try {
      await calendarService.initialize()
      const authenticated = calendarService.isAuthenticated()
      setIsAuthenticated(authenticated)
      
      if (authenticated) {
        await loadEvents()
      }
    } catch (error) {
      console.error('Failed to initialize calendar:', error)
    }
  }

  const loadEvents = async (date?: Date) => {
    try {
      setIsLoading(true)
      const targetDate = date || selectedDate
      
      // Get start and end of the selected day
      const startOfDay = new Date(targetDate)
      startOfDay.setHours(0, 0, 0, 0)
      
      const endOfDay = new Date(targetDate)
      endOfDay.setHours(23, 59, 59, 999)
      
      const calendarEvents = await calendarService.getEvents(
        'primary',
        startOfDay.toISOString(),
        endOfDay.toISOString()
      )
      
      setEvents(calendarEvents as CalendarEvent[])
    } catch (error) {
      console.error('Failed to load events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleAuth = async () => {
    try {
      const authUrl = calendarService.getAuthUrl()
      // Force redirect in the same window - prevent popup behavior
      window.location.href = authUrl
    } catch (error) {
      console.error('Failed to initiate auth:', error)
    }
  }

  const handleCreateEvent = async () => {
    if (!newEvent.summary || !newEvent.start?.dateTime || !newEvent.end?.dateTime) {
      return
    }

    try {
      const createdEvent = await calendarService.createEvent(newEvent as CalendarEvent)
      await loadEvents()
      setShowCreateForm(false)
      setNewEvent({
        summary: '',
        description: '',
        start: { dateTime: '', timeZone: 'UTC' },
        end: { dateTime: '', timeZone: 'UTC' },
        location: '',
        attendees: []
      })
      onEventCreate?.(createdEvent)
    } catch (error) {
      console.error('Failed to create event:', error)
    }
  }

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await calendarService.deleteEvent(eventId)
      await loadEvents()
      onEventDelete?.(eventId)
    } catch (error) {
      console.error('Failed to delete event:', error)
    }
  }

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) {
      await loadEvents()
      return
    }

    try {
      setIsLoading(true)
      const searchResults = await calendarService.searchEvents(searchQuery)
      setEvents(searchResults as CalendarEvent[])
    } catch (error) {
      console.error('Failed to search events:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const formatDateTime = (dateTime: string) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const navigateDate = async (direction: 'prev' | 'next' | 'today') => {
    let newDate = new Date(selectedDate)
    
    switch (direction) {
      case 'prev':
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'next':
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'today':
        newDate = new Date()
        break
    }
    
    setSelectedDate(newDate)
    
    // Reload events for the new date
    if (isAuthenticated) {
      await loadEvents(newDate)
    }
  }

  if (!isAuthenticated) {
    return (
      <div className="h-full flex flex-col bg-white">
        {/* Google Calendar-style Header */}
        <div className="flex items-center justify-between p-4 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center shadow-md">
              <Calendar className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-normal text-purple-800">Calendar</h1>
          </div>
        </div>

        {/* Connect Calendar */}
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
            <h3 className="text-lg font-normal text-gray-900 mb-2">
              Connect your calendar
            </h3>
            <p className="text-sm text-gray-500 mb-6">
              Connect your Google Calendar to create and manage events from your memories
            </p>
            <button
              onClick={handleAuth}
              className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-md hover:from-purple-600 hover:to-pink-700 transition-all text-sm font-medium shadow-md"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Connect Google Calendar
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Compact Calendar Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <Calendar className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-medium text-purple-800">Calendar</h1>
        </div>
        <button
          onClick={() => setShowCreateForm(true)}
          className="flex items-center space-x-1 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded text-sm font-medium hover:from-purple-600 hover:to-pink-700 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Create</span>
        </button>
      </div>

      {/* Compact Search and Navigation */}
      <div className="px-3 py-2 border-b border-gray-100 space-y-2">
        {/* Compact Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <form onSubmit={handleSearch} className="w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search events..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
            />
          </form>
        </div>
        
        {/* Compact Date Navigation */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateDate('prev')}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <ChevronLeft className="w-4 h-4 text-gray-600" />
            </button>
            <h2 className="text-sm font-medium text-gray-900 min-w-0 px-1">
              {selectedDate.toLocaleDateString('en-US', { 
                weekday: 'short',
                month: 'short', 
                day: 'numeric' 
              })}
            </h2>
            <button
              onClick={() => navigateDate('next')}
              className="p-0.5 hover:bg-gray-100 rounded"
            >
              <ChevronRight className="w-4 h-4 text-gray-600" />
            </button>
          </div>
          <button
            onClick={() => navigateDate('today')}
            className="px-2 py-1 text-sm text-purple-600 hover:bg-purple-50 rounded"
          >
            Today
          </button>
        </div>
      </div>

      {/* Events List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-gray-500">
            <Calendar className="w-8 h-8 mb-2 text-gray-300" />
            <p className="text-sm">No events for this day</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {events.map((event) => (
              <div
                key={event.id}
                className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium text-gray-900 truncate">
                      {event.summary}
                    </h4>
                    
                    {event.start?.dateTime && (
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDateTime(event.start.dateTime)}
                      </p>
                    )}
                    
                    {event.location && (
                      <p className="text-xs text-gray-500 mt-1 truncate">
                        📍 {event.location}
                      </p>
                    )}
                    
                    {event.attendees && event.attendees.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        👥 {event.attendees.length} guest{event.attendees.length !== 1 ? 's' : ''}
                      </p>
                    )}
                  </div>

                  {/* Event Actions */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleDeleteEvent(event.id!)}
                      className="p-1 text-gray-400 hover:text-red-500 rounded"
                      title="Delete event"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Google Calendar-style Create Event Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-normal text-gray-900">Create event</h3>
              <button
                onClick={() => setShowCreateForm(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <input
                  type="text"
                  value={newEvent.summary}
                  onChange={(e) => setNewEvent({...newEvent, summary: e.target.value})}
                  placeholder="Add title"
                  className="w-full text-xl font-normal placeholder-gray-400 border-0 border-b border-gray-200 focus:border-purple-500 focus:outline-none pb-2"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={newEvent.start?.dateTime?.slice(0, 16)}
                    onChange={(e) => setNewEvent({
                      ...newEvent,
                      start: { ...newEvent.start, dateTime: e.target.value + ':00.000Z' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={newEvent.end?.dateTime?.slice(0, 16)}
                    onChange={(e) => setNewEvent({
                      ...newEvent,
                      end: { ...newEvent.end, dateTime: e.target.value + ':00.000Z' }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                </div>
              </div>
              
              <div>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({...newEvent, location: e.target.value})}
                  placeholder="Add location"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              
              <div>
                <textarea
                  value={newEvent.description}
                  onChange={(e) => setNewEvent({...newEvent, description: e.target.value})}
                  placeholder="Add description"
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                />
              </div>
            </div>
            
            <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
              <button
                onClick={() => setShowCreateForm(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-md transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateEvent}
                disabled={!newEvent.summary || !newEvent.start?.dateTime || !newEvent.end?.dateTime}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white text-sm font-medium rounded-md hover:from-purple-600 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}