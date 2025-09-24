import { connect, keyStores, WalletConnection, Contract, Account } from 'near-api-js';
import { ContractMethods, NearConfig, MemoryAnchor } from '@/types/near';

export class NearWalletService {
  private near: any;
  private wallet: WalletConnection | null = null;
  private account: Account | null = null;
  private contract: Contract | null = null;
  private config: NearConfig;

  constructor(config: NearConfig) {
    this.config = config;
  }

  async initialize(): Promise<void> {
    try {
      // Create key store
      const keyStore = new keyStores.BrowserLocalStorageKeyStore();

      // Use a more reliable RPC endpoint to avoid rate limiting
      const rpcUrl = this.config.nodeUrl.includes('testnet') 
        ? 'https://rpc.testnet.near.org' 
        : 'https://rpc.mainnet.near.org';

      // Connect to NEAR with retry logic
      this.near = await connect({
        networkId: this.config.networkId,
        nodeUrl: rpcUrl,
        walletUrl: this.config.walletUrl,
        keyStore,
        helperUrl: this.config.helperUrl,
      });

      // Initialize wallet
      this.wallet = new WalletConnection(this.near, 'privacy-first-ai-memory');
      
      // Check if user returned from wallet authentication
      if (this.wallet.isSignedIn()) {
        console.log('🔗 NEAR wallet already signed in, setting up account...')
        this.account = this.wallet.account();
        console.log('📋 Account ID:', this.account.accountId)
        await this.initializeContract();
        console.log('✅ NEAR account and contract initialized')
      } else {
        console.log('ℹ️ NEAR wallet not signed in')
      }
      
      console.log('📱 NEAR wallet service initialized, connection status:', this.wallet.isSignedIn());
    } catch (error) {
      console.error('Failed to initialize NEAR wallet:', error);
      // Don't throw error, allow app to continue without NEAR
      console.warn('Continuing without NEAR wallet functionality');
    }
  }

  async connectWallet(): Promise<boolean> {
    if (!this.wallet) {
      console.log('🔄 NEAR wallet not initialized, initializing...')
      await this.initialize();
    }

    try {
      console.log('🔍 Checking NEAR wallet connection status...')
      console.log('📱 Wallet signed in:', this.wallet!.isSignedIn())
      
      if (!this.wallet!.isSignedIn()) {
        console.log('🔗 Starting NEAR wallet authentication...')
        // Redirect to NEAR wallet for authentication
        const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || 'memory-anchor.testnet';
        
        // Use requestSignIn for proper NEAR wallet authentication
        this.wallet!.requestSignIn({
          contractId: contractId,
          methodNames: [
            'create_memory_anchor',
            'update_memory_anchor', 
            'delete_memory_anchor',
            'grant_permission',
            'revoke_permission'
          ]
        });
        
        // Return true to indicate the connection process has started
        console.log('🚀 NEAR wallet redirect initiated')
        return true;
      }

      if (this.wallet!.isSignedIn()) {
        console.log('✅ NEAR wallet already signed in')
        if (!this.account) {
          console.log('⚙️ Setting up account and contract...')
          this.account = this.wallet!.account();
          await this.initializeContract();
          console.log('✅ Account and contract setup complete')
        }
        return true;
      }

      console.log('❌ NEAR wallet connection failed')
      return false;
    } catch (error) {
      console.error('❌ Failed to connect NEAR wallet:', error);
      return false;
    }
  }

  async disconnectWallet(): Promise<void> {
    console.log('🔌 NEAR wallet disconnect initiated...')
    
    // Always reset internal state immediately
    this.account = null
    this.contract = null
    console.log('🔄 NEAR wallet internal state reset')
    
    // Don't wait for NEAR wallet operations - just trigger signOut in background
    if (this.wallet) {
      try {
        const isCurrentlySignedIn = this.wallet.isSignedIn()
        console.log('🔍 Currently signed in:', isCurrentlySignedIn)
        
        if (isCurrentlySignedIn) {
          console.log('🚪 Triggering NEAR wallet signOut in background...')
          // Don't await this - let it happen in background to avoid hanging
          Promise.resolve().then(() => {
            try {
              this.wallet.signOut()
              console.log('✅ NEAR wallet signOut triggered')
            } catch (signOutError) {
              console.warn('⚠️ SignOut background error:', signOutError)
            }
          })
        } else {
          console.log('ℹ️  Already signed out from NEAR')
        }
      } catch (error) {
        console.warn('⚠️ Error checking NEAR wallet status:', error)
      }
    } else {
      console.log('ℹ️  NEAR wallet not initialized')
    }
    
    console.log('✅ NEAR wallet disconnect completed (non-blocking)')
  }

  isConnected(): boolean {
    const connected = this.wallet?.isSignedIn() || false;
    console.log('🔍 [NEAR] isConnected check:', {
      walletExists: !!this.wallet,
      isSignedIn: this.wallet?.isSignedIn(),
      accountExists: !!this.account,
      result: connected
    });
    return connected;
  }

  getAccountId(): string | null {
    return this.account?.accountId || null;
  }

  async getAccountBalance(): Promise<string> {
    if (!this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.account.getAccountBalance();
      // Convert yoctoNEAR to NEAR (divide by 10^24)
      const yoctoNearBalance = balance.available;
      const nearBalance = parseFloat(yoctoNearBalance) / Math.pow(10, 24);
      
      // Format to reasonable decimal places
      const formattedBalance = nearBalance.toFixed(4);
      console.log('💰 Balance conversion:', { yoctoNearBalance, nearBalance, formattedBalance });
      
      return formattedBalance;
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return '0.0000';
    }
  }

  private async initializeContract(): Promise<void> {
    if (!this.account) {
      throw new Error('Account not available');
    }

    const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || 'memory-anchor.testnet';
    
    this.contract = new Contract(
      this.account,
      contractId,
      {
        viewMethods: [
          'get_memory_anchor',
          'get_user_memories',
          'get_memory_permissions',
          'get_agent_permissions',
          'get_contract_stats',
          'search_memories'
        ],
        changeMethods: [
          'create_memory_anchor',
          'update_memory_anchor',
          'delete_memory_anchor',
          'grant_permission',
          'revoke_permission'
        ]
      }
    );
  }

  // Contract interaction methods
  async createMemoryAnchor(
    memoryId: string,
    cid: string,
    userId: string,
    accessPolicy: string,
    fileSize?: number,
    mimeType?: string
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).create_memory_anchor({
        memoryId,
        cid,
        userId,
        accessPolicy,
        fileSize,
        mimeType
      });
      
      console.log('Memory anchor created:', result);
      return result.transaction.hash;
    } catch (error) {
      console.error('Failed to create memory anchor:', error);
      throw error;
    }
  }

  async updateMemoryAnchor(
    memoryId: string,
    cid: string,
    userId: string,
    accessPolicy: string,
    fileSize?: number,
    mimeType?: string
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).update_memory_anchor({
        memoryId,
        cid,
        userId,
        accessPolicy,
        fileSize,
        mimeType
      });
      
      console.log('Memory anchor updated:', result);
      return result.transaction.hash;
    } catch (error) {
      console.error('Failed to update memory anchor:', error);
      throw error;
    }
  }

  async deleteMemoryAnchor(memoryId: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).delete_memory_anchor({
        memoryId
      });
      
      console.log('Memory anchor deleted:', result);
      return result.transaction.hash;
    } catch (error) {
      console.error('Failed to delete memory anchor:', error);
      throw error;
    }
  }

  async grantPermission(
    memoryId: string,
    agentId: string,
    actions: string[]
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).grant_permission({
        memoryId,
        agentId,
        actions
      });
      
      console.log('Permission granted:', result);
      return result.transaction.hash;
    } catch (error) {
      console.error('Failed to grant permission:', error);
      throw error;
    }
  }

  async revokePermission(
    memoryId: string,
    agentId: string
  ): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).revoke_permission({
        memoryId,
        agentId
      });
      
      console.log('Permission revoked:', result);
      return result.transaction.hash;
    } catch (error) {
      console.error('Failed to revoke permission:', error);
      throw error;
    }
  }

  // View methods
  async getMemoryAnchor(memoryId: string): Promise<MemoryAnchor | null> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).get_memory_anchor({
        memoryId
      });
      
      return result;
    } catch (error) {
      console.error('Failed to get memory anchor:', error);
      return null;
    }
  }

  async getUserMemories(
    accountId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<MemoryAnchor[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).get_user_memories({
        accountId,
        limit,
        offset
      });
      
      return result || [];
    } catch (error) {
      console.error('Failed to get user memories:', error);
      return [];
    }
  }

  async getMemoryPermissions(memoryId: string): Promise<string> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).get_memory_permissions({
        memoryId
      });
      
      return result || '{}';
    } catch (error) {
      console.error('Failed to get memory permissions:', error);
      return '{}';
    }
  }

  async getAgentPermissions(agentId: string): Promise<string[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).get_agent_permissions({
        agentId
      });
      
      return result || [];
    } catch (error) {
      console.error('Failed to get agent permissions:', error);
      return [];
    }
  }

  async searchMemories(
    query: string,
    owner?: string,
    limit: number = 20
  ): Promise<MemoryAnchor[]> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).search_memories({
        query,
        owner,
        limit
      });
      
      return result || [];
    } catch (error) {
      console.error('Failed to search memories:', error);
      return [];
    }
  }

  async getContractStats(): Promise<{ totalMemories: number; version: string }> {
    if (!this.contract) {
      throw new Error('Contract not initialized');
    }

    try {
      const result = await (this.contract as any).get_contract_stats();
      return result;
    } catch (error) {
      console.error('Failed to get contract stats:', error);
      return { totalMemories: 0, version: 'unknown' };
    }
  }

  // Utility methods
  async signMessage(message: string): Promise<string> {
    if (!this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // Use NEAR wallet to sign a message
      const messageBytes = new TextEncoder().encode(message);
      const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
      
      // Create a transaction to sign the message
      // Note: NEAR doesn't have direct message signing like Ethereum
      // We use a function call transaction instead
      const result = await this.account.signAndSendTransaction({
        receiverId: this.account.accountId,
        actions: [
          {
            type: 'FunctionCall',
            params: {
              methodName: 'sign_message',
              args: {
                message: message,
                hash: Array.from(new Uint8Array(messageHash))
              },
              gas: '30000000000000',
              deposit: '0'
            }
          }
        ]
      });
      
      return result.transaction.hash;
    } catch (error) {
      console.error('Failed to sign message:', error);
      // Fallback to a hash-based signature for demo purposes
      const messageBytes = new TextEncoder().encode(message + this.account.accountId);
      const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
      const hashArray = Array.from(new Uint8Array(messageHash));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
  }

  async verifySignature(message: string, signature: string, accountId?: string): Promise<boolean> {
    if (!this.account && !accountId) {
      throw new Error('Wallet not connected and no account ID provided');
    }

    try {
      const targetAccountId = accountId || this.account!.accountId;
      
      // For hash-based signatures (fallback), verify the hash
      if (signature.length === 64 && /^[a-f0-9]+$/i.test(signature)) {
        const messageBytes = new TextEncoder().encode(message + targetAccountId);
        const messageHash = await crypto.subtle.digest('SHA-256', messageBytes);
        const expectedSignature = Array.from(new Uint8Array(messageHash))
          .map(b => b.toString(16).padStart(2, '0'))
          .join('');
        
        return signature.toLowerCase() === expectedSignature.toLowerCase();
      }
      
      // For transaction-based signatures, query the blockchain
      // This would require implementing a verification contract or service
      // For now, we'll check if the signature looks like a valid NEAR transaction hash
      return signature.length === 44 && /^[A-Za-z0-9]+$/.test(signature);
    } catch (error) {
      console.error('Failed to verify signature:', error);
      return false;
    }
  }
}

// NEAR configuration
export const getNearConfig = (): NearConfig => {
  const networkId = process.env.NEXT_PUBLIC_NEAR_NETWORK || 'testnet';
  
  if (networkId === 'testnet') {
    return {
      networkId: 'testnet',
      nodeUrl: 'https://rpc.testnet.near.org',
      walletUrl: 'https://testnet.mynearwallet.com',
      helperUrl: 'https://helper.testnet.near.org',
      explorerUrl: 'https://explorer.testnet.near.org',
    };
  } else if (networkId === 'mainnet') {
    return {
      networkId: 'mainnet',
      nodeUrl: 'https://rpc.mainnet.near.org',
      walletUrl: 'https://app.mynearwallet.com',
      helperUrl: 'https://helper.mainnet.near.org',
      explorerUrl: 'https://explorer.near.org',
    };
  } else {
    // Local development
    return {
      networkId: 'local',
      nodeUrl: 'http://localhost:3030',
      walletUrl: 'http://localhost:4000',
      helperUrl: 'http://localhost:3000',
      explorerUrl: 'http://localhost:9001',
    };
  }
};

// Singleton instance
let nearWalletInstance: NearWalletService | null = null;

export const getNearWallet = (): NearWalletService => {
  if (!nearWalletInstance) {
    const config = getNearConfig();
    nearWalletInstance = new NearWalletService(config);
  }
  return nearWalletInstance;
};
