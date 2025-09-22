'use client';

import React, { useState } from 'react';
import { 
  Upload, 
  List, 
  Settings, 
  BarChart3, 
  RefreshCw,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import WalletConnection from './WalletConnection';
import MemoryUploadForm from './MemoryUploadForm';
import MemoryList from './MemoryList';
import { getDecentralizedMemoryService, DecentralizedMemoryResult } from '@/lib/decentralized-memory-service';
import toast from 'react-hot-toast';

type TabType = 'upload' | 'memories' | 'stats';

export default function MemoryDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [stats, setStats] = useState<{ totalMemories: number; version: string } | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  const memoryService = getDecentralizedMemoryService();

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const contractStats = await memoryService.getContractStats();
      setStats(contractStats);
    } catch (error) {
      console.error('Failed to load stats:', error);
      toast.error('Failed to load statistics');
    } finally {
      setLoadingStats(false);
    }
  };

  const handleUploadSuccess = (result: DecentralizedMemoryResult) => {
    console.log('Upload successful:', result);
    // Optionally switch to memories tab to show the new upload
    setActiveTab('memories');
  };

  const handleUploadError = (error: string) => {
    console.error('Upload error:', error);
  };

  const handleMemoryDelete = (memoryId: string) => {
    console.log('Memory deleted:', memoryId);
    // Refresh stats if we're on the stats tab
    if (activeTab === 'stats') {
      loadStats();
    }
  };

  const tabs = [
    { id: 'upload', label: 'Upload', icon: Upload },
    { id: 'memories', label: 'Memories', icon: List },
    { id: 'stats', label: 'Stats', icon: BarChart3 },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Decentralized AI Memory
          </h1>
          <p className="text-gray-600">
            Store and manage your memories on NEAR Protocol and Filecoin
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Wallet Connection */}
            <WalletConnection />

            {/* Navigation Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Navigation</h3>
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id as TabType);
                        if (tab.id === 'stats') {
                          loadStats();
                        }
                      }}
                      className={`
                        w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors
                        ${activeTab === tab.id
                          ? 'bg-blue-100 text-blue-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                        }
                      `}
                    >
                      <Icon className="w-4 h-4 mr-3" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>

            {/* Quick Stats */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium text-gray-900">Quick Stats</h3>
                <button
                  onClick={loadStats}
                  disabled={loadingStats}
                  className="p-1 text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingStats ? 'animate-spin' : ''}`} />
                </button>
              </div>
              
              {stats ? (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Memories</span>
                    <span className="font-medium">{stats.totalMemories}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Contract Version</span>
                    <span className="font-medium">{stats.version}</span>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">
                  {loadingStats ? 'Loading...' : 'Click refresh to load stats'}
                </div>
              )}
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            {activeTab === 'upload' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Upload Memory</h2>
                <MemoryUploadForm
                  onUploadSuccess={handleUploadSuccess}
                  onUploadError={handleUploadError}
                />
              </div>
            )}

            {activeTab === 'memories' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Your Memories</h2>
                <MemoryList
                  onMemoryDelete={handleMemoryDelete}
                />
              </div>
            )}

            {activeTab === 'stats' && (
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-6">Statistics</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Contract Stats */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                      <BarChart3 className="w-5 h-5 text-blue-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">Contract Statistics</h3>
                    </div>
                    
                    {loadingStats ? (
                      <div className="flex items-center justify-center py-8">
                        <RefreshCw className="w-6 h-6 animate-spin text-gray-400" />
                        <span className="ml-2 text-gray-500">Loading stats...</span>
                      </div>
                    ) : stats ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Total Memories</span>
                          <span className="text-2xl font-bold text-blue-600">{stats.totalMemories}</span>
                        </div>
                        <div className="flex justify-between items-center py-2 border-b border-gray-100">
                          <span className="text-gray-600">Contract Version</span>
                          <span className="text-lg font-semibold text-gray-900">{stats.version}</span>
                        </div>
                        <div className="flex justify-between items-center py-2">
                          <span className="text-gray-600">Network</span>
                          <span className="text-sm font-medium text-gray-700">
                            {process.env.NEXT_PUBLIC_NEAR_NETWORK || 'testnet'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <AlertCircle className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                        <p className="text-gray-500">Failed to load statistics</p>
                        <button
                          onClick={loadStats}
                          className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Try again
                        </button>
                      </div>
                    )}
                  </div>

                  {/* System Status */}
                  <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                    <div className="flex items-center mb-4">
                      <CheckCircle className="w-5 h-5 text-green-600 mr-2" />
                      <h3 className="text-lg font-medium text-gray-900">System Status</h3>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">NEAR Wallet</span>
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          memoryService.isWalletConnected()
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {memoryService.isWalletConnected() ? 'Connected' : 'Disconnected'}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2 border-b border-gray-100">
                        <span className="text-gray-600">Filecoin Storage</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Available
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center py-2">
                        <span className="text-gray-600">Synapse SDK</span>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          Ready
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}


