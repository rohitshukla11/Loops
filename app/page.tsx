'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { ChatInterface } from '@/components/chat/ChatInterface'
import { MemoryManagement } from '@/components/memory/MemoryManagement'
import { StatsCard } from '@/components/dashboard/StatsCard'
import CalendarInterface from '@/components/calendar/CalendarInterface'
import { getMemoryService } from '@/lib/memory-service'
import { getChatService } from '@/lib/chat-service'
import { aiService } from '@/lib/ai-service'
import { MemoryType, MemoryEntry } from '@/types/memory'
import { ChatMessage } from '@/types/chat'
import toast from 'react-hot-toast'

export default function Home() {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isTyping, setIsTyping] = useState(false)
  const [storeMemory, setStoreMemory] = useState(true)
  const [memories, setMemories] = useState<MemoryEntry[]>([])
  const [stats, setStats] = useState({
    totalMemories: 0,
    totalSize: 0,
    pinnedMemories: 0,
    golemStats: { chainId: 60138453025, totalMemories: 0, totalSize: 0, pinnedMemories: 0 }
  })
  const [lastTransactionUrl, setLastTransactionUrl] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'memories' | 'calendar'>('memories')

  const memoryService = getMemoryService()
  const chatService = getChatService()

  useEffect(() => {
    const initializeApp = async () => {
      try {
        console.log('🚀 Initializing app...')
        await memoryService.initialize()
        await chatService.initialize()
        console.log('✅ Services initialized')
        
        await loadStats()
        await loadMemories()
        await loadChatHistory()
        
        // Debug chat persistence
        await chatService.debugChatPersistence()
      } catch (error) {
        console.error('Failed to initialize app:', error)
        // Still try to load chat history even if initialization fails
        await loadChatHistory()
      }
    }
    
    initializeApp()
  }, [])

  // Note: Wallet connection check removed - using Ethereum wallet for Golem Base only

  const loadStats = async () => {
    try {
      const statsData = await memoryService.getStorageStats()
      console.log('📊 Loaded stats:', statsData)
      setStats(statsData)
    } catch (error) {
      console.error('Failed to load stats:', error)
      // Set default stats on error
      setStats({
        totalMemories: 0,
        totalSize: 0,
        pinnedMemories: 0,
        golemStats: { chainId: 60138453025, totalMemories: 0, totalSize: 0, pinnedMemories: 0 }
      })
    }
  }

  const loadMemories = async () => {
    try {
      console.log('🧠 Starting to load memories...')
      const searchResult = await memoryService.searchMemories({
        query: '',
        limit: 20
      })
      console.log('🧠 Loaded memories:', searchResult.memories.length, 'memories')
      console.log('🧠 Memory data:', searchResult.memories)
      setMemories(searchResult.memories)
      
      // If no memories found, create a test memory
      if (searchResult.memories.length === 0) {
        console.log('🧠 No memories found, creating a test memory...')
        try {
          const testMemory = await memoryService.createMemory({
            content: 'This is a test memory to verify the system is working',
            type: 'learned_fact',
            category: 'test',
            tags: ['test', 'system'],
            encrypted: false
          })
          console.log('🧠 Test memory created:', testMemory)
          
          // Reload memories after creating test memory
          const newSearchResult = await memoryService.searchMemories({
            query: '',
            limit: 20
          })
          console.log('🧠 Reloaded memories after test creation:', newSearchResult.memories.length, 'memories')
          setMemories(newSearchResult.memories)
        } catch (testError) {
          console.error('Failed to create test memory:', testError)
        }
      }
    } catch (error) {
      console.error('Failed to load memories:', error)
      setMemories([])
    }
  }

  const loadChatHistory = async () => {
    try {
      console.log('💬 Loading chat history...')
      const messages = await chatService.loadChatMessages()
      setMessages(messages)
      console.log('✅ Chat history loaded:', messages.length, 'messages')
    } catch (error) {
      console.error('Failed to load chat history:', error)
      // Set welcome message on error
      setMessages([{
        id: 'welcome',
        content: "Hello! I'm your privacy-first AI assistant. I can help you with various tasks while keeping all our conversations secure and private. What would you like to discuss?",
        role: 'assistant' as const,
        timestamp: new Date()
      }])
    }
  }

  const saveChatHistory = async (messages: ChatMessage[]) => {
    try {
      console.log('💾 Saving chat history...', messages.length, 'messages')
      await chatService.saveChatMessages(messages)
      console.log('✅ Chat history saved successfully')
    } catch (error) {
      console.error('Failed to save chat history:', error)
    }
  }

  const handleSendMessage = async (content: string) => {
    if (!content.trim()) return

    // Note: No authentication required - using Ethereum wallet for Golem Base

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Generate AI response using the AI service
      const aiResponse = await aiService.generateResponse(content, messages)
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.content,
        role: 'assistant',
        timestamp: new Date()
      }

      const updatedMessages = [...messages, userMessage, assistantMessage]
      setMessages(updatedMessages)

      // Save chat history to persistent storage (Golem Base only)
      await saveChatHistory(updatedMessages)
      
      // Show transaction URL for chat save
      const chatEntityKey = chatService.getChatEntityKey()
      if (chatEntityKey) {
        const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
        const txUrl = `${explorerUrl}/entity/${chatEntityKey}`
        setLastTransactionUrl(txUrl)
      }

      // Store conversation in memory (Golem Base only)
      if (storeMemory && aiResponse.shouldStore) {
        console.log('🧠 Storing conversation in encrypted memory...')
        const memory = await memoryService.createMemory({
          content: `User: ${content}\nAssistant: ${aiResponse.content}`,
          type: 'conversation',
          category: 'Chat',
          tags: ['conversation', 'ai-chat'],
          encrypted: true
        })
        console.log('✅ Conversation stored with ID:', memory.id)
        console.log('🗃️ Golem Base Entity Key:', memory.ipfsHash)
        const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
        const txUrl = `${explorerUrl}/entity/${memory.ipfsHash}`
        console.log(`🔗 Transaction URL: ${txUrl}`)
        setLastTransactionUrl(txUrl)
        
        loadStats()
        loadMemories()
      }

    } catch (error: any) {
      console.error('Failed to send message:', error)
      
      // Show specific error messages based on the error type
      if (error.message.includes('API key is required')) {
        toast.error('OpenAI API key is not configured. Please check your environment variables.')
      } else if (error.message.includes('401')) {
        toast.error('Invalid OpenAI API key. Please check your credentials.')
      } else if (error.message.includes('429')) {
        toast.error('Rate limit exceeded. Please try again in a moment.')
      } else if (error.message.includes('network')) {
        toast.error('Network error. Please check your internet connection.')
      } else {
        toast.error('Failed to send message. Please try again.')
      }
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }


  const clearChat = async () => {
    try {
      console.log('🗑️ Clearing chat...')
      await chatService.clearChatHistory()
      const messages = await chatService.loadChatMessages()
      setMessages(messages)
      console.log('✅ Chat cleared successfully')
    } catch (error) {
      console.error('Failed to clear chat:', error)
    }
  }


  const handleSearchMemories = async (query: string) => {
    try {
      const searchResult = await memoryService.searchMemories({
        query,
        type: 'conversation',
        limit: 20
      })
      setMemories(searchResult.memories)
    } catch (error) {
      console.error('Failed to search memories:', error)
      toast.error('Failed to search memories')
    }
  }

  const handleDeleteMemory = async (id: string) => {
    try {
      await memoryService.deleteMemory(id)
      loadStats()
      loadMemories()
      toast.success('Memory deleted successfully')
    } catch (error) {
      console.error('Failed to delete memory:', error)
      toast.error('Failed to delete memory')
    }
  }

  const handleGrantPermission = async (memoryId: string, agentId: string, actions: string[]) => {
    try {
      const success = await memoryService.grantPermission(memoryId, agentId, actions as ('read' | 'write' | 'delete')[])
      if (success) {
        toast.success(`Permission granted to ${agentId}`)
        loadMemories() // Refresh to show updated permissions
      } else {
        toast.error('Failed to grant permission')
      }
    } catch (error) {
      console.error('Failed to grant permission:', error)
      toast.error('Failed to grant permission')
    }
  }

  const handleRevokePermission = async (memoryId: string, agentId: string) => {
    try {
      const success = await memoryService.revokePermission(memoryId, agentId)
      if (success) {
        toast.success(`Permission revoked from ${agentId}`)
        loadMemories() // Refresh to show updated permissions
      } else {
        toast.error('Failed to revoke permission')
      }
    } catch (error) {
      console.error('Failed to revoke permission:', error)
      toast.error('Failed to revoke permission')
    }
  }


  const getMemoryTypes = () => {
    const types = new Set(memories.map(m => m.type))
    console.log('🔍 Memory types found:', Array.from(types), 'Total types:', types.size)
    return types.size
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
      <Header />
      
      {/* Transaction URL Display */}
      {lastTransactionUrl && (
        <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-blue-800">🔗 Last Transaction:</span>
              <a 
                href={lastTransactionUrl} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:text-blue-800 underline truncate max-w-md"
              >
                {lastTransactionUrl}
              </a>
            </div>
            <button
              onClick={() => setLastTransactionUrl(null)}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      
      <main className="flex-1 flex flex-col xl:flex-row w-full overflow-hidden">
        {/* Chat Interface - 60% Width */}
        <div className="w-full xl:w-3/5 flex flex-col min-w-0 bg-white border-r border-gray-200 overflow-hidden">
          <ChatInterface
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isTyping={isTyping}
            onClearChat={clearChat}
            storeMemory={storeMemory}
            onToggleMemory={setStoreMemory}
          />
        </div>

        {/* Calendar Interface - 20% Width */}
        <div className="w-full xl:w-1/5 flex-shrink-0 bg-white border-r border-gray-200 overflow-hidden">
          <CalendarInterface
            onEventCreate={(event) => {
              console.log('Event created:', event);
            }}
            onEventUpdate={(eventId, event) => {
              console.log('Event updated:', eventId, event);
            }}
            onEventDelete={(eventId) => {
              console.log('Event deleted:', eventId);
            }}
          />
        </div>

        {/* Memory Management - 20% Width */}
        <div className="w-full xl:w-1/5 flex-shrink-0 bg-white overflow-hidden">
          <MemoryManagement
            memories={memories}
            onSearchMemories={handleSearchMemories}
            onDeleteMemory={handleDeleteMemory}
            totalMemories={memories.length}
            memoryTypes={new Set(memories.map(m => m.type)).size}
            onGrantPermission={handleGrantPermission}
            onRevokePermission={handleRevokePermission}
          />
        </div>
      </main>
    </div>
  )
}
