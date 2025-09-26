import { MemoryEntry, MemoryMetadata } from '@/types/memory';
import { createClient, AccountData, Tagged, GolemBaseCreate, Annotation, GolemBaseUpdate } from 'golem-base-sdk';
import { keccak256 } from 'viem';
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
  transactionUrl?: string;
  transactionHash?: string;
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
  private currentNonce: number | null = null;
  private nonceLock = false;
  private txLock = false;

  constructor(config: GolemConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Validate private key
      const cleanPrivateKey = this.config.privateKey.replace('0x', '').trim();
      console.log('🔍 Private key validation:', {
        original: this.config.privateKey,
        cleaned: cleanPrivateKey,
        length: cleanPrivateKey.length,
        isDefault: cleanPrivateKey === '0000000000000000000000000000000000000000000000000000000000000000'
      });
      
      if (!this.config.privateKey || 
          cleanPrivateKey === '0000000000000000000000000000000000000000000000000000000000000000' ||
          cleanPrivateKey.length !== 64) {
        throw new Error(`Invalid private key. Length: ${cleanPrivateKey.length}, Expected: 64. Please set NEXT_PUBLIC_GOLEM_PRIVATE_KEY in your environment variables.`);
      }

      // Create account data from private key
      const key: AccountData = new Tagged(
        "privatekey", 
        Buffer.from(this.config.privateKey.replace('0x', ''), 'hex')
      );

      // Initialize the Golem Base client using the SDK with retry logic
      console.log('🔧 Initializing Golem Base client with retry logic...');
      
      let initAttempts = 0;
      const maxInitAttempts = 3;
      
      while (initAttempts < maxInitAttempts) {
        try {
          this.client = await createClient(
            this.config.chainId,
            key,
            this.config.rpcUrl,
            this.config.wsUrl,
          );
          break; // Success, exit retry loop
        } catch (error: any) {
          initAttempts++;
          console.warn(`⚠️  Golem Base client initialization attempt ${initAttempts}/${maxInitAttempts} failed:`, error?.message);
          
          if (initAttempts >= maxInitAttempts) {
            throw new Error(`Failed to initialize Golem Base client after ${maxInitAttempts} attempts: ${error?.message}`);
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 2000 * initAttempts));
        }
      }

      this.isInitialized = true;
      console.log('✅ Golem Base storage service initialized successfully');
      console.log('✅ Client object:', this.client);
      console.log('✅ Chain ID:', this.config.chainId);
      console.log('✅ RPC URL:', this.config.rpcUrl);
      
      // Load existing entity keys from localStorage for persistence
      this.loadEntityKeysFromStorage();
      
      // Debug: Log available methods for troubleshooting
      this.debugClientMethods();
    } catch (error: any) {
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

  private async getCurrentNonce(): Promise<number> {
    try {
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionCount',
          // Use 'pending' to include pending transactions in nonce calculation
          params: ['0x68343Aa0598b7FCAA102769D172e59cdDfae10f2', 'pending'],
          id: 1
        }),
        signal: AbortSignal.timeout(30000)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`RPC Error: ${data.error.message}`);
      }

      const nonce = parseInt(data.result, 16);
      console.log(`📊 Current nonce: ${nonce}`);
      return nonce;
    } catch (error: any) {
      console.warn(`⚠️ Failed to get nonce: ${error.message}`);
      return 0; // Fallback to 0
    }
  }

  private async testRpcConnection(): Promise<void> {
    try {
      // Test basic RPC connectivity with improved error handling
      const response = await fetch(this.config.rpcUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': '*/*',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_chainId',
          params: [],
          id: 1
        }),
        signal: AbortSignal.timeout(30000) // 30 second timeout
      });

      if (!response.ok) {
        throw new Error(`RPC test failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(`RPC error: ${data.error.message}`);
      }

      console.log('✅ RPC connection test successful');
    } catch (error: any) {
      console.warn('⚠️ RPC connection test failed:', error.message);
      throw error;
    }
  }

  private async testRpcConnectionWithRetry(): Promise<void> {
    let attempts = 0;
    const maxAttempts = 2; // Reduced attempts for faster fallback
    
    while (attempts < maxAttempts) {
      try {
        await this.testRpcConnection();
        return; // Success, exit retry loop
      } catch (error: any) {
        attempts++;
        console.warn(`⚠️  RPC connection attempt ${attempts}/${maxAttempts} failed:`, error.message);
        
        if (attempts >= maxAttempts) {
          console.warn(`🌐 Golem Base RPC test failed after ${maxAttempts} attempts, but continuing with initialization`);
          // Don't throw error, just warn and continue - the actual operations might still work
          return;
        }
        
        // Wait before retrying (exponential backoff)
        const delay = 1000 * Math.pow(2, attempts - 1); // 1s, 2s
        console.log(`🔄 Retrying RPC connection in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  private async waitForNonceAvailability(): Promise<void> {
    // Wait for nonce lock to be released
    while (this.nonceLock) {
      console.log('⏳ Waiting for nonce lock to be released...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // Acquire nonce lock
    this.nonceLock = true;
    
    try {
      // Get current nonce
      const currentNonce = await this.getCurrentNonce();
      
      // If we have a stored nonce, make sure it's not behind
      if (this.currentNonce !== null && this.currentNonce < currentNonce) {
        console.log(`📊 Updating nonce from ${this.currentNonce} to ${currentNonce}`);
        this.currentNonce = currentNonce;
      } else if (this.currentNonce === null) {
        this.currentNonce = currentNonce;
      }
      
      // Increment nonce for this transaction
      this.currentNonce++;
      console.log(`📊 Using nonce: ${this.currentNonce}`);
      
    } finally {
      // Release nonce lock after a delay
      setTimeout(() => {
        this.nonceLock = false;
      }, 3000); // 3 second delay to prevent rapid nonce reuse
    }
  }

  private async acquireTxLock(): Promise<void> {
    while (this.txLock) {
      console.log('⏳ Waiting for previous transaction to finish...');
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    this.txLock = true;
  }

  private releaseTxLock(): void {
    this.txLock = false;
  }

  async uploadMemory(memory: MemoryEntry): Promise<GolemUploadResult> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    if (!this.client) {
      throw new Error('Golem Base client not initialized');
    }

    try {
      // Ensure only one transaction is sent at a time to avoid nonce replacement errors
      await this.acquireTxLock();

      // Test RPC connectivity first with retry logic
      await this.testRpcConnectionWithRetry();
      
      // Wait for nonce availability to prevent nonce conflicts
      await this.waitForNonceAvailability();
      
      // Proceed immediately to entity creation (no artificial delay)
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

      // Check transaction size before sending
      const transactionSize = contentHex.length;
      const MAX_TX_SIZE = 200000; // 200KB limit for transaction data
      if (transactionSize > MAX_TX_SIZE) {
        throw new Error(`Transaction too large: ${transactionSize} bytes (max: ${MAX_TX_SIZE}). Content size: ${content.length} bytes. Please reduce memory content size.`);
      }

      console.log(`📊 Transaction size: ${transactionSize} bytes (${(transactionSize / 1024).toFixed(1)} KB)`);

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

      // 🎯 SOLUTION: Use the official txHashCallback from Golem Base SDK
      let transactionHash: string | undefined;
      
      console.log('🚀 Using official Golem Base SDK txHashCallback for immediate TX hash capture...');
      
      // Create the entity using sendTransaction with txHashCallback
      const result = await this.client.sendTransaction([createData], undefined, undefined, undefined, {
        txHashCallback: (txHash: `0x${string}`) => {
          transactionHash = txHash;
          const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
          const immediateUrl = `${explorerUrl}/tx/${txHash}`;
          
          console.log(`🎯 OFFICIAL TX HASH CAPTURED: ${txHash}`);
          console.log(`🚀 IMMEDIATE TX URL: ${immediateUrl}`);
          console.log(`✅ Transaction submitted! You can check its status immediately at: ${immediateUrl}`);
        }
      });
      
      // Update the entity with transaction hash if captured
      if (transactionHash && result.createEntitiesReceipts && result.createEntitiesReceipts.length > 0) {
        try {
          console.log('📝 Updating entity with transaction hash...');
          
          // Add transaction hash to memory data
          const updatedMemoryData = {
            ...memoryData,
            transactionHash: transactionHash,
            explorerUrl: `${process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io'}/tx/${transactionHash}`
          };
          
          const updatedContent = this.encoder.encode(JSON.stringify(updatedMemoryData));
          
          // Add transaction hash to annotations
          const updatedAnnotations: Annotation<string>[] = [
            ...annotations,
            { key: 'transactionHash', value: transactionHash },
            { key: 'explorerUrl', value: `${process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io'}/tx/${transactionHash}` }
          ];
          
          // Update the entity with the transaction hash
          const updateData: GolemBaseUpdate = {
            entityKey: result.createEntitiesReceipts[0].entityKey as `0x${string}`,
            data: Buffer.from(updatedContent),
            btl: 1000,
            stringAnnotations: updatedAnnotations,
            numericAnnotations: []
          };
          
          await this.client.updateEntities([updateData]);
          console.log('✅ Entity updated with transaction hash successfully!');
          
        } catch (updateError: any) {
          console.warn('⚠️ Failed to update entity with transaction hash:', updateError.message);
          // Continue execution - the entity was created successfully, just without the hash update
        }
      }
      
      // Extract createEntities results from sendTransaction response
      const entityResults = result.createEntitiesReceipts;
      
      if (!entityResults || entityResults.length === 0) {
        throw new Error('Failed to create entity - no result returned');
      }

      const entityResult = entityResults[0];

      // Track the entity key locally
      this.entityKeys.add(entityResult.entityKey);
      
      // Save to localStorage for persistence
      this.saveEntityKeysToStorage();

      // Generate transaction URL using the captured transaction hash
      const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
      const txUrl = transactionHash ? `${explorerUrl}/tx/${transactionHash}` : undefined;
      
      if (transactionHash) {
        console.log(`🔗 Final Transaction URL: ${txUrl}`);
        console.log(`✅ Official SDK transaction hash captured successfully!`);
        console.log(`📋 Transaction Hash: ${transactionHash}`);
        console.log(`🔍 View in account history: ${explorerUrl}/address/${process.env.NEXT_PUBLIC_GOLEM_ADDRESS}?tab=txs`);
      } else {
        console.warn(`⚠️ Transaction hash was not captured via txHashCallback`);
      }
      
      console.log(`✅ Memory uploaded successfully!`);
      console.log(`📋 Upload result:`, entityResult);

      return {
        entityKey: entityResult.entityKey,
        size: content.length,
        timestamp: Date.now(),
        chainId: this.config.chainId,
        transactionUrl: txUrl,
        transactionHash: transactionHash || undefined
      };
    } catch (error: any) {
      console.error('❌ DETAILED GOLEM BASE UPLOAD ERROR:', error);
      
      // Detailed error analysis
      const errorDetails = {
        errorType: error.constructor.name,
        message: error?.message,
        code: error?.code || 'UNKNOWN',
        cause: error.cause ? {
          type: error.cause.constructor.name,
          message: error.cause.message,
          code: error.cause.code || 'UNKNOWN'
        } : null,
        stack: error?.stack,
        config: {
          rpcUrl: this.config.rpcUrl,
          chainId: this.config.chainId,
          isInitialized: this.isInitialized,
          clientExists: !!this.client
        },
        timestamp: new Date().toISOString()
      };
      
      console.error('🔍 ERROR ANALYSIS:', JSON.stringify(errorDetails, null, 2));
      
      // Network-specific error analysis
      if (error?.message?.includes('fetch failed')) {
        console.error('🌐 NETWORK ERROR: The RPC endpoint is unreachable');
        console.error('   - Check if the RPC URL is correct:', this.config.rpcUrl);
        console.error('   - Verify network connectivity');
        console.error('   - Check if the Golem Base service is running');
      }
      
      if (error?.message?.includes('ETIMEDOUT')) {
        console.error('⏰ TIMEOUT ERROR: Request timed out');
        console.error('   - The RPC server is not responding within the timeout period');
        console.error('   - This could indicate server overload or network issues');
      }
      
      if (error?.message?.includes('HTTP request failed')) {
        console.error('🚫 HTTP ERROR: The RPC server returned an error');
        console.error('   - Check the server status');
        console.error('   - Verify the request format');
      }
      
      throw new Error(`Memory upload to Golem Base failed: ${error?.message}`);
    }
    finally {
      this.releaseTxLock();
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
      const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
      const txUrl = `${explorerUrl}/entity/${entityKey}`;
      console.log(`🔗 Entity URL: ${txUrl}`);

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

      // Generate entity URL for the memory
      const entityUrl = `${explorerUrl}/entity/${entityKey}`;
      
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
        entityUrl: entityUrl,
        transactionUrl: memoryData.transactionUrl // This will be set if available from upload
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
      const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
      const txUrl = `${explorerUrl}/entity/${entityKey}`;
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
      const explorerUrl = process.env.NEXT_PUBLIC_GOLEM_EXPLORER_URL || 'https://explorer.ethwarsaw.holesky.golemdb.io';
      const txUrl = `${explorerUrl}/entity/${entityKey}`;
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

      // Directly get owned entities using getEntitiesOfOwner (most efficient!)
      console.log('🔍 Getting owned entities directly...');
      const ownerAddress = process.env.NEXT_PUBLIC_GOLEM_ADDRESS || '0x68343Aa0598b7FCAA102769D172e59cdDfae10f2';
      console.log('📊 Owner address from env:', ownerAddress);
      
      const entityKeys = await this.client.getEntitiesOfOwner(ownerAddress);
      console.log(`📊 Entity keys result:`, entityKeys);
      console.log(`📊 Number of entity keys:`, entityKeys?.length || 0);
      
      if (!entityKeys || entityKeys.length === 0) {
        console.log('🔍 No owned entities found - this is normal for a fresh installation');
        return [];
      }

      console.log(`📊 Found ${entityKeys.length} owned entities from Golem Base, filtering for memories...`);

      const memories: MemoryEntry[] = [];
      
      // Process entity keys to find our memories
      for (const entityKey of entityKeys) {
        try {
          const memory = await this.retrieveMemory(entityKey);
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
      
      // If no query provided, get owned entities directly (most efficient!)
      if (!query || query.trim() === '') {
        console.log('🔍 Empty query detected, getting owned entities...');
        const ownerAddress = process.env.NEXT_PUBLIC_GOLEM_ADDRESS || '0x68343Aa0598b7FCAA102769D172e59cdDfae10f2';
        const entityKeys = await this.client.getEntitiesOfOwner(ownerAddress);
        
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

      // Get owned entity keys directly to estimate memory count and size
      const ownerAddress = process.env.NEXT_PUBLIC_GOLEM_ADDRESS || '0x68343Aa0598b7FCAA102769D172e59cdDfae10f2';
      const entityKeys = await this.client.getEntitiesOfOwner(ownerAddress);
      
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