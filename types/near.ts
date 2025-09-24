export interface NearConfig {
  networkId: string;
  nodeUrl: string;
  walletUrl: string;
  helperUrl: string;
  explorerUrl: string;
}

export interface ContractMethods {
  viewMethods: string[];
  changeMethods: string[];
}

export interface MemoryAnchor {
  memoryId: string;
  cid: string;
  userId: string;
  accessPolicy: string;
  fileSize?: number;
  mimeType?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PermissionGrant {
  agentId: string;
  actions: string[];
  grantedAt: string;
}

export interface ContractStats {
  totalMemories: number;
  version: string;
}
