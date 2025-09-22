'use client'

import { useState } from 'react'
import { MemoryEntry } from '@/types/memory'
import { 
  MoreVertical, 
  Trash2, 
  Edit, 
  Copy, 
  Shield, 
  Clock, 
  Tag,
  ExternalLink,
  Loader2
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

interface MemoryCardProps {
  memory: MemoryEntry
  onDelete: () => void
  isDeleting: boolean
  typeIcon: string
  typeLabel: string
}

export function MemoryCard({ 
  memory, 
  onDelete, 
  isDeleting, 
  typeIcon, 
  typeLabel 
}: MemoryCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)

  const formatDate = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const truncateContent = (content: string, maxLength: number = 150) => {
    if (content.length <= maxLength) return content
    return content.slice(0, maxLength) + '...'
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(memory.content)
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy content:', error)
    }
  }

  const handleViewOnIPFS = () => {
    if (memory.ipfsHash) {
      const ipfsUrl = `https://ipfs.io/ipfs/${memory.ipfsHash}`
      window.open(ipfsUrl, '_blank')
    }
  }

  const handleViewOnNEAR = () => {
    if (memory.nearTransactionId) {
      const nearUrl = `https://explorer.testnet.near.org/transactions/${memory.nearTransactionId}`
      window.open(nearUrl, '_blank')
    }
  }

  return (
    <div className="card p-6 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-2">
          <span className="text-2xl">{typeIcon}</span>
          <div>
            <h3 className="font-medium text-slate-900">{typeLabel}</h3>
            <p className="text-sm text-slate-500">{memory.category}</p>
          </div>
        </div>

        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="btn btn-outline btn-sm"
            disabled={isDeleting}
          >
            {isDeleting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <MoreVertical className="w-4 h-4" />
            )}
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg border border-slate-200 z-10">
              <div className="py-1">
                <button
                  onClick={() => {
                    setIsExpanded(!isExpanded)
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  {isExpanded ? 'Collapse' : 'Expand'}
                </button>
                <button
                  onClick={() => {
                    handleCopy()
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy Content
                </button>
                {memory.ipfsHash && (
                  <button
                    onClick={() => {
                      handleViewOnIPFS()
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on IPFS
                  </button>
                )}
                {memory.nearTransactionId && (
                  <button
                    onClick={() => {
                      handleViewOnNEAR()
                      setShowMenu(false)
                    }}
                    className="flex items-center w-full px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View on NEAR
                  </button>
                )}
                <div className="border-t border-slate-200 my-1"></div>
                <button
                  onClick={() => {
                    onDelete()
                    setShowMenu(false)
                  }}
                  className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="mb-4">
        <p className="text-slate-700 leading-relaxed">
          {isExpanded ? memory.content : truncateContent(memory.content)}
        </p>
        {!isExpanded && memory.content.length > 150 && (
          <button
            onClick={() => setIsExpanded(true)}
            className="text-primary-600 text-sm font-medium mt-2 hover:text-primary-700"
          >
            Read more...
          </button>
        )}
      </div>

      {/* Tags */}
      {memory.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {memory.tags.map((tag, index) => (
            <span
              key={index}
              className="badge badge-secondary text-xs"
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Metadata */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <div className="flex items-center space-x-4">
          <span className="flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            {formatDate(memory.createdAt)}
          </span>
          {memory.encrypted && (
            <span className="flex items-center text-green-600">
              <Shield className="w-4 h-4 mr-1" />
              Encrypted
            </span>
          )}
        </div>
        <div className="text-xs">
          v{memory.metadata.version}
        </div>
      </div>

      {/* IPFS Hash (if available) */}
      {memory.ipfsHash && (
        <div className="mt-3 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500">
            <span className="font-medium">IPFS:</span> {memory.ipfsHash.slice(0, 20)}...
          </div>
        </div>
      )}
    </div>
  )
}



