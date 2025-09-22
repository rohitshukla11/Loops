import { NearWalletService, getNearWallet } from './near-wallet';
import { GolemStorageService, getGolemStorage } from './golem-storage';
import { MemoryEntry, MemoryMetadata, MemoryType, Permission, AccessPolicy } from '@/types/memory';
import { MemoryAnchor } from '@/types/near';
import { MemoryValidator, ErrorHandler } from './validation';

export interface DecentralizedMemoryResult {
  success: boolean;
  memoryId?: string;
  cid?: string;
  transactionHash?: string;
  error?: string;
}

export interface MemoryUploadOptions {
  file: File;
  memoryId?: string;
  category?: string;
  tags?: string[];
  accessPolicy?: AccessPolicy;
  encrypt?: boolean;
}

export interface MemoryRetrieveOptions {
  memoryId: string;
  includeContent?: boolean;
}

export class DecentralizedMemoryService {
  private nearWallet: NearWalletService;
  private golemStorage: GolemStorageService;
  private isInitialized = false;

  constructor() {
    this.nearWallet = getNearWallet();
    this.golemStorage = getGolemStorage({
      privateKey: process.env.NEXT_PUBLIC_GOLEM_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
      chainId: parseInt(process.env.NEXT_PUBLIC_GOLEM_CHAIN_ID || '60138453025'),
      rpcUrl: process.env.NEXT_PUBLIC_GOLEM_RPC_URL || 'https://kaolin.holesky.golemdb.io/rpc',
      wsUrl: process.env.NEXT_PUBLIC_GOLEM_WS_URL || 'wss://kaolin.holesky.golemdb.io/rpc/ws',
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize both services
      await this.nearWallet.initialize();
      await this.golemStorage.initialize();
      
      this.isInitialized = true;
      console.log('Decentralized memory service initialized');
    } catch (error) {
      console.error('Failed to initialize decentralized memory service:', error);
      throw new Error('Memory service initialization failed');
    }
  }

  async connectWallet(): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.nearWallet.connectWallet();
  }

  async disconnectWallet(): Promise<void> {
    await this.nearWallet.disconnectWallet();
  }

  isWalletConnected(): boolean {
    return this.nearWallet.isConnected();
  }

  getAccountId(): string | null {
    return this.nearWallet.getAccountId();
  }

  async uploadMemory(options: MemoryUploadOptions): Promise<DecentralizedMemoryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isWalletConnected()) {
      return {
        success: false,
        error: ErrorHandler.createUserFriendlyMessage('Wallet not connected')
      };
    }

    try {
      // Validate input
      const validation = MemoryValidator.validateMemoryUpload(options);
      if (!validation.isValid) {
        return {
          success: false,
          error: `Validation failed: ${validation.errors.join(', ')}`
        };
      }

      const accountId = this.getAccountId();
      if (!accountId) {
        return {
          success: false,
          error: ErrorHandler.createUserFriendlyMessage('Unable to get account ID')
        };
      }

      // Generate memory ID if not provided
      const memoryId = options.memoryId || `memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

      // Create memory entry
      const memory: MemoryEntry = {
        id: memoryId,
        content: await this.fileToText(options.file),
        type: this.getFileType(options.file),
        category: options.category || 'general',
        tags: options.tags || [],
        createdAt: new Date(),
        updatedAt: new Date(),
        encrypted: options.encrypt || false,
        accessPolicy: options.accessPolicy || {
          owner: accountId,
          permissions: [] as Permission[]
        },
        metadata: {
          size: options.file.size,
          mimeType: options.file.type,
          encoding: 'utf-8',
          checksum: await this.calculateChecksum(options.file),
          version: 1,
          relatedMemories: []
        }
      };

      // Upload to Filecoin via Synapse
      console.log('Uploading memory to Filecoin...');
      const uploadResult = await this.golemStorage.uploadMemory(memory);
      
      if (!uploadResult.entityKey) {
        return {
          success: false,
          error: ErrorHandler.createUserFriendlyMessage('Failed to upload memory to Golem Base')
        };
      }

      // Create access policy for NEAR contract
      const accessPolicy = JSON.stringify(memory.accessPolicy);

      // Anchor the entity key to NEAR contract
      console.log('Anchoring entity key to NEAR contract...');
      const transactionHash = await this.nearWallet.createMemoryAnchor(
        memoryId,
        uploadResult.entityKey,
        accountId, // userId
        accessPolicy,
        options.file.size,
        options.file.type
      );

      console.log('Memory successfully uploaded and anchored:', {
        memoryId,
        entityKey: uploadResult.entityKey,
        transactionHash
      });

      return {
        success: true,
        memoryId,
        cid: uploadResult.entityKey,
        transactionHash
      };

    } catch (error) {
      console.error('Failed to upload memory:', error);
      const errorMessage = ErrorHandler.handleError(error, 'uploadMemory');
      return {
        success: false,
        error: ErrorHandler.createUserFriendlyMessage(errorMessage)
      };
    }
  }

  async retrieveMemory(options: MemoryRetrieveOptions): Promise<MemoryEntry | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    try {
      // First, get the memory anchor from NEAR contract
      const anchor = await this.nearWallet.getMemoryAnchor(options.memoryId);
      
      if (!anchor) {
        console.error('Memory anchor not found');
        return null;
      }

      // Check if we should retrieve the actual content
      if (!options.includeContent) {
        // Return a minimal memory entry with just metadata
        return {
          id: anchor.memoryId,
          content: '', // Empty content
          type: 'conversation', // Default type since MemoryAnchor doesn't have mimeType
          category: 'general',
          tags: [],
          createdAt: new Date(anchor.createdAt / 1000000), // Convert nanoseconds to milliseconds
          updatedAt: new Date(anchor.updatedAt / 1000000),
          encrypted: false,
          accessPolicy: JSON.parse(anchor.accessPolicy),
          metadata: {
            size: 0, // Default size since MemoryAnchor doesn't have fileSize
            mimeType: 'application/octet-stream',
            encoding: 'utf-8',
            checksum: '',
            version: anchor.version,
            relatedMemories: []
          },
          ipfsHash: anchor.ipfsHash
        };
      }

      // Retrieve the full content from Filecoin
      console.log('Retrieving memory content from Filecoin...');
      const memory = await this.golemStorage.retrieveMemory(anchor.ipfsHash);
      
      if (!memory) {
        console.error('Failed to retrieve memory content from Filecoin');
        return null;
      }

      // Update with anchor metadata
      memory.metadata = {
        ...memory.metadata,
        size: memory.metadata.size, // Use existing size since MemoryAnchor doesn't have fileSize
        mimeType: memory.metadata.mimeType, // Use existing mimeType since MemoryAnchor doesn't have mimeType
        version: anchor.version
      };

      return memory;

    } catch (error) {
      console.error('Failed to retrieve memory:', error);
      return null;
    }
  }

  async getUserMemories(limit: number = 50, offset: number = 0): Promise<MemoryAnchor[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isWalletConnected()) {
      return [];
    }

    const accountId = this.getAccountId();
    if (!accountId) {
      return [];
    }

    try {
      return await this.nearWallet.getUserMemories(accountId, limit, offset);
    } catch (error) {
      console.error('Failed to get user memories:', error);
      return [];
    }
  }

  async searchMemories(query: string, limit: number = 20): Promise<MemoryAnchor[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isWalletConnected()) {
      return [];
    }

    try {
      const accountId = this.getAccountId();
      return await this.nearWallet.searchMemories(query, accountId || undefined, limit);
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  async deleteMemory(memoryId: string): Promise<DecentralizedMemoryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isWalletConnected()) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    try {
      // Get the memory anchor to get the CID
      const anchor = await this.nearWallet.getMemoryAnchor(memoryId);
      
      if (!anchor) {
        return {
          success: false,
          error: 'Memory not found'
        };
      }

      // Delete from NEAR contract
      const transactionHash = await this.nearWallet.deleteMemoryAnchor(memoryId);

      // Unpin from Filecoin (optional - keeps content available but unpinned)
      await this.golemStorage.deleteMemory(anchor.ipfsHash);

      return {
        success: true,
        memoryId,
        transactionHash
      };

    } catch (error) {
      console.error('Failed to delete memory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async updateMemory(
    memoryId: string, 
    options: Partial<MemoryUploadOptions>
  ): Promise<DecentralizedMemoryResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.isWalletConnected()) {
      return {
        success: false,
        error: 'Wallet not connected'
      };
    }

    try {
      // Get existing memory
      const existingMemory = await this.retrieveMemory({ memoryId, includeContent: true });
      
      if (!existingMemory) {
        return {
          success: false,
          error: 'Memory not found'
        };
      }

      // Update memory with new options
      const updatedMemory: MemoryEntry = {
        ...existingMemory,
        content: options.file ? await this.fileToText(options.file) : existingMemory.content,
        category: options.category || existingMemory.category,
        tags: options.tags || existingMemory.tags,
        updatedAt: new Date(),
        metadata: {
          ...existingMemory.metadata,
          size: options.file ? options.file.size : existingMemory.metadata.size,
          mimeType: options.file ? options.file.type : existingMemory.metadata.mimeType,
          version: existingMemory.metadata.version + 1
        }
      };

      // Upload updated memory to Filecoin
      const uploadResult = await this.golemStorage.updateMemory(existingMemory.ipfsHash!, updatedMemory);
      
      if (!uploadResult.entityKey) {
        return {
          success: false,
          error: 'Failed to upload updated memory to Golem Base'
        };
      }

      // Update NEAR contract
      const accountId = this.getAccountId();
      if (!accountId) {
        return {
          success: false,
          error: 'Unable to get account ID'
        };
      }

      const accessPolicy = JSON.stringify(updatedMemory.accessPolicy);
      const transactionHash = await this.nearWallet.updateMemoryAnchor(
        memoryId,
        uploadResult.entityKey,
        accountId,
        accessPolicy,
        options.file?.size,
        options.file?.type
      );

      return {
        success: true,
        memoryId,
        cid: uploadResult.entityKey,
        transactionHash
      };

    } catch (error) {
      console.error('Failed to update memory:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async getAccountBalance(): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.nearWallet.getAccountBalance();
  }

  async getContractStats(): Promise<{ totalMemories: number; version: string }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    return await this.nearWallet.getContractStats();
  }

  // Helper methods
  private async fileToText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target?.result as string || '');
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  private getFileType(file: File): MemoryType {
    if (file.type.startsWith('image/')) return 'multimedia';
    if (file.type.startsWith('video/')) return 'multimedia';
    if (file.type.startsWith('audio/')) return 'multimedia';
    if (file.type.startsWith('text/')) return 'conversation';
    if (file.type === 'application/pdf') return 'multimedia';
    return 'multimedia';
  }

  private getMimeTypeCategory(mimeType: string): MemoryType {
    if (mimeType.startsWith('image/')) return 'multimedia';
    if (mimeType.startsWith('video/')) return 'multimedia';
    if (mimeType.startsWith('audio/')) return 'multimedia';
    if (mimeType.startsWith('text/')) return 'conversation';
    if (mimeType === 'application/pdf') return 'multimedia';
    return 'multimedia';
  }

  private async calculateChecksum(file: File): Promise<string> {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
}

// Singleton instance
let decentralizedMemoryInstance: DecentralizedMemoryService | null = null;

export const getDecentralizedMemoryService = (): DecentralizedMemoryService => {
  if (!decentralizedMemoryInstance) {
    decentralizedMemoryInstance = new DecentralizedMemoryService();
  }
  return decentralizedMemoryInstance;
};
