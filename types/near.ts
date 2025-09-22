export interface NearConfig {
  networkId: string;
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
  explorerUrl: string;
}

export interface ContractConfig {
  contractId: string;
  methods: {
    view: string[];
    change: string[];
  };
}

export interface MemoryAnchor {
  memoryId: string;
  ipfsHash: string;
  owner: string;
  accessPolicy: string; // JSON string of AccessPolicy
  createdAt: number; // timestamp
  updatedAt: number; // timestamp
  version: number;
}

export interface ContractMethods {
  // View methods
  get_memory_anchor: (memoryId: string) => Promise<MemoryAnchor | null>;
  get_user_memories: (accountId: string, limit?: number, offset?: number) => Promise<MemoryAnchor[]>;
  get_memory_permissions: (memoryId: string) => Promise<string>; // JSON string of AccessPolicy
  get_agent_permissions: (agentId: string) => Promise<string[]>; // Array of memory IDs
  
  // Change methods
  create_memory_anchor: (args: {
    memoryId: string;
    ipfsHash: string;
    accessPolicy: string;
  }) => Promise<void>;
  
  update_memory_anchor: (args: {
    memoryId: string;
    ipfsHash: string;
    accessPolicy: string;
  }) => Promise<void>;
  
  delete_memory_anchor: (memoryId: string) => Promise<void>;
  
  grant_permission: (args: {
    memoryId: string;
    agentId: string;
    actions: string[];
  }) => Promise<void>;
  
  revoke_permission: (args: {
    memoryId: string;
    agentId: string;
  }) => Promise<void>;
}



