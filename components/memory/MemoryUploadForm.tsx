'use client';

import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, File, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import { getDecentralizedMemoryService, DecentralizedMemoryResult } from '@/lib/decentralized-memory-service';
import toast from 'react-hot-toast';

interface MemoryUploadFormProps {
  onUploadSuccess?: (result: DecentralizedMemoryResult) => void;
  onUploadError?: (error: string) => void;
}

interface UploadState {
  isUploading: boolean;
  progress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  result?: DecentralizedMemoryResult;
}

export default function MemoryUploadForm({ 
  onUploadSuccess, 
  onUploadError 
}: MemoryUploadFormProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    isUploading: false,
    progress: 0,
    status: 'idle'
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [memoryId, setMemoryId] = useState('');
  const [category, setCategory] = useState('general');
  const [tags, setTags] = useState('');
  const [encrypt, setEncrypt] = useState(false);

  const memoryService = getDecentralizedMemoryService();

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setSelectedFile(acceptedFiles[0]);
      setUploadState({
        isUploading: false,
        progress: 0,
        status: 'idle'
      });
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/*': ['.txt', '.md', '.json'],
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'video/*': ['.mp4', '.webm', '.ogg'],
      'audio/*': ['.mp3', '.wav', '.ogg'],
      'application/pdf': ['.pdf'],
      'application/json': ['.json']
    },
    maxFiles: 1,
    maxSize: 10 * 1024 * 1024 // 10MB limit
  });

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!memoryService.isWalletConnected()) {
      toast.error('Please connect your NEAR wallet first');
      return;
    }

    setUploadState({
      isUploading: true,
      progress: 0,
      status: 'uploading'
    });

    try {
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setUploadState(prev => ({
          ...prev,
          progress: Math.min(prev.progress + 10, 90)
        }));
      }, 200);

      const result = await memoryService.uploadMemory({
        file: selectedFile,
        memoryId: memoryId || undefined,
        category,
        tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag),
        encrypt,
        accessPolicy: {
          owner: memoryService.getAccountId() || '',
          permissions: []
        }
      });

      clearInterval(progressInterval);

      if (result.success) {
        setUploadState({
          isUploading: false,
          progress: 100,
          status: 'success',
          result
        });

        toast.success('Memory uploaded successfully!');
        onUploadSuccess?.(result);

        // Reset form
        setSelectedFile(null);
        setMemoryId('');
        setCategory('general');
        setTags('');
        setEncrypt(false);
      } else {
        setUploadState({
          isUploading: false,
          progress: 0,
          status: 'error',
          result
        });

        toast.error(result.error || 'Upload failed');
        onUploadError?.(result.error || 'Upload failed');
      }
    } catch (error) {
      setUploadState({
        isUploading: false,
        progress: 0,
        status: 'error'
      });

      const errorMessage = error instanceof Error ? error.message : 'Upload failed';
      toast.error(errorMessage);
      onUploadError?.(errorMessage);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    setUploadState({
      isUploading: false,
      progress: 0,
      status: 'idle'
    });
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type === 'application/pdf') return '📄';
    if (file.type.startsWith('text/')) return '📝';
    return '📁';
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="w-full max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Upload Memory</h2>
      
      {/* File Drop Zone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
          ${isDragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
          }
          ${selectedFile ? 'border-green-400 bg-green-50' : ''}
        `}
      >
        <input {...getInputProps()} />
        
        {selectedFile ? (
          <div className="space-y-4">
            <div className="flex items-center justify-center space-x-2">
              <span className="text-4xl">{getFileIcon(selectedFile)}</span>
              <div className="text-left">
                <p className="font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-sm text-gray-500">{formatFileSize(selectedFile.size)}</p>
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeFile();
                }}
                className="p-1 text-gray-400 hover:text-red-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 text-gray-400 mx-auto" />
            <div>
              <p className="text-lg font-medium text-gray-900">
                {isDragActive ? 'Drop the file here' : 'Drag & drop a file here'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                or click to select a file
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Supports: Images, Videos, Audio, PDF, Text files (Max 10MB)
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Upload Options */}
      {selectedFile && (
        <div className="mt-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Memory ID (optional)
              </label>
              <input
                type="text"
                value={memoryId}
                onChange={(e) => setMemoryId(e.target.value)}
                placeholder="Auto-generated if empty"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="general">General</option>
                <option value="conversation">Conversation</option>
                <option value="document">Document</option>
                <option value="media">Media</option>
                <option value="code">Code</option>
                <option value="personal">Personal</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tags (comma-separated)
            </label>
            <input
              type="text"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g., important, work, project"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center">
            <input
              type="checkbox"
              id="encrypt"
              checked={encrypt}
              onChange={(e) => setEncrypt(e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="encrypt" className="ml-2 block text-sm text-gray-700">
              Encrypt memory content
            </label>
          </div>
        </div>
      )}

      {/* Upload Progress */}
      {uploadState.isUploading && (
        <div className="mt-6">
          <div className="flex items-center justify-between text-sm text-gray-600 mb-2">
            <span>Uploading to Filecoin...</span>
            <span>{uploadState.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${uploadState.progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Upload Status */}
      {uploadState.status === 'success' && uploadState.result && (
        <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">Upload Successful!</p>
              <p className="text-xs text-green-600 mt-1">
                Memory ID: {uploadState.result.memoryId}
              </p>
              <p className="text-xs text-green-600">
                CID: {uploadState.result.cid}
              </p>
            </div>
          </div>
        </div>
      )}

      {uploadState.status === 'error' && uploadState.result && (
        <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <div>
              <p className="text-sm font-medium text-red-800">Upload Failed</p>
              <p className="text-xs text-red-600 mt-1">
                {uploadState.result.error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Upload Button */}
      {selectedFile && (
        <div className="mt-6">
          <button
            onClick={handleUpload}
            disabled={uploadState.isUploading || !memoryService.isWalletConnected()}
            className={`
              w-full flex items-center justify-center px-4 py-3 rounded-md font-medium transition-colors
              ${uploadState.isUploading || !memoryService.isWalletConnected()
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-blue-600 text-white hover:bg-blue-700'
              }
            `}
          >
            {uploadState.isUploading ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 mr-2" />
                Upload Memory
              </>
            )}
          </button>
          
          {!memoryService.isWalletConnected() && (
            <p className="text-sm text-red-600 mt-2 text-center">
              Please connect your NEAR wallet to upload memories
            </p>
          )}
        </div>
      )}
    </div>
  );
}


