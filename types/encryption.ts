export interface EncryptionConfig {
  algorithm: 'AES-256-GCM' | 'ChaCha20-Poly1305';
  keyDerivation: 'PBKDF2' | 'Argon2' | 'scrypt';
  iterations: number;
  saltLength: number;
  ivLength: number;
  tagLength: number;
}

export interface EncryptedData {
  encryptedContent: string;
  iv: string;
  salt: string;
  tag: string;
  algorithm: string;
  keyDerivation: string;
  iterations: number;
}

export interface ThresholdEncryptionConfig {
  threshold: number;
  totalShares: number;
  participants: string[];
  algorithm: 'Shamir' | 'Blakley';
}

export interface EncryptionKey {
  publicKey: string;
  privateKey?: string; // Only available for owner
  keyId: string;
  algorithm: string;
  createdAt: Date;
  expiresAt?: Date;
  salt?: string; // For password-derived keys
}

export interface TimelockEncryption {
  encryptedKey: string;
  unlockTime: number; // Unix timestamp
  timelockAlgorithm: 'RSA' | 'Lattice';
  publicKey: string;
}

export interface DecryptionResult {
  content: string;
  metadata: {
    decryptedAt: Date;
    keyUsed: string;
    algorithm: string;
  };
}



