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
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full">
      {/* Header */}
      <div className="p-6 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-700 rounded-lg flex items-center justify-center">
            <Diamond className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">Memory Management</h3>
            <p className="text-xs text-slate-500 mt-1">Decentralized storage</p>
          </div>
        </div>
      </div>

      {/* Memory Statistics - Simplified */}
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-slate-600">
            <Database className="w-4 h-4 text-blue-500" />
            <span className="font-medium">{totalMemories} Total</span>
          </div>
          <div className="flex items-center space-x-2 text-slate-600">
            <Diamond className="w-4 h-4 text-green-500" />
            <span className="font-medium">{memoryTypes} Types</span>
          </div>
        </div>
      </div>

      {/* Search Memories - Compact */}
      <div className="p-4 border-b border-slate-100">
        <form onSubmit={handleSearch} className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2.5 bg-purple-500 text-white rounded-lg hover:bg-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Recent Memories */}
      <div className="flex-1 overflow-y-auto">
        <div className="sticky top-0 bg-white p-4 border-b border-slate-100 z-10">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-800 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-purple-500" />
              Recent Memories
            </h4>
            <button
              onClick={() => setShowDecrypted(!showDecrypted)}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 transition-colors"
            >
              {showDecrypted ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
              <span>{showDecrypted ? 'Decrypted' : 'Encrypted'}</span>
            </button>
          </div>
        </div>
        
        <div className="p-4">
          {memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-3">
                <Database className="w-6 h-6 text-slate-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">No memories yet</p>
              <p className="text-xs text-slate-400 mt-1">Start chatting to create memories</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.slice(0, 10).map((memory) => (
                <div
                  key={memory.id}
                  className="bg-slate-50 rounded-lg p-3 border border-slate-200 hover:bg-white hover:shadow-sm transition-all duration-200"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                          memory.type === 'learned_fact' 
                            ? 'bg-green-100 text-green-700' 
                            : memory.type === 'user_preference'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {memory.type.replace('_', ' ')}
                        </span>
                        <span className="text-xs text-slate-500">
                          {new Date(memory.createdAt).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                        {memory.encrypted && (
                          <span className="text-xs text-slate-400 flex items-center">
                            {decryptionStatus.get(memory.id) === 'decrypting' && (
                              <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin" />
                            )}
                            {decryptionStatus.get(memory.id) === 'decrypted' && <Unlock className="w-3 h-3" />}
                            {decryptionStatus.get(memory.id) === 'failed' && <Lock className="w-3 h-3" />}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed line-clamp-2">
                        {showDecrypted && memory.encrypted && decryptedMemories.has(memory.id) 
                          ? truncateContent(decryptedMemories.get(memory.id) || memory.content, 80)
                          : truncateContent(memory.content, 80)
                        }
                      </p>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => setSelectedMemoryForCalendar(memory)}
                        className="p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-md transition-all"
                        title="Add to calendar"
                      >
                        <Calendar className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDeleteMemory(memory.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
                        title="Delete memory"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
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
