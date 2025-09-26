export interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  memoryId?: string;
  golemExplorerUrl?: string; // Legacy field for backward compatibility
  entityUrl?: string; // Golem Base entity URL
  transactionUrl?: string; // Golem Base transaction URL
}
