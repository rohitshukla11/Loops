'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { getNearWallet } from '@/lib/near-wallet'

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
  const [isLoading, setIsLoading] = useState(true)

  const nearWallet = getNearWallet()

  useEffect(() => {
    initializeWallet()
  }, [])

  const initializeWallet = async () => {
    try {
      await nearWallet.initialize()
      const connected = nearWallet.isConnected()
      setIsConnected(connected)
      
      if (connected) {
        setAccountId(nearWallet.getAccountId())
        const accountBalance = await nearWallet.getAccountBalance()
        setBalance(accountBalance)
      }
    } catch (error) {
      console.error('Failed to initialize wallet:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const connect = async (): Promise<boolean> => {
    try {
      setIsLoading(true)
      const success = await nearWallet.connectWallet()
      
      if (success) {
        setIsConnected(true)
        setAccountId(nearWallet.getAccountId())
        const accountBalance = await nearWallet.getAccountBalance()
        setBalance(accountBalance)
      }
      
      return success
    } catch (error) {
      console.error('Failed to connect wallet:', error)
      return false
    } finally {
      setIsLoading(false)
    }
  }

  const disconnect = async (): Promise<void> => {
    try {
      await nearWallet.disconnectWallet()
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
    isLoading,
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



