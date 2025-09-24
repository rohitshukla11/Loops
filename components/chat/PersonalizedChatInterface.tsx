'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Bot, User, Loader2, Heart, Calendar, Utensils, Dumbbell, Target } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  memoryId?: string
  insights?: PersonalInsights
  golemExplorerUrl?: string
}

interface PersonalInsights {
  scheduleAnalysis: {
    busyPeriods: string[];
    freeTimes: string[];
    upcomingImportantMeetings: string[];
    workloadLevel: 'light' | 'moderate' | 'heavy' | 'overwhelming';
  };
  recommendations: {
    meals: string[];
    workoutTimes: string[];
    breakSuggestions: string[];
    priorities: string[];
  };
  wellness: {
    stressIndicators: string[];
    energyOptimization: string[];
    balanceScore: number;
  };
}

interface PersonalizedChatInterfaceProps {
  messages: ChatMessage[]
  onSendMessage: (content: string) => void
  isLoading: boolean
  isTyping: boolean
  onClearChat: () => void
  storeMemory: boolean
  onToggleMemory: (enabled: boolean) => void
  insights?: PersonalInsights
  onShowProfile?: () => void
}

export function PersonalizedChatInterface({ 
  messages, 
  onSendMessage, 
  isLoading, 
  isTyping, 
  onClearChat,
  storeMemory,
  onToggleMemory,
  insights,
  onShowProfile
}: PersonalizedChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // showInsights is now controlled by the parent component through the insights prop
  const showInsights = insights !== null && insights !== undefined

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue)
      setInputValue('')
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const formatTime = (date: Date | string) => {
    try {
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      if (isNaN(dateObj.getTime())) {
        return 'Just now';
      }
      return formatDistanceToNow(dateObj, { addSuffix: true });
    } catch (error) {
      console.warn('Invalid date format:', date, error);
      return 'Just now';
    }
  }

  const getWorkloadColor = (level: string) => {
    switch (level) {
      case 'light': return 'text-green-600 bg-green-50'
      case 'moderate': return 'text-yellow-600 bg-yellow-50'
      case 'heavy': return 'text-orange-600 bg-orange-50'
      case 'overwhelming': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getBalanceScoreColor = (score: number) => {
    if (score >= 8) return 'text-green-600 bg-green-50'
    if (score >= 6) return 'text-yellow-600 bg-yellow-50'
    if (score >= 4) return 'text-orange-600 bg-orange-50'
    return 'text-red-600 bg-red-50'
  }

  const quickPrompts = [
    "How's my schedule looking today?",
    "What should I eat for lunch?",
    "When's the best time to workout?",
    "Help me prioritize my tasks"
  ]

  const handleQuickPrompt = (prompt: string) => {
    setInputValue(prompt)
    inputRef.current?.focus()
  }



  return (
    <div className="bg-white rounded-xl shadow-lg border border-slate-200 flex flex-col h-full">


      {/* Compact Daily Analysis */}
      {showInsights && insights && (
        <div className="border-b border-purple-200 bg-gradient-to-r from-purple-50/50 to-pink-50/50 px-3 py-2">
          <div className="flex items-center justify-between mb-1">
            <h4 className="text-xs font-medium text-purple-800">📊 Today's Insights</h4>
            <div className="text-xs text-purple-600">
              Balance: <span className={`font-semibold ${getBalanceScoreColor(insights.wellness.balanceScore)}`}>{insights.wellness.balanceScore}/10</span>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-xs">
            {/* Schedule Summary */}
            <div className="bg-white/60 rounded px-2 py-1">
              <div className="flex items-center space-x-1 mb-0.5">
                <Calendar className="w-2.5 h-2.5 text-purple-600" />
                <span className="font-medium text-slate-700 text-xs">Schedule</span>
              </div>
              <div className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium ${getWorkloadColor(insights.scheduleAnalysis.workloadLevel)}`}>
                {insights.scheduleAnalysis.workloadLevel}
              </div>
            </div>

            {/* Top Priority */}
            <div className="bg-white/60 rounded px-2 py-1">
              <div className="flex items-center space-x-1 mb-0.5">
                <Target className="w-2.5 h-2.5 text-blue-600" />
                <span className="font-medium text-slate-700 text-xs">Focus</span>
              </div>
              <p className="text-slate-600 truncate text-xs">
                {insights.recommendations.priorities[0] || "Stay productive 🎯"}
              </p>
            </div>

            {/* Quick Suggestion */}
            <div className="bg-white/60 rounded px-2 py-1">
              <div className="flex items-center space-x-1 mb-0.5">
                <Heart className="w-2.5 h-2.5 text-pink-600" />
                <span className="font-medium text-slate-700 text-xs">Wellness</span>
              </div>
              <p className="text-slate-600 truncate text-xs">
                {insights.recommendations.meals[0] || insights.recommendations.workoutTimes[0] || "Take care of yourself 💜"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Action Prompts */}
      {messages.length === 0 && (
        <div className="p-4 border-b border-slate-200">
          <div className="flex flex-wrap gap-2">
            {quickPrompts.map((prompt, index) => (
              <button
                key={index}
                onClick={() => handleQuickPrompt(prompt)}
                className="text-xs px-3 py-2 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors border border-purple-200"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gradient-to-b from-purple-50/30 to-white">
        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800 mb-2">Welcome to BetterHalf.ai! 💜</h3>
            <p className="text-slate-600 max-w-md mx-auto">
              I'm your AI companion, here to help you optimize your schedule, suggest healthy meals, find workout times, and support you through your day. 
              I understand your patterns and will never judge - just care about your wellbeing.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`flex max-w-[85%] ${
                message.role === 'user' ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* Avatar */}
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white ml-4'
                    : 'bg-gradient-to-br from-purple-500 to-pink-600 text-white mr-4'
                }`}
              >
                {message.role === 'user' ? (
                  <User className="w-5 h-5" />
                ) : (
                  <Heart className="w-5 h-5" />
                )}
              </div>

              {/* Message Content */}
              <div
                className={`rounded-2xl px-5 py-3 shadow-sm ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-blue-500 to-blue-600 text-white'
                    : 'bg-white text-slate-900 border border-purple-200'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
                <div className="mt-2 flex items-center justify-between">
                  <p
                    className={`text-xs ${
                      message.role === 'user' ? 'text-blue-100' : 'text-slate-500'
                    }`}
                  >
                    {formatTime(message.timestamp)}
                  </p>
                  {message.golemExplorerUrl && (
                    <div className="flex flex-col space-y-1">
                      <a
                        href={message.golemExplorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-purple-600 hover:text-purple-800 underline flex items-center space-x-1"
                        title="View memory on Golem DB explorer"
                      >
                        <span>🔗</span>
                        <span>
                          {message.golemExplorerUrl.includes('/tx/') ? 'View TX on Golem DB' : 'View Entity on Golem DB'}
                        </span>
                      </a>
                      <div className="text-xs text-gray-500">
                        {(message.golemExplorerUrl.includes('/tx/') ? 'Tx' : 'Key')}: {message.golemExplorerUrl.split('/').pop()?.substring(0, 10)}...
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Typing Indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex max-w-[85%]">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center flex-shrink-0 mr-4 shadow-sm">
                <Heart className="w-5 h-5" />
              </div>
              <div className="bg-white text-slate-900 rounded-2xl px-5 py-3 border border-purple-200 shadow-sm">
                <div className="flex items-center space-x-2">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-500" />
                  <span className="text-sm">Analyzing your schedule and thinking...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Enhanced Input Area */}
      <div className="border-t border-slate-200 p-4 bg-white rounded-b-xl">
        {/* Suggestion Pills */}
        {!isLoading && inputValue === '' && (
          <div className="flex flex-wrap gap-2 mb-3">
            <button
              onClick={() => handleQuickPrompt("What should I focus on today?")}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-purple-50 text-purple-700 rounded-full hover:bg-purple-100 transition-colors"
            >
              <Target className="w-3 h-3" />
              <span>Focus</span>
            </button>
            <button
              onClick={() => handleQuickPrompt("Suggest a healthy meal")}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-green-50 text-green-700 rounded-full hover:bg-green-100 transition-colors"
            >
              <Utensils className="w-3 h-3" />
              <span>Meal</span>
            </button>
            <button
              onClick={() => handleQuickPrompt("When should I workout?")}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full hover:bg-orange-100 transition-colors"
            >
              <Dumbbell className="w-3 h-3" />
              <span>Workout</span>
            </button>
            <button
              onClick={() => handleQuickPrompt("How's my work-life balance?")}
              className="flex items-center space-x-1 text-xs px-3 py-1.5 bg-pink-50 text-pink-700 rounded-full hover:bg-pink-100 transition-colors"
            >
              <Heart className="w-3 h-3" />
              <span>Balance</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex space-x-3">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Tell me what's on your mind, or ask for suggestions..."
            className="flex-1 px-4 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
            disabled={isLoading}
          />
          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-xl hover:from-purple-600 hover:to-pink-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-sm"
            disabled={!inputValue.trim() || isLoading}
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Send className="w-5 h-5" />
            )}
          </button>
        </form>
      </div>
    </div>
  )
}
