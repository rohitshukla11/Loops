'use client'

import { useState } from 'react'
import { useWallet } from '@/components/providers/WalletProvider'
import { Wallet, User, LogOut, Menu, X } from 'lucide-react'

export function Header() {
  const { isConnected, accountId, balance, connect, disconnect, isLoading } = useWallet()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance)
    if (num < 0.001) return '< 0.001'
    return num.toFixed(3)
  }

  const formatAccountId = (accountId: string | null) => {
    if (!accountId) return 'Unknown Account'
    if (accountId.length <= 20) return accountId
    return `${accountId.slice(0, 8)}...${accountId.slice(-8)}`
  }

  return (
    <header className="bg-white shadow-sm border-b border-slate-200">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-700 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">🤖</span>
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                AI Agent with IPFS Memory
              </h1>
              <p className="text-sm text-slate-600">Intelligent conversations with decentralized memory storage</p>
            </div>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-8">
            <nav className="flex items-center space-x-6">
              <a href="#" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Chat
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                History
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Settings
              </a>
            </nav>

            {/* Wallet Connection */}
            <div className="flex items-center space-x-3">
              {isConnected ? (
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-3 py-2">
                    <User className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-900">
                      {formatAccountId(accountId)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 bg-green-50 rounded-lg px-3 py-2">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      {formatBalance(balance)} NEAR
                    </span>
                  </div>
                  <button
                    onClick={disconnect}
                    className="inline-flex items-center px-3 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <LogOut className="w-4 h-4 mr-1" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="inline-flex items-center justify-center p-2 text-slate-600 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
            >
              {isMenuOpen ? (
                <X className="w-5 h-5" />
              ) : (
                <Menu className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {isMenuOpen && (
          <div className="md:hidden border-t border-slate-200 py-4">
            <nav className="flex flex-col space-y-3 mb-4">
              <a href="#" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Chat
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                History
              </a>
              <a href="#" className="text-slate-600 hover:text-slate-900 font-medium transition-colors">
                Settings
              </a>
            </nav>

            {/* Mobile Wallet Connection */}
            <div className="border-t border-slate-200 pt-4">
              {isConnected ? (
                <div className="space-y-3">
                  <div className="flex items-center space-x-2 bg-slate-50 rounded-lg px-3 py-2">
                    <User className="w-4 h-4 text-slate-600" />
                    <span className="text-sm font-medium text-slate-900">
                      {formatAccountId(accountId)}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 bg-green-50 rounded-lg px-3 py-2">
                    <Wallet className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-900">
                      {formatBalance(balance)} NEAR
                    </span>
                  </div>
                  <button
                    onClick={disconnect}
                    className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                    disabled={isLoading}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    Disconnect
                  </button>
                </div>
              ) : (
                <button
                  onClick={connect}
                  className="w-full inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={isLoading}
                >
                  <Wallet className="w-4 h-4 mr-2" />
                  {isLoading ? 'Connecting...' : 'Connect Wallet'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
