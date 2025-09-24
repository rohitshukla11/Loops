'use client'

import React, { useState, useEffect } from 'react'
import { Search, Trash2, Diamond, Database, Clock, Lock, Unlock, Calendar } from 'lucide-react'
import { MemoryEntry, MemoryType } from '@/types/memory'
import { getEncryptionService } from '@/lib/encryption'
import MemoryToCalendar from '@/components/calendar/MemoryToCalendar'

interface MemoryManagementProps {
  memories: MemoryEntry[]
  onSearchMemories: (query: string) => void
  onDeleteMemory: (id: string) => void
  totalMemories: number
  memoryTypes: number
  onGrantPermission?: (memoryId: string, agentId: string, actions: string[]) => void
  onRevokePermission?: (memoryId: string, agentId: string) => void
}

export function MemoryManagement({
  memories,
  onSearchMemories,
  onDeleteMemory,
  totalMemories,
  memoryTypes,
  onGrantPermission,
  onRevokePermission
}: MemoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [decryptedMemories, setDecryptedMemories] = useState<Map<string, string>>(new Map())
  const [decryptionStatus, setDecryptionStatus] = useState<Map<string, 'decrypting' | 'decrypted' | 'failed'>>(new Map())
  const [showDecrypted, setShowDecrypted] = useState(true)
  const [selectedMemoryForCalendar, setSelectedMemoryForCalendar] = useState<MemoryEntry | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    onSearchMemories(searchQuery)
  }

  // Decrypt memory content
  const decryptMemory = async (memory: MemoryEntry) => {
    if (!memory.encrypted || decryptedMemories.has(memory.id)) {
      return
    }

    setDecryptionStatus(prev => new Map(prev).set(memory.id, 'decrypting'))

    try {
      const encryptionService = getEncryptionService()
      const keys = encryptionService.getKeys()
      
      if (keys.length === 0) {
        throw new Error('No encryption keys available')
      }

      // Parse the encrypted content
      const encryptedData = JSON.parse(memory.content)
      
      // Try to decrypt with the first available key
      const result = await encryptionService.decrypt(encryptedData, keys[0].keyId)
      
      setDecryptedMemories(prev => new Map(prev).set(memory.id, result.content))
      setDecryptionStatus(prev => new Map(prev).set(memory.id, 'decrypted'))
    } catch (error) {
      console.warn(`Failed to decrypt memory ${memory.id}:`, error)
      setDecryptedMemories(prev => new Map(prev).set(memory.id, `[Decryption failed] ${memory.content.substring(0, 50)}...`))
      setDecryptionStatus(prev => new Map(prev).set(memory.id, 'failed'))
    }
  }

  // Decrypt all encrypted memories on component mount
  useEffect(() => {
    const decryptAllMemories = async () => {
      for (const memory of memories) {
        if (memory.encrypted && !decryptedMemories.has(memory.id)) {
          await decryptMemory(memory)
        }
      }
    }

    if (showDecrypted && memories.length > 0) {
      decryptAllMemories()
    }
  }, [memories, showDecrypted])


  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    }).format(date)
  }

  const truncateContent = (content: string, maxLength: number = 100) => {
    return content.length > maxLength ? content.substring(0, maxLength) + '...' : content
  }

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Compact Memory Header */}
      <div className="flex items-center px-3 py-2 border-b border-purple-200 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center space-x-2">
          <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center">
            <Database className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-medium text-purple-800">Memories</h1>
        </div>
      </div>

      {/* Compact Search and Controls */}
      <div className="px-3 py-2 border-b border-gray-100 space-y-2">
        {/* Compact Search */}
        <div className="relative">
          <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <form onSubmit={handleSearch} className="w-full">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded text-sm focus:outline-none focus:ring-1 focus:ring-purple-500 focus:border-transparent"
            />
          </form>
        </div>
        
        {/* Compact Controls */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4 text-sm text-purple-600">
            <div className="flex items-center space-x-1">
              <Database className="w-4 h-4" />
              <span>Total memories {totalMemories}</span>
            </div>
            <div className="flex items-center space-x-1">
              <Diamond className="w-4 h-4" />
              <span>{memoryTypes} types</span>
            </div>
          </div>
          <button
            onClick={() => setShowDecrypted(!showDecrypted)}
            className="flex items-center space-x-1 px-3 py-1.5 text-sm text-purple-600 hover:bg-purple-50 rounded"
          >
            {showDecrypted ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
            <span>{showDecrypted ? 'Decrypted' : 'Encrypted'}</span>
          </button>
        </div>
      </div>

      {/* Memory List */}
      <div className="flex-1 overflow-y-auto">
        {memories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-100 to-pink-100 rounded-full flex items-center justify-center mb-3">
              <Database className="w-6 h-6 text-purple-500" />
            </div>
            <p className="text-sm font-medium text-gray-600">No memories yet</p>
            <p className="text-xs text-gray-400 mt-1">Start chatting to create memories</p>
          </div>
        ) : (
          <div className="px-3 py-2 space-y-2">
            {memories.slice(0, 10).map((memory) => (
              <div
                key={memory.id}
                className="bg-gray-50 rounded p-2 border border-gray-200 hover:bg-white hover:shadow-sm transition-all"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${
                        memory.type === 'learned_fact' 
                          ? 'bg-green-100 text-green-700' 
                          : memory.type === 'user_preference'
                          ? 'bg-orange-100 text-orange-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}>
                        {memory.type.replace('_', ' ')}
                      </span>
                      <span className="text-xs text-gray-500">
                        {new Date(memory.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                      {memory.encrypted && (
                        <span className="text-xs text-gray-400 flex items-center">
                          {decryptionStatus.get(memory.id) === 'decrypting' && (
                            <div className="w-2 h-2 border border-gray-300 border-t-transparent rounded-full animate-spin" />
                          )}
                          {decryptionStatus.get(memory.id) === 'decrypted' && <Unlock className="w-2 h-2" />}
                          {decryptionStatus.get(memory.id) === 'failed' && <Lock className="w-2 h-2" />}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-700 leading-relaxed line-clamp-2">
                      {showDecrypted && memory.encrypted && decryptedMemories.has(memory.id) 
                        ? truncateContent(decryptedMemories.get(memory.id) || memory.content, 60)
                        : truncateContent(memory.content, 60)
                      }
                    </p>
                  </div>
                  <div className="flex items-center space-x-1 flex-shrink-0">
                    <button
                      onClick={() => setSelectedMemoryForCalendar(memory)}
                      className="p-1 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded transition-all"
                      title="Add to calendar"
                    >
                      <Calendar className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => onDeleteMemory(memory.id)}
                      className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all"
                      title="Delete memory"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Memory to Calendar Modal */}
      {selectedMemoryForCalendar && (
        <MemoryToCalendar
          memory={selectedMemoryForCalendar}
          onEventCreated={(eventId) => {
            console.log('Event created:', eventId);
            setSelectedMemoryForCalendar(null);
          }}
          onClose={() => setSelectedMemoryForCalendar(null)}
        />
      )}
    </div>
  )
}
