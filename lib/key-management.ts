import { EncryptionKey } from '@/types/encryption';

export interface KeyManagementConfig {
  usePasswordDerivation: boolean;
  password?: string;
  keyRotationInterval?: number; // days
  maxKeyAge?: number; // days
}

export class KeyManagementService {
  private config: KeyManagementConfig;
  private sessionKeys: Map<string, EncryptionKey> = new Map();
  private masterKey?: string;

  constructor(config: KeyManagementConfig) {
    this.config = config;
  }

  /**
   * Initialize key management with user password
   */
  async initializeWithPassword(password: string): Promise<void> {
    this.masterKey = password;
    console.log('🔐 Key management initialized with password');
  }

  /**
   * Generate a session-based encryption key
   * Keys are only stored in memory during the session
   */
  generateSessionKey(keyId?: string): EncryptionKey {
    const keyId_ = keyId || this.generateKeyId();
    
    // Generate random key for this session
    const key = this.generateRandomKey();
    
    const encryptionKey: EncryptionKey = {
      publicKey: key,
      privateKey: key,
      keyId: keyId_,
      algorithm: 'AES-256-GCM',
      createdAt: new Date(),
    };

    this.sessionKeys.set(keyId_, encryptionKey);
    console.log(`🔑 Generated session key: ${keyId_}`);
    return encryptionKey;
  }

  /**
   * Generate key from master password for specific memory
   */
  async generateMemoryKey(memoryId: string, salt?: string): Promise<EncryptionKey> {
    if (!this.masterKey) {
      throw new Error('Master key not initialized. Call initializeWithPassword() first.');
    }

    const keyId = `memory_${memoryId}`;
    const memorySalt = salt || this.generateRandomSalt();
    
    // Derive key from master password + memory ID + salt
    const keyMaterial = `${this.masterKey}_${memoryId}_${memorySalt}`;
    const derivedKey = await this.deriveKey(keyMaterial, memorySalt);
    
    const encryptionKey: EncryptionKey = {
      publicKey: derivedKey,
      privateKey: derivedKey,
      keyId: keyId,
      algorithm: 'AES-256-GCM',
      createdAt: new Date(),
      salt: memorySalt,
    };

    this.sessionKeys.set(keyId, encryptionKey);
    console.log(`🔑 Generated memory-specific key: ${keyId}`);
    return encryptionKey;
  }

  /**
   * Get key for decryption
   */
  getKey(keyId: string): EncryptionKey | undefined {
    return this.sessionKeys.get(keyId);
  }

  /**
   * Get all available keys
   */
  getAllKeys(): EncryptionKey[] {
    return Array.from(this.sessionKeys.values());
  }

  /**
   * Clear all session keys (on logout)
   */
  clearSession(): void {
    this.sessionKeys.clear();
    this.masterKey = undefined;
    console.log('🔐 Session keys cleared');
  }

  /**
   * Check if key management is initialized
   */
  isInitialized(): boolean {
    return !!this.masterKey;
  }

  /**
   * Generate a random key
   */
  private generateRandomKey(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate a random salt
   */
  private generateRandomSalt(): string {
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Derive key using PBKDF2
   */
  private async deriveKey(password: string, salt: string): Promise<string> {
    // This is a simplified version - in production, use a proper PBKDF2 implementation
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    
    const hash = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hash));
    const hashString = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    // Double hash for additional security
    const finalHash = await crypto.subtle.digest('SHA-256', encoder.encode(hashString + salt));
    const finalArray = Array.from(new Uint8Array(finalHash));
    return finalArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Generate unique key ID
   */
  private generateKeyId(): string {
    return `key_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
let keyManagementInstance: KeyManagementService | null = null;

export const getKeyManagementService = (config?: KeyManagementConfig): KeyManagementService => {
  if (!keyManagementInstance) {
    keyManagementInstance = new KeyManagementService(config || {
      usePasswordDerivation: true,
      keyRotationInterval: 30,
      maxKeyAge: 90
    });
  }
  return keyManagementInstance;
};
