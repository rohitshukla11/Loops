export interface MemoryEntry {
  id: string;
  content: string;
  type: MemoryType;
  category: string;
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  encrypted: boolean;
  accessPolicy: AccessPolicy;
  metadata: MemoryMetadata;
  ipfsHash?: string;
  nearTransactionId?: string;
}

export type MemoryType = 
  | 'conversation'
  | 'learned_fact'
  | 'user_preference'
  | 'task_outcome'
  | 'multimedia'
  | 'workflow'
  | 'agent_share'
  | 'profile_data';

export interface AccessPolicy {
  owner: string; // NEAR account ID
  permissions: Permission[];
  timelock?: TimelockPolicy;
  threshold?: ThresholdPolicy;
}

export interface Permission {
  agentId: string;
  actions: ('read' | 'write' | 'delete')[];
  conditions?: PermissionCondition[];
}

export interface PermissionCondition {
  type: 'time_based' | 'location_based' | 'context_based';
  value: any;
}

export interface TimelockPolicy {
  unlockTime: Date;
  autoDelete?: Date;
}

export interface ThresholdPolicy {
  requiredSignatures: number;
  signers: string[];
}

export interface MemoryMetadata {
  size: number;
  mimeType?: string;
  encoding?: string;
  checksum: string;
  version: number;
  parentId?: string;
  relatedMemories: string[];
  encryptionKeyId?: string; // For storing encryption key ID
  encryptionSalt?: string; // For storing encryption salt for key regeneration
}

export interface MemorySearchQuery {
  query: string;
  type?: MemoryType;
  category?: string;
  tags?: string[];
  dateRange?: {
    start: Date;
    end: Date;
  };
  accessLevel?: 'public' | 'private' | 'encrypted';
  limit?: number;
  offset?: number;
  verifyIntegrity?: boolean; // Enable verification flow
}

export interface MemorySearchResult {
  memories: MemoryEntry[];
  totalCount: number;
  facets: {
    types: Record<MemoryType, number>;
    categories: Record<string, number>;
    tags: Record<string, number>;
  };
}
