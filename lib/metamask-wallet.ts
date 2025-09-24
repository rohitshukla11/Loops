// Simple MetaMask integration for NEAR
export interface MetaMaskAccount {
  address: string;
  balance: string;
  isConnected: boolean;
}

export class MetaMaskWalletService {
  private account: MetaMaskAccount | null = null;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    if (typeof window !== 'undefined' && window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.account = null;
        } else {
          this.connect();
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }
  }

  async isInstalled(): Promise<boolean> {
    return typeof window !== 'undefined' && !!window.ethereum;
  }

  async connect(): Promise<boolean> {
    try {
      if (!await this.isInstalled()) {
        throw new Error('MetaMask is not installed');
      }

      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length > 0) {
        const address = accounts[0];
        const balance = await this.getBalance(address);
        
        this.account = {
          address,
          balance,
          isConnected: true,
        };

        return true;
      }

      return false;
    } catch (error) {
      console.error('Failed to connect MetaMask:', error);
      return false;
    }
  }

  async disconnect(): Promise<void> {
    this.account = null;
  }

  isConnected(): boolean {
    return this.account?.isConnected || false;
  }

  getAccountId(): string | null {
    return this.account?.address || null;
  }

  getAccount(): MetaMaskAccount | null {
    return this.account;
  }

  async getBalance(address?: string): Promise<string> {
    try {
      const accountAddress = address || this.account?.address;
      if (!accountAddress) return '0';

      const balance = await window.ethereum.request({
        method: 'eth_getBalance',
        params: [accountAddress, 'latest'],
      });

      // Convert from wei to ETH
      const ethBalance = parseInt(balance, 16) / Math.pow(10, 18);
      return ethBalance.toString();
    } catch (error) {
      console.error('Failed to get balance:', error);
      return '0';
    }
  }

  async switchToNearNetwork(): Promise<boolean> {
    try {
      // Add NEAR testnet to MetaMask
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x4e454152', // NEAR testnet chain ID
          chainName: 'NEAR Testnet',
          rpcUrls: ['https://rpc.testnet.near.org'],
          nativeCurrency: {
            name: 'NEAR',
            symbol: 'NEAR',
            decimals: 24,
          },
          blockExplorerUrls: ['https://explorer.testnet.near.org'],
        }],
      });

      return true;
    } catch (error) {
      console.error('Failed to switch to NEAR network:', error);
      return false;
    }
  }

  async signMessage(message: string): Promise<string | null> {
    try {
      if (!this.account?.address) return null;

      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [message, this.account.address],
      });

      return signature;
    } catch (error) {
      console.error('Failed to sign message:', error);
      return null;
    }
  }
}

// Global type declaration for window.ethereum
declare global {
  interface Window {
    ethereum?: {
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, callback: (...args: any[]) => void) => void;
      removeListener: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}

// Singleton instance
let metaMaskInstance: MetaMaskWalletService | null = null;

export const getMetaMaskWallet = (): MetaMaskWalletService => {
  if (!metaMaskInstance) {
    metaMaskInstance = new MetaMaskWalletService();
  }
  return metaMaskInstance;
};






