'use client'

import { createContext, useContext, useState, ReactNode } from 'react'

interface WalletContextType {
  isConnected: boolean
  accountId: string | null
  balance: string
  connect: () => Promise<boolean>
  disconnect: () => Promise<void>
  isLoading: boolean
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [isConnected, setIsConnected] = useState(false)
  const [accountId, setAccountId] = useState<string | null>(null)
  const [balance, setBalance] = useState('0')
  const [isLoading, setIsLoading] = useState(false)

  const connect = async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      // Simulate wallet connection for UI purposes only
      // Memory operations use Golem Base directly without wallet dependency
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIsConnected(true)
      setAccountId('ethereum-wallet')
      setBalance('0.000')
      return true
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = async (): Promise<void> => {
    try {
      setIsConnected(false)
      setAccountId(null)
      setBalance('0')
    } catch (error) {
      console.error('Failed to disconnect wallet:', error)
    }
  }

  const value: WalletContextType = {
    isConnected,
    accountId,
    balance,
    connect,
    disconnect,
    isLoading
  }

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error('useWallet must be used within a WalletProvider')
  }
  return context
}