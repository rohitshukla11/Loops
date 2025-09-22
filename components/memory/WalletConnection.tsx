'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  LogOut, 
  User, 
  Coins, 
  Loader2, 
  CheckCircle,
  AlertCircle 
} from 'lucide-react';
import { getDecentralizedMemoryService } from '@/lib/decentralized-memory-service';
import toast from 'react-hot-toast';

export default function WalletConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);

  const memoryService = getDecentralizedMemoryService();

  useEffect(() => {
    checkConnectionStatus();
  }, []);

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      await memoryService.initialize();
      
      const connected = memoryService.isWalletConnected();
      setIsConnected(connected);
      
      if (connected) {
        const account = memoryService.getAccountId();
        setAccountId(account);
        
        if (account) {
          try {
            const accountBalance = await memoryService.getAccountBalance();
            setBalance(accountBalance);
          } catch (error) {
            console.error('Failed to get balance:', error);
          }
        }
      }
    } catch (error) {
      console.error('Failed to check connection status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleConnect = async () => {
    try {
      setIsConnecting(true);
      
      const success = await memoryService.connectWallet();
      
      if (success) {
        setIsConnected(true);
        const account = memoryService.getAccountId();
        setAccountId(account);
        
        if (account) {
          try {
            const accountBalance = await memoryService.getAccountBalance();
            setBalance(accountBalance);
          } catch (error) {
            console.error('Failed to get balance:', error);
          }
        }
        
        toast.success('Wallet connected successfully!');
      } else {
        toast.error('Failed to connect wallet');
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await memoryService.disconnectWallet();
      setIsConnected(false);
      setAccountId(null);
      setBalance('0');
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num === 0) return '0 NEAR';
    if (num < 0.001) return '< 0.001 NEAR';
    return `${num.toFixed(3)} NEAR`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
        <span className="ml-2 text-gray-600">Checking wallet status...</span>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      {!isConnected ? (
        <div className="text-center">
          <div className="mb-4">
            <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-2" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              Connect Your NEAR Wallet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Connect your NEAR wallet to upload and manage memories
            </p>
          </div>
          
          <button
            onClick={handleConnect}
            disabled={isConnecting}
            className={`
              inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors
              ${isConnecting
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {isConnecting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Connecting...
              </>
            ) : (
              <>
                <Wallet className="w-4 h-4 mr-2" />
                Connect Wallet
              </>
            )}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Wallet Connected</h3>
                <p className="text-xs text-gray-500 font-mono">{accountId}</p>
              </div>
            </div>
            
            <button
              onClick={handleDisconnect}
              className="p-2 text-gray-400 hover:text-red-600 transition-colors"
              title="Disconnect wallet"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-md p-3">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center text-gray-600">
                <Coins className="w-4 h-4 mr-1" />
                <span>Balance</span>
              </div>
              <span className="font-medium text-gray-900">
                {formatBalance(balance)}
              </span>
            </div>
          </div>

          <div className="text-xs text-gray-500 text-center">
            Connected to NEAR {process.env.NEXT_PUBLIC_NEAR_NETWORK || 'testnet'}
          </div>
        </div>
      )}
    </div>
  );
}


