'use client'

import { useState } from 'react'
import { MemoryType } from '@/types/memory'
import { X, Plus, Minus } from 'lucide-react'

interface CreateMemoryModalProps {
  onClose: () => void
  onSubmit: (data: {
    content: string
    type: MemoryType
    category: string
    tags: string[]
    encrypt: boolean
  }) => void
}

const MEMORY_TYPES: { value: MemoryType; label: string; icon: string; description: string }[] = [
  {
    value: 'conversation',
    label: 'Conversation',
    icon: '💬',
    description: 'Chat history and dialogue with AI agents'
  },
  {
    value: 'learned_fact',
    label: 'Learned Fact',
    icon: '🧠',
    description: 'Knowledge and insights discovered by the AI'
  },
  {
    value: 'user_preference',
    label: 'User Preference',
    icon: '⚙️',
    description: 'Personal settings and customization data'
  },
  {
    value: 'task_outcome',
    label: 'Task Outcome',
    icon: '✅',
    description: 'Results and logs from completed tasks'
  },
  {
    value: 'multimedia',
    label: 'Multimedia',
    icon: '🎵',
    description: 'Images, audio, video, and other media'
  },
  {
    value: 'workflow',
    label: 'Workflow',
    icon: '🔄',
    description: 'Process definitions and automation rules'
  },
  {
    value: 'agent_share',
    label: 'Agent Share',
    icon: '🤝',
    description: 'Knowledge shared between different AI agents'
  },
]

export function CreateMemoryModal({ onClose, onSubmit }: CreateMemoryModalProps) {
  const [content, setContent] = useState('')
  const [type, setType] = useState<MemoryType>('conversation')
  const [category, setCategory] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [newTag, setNewTag] = useState('')
  const [encrypt, setEncrypt] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!content.trim()) {
      alert('Please enter some content for your memory')
      return
    }

    if (!category.trim()) {
      alert('Please enter a category for your memory')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        content: content.trim(),
        type,
        category: category.trim(),
        tags,
        encrypt
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddTag = () => {
    if (newTag.trim() && !tags.includes(newTag.trim())) {
      setTags([...tags, newTag.trim()])
      setNewTag('')
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove))
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleAddTag()
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200">
          <h2 className="text-xl font-semibold text-slate-900">Create New Memory</h2>
          <button
            onClick={onClose}
            className="btn btn-outline btn-sm"
            disabled={isSubmitting}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Memory Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-3">
              Memory Type
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {MEMORY_TYPES.map((memoryType) => (
                <button
                  key={memoryType.value}
                  type="button"
                  onClick={() => setType(memoryType.value)}
                  className={`p-4 rounded-lg border text-left transition-colors ${
                    type === memoryType.value
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{memoryType.icon}</span>
                    <div>
                      <div className="font-medium text-slate-900">
                        {memoryType.label}
                      </div>
                      <div className="text-sm text-slate-500">
                        {memoryType.description}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Category
            </label>
            <input
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="e.g., Work, Personal, Research..."
              className="input w-full"
              required
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Content
            </label>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Enter your memory content here..."
              className="textarea w-full min-h-[120px]"
              required
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Tags
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {tags.map((tag, index) => (
                <span
                  key={index}
                  className="badge badge-primary flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => handleRemoveTag(tag)}
                    className="ml-2 hover:text-red-600"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={newTag}
                onChange={(e) => setNewTag(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Add a tag..."
                className="input flex-1"
              />
              <button
                type="button"
                onClick={handleAddTag}
                className="btn btn-outline"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Encryption */}
          <div>
            <label className="flex items-center space-x-3">
              <input
                type="checkbox"
                checked={encrypt}
                onChange={(e) => setEncrypt(e.target.checked)}
                className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
              />
              <div>
                <div className="text-sm font-medium text-slate-700">
                  Encrypt this memory
                </div>
                <div className="text-sm text-slate-500">
                  Content will be encrypted before storage for enhanced privacy
                </div>
              </div>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end space-x-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-outline"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !content.trim() || !category.trim()}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Creating...
                </>
              ) : (
                'Create Memory'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}



