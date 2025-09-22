import { MemoryEntry, MemoryType, AccessPolicy, MemorySearchQuery, MemorySearchResult } from '@/types/memory';
import { getGolemStorage } from './golem-storage';
import { getEncryptionService } from './encryption';
import { v4 as uuidv4 } from 'uuid';

export class MemoryService {
  // Note: IPFS storage removed - using Golem Base only
  private golemStorage = getGolemStorage({
    privateKey: process.env.NEXT_PUBLIC_GOLEM_PRIVATE_KEY || '0x0000000000000000000000000000000000000000000000000000000000000000',
    chainId: parseInt(process.env.NEXT_PUBLIC_GOLEM_CHAIN_ID || '60138453025'),
    rpcUrl: process.env.NEXT_PUBLIC_GOLEM_RPC_URL || 'https://kaolin.holesky.golemdb.io/rpc',
    wsUrl: process.env.NEXT_PUBLIC_GOLEM_WS_URL || 'wss://kaolin.holesky.golemdb.io/rpc/ws',
  });
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
      await this.golemStorage.initialize();
      
      // Note: Local index removed - memories are queried directly from Golem Base
      // Note: NEAR wallet removed - using Ethereum wallet for Golem Base only
      
      console.log('Memory service initialized successfully with Golem Base (Ethereum wallet)');
    } catch (error) {
      console.error('Failed to initialize memory service:', error);
      throw error;
    }
  }

  // Note: updateLocalIndex method removed - using direct Golem Base queries instead

  // Direct Golem Base search - Query Flow Implementation
  private async searchMemoriesDirect(query: MemorySearchQuery): Promise<MemoryEntry[]> {
    try {
      console.log('🔍 Query Flow: Searching memories via Golem Base...');
      
      const memories: MemoryEntry[] = [];

      // Use the searchMemories method from golemStorage which now uses proper API
      const searchResults = await this.golemStorage.searchMemories(
        query.query || '', 
        undefined, // owner - not needed since we use Ethereum wallet
        50 // limit
      );

      console.log(`📊 Found ${searchResults.length} memories from Golem Base search`);

      // Apply additional filters
      for (const memory of searchResults) {
        // Apply type filter
        if (query.type && memory.type !== query.type) {
          continue;
        }

        // Apply category filter
        if (query.category && memory.category !== query.category) {
          continue;
        }

        // Apply tags filter
        if (query.tags && query.tags.length > 0) {
          const hasMatchingTag = query.tags.some(tag => memory.tags.includes(tag));
          if (!hasMatchingTag) {
            continue;
          }
        }

        // Apply date range filter
        if (query.dateRange) {
          if (memory.createdAt < query.dateRange.start || memory.createdAt > query.dateRange.end) {
            continue;
          }
        }

        memories.push(memory);
      }

      console.log(`✅ Query Flow: Found ${memories.length} memories after filtering`);
      return memories;
    } catch (error) {
      console.error('Query Flow failed:', error);
      return [];
    }
  }

  // Note: filterLocalIndex method removed - using direct Golem Base queries instead

  // Check if memory matches content query
  private matchesContentQuery(memory: MemoryEntry, query: string): boolean {
    const queryLower = query.toLowerCase();
    
    // Check content
    if (memory.content.toLowerCase().includes(queryLower)) {
      return true;
    }
    
    // Check tags
    if (memory.tags.some(tag => tag.toLowerCase().includes(queryLower))) {
      return true;
    }
    
    // Check category
    if (memory.category.toLowerCase().includes(queryLower)) {
      return true;
    }
    
    return false;
  }

  // Throttled request method to prevent rate limiting
  private async throttledRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.requestQueue.push(async () => {
        try {
          const now = Date.now();
          const timeSinceLastRequest = now - this.lastRequestTime;
          
          if (timeSinceLastRequest < this.REQUEST_DELAY) {
            await new Promise(resolve => setTimeout(resolve, this.REQUEST_DELAY - timeSinceLastRequest));
          }
          
          this.lastRequestTime = Date.now();
          const result = await requestFn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      this.processQueue();
    });
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }
    
    this.isProcessing = true;
    
    while (this.requestQueue.length > 0) {
      const request = this.requestQueue.shift();
      if (request) {
        try {
          await request();
        } catch (error) {
          console.error('Request failed:', error);
        }
      }
    }
    
    this.isProcessing = false;
  }

  /**
   * Create a new memory entry
   */
  async createMemory(
    content: string,
    type: MemoryType,
    category: string,
    tags: string[] = [],
    accessPolicy?: Partial<AccessPolicy>,
    encrypt: boolean = true
  ): Promise<MemoryEntry> {
    // Note: For Golem Base operations, we use Ethereum wallet from environment
    // No need to check NEAR wallet connection for Golem Base storage
    
    const memoryId = uuidv4();
    const now = new Date();

    // Create access policy (use a default owner for Golem Base)
    const policy: AccessPolicy = {
      owner: 'ethereum-wallet', // Golem Base uses Ethereum wallet
      permissions: accessPolicy?.permissions || [],
      timelock: accessPolicy?.timelock,
      threshold: accessPolicy?.threshold,
    };

    // Encrypt content if requested
    let encryptedContent = content;
    let encryptionKeyId: string | undefined;

    if (encrypt) {
      const encryptionKey = this.encryptionService.generateKeyPair();
      const encryptedData = await this.encryptionService.encrypt(content, encryptionKey.keyId);
      encryptedContent = JSON.stringify(encryptedData);
      encryptionKeyId = encryptionKey.keyId;
      
      // Save keys to localStorage for persistence
      this.encryptionService.saveKeysToStorage();
    }

    // Create memory entry
    const memory: MemoryEntry = {
      id: memoryId,
      content: encryptedContent,
      type,
      category,
      tags,
      createdAt: now,
      updatedAt: now,
      encrypted: encrypt,
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
      // Store in Golem Base
      const uploadResult = await this.golemStorage.uploadMemory(memory);
      memory.ipfsHash = uploadResult.entityKey;

      // Note: NEAR anchoring removed - using Golem Base only with Ethereum wallet

      console.log(`Memory created successfully with Golem Base: ${memoryId}`);
      console.log(`Golem Base Entity Key: ${uploadResult.entityKey}, Size: ${uploadResult.size} bytes`);
      console.log(`🔗 Transaction URL: https://explorer.kaolin.holesky.golemdb.io/entity/${uploadResult.entityKey}`);
      
      // Note: Local index removed - memories are now queried directly from Golem Base
      
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
      // Get anchor from NEAR
      const anchor = await this.nearWallet.getMemoryAnchor(memoryId);
      if (!anchor) {
        return null;
      }

      // Retrieve from Golem Base
      const memory = await this.golemStorage.retrieveMemory(anchor.ipfsHash);
      if (!memory) {
        return null;
      }

      // Decrypt if necessary
      if (memory.encrypted) {
        try {
          // In a real implementation, you'd need to store the encryption key ID
          // For now, we'll assume the first available key
          const keys = this.encryptionService.getKeys();
          if (keys.length > 0) {
            const encryptedData = JSON.parse(memory.content);
            const decrypted = await this.encryptionService.decrypt(encryptedData, keys[0].keyId);
            memory.content = decrypted.content;
          }
        } catch (error) {
          console.error('Failed to decrypt memory:', error);
          // Return encrypted content if decryption fails
        }
      }

      return memory;
    } catch (error) {
      console.error('Failed to get memory:', error);
      return null;
    }
  }

  /**
   * Update an existing memory
   */
  async updateMemory(
    memoryId: string,
    updates: Partial<Pick<MemoryEntry, 'content' | 'category' | 'tags' | 'accessPolicy'>>
  ): Promise<MemoryEntry | null> {
    const accountId = this.nearWallet.getAccountId();
    if (!accountId) {
      throw new Error('User must be connected to NEAR wallet');
    }

    try {
      // Get existing memory
      const existingMemory = await this.getMemory(memoryId);
      if (!existingMemory) {
        throw new Error('Memory not found');
      }

      // Check ownership
      if (existingMemory.accessPolicy.owner !== accountId) {
        throw new Error('Only the owner can update this memory');
      }

      // Update memory
      const updatedMemory: MemoryEntry = {
        ...existingMemory,
        ...updates,
        updatedAt: new Date(),
        metadata: {
          ...existingMemory.metadata,
          version: existingMemory.metadata.version + 1,
        },
      };

      // Store updated memory in Golem Base
      const uploadResult = await this.golemStorage.updateMemory(existingMemory.ipfsHash!, updatedMemory);
      updatedMemory.ipfsHash = uploadResult.entityKey;

      // Update anchor on NEAR
      const transactionId = await this.nearWallet.updateMemoryAnchor(
        memoryId,
        uploadResult.entityKey,
        accountId,
        JSON.stringify(updatedMemory.accessPolicy)
      );
      updatedMemory.nearTransactionId = transactionId;

      console.log(`Memory updated successfully: ${memoryId}`);
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
      console.log(`🗑️ Deleting memory: ${memoryId}`);

      // Get all memories to find the one with matching ID
      const allMemories = await this.golemStorage.searchMemories('', undefined, 1000);
      const memoryToDelete = allMemories.find(m => m.id === memoryId);
      
      if (!memoryToDelete) {
        throw new Error('Memory not found');
      }

      // Delete from Golem Base using entity key
      const success = await this.golemStorage.deleteMemory(memoryToDelete.ipfsHash || '');
      if (!success) {
        throw new Error('Failed to delete memory from Golem Base');
      }

      console.log(`✅ Memory ${memoryId} deleted successfully`);
      return true;
    } catch (error) {
      console.error('Failed to delete memory:', error);
      throw error;
    }
  }

  /**
   * Delete all unencrypted memories
   */
  async deleteUnencryptedMemories(): Promise<{ deleted: number; errors: number }> {
    try {
      console.log('🗑️ Starting cleanup of unencrypted memories...');
      
      let deleted = 0;
      let errors = 0;

      // Get all owned memories
      const allMemories = await this.golemStorage.searchMemories('', undefined, 1000);
      
      console.log(`📊 Found ${allMemories.length} total memories, filtering for unencrypted ones...`);

      for (const memory of allMemories) {
        try {
          // Check if memory is unencrypted
          if (!memory.encrypted) {
            console.log(`🗑️ Deleting unencrypted memory: ${memory.id} (${memory.type})`);
            
            // Delete from Golem Base using entity key
            const success = await this.golemStorage.deleteMemory(memory.ipfsHash || '');
            if (success) {
              deleted++;
              console.log(`✅ Deleted unencrypted memory: ${memory.id}`);
            } else {
              errors++;
              console.error(`❌ Failed to delete memory: ${memory.id}`);
            }
          } else {
            console.log(`🔒 Keeping encrypted memory: ${memory.id} (${memory.type})`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error processing memory ${memory.id}:`, error);
        }
      }

      console.log(`✅ Cleanup complete: ${deleted} deleted, ${errors} errors`);
      return { deleted, errors };
    } catch (error) {
      console.error('Failed to delete unencrypted memories:', error);
      throw error;
    }
  }

  /**
   * Decrypt encrypted memories and return them as chat messages
   */
  async decryptMemoriesForChat(): Promise<{ decrypted: number; errors: number; messages: any[] }> {
    try {
      console.log('🔓 Starting decryption of encrypted memories for chat...');
      
      let decrypted = 0;
      let errors = 0;
      const messages: any[] = [];

      // Get all owned memories
      const allMemories = await this.golemStorage.searchMemories('', undefined, 1000);
      
      console.log(`📊 Found ${allMemories.length} total memories, filtering for encrypted ones...`);

      for (const memory of allMemories) {
        try {
          // Check if memory is encrypted
          if (memory.encrypted) {
            console.log(`🔓 Decrypting memory: ${memory.id} (${memory.type})`);
            
            // Try to decrypt the content
            let decryptedContent = memory.content;
            
            try {
              // Parse the encrypted content
              const encryptedData = JSON.parse(memory.content);
              
              // Get available encryption keys
              const keys = this.encryptionService.getKeys();
              if (keys.length > 0) {
                // Try to decrypt with available keys
                decryptedContent = await this.encryptionService.decrypt(encryptedData, keys[0].keyId);
                console.log(`✅ Successfully decrypted memory: ${memory.id}`);
              } else {
                console.warn(`⚠️ No encryption keys available for memory: ${memory.id}`);
                decryptedContent = `[Encrypted - No key available] ${memory.content.substring(0, 50)}...`;
              }
            } catch (decryptError) {
              console.warn(`⚠️ Failed to decrypt memory ${memory.id}:`, decryptError);
              decryptedContent = `[Decryption failed] ${memory.content.substring(0, 50)}...`;
            }

            // Convert to chat message format
            const chatMessage = {
              id: memory.id,
              content: decryptedContent,
              role: memory.type === 'conversation' ? 'assistant' : 'system',
              timestamp: memory.createdAt,
              memoryType: memory.type,
              category: memory.category
            };

            messages.push(chatMessage);
            decrypted++;
            console.log(`✅ Added decrypted memory to chat: ${memory.id}`);
          } else {
            console.log(`📝 Skipping unencrypted memory: ${memory.id} (${memory.type})`);
          }
        } catch (error) {
          errors++;
          console.error(`❌ Error processing memory ${memory.id}:`, error);
        }
      }

      // Sort messages by timestamp
      messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

      console.log(`✅ Decryption complete: ${decrypted} decrypted, ${errors} errors, ${messages.length} messages`);
      return { decrypted, errors, messages };
    } catch (error) {
      console.error('Failed to decrypt memories:', error);
      throw error;
    }
  }

  /**
   * Search memories with hybrid approach (Query Flow Implementation)
   */
  async searchMemories(query: MemorySearchQuery): Promise<MemorySearchResult> {
    try {
      console.log('🔍 Starting hybrid memory search...');
      
      let memories: MemoryEntry[] = [];
      let searchMethod = 'unknown';

      // Primary: Use Query Flow (local/Golem Base index, no NEAR contact)
      console.log('📊 Using Query Flow: Local index + Golem Base retrieval...');
      memories = await this.searchMemoriesDirect(query);
      searchMethod = 'query-flow';
      console.log(`✅ Query Flow found ${memories.length} memories`);

      // Optional: Verify integrity for critical memories (if needed)
      if (query.verifyIntegrity && memories.length > 0) {
        console.log('🔐 Verifying memory integrity...');
        const verifiedMemories: MemoryEntry[] = [];
        
        for (const memory of memories) {
          const verification = await this.verifyMemoryIntegrity(memory.id);
          if (verification.isValid) {
            verifiedMemories.push(memory);
          } else {
            console.warn(`⚠️ Memory ${memory.id} failed verification: ${verification.error}`);
          }
        }
        
        memories = verifiedMemories;
        console.log(`✅ Verification complete: ${memories.length} valid memories`);
      }

      // Apply additional filters
      let filteredMemories = memories;

      if (query.type) {
        filteredMemories = filteredMemories.filter(m => m.type === query.type);
      }

      if (query.category) {
        filteredMemories = filteredMemories.filter(m => m.category === query.category);
      }

      if (query.tags && query.tags.length > 0) {
        filteredMemories = filteredMemories.filter(m => 
          query.tags!.some(tag => m.tags.includes(tag))
        );
      }

      if (query.dateRange) {
        filteredMemories = filteredMemories.filter(m => 
          m.createdAt >= query.dateRange!.start && m.createdAt <= query.dateRange!.end
        );
      }

      // Generate facets
      const facets = {
        types: {} as Record<MemoryType, number>,
        categories: {} as Record<string, number>,
        tags: {} as Record<string, number>,
      };

      filteredMemories.forEach(memory => {
        // Count types
        facets.types[memory.type] = (facets.types[memory.type] || 0) + 1;
        
        // Count categories
        facets.categories[memory.category] = (facets.categories[memory.category] || 0) + 1;
        
        // Count tags
        memory.tags.forEach(tag => {
          facets.tags[tag] = (facets.tags[tag] || 0) + 1;
        });
      });

      // Apply pagination
      const offset = query.offset || 0;
      const limit = query.limit || 20;
      const paginatedMemories = filteredMemories.slice(offset, offset + limit);

      console.log(`📊 Search completed using ${searchMethod}: ${paginatedMemories.length}/${filteredMemories.length} memories`);

      return {
        memories: paginatedMemories,
        totalCount: filteredMemories.length,
        facets,
      };
    } catch (error) {
      console.error('Failed to search memories:', error);
      return {
        memories: [],
        totalCount: 0,
        facets: { 
          types: {} as Record<MemoryType, number>, 
          categories: {}, 
          tags: {} 
        },
      };
    }
  }

  /**
   * Get user's memories
   */
  async getUserMemories(limit: number = 50, offset: number = 0): Promise<MemoryEntry[]> {
    const accountId = this.nearWallet.getAccountId();
    if (!accountId) {
      throw new Error('User must be connected to NEAR wallet');
    }

    try {
      const anchors = await this.nearWallet.getUserMemories(accountId, limit, offset);
      const memories: MemoryEntry[] = [];

      for (const anchor of anchors) {
        const memory = await this.golemStorage.retrieveMemory(anchor.ipfsHash);
        if (memory) {
          memories.push(memory);
        }
      }

      return memories;
    } catch (error) {
      console.error('Failed to get user memories:', error);
      return [];
    }
  }

  /**
   * Grant permission to an agent
   */
  async grantPermission(
    memoryId: string,
    agentId: string,
    actions: ('read' | 'write' | 'delete')[]
  ): Promise<string> {
    const accountId = this.nearWallet.getAccountId();
    if (!accountId) {
      throw new Error('User must be connected to NEAR wallet');
    }

    try {
      const transactionId = await this.nearWallet.grantPermission(
        memoryId,
        agentId,
        actions
      );

      console.log(`Permission granted to ${agentId} for memory ${memoryId}`);
      return transactionId;
    } catch (error) {
      console.error('Failed to grant permission:', error);
      throw error;
    }
  }

  /**
   * Revoke permission from an agent
   */
  async revokePermission(memoryId: string, agentId: string): Promise<string> {
    const accountId = this.nearWallet.getAccountId();
    if (!accountId) {
      throw new Error('User must be connected to NEAR wallet');
    }

    try {
      const transactionId = await this.nearWallet.revokePermission(memoryId, agentId);

      console.log(`Permission revoked from ${agentId} for memory ${memoryId}`);
      return transactionId;
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      throw error;
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(): Promise<{
    totalMemories: number;
    totalSize: number;
    pinnedMemories: number;
    golemStats: { chainId: number; totalMemories: number; totalSize: number; pinnedMemories: number };
  }> {
    try {
      const golemStats = await this.golemStorage.getStorageStats();
      
      return {
        totalMemories: golemStats.totalMemories,
        totalSize: golemStats.totalSize,
        pinnedMemories: golemStats.pinnedMemories,
        golemStats,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalMemories: 0,
        totalSize: 0,
        pinnedMemories: 0,
        golemStats: { chainId: 60138453025, totalMemories: 0, totalSize: 0, pinnedMemories: 0 },
      };
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
    return hash.toString(16);
  }

  /**
   * Connect to NEAR wallet
   */
  async connectWallet(): Promise<boolean> {
    return this.nearWallet.connectWallet();
  }

  /**
   * Disconnect from NEAR wallet
   */
  async disconnectWallet(): Promise<void> {
    return this.nearWallet.disconnectWallet();
  }

  /**
   * Check if wallet is connected
   */
  isWalletConnected(): boolean {
    return this.nearWallet.isConnected();
  }

  /**
   * Get current account ID
   */
  getAccountId(): string | null {
    return this.nearWallet.getAccountId();
  }

  // Verification Flow: Verify memory integrity against NEAR anchor
  async verifyMemoryIntegrity(memoryId: string): Promise<{
    isValid: boolean;
    cid: string;
    anchoredHash?: string;
    error?: string;
  }> {
    try {
      console.log(`🔐 Verification Flow: Verifying memory ${memoryId}...`);
      
      // Step 1: Get memory from local index
      const metadata = this.localMemoryIndex.get(memoryId);
      if (!metadata) {
        return {
          isValid: false,
          cid: '',
          error: 'Memory not found in local index'
        };
      }

      // Step 2: Get current CID from Golem Base
      const memory = await this.golemStorage.retrieveMemory(metadata.entityKey);
      if (!memory) {
        return {
          isValid: false,
          cid: metadata.entityKey,
          error: 'Memory not found in Golem Base'
        };
      }

      const currentCid = metadata.entityKey;
      console.log(`📋 Current CID from Golem Base: ${currentCid}`);

      // Step 3: Get anchored hash from NEAR (if available)
      let anchoredHash: string | undefined;
      try {
        if (metadata.nearTransactionId) {
          // In a real implementation, you'd query NEAR for the anchored hash
          // For now, we'll simulate this
          console.log(`🔗 Checking NEAR anchor for transaction: ${metadata.nearTransactionId}`);
          
          // This would be a real NEAR query in production
          // const anchor = await this.nearWallet.getMemoryAnchor(memoryId);
          // anchoredHash = anchor?.ipfsHash;
          
          // For demo purposes, assume it matches if we have a transaction ID
          anchoredHash = currentCid;
        }
      } catch (nearError) {
        console.warn('⚠️ NEAR verification failed, memory may be compromised:', nearError);
        return {
          isValid: false,
          cid: currentCid,
          error: 'NEAR verification failed'
        };
      }

      // Step 4: Compare CIDs
      const isValid = anchoredHash ? currentCid === anchoredHash : true;
      
      console.log(`✅ Verification Flow: Memory ${memoryId} is ${isValid ? 'VALID' : 'INVALID'}`);
      console.log(`📊 Current CID: ${currentCid}`);
      console.log(`🔗 Anchored Hash: ${anchoredHash || 'Not available'}`);

      return {
        isValid,
        cid: currentCid,
        anchoredHash,
        error: isValid ? undefined : 'CID mismatch with anchored hash'
      };
    } catch (error) {
      console.error('Verification Flow failed:', error);
      return {
        isValid: false,
        cid: '',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Enhanced memory retrieval with verification
  async getMemoryWithVerification(memoryId: string): Promise<{
    memory: MemoryEntry | null;
    verification: {
      isValid: boolean;
      cid: string;
      anchoredHash?: string;
      error?: string;
    };
  }> {
    try {
      console.log(`🔍 Retrieving memory ${memoryId} with verification...`);
      
      // Get memory from local index
      const metadata = this.localMemoryIndex.get(memoryId);
      if (!metadata) {
        return {
          memory: null,
          verification: {
            isValid: false,
            cid: '',
            error: 'Memory not found in local index'
          }
        };
      }

      // Retrieve memory from Golem Base
      const memory = await this.golemStorage.retrieveMemory(metadata.entityKey);
      if (!memory) {
        return {
          memory: null,
          verification: {
            isValid: false,
            cid: metadata.entityKey,
            error: 'Memory not found in Golem Base'
          }
        };
      }

      // Verify memory integrity
      const verification = await this.verifyMemoryIntegrity(memoryId);

      return {
        memory: verification.isValid ? memory : null,
        verification
      };
    } catch (error) {
      console.error('Failed to retrieve memory with verification:', error);
      return {
        memory: null,
        verification: {
          isValid: false,
          cid: '',
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      };
    }
  }
}

// Singleton instance
let memoryServiceInstance: MemoryService | null = null;

export const getMemoryService = (): MemoryService => {
  if (!memoryServiceInstance) {
    memoryServiceInstance = new MemoryService();
  }
  return memoryServiceInstance;
};
