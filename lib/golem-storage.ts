import { MemoryEntry, MemoryMetadata } from '@/types/memory';
import { createClient, AccountData, Tagged, GolemBaseCreate, Annotation, GolemBaseUpdate } from 'golem-base-sdk';
import { randomUUID } from 'crypto';

// Golem Base configuration
interface GolemConfig {
  privateKey: string;
  chainId: number;
  rpcUrl: string;
  wsUrl: string;
}

interface GolemUploadResult {
  entityKey: string;
  size: number;
  timestamp: number;
  chainId: number;
}

interface GolemRetrieveResult {
  content: ArrayBuffer;
  entityKey: string;
  size: number;
  annotations: Record<string, any>;
}

export class GolemStorageService {
  private config: GolemConfig;
  private isInitialized = false;
  private client: any = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();
  private entityKeys: Set<string> = new Set(); // Track entity keys locally

  constructor(config: GolemConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Validate private key
      if (!this.config.privateKey || this.config.privateKey === '0x0000000000000000000000000000000000000000000000000000000000000000') {
        throw new Error('Invalid private key. Please set NEXT_PUBLIC_GOLEM_PRIVATE_KEY in your environment variables.');
      }

      // Create account data from private key
      const key: AccountData = new Tagged(
        "privatekey", 
        Buffer.from(this.config.privateKey.replace('0x', ''), 'hex')
      );

      // Initialize the Golem Base client using the SDK
      this.client = await createClient(
        this.config.chainId,
        key,
        this.config.rpcUrl,
        this.config.wsUrl,
      );

      this.isInitialized = true;
      console.log('Golem Base storage service initialized successfully');
      
      // Load existing entity keys from localStorage for persistence
      this.loadEntityKeysFromStorage();
      
      // Debug: Log available methods for troubleshooting
      this.debugClientMethods();
    } catch (error) {
      console.error('Failed to initialize Golem Base storage:', error);
      throw new Error('Golem Base storage initialization failed');
    }
  }

  // Debug method to log available client methods
  private debugClientMethods(): void {
    if (!this.client) return;
    
    try {
      console.log('🔍 Golem Base Client Debug Info:');
      console.log('📋 Client type:', typeof this.client);
      console.log('📋 Client constructor:', this.client.constructor.name);
      
      const ownProps = Object.getOwnPropertyNames(this.client);
      const prototypeProps = Object.getOwnPropertyNames(Object.getPrototypeOf(this.client));
      const allMethods = [...ownProps, ...prototypeProps].filter(prop => 
        typeof this.client[prop] === 'function' && !prop.startsWith('_')
      );
      
      console.log('📋 Available methods:', allMethods);
      console.log('📋 Methods containing "entity":', allMethods.filter(m => m.toLowerCase().includes('entity')));
      console.log('📋 Methods containing "get":', allMethods.filter(m => m.toLowerCase().includes('get')));
      console.log('📋 Methods containing "list":', allMethods.filter(m => m.toLowerCase().includes('list')));
    } catch (error) {
      console.warn('Failed to debug client methods:', error);
    }
  }

  // Load entity keys from localStorage for persistence
  private loadEntityKeysFromStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('golem-entity-keys');
        if (stored) {
          const keys = JSON.parse(stored);
          this.entityKeys = new Set(keys);
          console.log(`📊 Loaded ${this.entityKeys.size} entity keys from localStorage`);
        }
      }
    } catch (error) {
      console.warn('Failed to load entity keys from localStorage:', error);
    }
  }

  // Save entity keys to localStorage for persistence
  private saveEntityKeysToStorage(): void {
    try {
      if (typeof window !== 'undefined') {
        const keys = Array.from(this.entityKeys);
        localStorage.setItem('golem-entity-keys', JSON.stringify(keys));
        console.log(`💾 Saved ${keys.length} entity keys to localStorage`);
      }
    } catch (error) {
      console.warn('Failed to save entity keys to localStorage:', error);
    }
  }

  async uploadMemory(memory: MemoryEntry): Promise<GolemUploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Golem Base client not initialized');
    }

    try {
      // Prepare the memory data for upload
      const memoryData = {
        id: memory.id,
        content: memory.content,
        type: memory.type,
        category: memory.category,
        tags: memory.tags,
        createdAt: memory.createdAt.toISOString(),
        updatedAt: memory.updatedAt.toISOString(),
        encrypted: memory.encrypted,
        accessPolicy: memory.accessPolicy,
        metadata: memory.metadata
      };

      const content = this.encoder.encode(JSON.stringify(memoryData));
      const contentHex = '0x' + Buffer.from(content).toString('hex');

      // Create annotations for the memory
      const annotations: Annotation<string>[] = [
        { key: 'memoryId', value: memory.id },
        { key: 'type', value: memory.type },
        { key: 'category', value: memory.category },
        { key: 'owner', value: memory.accessPolicy.owner },
        { key: 'createdAt', value: memory.createdAt.toISOString() }
      ];

      console.log(`📤 Uploading memory with ID: ${memory.id}`);
      console.log(`📊 Content size: ${content.length} bytes`);
      console.log(`🏷️ Annotations:`, annotations);

      // Create entity using the SDK
      const createData: GolemBaseCreate = {
        data: Buffer.from(content),
        btl: 1000, // Block to live
        stringAnnotations: annotations,
        numericAnnotations: []
      };

      const result = await this.client.createEntities([createData]);
      
      if (!result || result.length === 0) {
        throw new Error('Failed to create entity - no result returned');
      }

      const entityResult = result[0];

      // Track the entity key locally
      this.entityKeys.add(entityResult.entityKey);
      
      // Save to localStorage for persistence
      this.saveEntityKeysToStorage();

      // Generate transaction URL for Golem Base
      const txUrl = `https://explorer.kaolin.holesky.golemdb.io/entity/${entityResult.entityKey}`;
      
      console.log(`✅ Memory uploaded successfully!`);
      console.log(`📋 Upload result:`, entityResult);
      console.log(`🔗 Transaction URL: ${txUrl}`);

      return {
        entityKey: entityResult.entityKey,
        size: content.length,
        timestamp: Date.now(),
        chainId: this.config.chainId
      };
    } catch (error) {
      console.error('Failed to upload memory to Golem Base:', error);
      throw new Error('Memory upload to Golem Base failed');
    }
  }

  async retrieveMemory(entityKey: string): Promise<MemoryEntry | null> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Golem Base client not initialized');
    }

    // Validate entity key
    if (!entityKey || typeof entityKey !== 'string' || entityKey.trim() === '') {
      console.warn('Invalid entity key provided:', entityKey);
      return null;
    }

    try {
      console.log(`🔍 Retrieving memory with entity key: ${entityKey}`);
      
      // Generate transaction URL for Golem Base
      const txUrl = `https://explorer.kaolin.holesky.golemdb.io/entity/${entityKey}`;
      console.log(`🔗 Transaction URL: ${txUrl}`);

      // Get the storage value directly using the entity key
      const storageValue = await this.client.getStorageValue(entityKey);
      
      if (!storageValue || storageValue.length === 0) {
        console.log(`No memory found with entity key: ${entityKey}`);
        return null;
      }

      // Parse the retrieved content
      const text = this.decoder.decode(storageValue);
      
      // Check if the content is valid JSON (our memory format)
      let memoryData;
      try {
        memoryData = JSON.parse(text);
      } catch (jsonError) {
        console.log(`Entity ${entityKey} contains non-JSON data: ${text.substring(0, 50)}...`);
        return null;
      }

      // Validate that this is our memory format
      if (!memoryData.id || !memoryData.content || !memoryData.accessPolicy) {
        console.log(`Entity ${entityKey} is not a valid memory format`);
        return null;
      }

      // Convert back to MemoryEntry
      const memory: MemoryEntry = {
        id: memoryData.id,
        content: memoryData.content,
        type: memoryData.type || 'conversation',
        category: memoryData.category || 'general',
        tags: memoryData.tags || [],
        createdAt: new Date(memoryData.createdAt),
        updatedAt: new Date(memoryData.updatedAt),
        encrypted: memoryData.encrypted || false,
        accessPolicy: memoryData.accessPolicy,
        metadata: memoryData.metadata || {},
        ipfsHash: entityKey, // Store the entity key as ipfsHash for compatibility
      };

      console.log(`✅ Memory retrieved successfully!`);
      console.log(`📋 Memory ID: ${memory.id}, Type: ${memory.type}`);
      
      return memory;
    } catch (error) {
      console.error('Failed to retrieve memory from Golem Base:', error);
      return null;
    }
  }

  async updateMemory(entityKey: string, updatedMemory: MemoryEntry): Promise<GolemUploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Golem Base client not initialized');
    }

    try {
      console.log(`📝 Updating memory with entity key: ${entityKey}`);
      
      // Generate transaction URL for Golem Base
      const txUrl = `https://explorer.kaolin.holesky.golemdb.io/entity/${entityKey}`;
      console.log(`🔗 Transaction URL: ${txUrl}`);

      // Prepare the updated memory data
      const memoryData = {
        id: updatedMemory.id,
        content: updatedMemory.content,
        type: updatedMemory.type,
        category: updatedMemory.category,
        tags: updatedMemory.tags,
        createdAt: updatedMemory.createdAt.toISOString(),
        updatedAt: updatedMemory.updatedAt.toISOString(),
        encrypted: updatedMemory.encrypted,
        accessPolicy: updatedMemory.accessPolicy,
        metadata: updatedMemory.metadata
      };

      const content = this.encoder.encode(JSON.stringify(memoryData));
      const contentHex = '0x' + Buffer.from(content).toString('hex');

      // Create updated annotations
      const annotations: Annotation<string>[] = [
        { key: 'memoryId', value: updatedMemory.id },
        { key: 'type', value: updatedMemory.type },
        { key: 'category', value: updatedMemory.category },
        { key: 'owner', value: updatedMemory.accessPolicy.owner },
        { key: 'createdAt', value: updatedMemory.createdAt.toISOString() },
        { key: 'updatedAt', value: updatedMemory.updatedAt.toISOString() }
      ];

      // Create update data using the SDK
      const updateData: GolemBaseUpdate = {
        entityKey: entityKey as `0x${string}`,
        data: Buffer.from(content),
        btl: 1000, // Block to live
        stringAnnotations: annotations,
        numericAnnotations: []
      };

      const result = await this.client.updateEntities([updateData]);
      
      if (!result || result.length === 0) {
        throw new Error('Failed to update entity - no result returned');
      }

      const entityResult = result[0];

      console.log(`✅ Memory updated successfully!`);
      console.log(`📋 Update result:`, entityResult);

      return {
        entityKey: entityResult.entityKey,
        size: content.length,
        timestamp: Date.now(),
        chainId: this.config.chainId
      };
    } catch (error) {
      console.error('Failed to update memory in Golem Base:', error);
      throw new Error('Memory update in Golem Base failed');
    }
  }

  async deleteMemory(entityKey: string): Promise<boolean> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Golem Base client not initialized');
    }

    try {
      console.log(`🗑️ Deleting memory with entity key: ${entityKey}`);
      
      // Generate transaction URL for Golem Base
      const txUrl = `https://explorer.kaolin.holesky.golemdb.io/entity/${entityKey}`;
      console.log(`🔗 Transaction URL: ${txUrl}`);

      // Remove from local tracking
      this.entityKeys.delete(entityKey);
      
      // Save to localStorage for persistence
      this.saveEntityKeysToStorage();

      // Delete entity using the SDK
      const result = await this.client.deleteEntities([entityKey as `0x${string}`]);

      console.log(`✅ Memory deleted successfully!`);
      console.log(`📋 Delete result:`, result);

      return true;
    } catch (error) {
      console.error('Failed to delete memory from Golem Base:', error);
      return false;
    }
  }

  async searchMemories(query: string, owner?: string, limit: number = 10): Promise<MemoryEntry[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Golem Base client not initialized');
    }

    try {
      console.log(`🔍 Searching memories with query: "${query}", owner: ${owner}, limit: ${limit}`);

      // Use the efficient owner-based method to get owned entities
      const entities = await this.queryEntities('');
      
      if (!entities || entities.length === 0) {
        console.log('No owned entities found');
        return [];
      }

      console.log(`📊 Found ${entities.length} owned entities from Golem Base, filtering for memories...`);

      const memories: MemoryEntry[] = [];
      
      // Process entities to find our memories
      for (const entity of entities) {
        try {
          const memory = await this.retrieveMemory(entity.entityKey);
          if (memory) {
            // Filter by owner if specified
            if (owner && memory.accessPolicy.owner !== owner) {
              continue;
            }
            
            // Filter by query if specified
            if (query && !memory.content.toLowerCase().includes(query.toLowerCase()) && 
                !memory.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))) {
              continue;
            }
            
            memories.push(memory);
            
            if (memories.length >= limit) {
              break;
            }
          }
        } catch (error) {
          // Silently skip non-memory entities
          continue;
        }
      }

      console.log(`✅ Found ${memories.length} memories matching search criteria`);
      return memories;
    } catch (error) {
      console.error('Failed to search memories in Golem Base:', error);
      return [];
    }
  }

  // Query entities from Golem Base using the correct SDK method
  async queryEntities(query: string = ''): Promise<any[]> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Golem Base client not initialized');
    }

    try {
      console.log(`🔍 Querying Golem Base with query: "${query}"`);
      
      // If no query provided, get owned entities using getOwnedEntityKeys (much more efficient!)
      if (!query || query.trim() === '') {
        console.log('🔍 Empty query detected, getting owned entities...');
        const entityKeys = await this.getOwnedEntityKeys();
        
        // Convert entity keys to the expected format
        const entities = [];
        for (const entityKey of entityKeys) {
          try {
            const storageValue = await this.client.getStorageValue(entityKey);
            entities.push({
              entityKey: entityKey,
              storageValue: storageValue
            });
          } catch (error) {
            console.warn(`Failed to get storage value for entity ${entityKey}:`, error);
          }
        }
        
        console.log(`📊 Found ${entities.length} owned entities from Golem Base`);
        return entities;
      }
      
      // Use the Golem Base SDK queryEntities method for specific queries
      const entities = await this.client.queryEntities(query);
      
      console.log(`📊 Found ${entities.length} entities from Golem Base query`);
      return entities;
    } catch (error) {
      console.error('Failed to query entities from Golem Base:', error);
      
      // Return empty array on error to allow the app to continue
      console.warn('⚠️ Query failed, returning empty results');
      return [];
    }
  }

  // Get all entity keys from Golem Base using the correct SDK method
  async getAllEntityKeys(): Promise<string[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Golem Base client not initialized');
      }

      console.log('📊 Fetching all entity keys from Golem Base...');
      
      // Use the correct API method from the documentation
      const entityKeys = await this.client.getAllEntityKeys();
      
      console.log(`📊 Retrieved ${entityKeys.length} entity keys from Golem Base`);
      
      // Update our local tracking with the actual keys from Golem Base
      this.entityKeys.clear();
      entityKeys.forEach((key: string) => this.entityKeys.add(key));
      
      // Save to localStorage for persistence
      this.saveEntityKeysToStorage();
      
      return entityKeys;
    } catch (error) {
      console.error('Failed to get entity keys from Golem Base:', error);
      
      // Fallback to local tracking if API fails
      console.log(`📊 Falling back to local entity key tracking: ${this.entityKeys.size} entities tracked`);
      return Array.from(this.entityKeys);
    }
  }

  // Get entity keys owned by the current address - much more efficient!
  async getOwnedEntityKeys(): Promise<string[]> {
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }

      if (!this.client) {
        throw new Error('Golem Base client not initialized');
      }

      console.log('📊 Fetching entity keys owned by current address...');
      
      // Get the owner address first
      const ownerAddress = await this.client.getOwnerAddress();
      console.log('📊 Owner address:', ownerAddress);
      
      // Use getEntitiesOfOwner for much more efficient retrieval
      const entityKeys = await this.client.getEntitiesOfOwner(ownerAddress);
      
      console.log(`📊 Retrieved ${entityKeys.length} entity keys owned by ${ownerAddress}`);
      
      // Update our local tracking with the owned keys
      this.entityKeys.clear();
      entityKeys.forEach((key: string) => this.entityKeys.add(key));
      
      // Save to localStorage for persistence
      this.saveEntityKeysToStorage();
      
      return entityKeys;
    } catch (error) {
      console.error('Failed to get owned entity keys from Golem Base:', error);
      
      // Fallback to local tracking if API fails
      console.log(`📊 Falling back to local entity key tracking: ${this.entityKeys.size} entities tracked`);
      return Array.from(this.entityKeys);
    }
  }

  async getStorageStats(): Promise<{
    totalMemories: number;
    totalSize: number;
    pinnedMemories: number;
    chainId: number;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      return {
        totalMemories: 0,
        totalSize: 0,
        pinnedMemories: 0,
        chainId: this.config.chainId,
      };
    }

    try {
      console.log(`📊 Getting storage statistics...`);

      // Get owned entity keys and sample them to estimate memory count and size
      const entityKeys = await this.getOwnedEntityKeys();
      
      if (!entityKeys || entityKeys.length === 0) {
        return {
          totalMemories: 0,
          totalSize: 0,
          pinnedMemories: 0,
          chainId: this.config.chainId,
        };
      }

      // Debug: Log the raw entity keys to understand what we're getting
      console.log('📊 Raw entity keys from Golem Base (stats):', entityKeys.slice(0, 5), '...');
      console.log('📊 Entity keys types (stats):', entityKeys.slice(0, 5).map((key: any) => typeof key));

      // Filter out invalid entity keys with more robust validation
      const validEntityKeys = entityKeys.filter((key: any) => {
        const isValid = key !== null && 
                       key !== undefined && 
                       typeof key === 'string' && 
                       key.trim() !== '' &&
                       key.length > 0;
        
        if (!isValid) {
          console.warn('🚫 Invalid entity key filtered out in stats:', key, typeof key);
        }
        
        return isValid;
      });

      console.log(`📊 Found ${validEntityKeys.length} valid entities (${entityKeys.length - validEntityKeys.length} invalid), sampling for memory stats...`);

      let totalSize = 0;
      let validMemories = 0;

      // Sample a subset of entities to estimate memory count and size
      const sampleSize = Math.min(validEntityKeys.length, 50); // Sample up to 50 entities
      const sampleKeys = validEntityKeys.slice(0, sampleSize);

      for (const entityKey of sampleKeys) {
        // Double-check entity key validity before processing
        if (!entityKey || typeof entityKey !== 'string' || entityKey.trim() === '') {
          console.warn('🚫 Skipping invalid entity key in stats processing:', entityKey);
          continue;
        }
        try {
          const memory = await this.retrieveMemory(entityKey);
          if (memory) {
            totalSize += memory.metadata.size || 0;
            validMemories++;
          }
        } catch (error) {
          // Silently skip non-memory entities
        }
      }

      // Estimate total memories based on sample
      const estimatedMemories = validEntityKeys.length > 0 ? 
        Math.round((validMemories / sampleSize) * validEntityKeys.length) : 0;
      const estimatedSize = validEntityKeys.length > 0 ? 
        Math.round((totalSize / sampleSize) * validEntityKeys.length) : 0;

      return {
        totalMemories: estimatedMemories,
        totalSize: estimatedSize,
        pinnedMemories: estimatedMemories, // All stored data is "pinned" in Golem Base
        chainId: this.config.chainId,
      };
    } catch (error) {
      console.error('Failed to get storage stats:', error);
      return {
        totalMemories: 0,
        totalSize: 0,
        pinnedMemories: 0,
        chainId: this.config.chainId,
      };
    }
  }

  async cleanup(): Promise<void> {
    // Golem Base client doesn't have a disconnect method
    this.isInitialized = false;
  }
}

// Factory function to create Golem storage service
export function getGolemStorage(config: GolemConfig): GolemStorageService {
  return new GolemStorageService(config);
}