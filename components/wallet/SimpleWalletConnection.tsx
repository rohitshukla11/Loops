'use client';

import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  LogOut, 
  User, 
  Coins, 
  Loader2, 
  CheckCircle,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { getUnifiedWallet, WalletType } from '@/lib/unified-wallet';
import toast from 'react-hot-toast';

export default function SimpleWalletConnection() {
  const [isConnecting, setIsConnecting] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [account, setAccount] = useState<any>(null);
  const [balance, setBalance] = useState<string>('0');
  const [loading, setLoading] = useState(true);
  const [showWalletOptions, setShowWalletOptions] = useState(false);
  const [isMetaMaskInstalled, setIsMetaMaskInstalled] = useState(false);

  const walletService = getUnifiedWallet();

  useEffect(() => {
    checkConnectionStatus();
    checkMetaMaskInstallation();
  }, []);

  const checkMetaMaskInstallation = async () => {
    const installed = await walletService.isMetaMaskInstalled();
    setIsMetaMaskInstalled(installed);
  };

  const checkConnectionStatus = async () => {
    try {
      setLoading(true);
      await walletService.initialize();
      
      const connected = walletService.isWalletConnected();
      setIsConnected(connected);
      
      if (connected) {
        const accountData = walletService.getAccount();
        setAccount(accountData);
        
        if (accountData) {
          try {
            const accountBalance = await walletService.getAccountBalance();
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

  const handleConnect = async (walletType: WalletType) => {
    try {
      setIsConnecting(true);
      setShowWalletOptions(false);
      
      const success = await walletService.connectWallet(walletType);
      
      if (success) {
        setIsConnected(true);
        const accountData = walletService.getAccount();
        setAccount(accountData);
        
        if (accountData) {
          try {
            const accountBalance = await walletService.getAccountBalance();
            setBalance(accountBalance);
          } catch (error) {
            console.error('Failed to get balance:', error);
          }
        }
        
        toast.success(`${walletType === 'near' ? 'NEAR' : 'MetaMask'} wallet connected successfully!`);
      } else {
        toast.error(`Failed to connect ${walletType === 'near' ? 'NEAR' : 'MetaMask'} wallet`);
      }
    } catch (error) {
      console.error('Connection error:', error);
      toast.error(`Failed to connect ${walletType === 'near' ? 'NEAR' : 'MetaMask'} wallet`);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    try {
      await walletService.disconnectWallet();
      setIsConnected(false);
      setAccount(null);
      setBalance('0');
      toast.success('Wallet disconnected');
    } catch (error) {
      console.error('Disconnect error:', error);
      toast.error('Failed to disconnect wallet');
    }
  };

  const formatBalance = (balance: string, walletType: WalletType) => {
    const num = parseFloat(balance);
    if (num === 0) return `0 ${walletType === 'near' ? 'NEAR' : 'ETH'}`;
    if (num < 0.001) return `< 0.001 ${walletType === 'near' ? 'NEAR' : 'ETH'}`;
    return `${num.toFixed(3)} ${walletType === 'near' ? 'NEAR' : 'ETH'}`;
  };

  const installMetaMask = () => {
    window.open('https://metamask.io/download/', '_blank');
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
              Connect Your Wallet
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Choose your preferred wallet to connect
            </p>
          </div>
          
          {!showWalletOptions ? (
            <button
              onClick={() => setShowWalletOptions(true)}
              disabled={isConnecting}
              className="inline-flex items-center px-4 py-2 rounded-md font-medium transition-colors bg-blue-600 text-white hover:bg-blue-700"
            >
              <Wallet className="w-4 h-4 mr-2" />
              Connect Wallet
            </button>
          ) : (
            <div className="space-y-3">
              {/* NEAR Wallet Option */}
              <button
                onClick={() => handleConnect('near')}
                disabled={isConnecting}
                className="w-full flex items-center justify-center px-4 py-3 rounded-md font-medium transition-colors bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
              >
                {isConnecting ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Wallet className="w-4 h-4 mr-2" />
                )}
                Connect NEAR Wallet
              </button>

              {/* MetaMask Option */}
              {isMetaMaskInstalled ? (
                <button
                  onClick={() => handleConnect('metamask')}
                  disabled={isConnecting}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-md font-medium transition-colors bg-orange-600 text-white hover:bg-orange-700 disabled:opacity-50"
                >
                  {isConnecting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Wallet className="w-4 h-4 mr-2" />
                  )}
                  Connect MetaMask
                </button>
              ) : (
                <button
                  onClick={installMetaMask}
                  className="w-full flex items-center justify-center px-4 py-3 rounded-md font-medium transition-colors bg-gray-600 text-white hover:bg-gray-700"
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Install MetaMask
                </button>
              )}

              <button
                onClick={() => setShowWalletOptions(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="w-5 h-5 text-blue-600" />
                </div>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {account?.walletType === 'near' ? 'NEAR' : 'MetaMask'} Wallet
                </p>
                <p className="text-xs text-gray-500 font-mono">
                  {account?.address?.slice(0, 8)}...{account?.address?.slice(-8)}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-xs text-green-600">Connected</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
            <div className="flex items-center space-x-2">
              <Coins className="w-4 h-4 text-gray-500" />
              <span className="text-sm text-gray-600">Balance</span>
            </div>
            <span className="text-sm font-medium text-gray-900">
              {formatBalance(balance, account?.walletType || 'near')}
            </span>
          </div>

          <button
            onClick={handleDisconnect}
            className="w-full flex items-center justify-center px-4 py-2 text-sm font-medium text-red-600 bg-red-50 rounded-md hover:bg-red-100 transition-colors"
          >
            <LogOut className="w-4 h-4 mr-2" />
            Disconnect Wallet
          </button>
        </div>
      )}
    </div>
  );
}





