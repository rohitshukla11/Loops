'use client'

import { useState } from 'react'
import { Search, Filter, X } from 'lucide-react'
import { MemoryType } from '@/types/memory'

interface SearchBarProps {
  onSearch: (query: string) => void
  searchQuery: string
  selectedType: MemoryType | 'all'
  onTypeChange: (type: MemoryType | 'all') => void
}

const MEMORY_TYPES: { value: MemoryType | 'all'; label: string; icon: string }[] = [
  { value: 'all', label: 'All Types', icon: '📝' },
  { value: 'conversation', label: 'Conversations', icon: '💬' },
  { value: 'learned_fact', label: 'Learned Facts', icon: '🧠' },
  { value: 'user_preference', label: 'Preferences', icon: '⚙️' },
  { value: 'task_outcome', label: 'Task Outcomes', icon: '✅' },
  { value: 'multimedia', label: 'Multimedia', icon: '🎵' },
  { value: 'workflow', label: 'Workflows', icon: '🔄' },
  { value: 'agent_share', label: 'Agent Shares', icon: '🤝' },
]

export function SearchBar({ onSearch, searchQuery, selectedType, onTypeChange }: SearchBarProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery)
  const [showFilters, setShowFilters] = useState(false)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearch(localQuery)
  }

  const handleClear = () => {
    setLocalQuery('')
    onSearch('')
  }

  const handleTypeChange = (type: MemoryType | 'all') => {
    onTypeChange(type)
    // Trigger search with current query when type changes
    onSearch(localQuery)
  }

  return (
    <div className="space-y-4">
      {/* Search Input */}
      <form onSubmit={handleSearch} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search memories..."
            className="input pl-10 pr-10 w-full"
          />
          {localQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </form>

      {/* Filter Toggle */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="btn btn-outline btn-sm"
        >
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </button>

        {searchQuery && (
          <div className="text-sm text-slate-600">
            Searching for: "{searchQuery}"
          </div>
        )}
      </div>

      {/* Filter Options */}
      {showFilters && (
        <div className="bg-slate-50 rounded-lg p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Memory Type
            </label>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {MEMORY_TYPES.map((type) => (
                <button
                  key={type.value}
                  onClick={() => handleTypeChange(type.value)}
                  className={`btn btn-sm ${
                    selectedType === type.value
                      ? 'btn-primary'
                      : 'btn-outline'
                  }`}
                >
                  <span className="mr-2">{type.icon}</span>
                  {type.label}
                </button>
              ))}
            </div>
          </div>

          {/* Additional filters can be added here */}
          <div className="text-sm text-slate-500">
            More filters coming soon: date range, tags, encryption status
          </div>
        </div>
      )}
    </div>
  )
}



