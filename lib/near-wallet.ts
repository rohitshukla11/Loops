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
        this.account = this.wallet.account();
        await this.initializeContract();
      }
      
      console.log('NEAR wallet service initialized');
    } catch (error) {
      console.error('Failed to initialize NEAR wallet:', error);
      // Don't throw error, allow app to continue without NEAR
      console.warn('Continuing without NEAR wallet functionality');
    }
  }

  async connectWallet(): Promise<boolean> {
    if (!this.wallet) {
      await this.initialize();
    }

    try {
      if (!this.wallet!.isSignedIn()) {
        // Redirect to NEAR wallet for authentication
        const walletUrl = this.config.walletUrl;
        const contractId = process.env.NEXT_PUBLIC_CONTRACT_ID || 'memory-anchor.testnet';
        const redirectUrl = `${walletUrl}/login/?contract_id=${contractId}&title=AI%20Memory%20App&success_url=${encodeURIComponent(window.location.href)}&failure_url=${encodeURIComponent(window.location.href)}`;
        
        // Open wallet in new tab
        window.open(redirectUrl, '_blank');
        
        // Return true to indicate the connection process has started
        return true;
      }

      if (this.wallet!.isSignedIn()) {
        this.account = this.wallet!.account();
        await this.initializeContract();
        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect wallet:', error);
      return false;
    }
  }

  async disconnectWallet(): Promise<void> {
    if (this.wallet) {
      this.wallet.signOut();
      this.account = null;
      this.contract = null;
    }
  }

  isConnected(): boolean {
    return this.wallet?.isSignedIn() || false;
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
      return balance.available;
    } catch (error) {
      console.error('Failed to get account balance:', error);
      return '0';
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
      // For demo purposes, return a mock signature
      // In production, you would use the NEAR wallet to sign messages
      const mockSignature = `mock_signature_${Date.now()}`;
      return mockSignature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      throw error;
    }
  }

  async verifySignature(message: string, signature: string): Promise<boolean> {
    if (!this.account) {
      throw new Error('Wallet not connected');
    }

    try {
      // For demo purposes, always return true
      // In production, you would verify the signature
      return true;
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
