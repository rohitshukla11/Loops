'use client'

import React, { useState, useEffect } from 'react'
import { Search, Trash2, Diamond, Database, Clock, Lock, Unlock } from 'lucide-react'
import { MemoryEntry, MemoryType } from '@/types/memory'
import { getEncryptionService } from '@/lib/encryption'

interface MemoryManagementProps {
  memories: MemoryEntry[]
  onSearchMemories: (query: string) => void
  onDeleteMemory: (id: string) => void
  totalMemories: number
  memoryTypes: number
}

export function MemoryManagement({
  memories,
  onSearchMemories,
  onDeleteMemory,
  totalMemories,
  memoryTypes
}: MemoryManagementProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [decryptedMemories, setDecryptedMemories] = useState<Map<string, string>>(new Map())
  const [decryptionStatus, setDecryptionStatus] = useState<Map<string, 'decrypting' | 'decrypted' | 'failed'>>(new Map())
  const [showDecrypted, setShowDecrypted] = useState(true)

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
      <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-700 rounded-full flex items-center justify-center shadow-md">
            <Diamond className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Memory Management</h3>
            <p className="text-sm text-slate-500">Decentralized memory storage and retrieval</p>
          </div>
        </div>
      </div>

      {/* Memory Statistics */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center space-x-2 bg-blue-50 px-3 py-2 rounded-lg">
            <Database className="w-4 h-4 text-blue-600" />
            <span className="text-slate-700 font-medium">{totalMemories} Total Memories</span>
          </div>
          <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg">
            <Diamond className="w-4 h-4 text-green-600" />
            <span className="text-slate-700 font-medium">{memoryTypes} Memory Types</span>
          </div>
        </div>
        <div className="mt-3 text-xs text-slate-500 bg-slate-100 px-3 py-2 rounded-lg">
          <span className="font-medium">Auto-filter:</span> Disabled
        </div>
      </div>


      {/* Search Memories */}
      <div className="p-4 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white">
        <h4 className="text-sm font-medium text-slate-700 mb-3 flex items-center">
          <Search className="w-4 h-4 mr-2 text-purple-600" />
          Search Memories
        </h4>
        <form onSubmit={handleSearch} className="flex space-x-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search memories..."
            className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg hover:from-purple-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition-all duration-200 shadow-sm"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Recent Memories */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col bg-gradient-to-b from-white to-slate-50">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-medium text-slate-700 flex items-center">
            <Clock className="w-4 h-4 mr-2 text-purple-600" />
            Recent Memories
          </h4>
          <button
            onClick={() => setShowDecrypted(!showDecrypted)}
            className="flex items-center space-x-1 text-xs px-2 py-1 rounded-md bg-slate-100 hover:bg-slate-200 transition-colors"
          >
            {showDecrypted ? <Unlock className="w-3 h-3" /> : <Lock className="w-3 h-3" />}
            <span>{showDecrypted ? 'Decrypted' : 'Encrypted'}</span>
          </button>
        </div>
        <div className="flex-1">
          {memories.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <Database className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-sm font-medium">No memories yet</p>
              <p className="text-xs text-slate-400 mt-1">Add your first memory above</p>
            </div>
          ) : (
            <div className="space-y-3">
              {memories.slice(0, 10).map((memory) => (
                <div
                  key={memory.id}
                  className="bg-white rounded-lg p-4 border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-2">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${
                          memory.type === 'learned_fact' 
                            ? 'bg-green-100 text-green-700' 
                            : memory.type === 'user_preference'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-blue-100 text-blue-700'
                        }`}>
                          {memory.type}
                        </span>
                        <span className="text-xs text-slate-500">
                          {formatDate(memory.createdAt)}
                        </span>
                        {memory.encrypted && (
                          <span className="text-xs text-slate-400 flex items-center">
                            {decryptionStatus.get(memory.id) === 'decrypting' && (
                              <div className="w-3 h-3 border border-slate-300 border-t-transparent rounded-full animate-spin mr-1" />
                            )}
                            {decryptionStatus.get(memory.id) === 'decrypted' && <Unlock className="w-3 h-3 mr-1" />}
                            {decryptionStatus.get(memory.id) === 'failed' && <Lock className="w-3 h-3 mr-1" />}
                            {decryptionStatus.get(memory.id) || 'encrypted'}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        {showDecrypted && memory.encrypted && decryptedMemories.has(memory.id) 
                          ? truncateContent(decryptedMemories.get(memory.id) || memory.content)
                          : truncateContent(memory.content)
                        }
                      </p>
                    </div>
                    <button
                      onClick={() => onDeleteMemory(memory.id)}
                      className="ml-3 p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
