'use client'

import { useState, useEffect, useRef } from 'react'
import { Header } from '@/components/layout/Header'
import { PersonalizedChatInterface } from '@/components/chat/PersonalizedChatInterface'
import { ProfileManagement, UserProfile } from '@/components/profile/ProfileManagement'
import { MemoryManagement } from '@/components/memory/MemoryManagement'
import { StatsCard } from '@/components/dashboard/StatsCard'
import CalendarInterface from '@/components/calendar/CalendarInterface'
import { getMemoryService } from '@/lib/memory-service'
import { getChatService } from '@/lib/chat-service'
import { aiService } from '@/lib/ai-service'
import { MemoryType, MemoryEntry } from '@/types/memory'
import { ChatMessage } from '@/types/chat'
import toast from 'react-hot-toast'
import { Heart, Settings, User } from 'lucide-react'

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
  
  // BetterHalf.ai is now the default and only mode
  const [personalizedMessages, setPersonalizedMessages] = useState<ChatMessage[]>([])
  const [showProfileManagement, setShowProfileManagement] = useState(false)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [personalizedInsights, setPersonalizedInsights] = useState<any>(null)
  const [showInsights, setShowInsights] = useState(true) // Show insights by default

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

    await handlePersonalizedMessage(content)
  }


  const handlePersonalizedMessage = async (content: string) => {
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      role: 'user',
      timestamp: new Date()
    }

    setPersonalizedMessages(prev => [...prev, userMessage])
    setIsLoading(true)
    setIsTyping(true)

    try {
      // Call personalized agent API
      const response = await fetch('/api/personalized-agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userInput: content,
          previousMessages: personalizedMessages
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get personalized response');
      }

      const data = await response.json();
      
      // Log detailed response information
      console.log('🤖 AI Response received:', {
        contentLength: data.content?.length || 0,
        hasGolemUrl: !!data.golemExplorerUrl,
        golemUrl: data.golemExplorerUrl,
        shouldStore: data.shouldStore,
        timestamp: new Date().toISOString()
      });
      
      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.content,
        role: 'assistant',
        timestamp: new Date(),
        golemExplorerUrl: data.golemExplorerUrl, // Legacy field for backward compatibility
        entityUrl: data.entityUrl,
        transactionUrl: data.transactionUrl
      }

      const updatedMessages = [...personalizedMessages, userMessage, assistantMessage]
      setPersonalizedMessages(updatedMessages)

      // Update insights if provided
      if (data.insights) {
        setPersonalizedInsights(data.insights)
      }

      // Store conversation in memory if enabled
      if (storeMemory && data.shouldStore) {
        try {
          const memory = await memoryService.createMemory({
            content: `User: ${content}\nPersonal AI: ${data.content}`,
            type: 'conversation',
            category: 'Personal Chat',
            tags: ['personalized-agent', 'conversation', 'lifestyle'],
            encrypted: true
          })
          console.log('✅ Personalized conversation stored with ID:', memory.id)
          
          loadStats()
          loadMemories()
        } catch (memoryError) {
          console.warn('Failed to store personalized conversation:', memoryError)
        }
      }

    } catch (error: any) {
      console.error('❌ DETAILED CHAT ERROR:', error);
      
      // Detailed error analysis for chat
      const errorDetails = {
        errorType: error.constructor.name,
        message: error.message,
        userInput: content.substring(0, 100) + '...',
        timestamp: new Date().toISOString(),
        responseStatus: 'FAILED'
      };
      
      console.error('🔍 CHAT ERROR ANALYSIS:', JSON.stringify(errorDetails, null, 2));
      
      // Specific error guidance
      if (error.message.includes('Failed to get personalized response')) {
        console.error('🤖 PERSONALIZED RESPONSE FAILED');
        console.error('   - The AI service failed to generate a response');
        console.error('   - Check the API endpoint and service status');
        console.error('   - Verify OpenAI API configuration');
      }
      
      if (error.message.includes('Learning interaction failed')) {
        console.error('🧠 LEARNING FAILED');
        console.error('   - The AI cannot learn from this interaction');
        console.error('   - Check Golem Base connectivity and memory service');
        console.error('   - The response will be generated but not stored');
      }
      
      if (error.message.includes('Memory upload to Golem Base failed')) {
        console.error('🌐 GOLEM BASE UPLOAD FAILED');
        console.error('   - The memory cannot be stored on the blockchain');
        console.error('   - Check network connectivity and RPC endpoint');
        console.error('   - Verify Golem Base configuration');
      }
      
      if (error.message.includes('API key')) {
        toast.error('OpenAI API key is not configured properly. Please check your environment variables.')
      } else if (error.message.includes('429')) {
        toast.error('Rate limit exceeded. Please try again in a moment.')
      } else {
        toast.error(`Error: ${error.message}. Check console for detailed analysis.`)
      }
    } finally {
      setIsLoading(false)
      setIsTyping(false)
    }
  }


  const clearChat = async () => {
    try {
    console.log('🗑️ Clearing BetterHalf.ai chat...')
    setPersonalizedMessages([])
    setPersonalizedInsights(null)
    console.log('✅ BetterHalf.ai chat cleared successfully')
    } catch (error) {
      console.error('Failed to clear chat:', error)
    }
  }

  // Profile Management Functions
  const loadUserProfile = async () => {
    try {
      const response = await fetch('/api/profile')
      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
      }
    } catch (error) {
      console.error('Failed to load user profile:', error)
    }
  }

  const handleUpdateProfile = async (profile: UserProfile) => {
    try {
      const response = await fetch('/api/profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          profile,
          updateType: 'full'
        }),
      });

      if (response.ok) {
        const data = await response.json()
        setUserProfile(data.profile)
        toast.success('Profile updated successfully!')
        
        // Refresh insights
        await refreshPersonalizedInsights()
      } else {
        throw new Error('Failed to update profile')
      }
    } catch (error) {
      console.error('Failed to update profile:', error)
      toast.error('Failed to update profile')
    }
  }

  const refreshPersonalizedInsights = async () => {
    try {
      const response = await fetch('/api/personalized-agent')
      if (response.ok) {
        const data = await response.json()
        if (data.insights) {
          setPersonalizedInsights(data.insights)
        }
      }
    } catch (error) {
      console.warn('Failed to refresh insights:', error)
    }
  }

  // Load profile and insights on mount (BetterHalf.ai is always active)
  useEffect(() => {
    loadUserProfile()
    refreshPersonalizedInsights()
  }, [])


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
      <Header 
        showInsights={showInsights}
        onToggleInsights={(show) => {
          setShowInsights(show)
          if (show && !personalizedInsights) {
            refreshPersonalizedInsights()
          }
        }}
        onShowProfile={() => setShowProfileManagement(true)}
        storeMemory={storeMemory}
        onToggleMemory={setStoreMemory}
        onClearChat={clearChat}
        insights={personalizedInsights}
      />
      
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
                {/* BetterHalf.ai Chat Interface - 60% Width */}
        <div className="w-full xl:w-3/5 flex flex-col min-w-0 bg-white border-r border-gray-200 overflow-hidden">
          <PersonalizedChatInterface
            messages={personalizedMessages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            isTyping={isTyping}
            onClearChat={clearChat}
            storeMemory={storeMemory}
            onToggleMemory={setStoreMemory}
            insights={showInsights ? personalizedInsights : null}
            onShowProfile={() => setShowProfileManagement(true)}
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

      {/* Profile Management Modal */}
      {showProfileManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
            <ProfileManagement
              profile={userProfile}
              onUpdateProfile={handleUpdateProfile}
              onClose={() => setShowProfileManagement(false)}
            />
          </div>
        </div>
      )}
    </div>
  )
}
