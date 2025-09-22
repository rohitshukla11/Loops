'use client';

import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Filter, 
  Download, 
  Trash2, 
  Eye, 
  EyeOff, 
  Calendar,
  File,
  Image,
  Video,
  Music,
  FileText,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { getMemoryService } from '@/lib/memory-service';
import { MemoryEntry } from '@/types/memory';
import toast from 'react-hot-toast';

interface MemoryListProps {
  onMemorySelect?: (memoryId: string) => void;
  onMemoryDelete?: (memoryId: string) => void;
}

interface MemoryItemProps {
  memory: MemoryEntry;
  onSelect: (memoryId: string) => void;
  onDelete: (memoryId: string) => void;
  onView: (memoryId: string) => void;
}

function MemoryItem({ memory, onSelect, onDelete, onView }: MemoryItemProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showContent, setShowContent] = useState(false);
  const [content, setContent] = useState<string | null>(null);
  const [loadingContent, setLoadingContent] = useState(false);

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'conversation': return <FileText className="w-5 h-5 text-blue-500" />;
      case 'learned_fact': return <FileText className="w-5 h-5 text-green-500" />;
      case 'user_preference': return <FileText className="w-5 h-5 text-orange-500" />;
      case 'multimedia': return <Image className="w-5 h-5 text-purple-500" />;
      default: return <File className="w-5 h-5 text-gray-400" />;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown size';
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      setIsDeleting(true);
      try {
        const memoryService = getMemoryService();
        await memoryService.deleteMemory(memory.id);
        toast.success('Memory deleted successfully');
        onDelete(memory.id);
      } catch (error) {
        console.error('Failed to delete memory:', error);
        toast.error('Failed to delete memory');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const handleViewContent = async () => {
    if (content) {
      setShowContent(!showContent);
      return;
    }

    setLoadingContent(true);
    try {
      const memoryService = getMemoryService();
      const fullMemory = await memoryService.getMemory(memory.id);

      if (fullMemory) {
        setContent(fullMemory.content);
        setShowContent(true);
      } else {
        toast.error('Failed to load memory content');
      }
    } catch (error) {
      console.error('Failed to load memory content:', error);
      toast.error('Failed to load memory content');
    } finally {
      setLoadingContent(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          <div className="flex-shrink-0">
            {getFileIcon(memory.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2">
              <h3 className="text-sm font-medium text-gray-900 truncate">
                {memory.id}
              </h3>
              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {memory.type}
              </span>
            </div>
            
            <div className="mt-1 flex items-center space-x-4 text-xs text-gray-500">
              <span className="flex items-center">
                <Calendar className="w-3 h-3 mr-1" />
                {formatDate(memory.createdAt)}
              </span>
              <span>{formatFileSize(memory.metadata?.size)}</span>
              <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                {memory.ipfsHash ? memory.ipfsHash.substring(0, 12) + '...' : 'N/A'}
              </span>
            </div>

          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onView(memory.id)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="View details"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={handleViewContent}
            disabled={loadingContent}
            className="p-2 text-gray-400 hover:text-green-600 transition-colors disabled:opacity-50"
            title={showContent ? "Hide content" : "View content"}
          >
            {loadingContent ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : showContent ? (
              <EyeOff className="w-4 h-4" />
            ) : (
              <Eye className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleDelete}
            disabled={isDeleting}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50"
            title="Delete memory"
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Trash2 className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Content Preview */}
      {showContent && content && (
        <div className="mt-4 p-3 bg-gray-50 rounded-md">
          <div className="text-xs text-gray-600 mb-2">Content Preview:</div>
          <div className="text-sm text-gray-800 max-h-32 overflow-y-auto">
            {content.length > 500 ? `${content.substring(0, 500)}...` : content}
          </div>
        </div>
      )}
    </div>
  );
}

export default function MemoryList({ onMemorySelect, onMemoryDelete }: MemoryListProps) {
  const [memories, setMemories] = useState<MemoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const memoryService = getMemoryService();

  const loadMemories = async (page: number = 0, reset: boolean = false) => {
    try {
      setLoading(true);
      
      if (searchQuery.trim()) {
        // Search memories
        const searchResult = await memoryService.searchMemories({
          query: searchQuery,
          limit: 20,
          offset: page * 20
        });
        setMemories(reset ? searchResult.memories : [...memories, ...searchResult.memories]);
        setHasMore(searchResult.memories.length === 20);
      } else {
        // Load user memories - for now, we'll use search with empty query
        const searchResult = await memoryService.searchMemories({
          query: '',
          limit: 20,
          offset: page * 20
        });
        setMemories(reset ? searchResult.memories : [...memories, ...searchResult.memories]);
        setHasMore(searchResult.memories.length === 20);
      }
    } catch (error) {
      console.error('Failed to load memories:', error);
      toast.error('Failed to load memories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMemories(0, true);
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadMemories(0, true);
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    setCurrentPage(0);
  };

  const handleLoadMore = () => {
    const nextPage = currentPage + 1;
    setCurrentPage(nextPage);
    loadMemories(nextPage, false);
  };

  const handleMemoryDelete = (memoryId: string) => {
    setMemories(memories.filter(m => m.id !== memoryId));
    onMemoryDelete?.(memoryId);
  };

  const filteredMemories = memories.filter(memory => {
    if (filterCategory === 'all') return true;
    // Add category filtering logic here if needed
    return true;
  });

  // Note: Wallet connection check removed as it's handled at the app level

  return (
    <div className="w-full max-w-4xl mx-auto">
      {/* Search and Filter */}
      <div className="mb-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search memories..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Categories</option>
              <option value="general">General</option>
              <option value="conversation">Conversation</option>
              <option value="document">Document</option>
              <option value="media">Media</option>
              <option value="code">Code</option>
              <option value="personal">Personal</option>
            </select>
          </div>
        </div>
      </div>

      {/* Memories List */}
      <div className="space-y-4">
        {loading && memories.length === 0 ? (
          <div className="text-center py-12">
            <Loader2 className="w-8 h-8 text-gray-400 mx-auto mb-4 animate-spin" />
            <p className="text-gray-500">Loading memories...</p>
          </div>
        ) : filteredMemories.length === 0 ? (
          <div className="text-center py-12">
            <File className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Memories Found</h3>
            <p className="text-gray-500">
              {searchQuery ? 'No memories match your search' : 'Upload your first memory to get started'}
            </p>
          </div>
        ) : (
          filteredMemories.map((memory) => (
            <MemoryItem
              key={memory.id}
              memory={memory}
              onSelect={onMemorySelect || (() => {})}
              onDelete={handleMemoryDelete}
              onView={onMemorySelect || (() => {})}
            />
          ))
        )}
      </div>

      {/* Load More Button */}
      {hasMore && !loading && (
        <div className="mt-6 text-center">
          <button
            onClick={handleLoadMore}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin inline" />
                Loading...
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}

      {loading && memories.length > 0 && (
        <div className="mt-4 text-center">
          <Loader2 className="w-4 h-4 text-gray-400 mx-auto animate-spin" />
        </div>
      )}
    </div>
  );
}