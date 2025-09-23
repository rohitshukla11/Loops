// Unified wallet service supporting both NEAR and MetaMask
import { getNearWallet } from './near-wallet';
import { getMetaMaskWallet, MetaMaskAccount } from './metamask-wallet';

export type WalletType = 'near' | 'metamask';

export interface UnifiedWalletAccount {
  address: string;
  balance: string;
  isConnected: boolean;
  walletType: WalletType;
}

export class UnifiedWalletService {
  private nearWallet = getNearWallet();
  private metaMaskWallet = getMetaMaskWallet();
  private currentWalletType: WalletType | null = null;

  async initialize(): Promise<void> {
    // Initialize both wallet services
    try {
      await this.nearWallet.initialize();
    } catch (error) {
      console.warn('Failed to initialize NEAR wallet:', error);
    }
  }

  async connectWallet(walletType: WalletType): Promise<boolean> {
    try {
      this.currentWalletType = walletType;

      if (walletType === 'near') {
        return await this.nearWallet.connectWallet();
      } else if (walletType === 'metamask') {
        return await this.metaMaskWallet.connect();
      }

      return false;
    } catch (error) {
      console.error(`Failed to connect ${walletType} wallet:`, error);
      return false;
    }
  }

  async disconnectWallet(): Promise<void> {
    if (this.currentWalletType === 'near') {
      await this.nearWallet.disconnectWallet();
    } else if (this.currentWalletType === 'metamask') {
      await this.metaMaskWallet.disconnect();
    }
    
    this.currentWalletType = null;
  }

  isWalletConnected(): boolean {
    if (this.currentWalletType === 'near') {
      return this.nearWallet.isConnected();
    } else if (this.currentWalletType === 'metamask') {
      return this.metaMaskWallet.isConnected();
    }
    
    return false;
  }

  getAccountId(): string | null {
    if (this.currentWalletType === 'near') {
      return this.nearWallet.getAccountId();
    } else if (this.currentWalletType === 'metamask') {
      return this.metaMaskWallet.getAccountId();
    }
    
    return null;
  }

  getAccount(): UnifiedWalletAccount | null {
    if (this.currentWalletType === 'near') {
      const accountId = this.nearWallet.getAccountId();
      if (!accountId) return null;
      
      return {
        address: accountId,
        balance: '0', // Will be fetched separately
        isConnected: true,
        walletType: 'near',
      };
    } else if (this.currentWalletType === 'metamask') {
      const account = this.metaMaskWallet.getAccount();
      if (!account) return null;
      
      return {
        address: account.address,
        balance: account.balance,
        isConnected: account.isConnected,
        walletType: 'metamask',
      };
    }
    
    return null;
  }

  async getAccountBalance(): Promise<string> {
    if (this.currentWalletType === 'near') {
      return await this.nearWallet.getAccountBalance();
    } else if (this.currentWalletType === 'metamask') {
      return await this.metaMaskWallet.getBalance();
    }
    
    return '0';
  }

  getCurrentWalletType(): WalletType | null {
    return this.currentWalletType;
  }

  async isMetaMaskInstalled(): Promise<boolean> {
    return await this.metaMaskWallet.isInstalled();
  }

  async switchToNearNetwork(): Promise<boolean> {
    if (this.currentWalletType === 'metamask') {
      return await this.metaMaskWallet.switchToNearNetwork();
    }
    return false;
  }

  async signMessage(message: string): Promise<string | null> {
    if (this.currentWalletType === 'near') {
      return await this.nearWallet.signMessage(message);
    } else if (this.currentWalletType === 'metamask') {
      return await this.metaMaskWallet.signMessage(message);
    }
    
    return null;
  }
}

// Singleton instance
let unifiedWalletInstance: UnifiedWalletService | null = null;

export const getUnifiedWallet = (): UnifiedWalletService => {
  if (!unifiedWalletInstance) {
    unifiedWalletInstance = new UnifiedWalletService();
  }
  return unifiedWalletInstance;
};





