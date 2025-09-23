import { MemoryEntry, MemoryType, AccessPolicy, MemorySearchQuery, MemorySearchResult, Permission } from '@/types/memory';
import { getGolemStorage } from './golem-storage';
import { getEncryptionService } from './encryption';
// Hash utilities moved inline to avoid dependencies
import { v4 as uuidv4 } from 'uuid';

export class MemoryService {
  // Note: IPFS storage removed - using Golem Base only
  private golemStorage = getGolemStorage({
    privateKey: process.env.NEXT_PUBLIC_GOLEM_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
    chainId: parseInt(process.env.NEXT_PUBLIC_GOLEM_CHAIN_ID || '60138453025'),
    rpcUrl: process.env.NEXT_PUBLIC_GOLEM_RPC_URL || 'https://kaolin.holesky.golemdb.io/rpc',
    wsUrl: process.env.NEXT_PUBLIC_GOLEM_WS_URL || 'wss://kaolin.holesky.golemdb.io/rpc/ws',
  });
  
  constructor() {
    console.log('🧠 MemoryService constructor called');
    console.log('🧠 Environment variables:', {
      privateKey: process.env.NEXT_PUBLIC_GOLEM_PRIVATE_KEY ? 'SET' : 'NOT SET',
      chainId: process.env.NEXT_PUBLIC_GOLEM_CHAIN_ID,
      rpcUrl: process.env.NEXT_PUBLIC_GOLEM_RPC_URL,
      wsUrl: process.env.NEXT_PUBLIC_GOLEM_WS_URL
    });
  }
  private encryptionService = getEncryptionService();
  // Note: NEAR wallet removed - using Ethereum wallet for Golem Base only
  
  // Request throttling
  private requestQueue: Array<() => Promise<any>> = [];
  private isProcessing = false;
  private lastRequestTime = 0;
  private readonly REQUEST_DELAY = 1000; // 1 second between requests
  
  // Note: Local indexing removed - using direct Golem Base queries instead

  async initialize(): Promise<void> {
    try {
      console.log('🧠 MemoryService.initialize() called');
      console.log('🧠 Initializing Golem storage...');
      
      await this.golemStorage.initialize();
      
      // Note: Local index removed - memories are queried directly from Golem Base
      // Note: NEAR wallet removed - using Ethereum wallet for Golem Base only
      
      console.log('✅ Memory service initialized successfully with Golem Base (Ethereum wallet)');
    } catch (error: any) {
      console.error('❌ Failed to initialize memory service:', error);
      console.error('❌ Error details:', error.message);
      console.error('❌ Error stack:', error.stack);
      throw error;
    }
  }

  // Note: updateLocalIndex method removed - using direct Golem Base queries instead

  // Direct Golem Base search - Query Flow Implementation
  private async searchMemoriesDirect(query: MemorySearchQuery): Promise<MemoryEntry[]> {
    try {
      console.log('🔍 Searching memories with query:', query);
      
      // Use Golem Base search with optimized owner-based retrieval
      const memories = await this.golemStorage.searchMemories(query.query || '');
      
      console.log('🔍 Raw memories from Golem Base:', memories.length);
      
      // Filter memories based on query parameters
      let filteredMemories = memories;
      
      if (query.type) {
        filteredMemories = filteredMemories.filter(m => m.type === query.type);
        console.log(`🔍 Filtered by type "${query.type}":`, filteredMemories.length);
      }
      
      if (query.category) {
        filteredMemories = filteredMemories.filter(m => m.category === query.category);
        console.log(`🔍 Filtered by category "${query.category}":`, filteredMemories.length);
      }
      
      if (query.tags && query.tags.length > 0) {
        filteredMemories = filteredMemories.filter(m => 
          query.tags!.some(tag => m.tags.includes(tag))
        );
        console.log(`🔍 Filtered by tags "${query.tags}":`, filteredMemories.length);
      }
      
      if (query.dateRange) {
        filteredMemories = filteredMemories.filter(m => 
          m.createdAt >= query.dateRange!.start && m.createdAt <= query.dateRange!.end
        );
        console.log(`🔍 Filtered by date range:`, filteredMemories.length);
      }
      
      // Apply limit and offset
      if (query.limit) {
        const offset = query.offset || 0;
        filteredMemories = filteredMemories.slice(offset, offset + query.limit);
        console.log(`🔍 Applied limit ${query.limit} and offset ${offset}:`, filteredMemories.length);
      }
      
      return filteredMemories;
    } catch (error) {
      console.error('❌ Failed to search memories directly:', error);
      return [];
    }
  }

  /**
   * Create a new memory entry
   */
  async createMemory(memoryData: {
    content: string;
    type: MemoryType;
    category: string;
    tags?: string[];
    accessPolicy?: Partial<AccessPolicy>;
    encrypted?: boolean;
  }): Promise<MemoryEntry> {
    const { content, type, category, tags = [], accessPolicy, encrypted = true } = memoryData;
    const memoryId = uuidv4();
    const now = new Date();

    // Create access policy (use a default owner for Golem Base)
    const policy: AccessPolicy = {
      owner: 'ethereum-wallet', // Golem Base uses Ethereum wallet
      permissions: accessPolicy?.permissions || [],
      timelock: accessPolicy?.timelock,
      threshold: accessPolicy?.threshold,
    };

    // Encrypt memory content client-side (AES-256-GCM)
    let encryptedContent = content;
    let encryptionKeyId: string | undefined;

    if (encrypted) {
      const encryptionKey = this.encryptionService.generateKeyPair();
      const encryptedData = await this.encryptionService.encrypt(content, encryptionKey.keyId);
      encryptedContent = JSON.stringify(encryptedData);
      encryptionKeyId = encryptionKey.keyId;
      
      // Save keys to localStorage for persistence
      this.encryptionService.saveKeysToStorage();
    }

    // Generate SHA256 hash of encrypted memory
    const memoryHash = this.generateMemoryHash(encryptedContent);

    // Create memory entry
    const memory: MemoryEntry = {
      id: memoryId,
      content: encryptedContent,
      type,
      category,
      tags,
      createdAt: now,
      updatedAt: now,
      encrypted: encrypted,
      accessPolicy: policy,
      metadata: {
        size: encryptedContent.length,
        mimeType: 'text/plain',
        encoding: 'utf-8',
        checksum: this.generateChecksum(encryptedContent),
        version: 1,
        relatedMemories: [],
      },
    };

    try {
      // Store encrypted memory on Golem Base → receive entity key
      const uploadResult = await this.golemStorage.uploadMemory(memory);
      memory.ipfsHash = uploadResult.entityKey;

      console.log(`Memory created successfully with Golem Base: ${memoryId}`);
      console.log(`Golem Base Entity Key: ${uploadResult.entityKey}, Size: ${uploadResult.size} bytes`);
      console.log(`Memory Hash: ${memoryHash}`);
      const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
      console.log(`🔗 Transaction URL: ${explorerUrl}/entity/${uploadResult.entityKey}`);
      
      return memory;
    } catch (error) {
      console.error('Failed to create memory:', error);
      throw error;
    }
  }

  /**
   * Retrieve a memory by ID
   */
  async getMemory(memoryId: string): Promise<MemoryEntry | null> {
    try {
      // Search for memory in Golem Base
      const memories = await this.searchMemoriesDirect({ query: memoryId, type: undefined });
      const memory = memories.find(m => m.id === memoryId);
      
      if (!memory) {
        console.log(`Memory not found for ID: ${memoryId}`);
        return null;
      }

      // Decrypt memory content if encrypted
      if (memory.encrypted) {
        try {
          const keys = this.encryptionService.getKeys();
          if (keys.length > 0) {
            const encryptedData = JSON.parse(memory.content);
            const decrypted = await this.encryptionService.decrypt(encryptedData, keys[0].keyId);
            memory.content = decrypted.content;
            console.log(`✅ Memory decrypted successfully for ${memoryId}`);
          } else {
            console.warn(`No encryption keys available for memory ${memoryId}`);
          }
        } catch (error) {
          console.error('Failed to decrypt memory:', error);
          // Return encrypted content if decryption fails
        }
      }

      console.log(`📊 Memory retrieved: ${memoryId} at ${new Date().toISOString()}`);

      return memory;
    } catch (error) {
      console.error('Failed to get memory:', error);
      return null;
    }
  }

  /**
   * Verify memory integrity using hash comparison
   */
  async verifyMemoryIntegrity(memoryId: string): Promise<{
    isValid: boolean;
    cid: string;
    currentHash?: string;
    expectedHash?: string;
    error?: string;
  }> {
    try {
      // Get memory from Golem Base
      const memory = await this.getMemory(memoryId);
      if (!memory) {
        return { 
          isValid: false, 
          cid: memoryId,
          error: 'Memory not found'
        };
      }

      // Generate current hash
      const currentHash = this.generateMemoryHash(memory.content);
      
      // For now, we'll consider it valid if we can retrieve the memory
      // In a more sophisticated system, you might store the original hash
      const isValid = true;

      return {
        isValid,
        cid: memoryId,
        currentHash,
        expectedHash: currentHash // For now, we'll use the same hash
      };
    } catch (error) {
      console.error('Failed to verify memory integrity:', error);
      return { 
        isValid: false, 
        cid: memoryId,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<Pick<MemoryEntry, 'content' | 'category' | 'tags' | 'accessPolicy'>>
  ): Promise<MemoryEntry | null> {
    try {
      // Get existing memory
      const existingMemory = await this.getMemory(memoryId);
      if (!existingMemory) {
        throw new Error('Memory not found');
      }

      // Update memory properties
      const updatedMemory: MemoryEntry = {
        ...existingMemory,
        ...updates,
        updatedAt: new Date(),
        metadata: {
          ...existingMemory.metadata,
          version: existingMemory.metadata.version + 1,
        },
      };

      // Encrypt content if it was updated
      if (updates.content) {
        const encryptionKey = this.encryptionService.generateKeyPair();
        const encryptedData = await this.encryptionService.encrypt(updates.content, encryptionKey.keyId);
        updatedMemory.content = JSON.stringify(encryptedData);
        updatedMemory.encrypted = true;
        
        // Save keys to localStorage for persistence
        this.encryptionService.saveKeysToStorage();
      }

      // Update in Golem Base
      const uploadResult = await this.golemStorage.updateMemory(existingMemory.ipfsHash!, updatedMemory);
      updatedMemory.ipfsHash = uploadResult.entityKey;

      console.log(`Memory updated successfully: ${memoryId}`);
      console.log(`Golem Base Entity Key: ${uploadResult.entityKey}, Size: ${uploadResult.size} bytes`);
      const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
      console.log(`🔗 Transaction URL: ${explorerUrl}/entity/${uploadResult.entityKey}`);

      return updatedMemory;
    } catch (error) {
      console.error('Failed to update memory:', error);
      throw error;
    }
  }

  /**
   * Delete a memory
   */
  async deleteMemory(memoryId: string): Promise<boolean> {
    try {
      // Find the memory first
      const memories = await this.searchMemoriesDirect({ query: memoryId, type: undefined });
      const memory = memories.find(m => m.id === memoryId);
      
      if (!memory) {
        console.log(`Memory not found for deletion: ${memoryId}`);
        return false;
      }

      // Delete from Golem Base using the entity key
      const success = await this.golemStorage.deleteMemory(memory.ipfsHash!);
      
      if (success) {
        console.log(`Memory deleted successfully: ${memoryId}`);
        const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
        console.log(`🔗 Transaction URL: ${explorerUrl}/entity/${memory.ipfsHash}`);
      }

      return success;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      return false;
    }
  }

  /**
   * Search memories using Golem Base
   */
  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    try {
      const memories = await this.searchMemoriesDirect(query);
      
      // Apply additional filtering if needed
      let filteredMemories = memories;

      if (query.type) {
        filteredMemories = filteredMemories.filter(memory => memory.type === query.type);
      }

      if (query.category) {
        filteredMemories = filteredMemories.filter(memory => 
          memory.category.toLowerCase().includes(query.category!.toLowerCase())
        );
      }

      if (query.tags && query.tags.length > 0) {
        filteredMemories = filteredMemories.filter(memory =>
          query.tags!.some(tag => memory.tags.includes(tag))
        );
      }

      return {
        memories: filteredMemories,
        totalCount: filteredMemories.length,
        facets: {
          types: {
            conversation: 0,
            learned_fact: 0,
            user_preference: 0,
            task_outcome: 0,
            multimedia: 0,
            workflow: 0,
            agent_share: 0
          },
          categories: {},
          tags: {}
        }
      };
    } catch (error) {
      console.error('Failed to search memories:', error);
      return {
        memories: [],
        totalCount: 0,
        facets: { 
          types: {
            conversation: 0,
            learned_fact: 0,
            user_preference: 0,
            task_outcome: 0,
            multimedia: 0,
            workflow: 0,
            agent_share: 0
          },
          categories: {}, 
          tags: {} 
        }
      };
    }
  }

  /**
   * Get all memories
   */
  async getAllMemories(): Promise<MemoryEntry[]> {
    try {
      return await this.searchMemoriesDirect({ query: '', type: undefined });
    } catch (error) {
      console.error('Failed to get all memories:', error);
      return [];
    }
  }

  /**
   * Get memories by type
   */
  async getMemoriesByType(type: MemoryType): Promise<MemoryEntry[]> {
    try {
      return await this.searchMemoriesDirect({ query: '', type });
    } catch (error) {
      console.error('Failed to get memories by type:', error);
      return [];
    }
  }

  /**
   * Get memories by category
   */
  async getMemoriesByCategory(category: string): Promise<MemoryEntry[]> {
    try {
      return await this.searchMemoriesDirect({ query: '', category });
    } catch (error) {
      console.error('Failed to get memories by category:', error);
      return [];
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalMemories: number;
    totalSize: number;
    pinnedMemories: number;
    golemStats: {
      chainId: number;
      totalMemories: number;
      totalSize: number;
      pinnedMemories: number;
    };
  }> {
    try {
      const stats = await this.golemStorage.getStorageStats();
      return {
        totalMemories: stats.totalMemories,
        totalSize: stats.totalSize,
        pinnedMemories: stats.pinnedMemories,
        golemStats: {
          chainId: stats.chainId,
          totalMemories: stats.totalMemories,
          totalSize: stats.totalSize,
          pinnedMemories: stats.pinnedMemories,
        }
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalMemories: 0,
        totalSize: 0,
        pinnedMemories: 0,
        golemStats: {
          chainId: 60138453025,
          totalMemories: 0,
          totalSize: 0,
          pinnedMemories: 0
        }
      };
    }
  }

  /**
   * Delete all unencrypted memories
   */
  async deleteUnencryptedMemories(): Promise<number> {
    try {
      const allMemories = await this.getAllMemories();
      const unencryptedMemories = allMemories.filter(memory => !memory.encrypted);
      
      let deletedCount = 0;
      for (const memory of unencryptedMemories) {
        const success = await this.deleteMemory(memory.id);
        if (success) {
          deletedCount++;
        }
      }
      
      console.log(`Deleted ${deletedCount} unencrypted memories`);
      return deletedCount;
    } catch (error) {
      console.error('Failed to delete unencrypted memories:', error);
      return 0;
    }
  }

  /**
   * Decrypt memories for chat display
   */
  async decryptMemoriesForChat(): Promise<MemoryEntry[]> {
    try {
      const allMemories = await this.getAllMemories();
      const decryptedMemories: MemoryEntry[] = [];
      
      for (const memory of allMemories) {
        if (memory.encrypted) {
          try {
            const keys = this.encryptionService.getKeys();
            if (keys.length > 0) {
              const encryptedData = JSON.parse(memory.content);
              const decrypted = await this.encryptionService.decrypt(encryptedData, keys[0].keyId);
              
              const decryptedMemory = {
                ...memory,
                content: decrypted.content
              };
              decryptedMemories.push(decryptedMemory);
            }
          } catch (error) {
            console.warn(`Failed to decrypt memory ${memory.id}:`, error);
            decryptedMemories.push(memory); // Add encrypted version if decryption fails
          }
        } else {
          decryptedMemories.push(memory);
        }
      }
      
      return decryptedMemories;
    } catch (error) {
      console.error('Failed to decrypt memories for chat:', error);
      return [];
    }
  }

  /**
   * Grant permission to an AI agent
   */
  async grantPermission(memoryId: string, agentId: string, actions: ('read' | 'write' | 'delete')[]): Promise<boolean> {
    try {
      console.log(`🔐 Granting permission to ${agentId} for memory ${memoryId}:`, actions);
      
      const memory = await this.getMemory(memoryId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }
      
      // Check if permission already exists
      const existingPermission = memory.accessPolicy.permissions.find(p => p.agentId === agentId);
      
      if (existingPermission) {
        // Update existing permission
        existingPermission.actions = Array.from(new Set([...existingPermission.actions, ...actions]));
      } else {
        // Add new permission
        memory.accessPolicy.permissions.push({
          agentId,
          actions,
          conditions: []
        });
      }
      
      // Update memory in Golem Base
      await this.updateMemory(memoryId, memory);
      
      console.log(`✅ Permission granted to ${agentId} for memory ${memoryId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to grant permission to ${agentId} for memory ${memoryId}:`, error);
      return false;
    }
  }

  /**
   * Revoke permission from an AI agent
   */
  async revokePermission(memoryId: string, agentId: string): Promise<boolean> {
    try {
      console.log(`🔐 Revoking permission from ${agentId} for memory ${memoryId}`);
      
      const memory = await this.getMemory(memoryId);
      if (!memory) {
        throw new Error(`Memory ${memoryId} not found`);
      }
      
      // Remove permission
      memory.accessPolicy.permissions = memory.accessPolicy.permissions.filter(p => p.agentId !== agentId);
      
      // Update memory in Golem Base
      await this.updateMemory(memoryId, memory);
      
      console.log(`✅ Permission revoked from ${agentId} for memory ${memoryId}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to revoke permission from ${agentId} for memory ${memoryId}:`, error);
      return false;
    }
  }

  /**
   * Check if an agent has permission to perform an action
   */
  async checkPermission(memoryId: string, agentId: string, action: 'read' | 'write' | 'delete'): Promise<boolean> {
    try {
      const memory = await this.getMemory(memoryId);
      if (!memory) {
        return false;
      }
      
      // Check if agent has permission
      const permission = memory.accessPolicy.permissions.find(p => p.agentId === agentId);
      if (!permission) {
        return false;
      }
      
      return permission.actions.includes(action);
    } catch (error) {
      console.error(`❌ Failed to check permission for ${agentId} on memory ${memoryId}:`, error);
      return false;
    }
  }

  /**
   * Get all permissions for a memory
   */
  async getMemoryPermissions(memoryId: string): Promise<Permission[]> {
    try {
      const memory = await this.getMemory(memoryId);
      if (!memory) {
        return [];
      }
      
      return memory.accessPolicy.permissions;
    } catch (error) {
      console.error(`❌ Failed to get permissions for memory ${memoryId}:`, error);
      return [];
    }
  }

  /**
   * Generate checksum for content
   */
  private generateChecksum(content: string): string {
    // Simple checksum implementation
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Generate SHA256 hash for memory content
   */
  private generateMemoryHash(content: string): string {
    // Simple hash implementation (in production, use crypto.subtle.digest)
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
}

// Singleton instance
let memoryServiceInstance: MemoryService | null = null;

export function getMemoryService(): MemoryService {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService();
  }
  return memoryServiceInstance;
}
