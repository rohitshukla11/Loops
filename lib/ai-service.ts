import { ChatMessage } from '@/types/chat';

export interface AIResponse {
  content: string;
  shouldStore: boolean;
}

export interface AIService {
  generateResponse(userInput: string, previousMessages: ChatMessage[]): Promise<AIResponse>;
}

/**
 * OpenAI-compatible AI service
 * Replace this with your preferred AI provider (OpenAI, Anthropic, etc.)
 */
export class OpenAIService implements AIService {
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(apiKey: string, model: string = 'gpt-3.5-turbo', baseUrl: string = 'https://api.openai.com/v1') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl;
  }

  async generateResponse(userInput: string, previousMessages: ChatMessage[]): Promise<AIResponse> {
    // Prepare messages for OpenAI API
    const messages = [
      {
        role: 'system',
        content: 'You are a helpful, privacy-first AI assistant. You help users with various tasks while maintaining their privacy and security. Keep responses concise and helpful.'
      },
      ...previousMessages.slice(-10).map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      {
        role: 'user',
        content: userInput
      }
    ];

    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.model,
        messages: messages,
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`AI service error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || 'I apologize, but I could not generate a response.';

    // Determine if this conversation should be stored
    const shouldStore = this.shouldStoreConversation(userInput, content);

    return {
      content,
      shouldStore
    };
  }

  private shouldStoreConversation(userInput: string, aiResponse: string): boolean {
    // Store conversations that are meaningful and not test messages
    const isTestMessage = userInput.toLowerCase().includes('test') || 
                         userInput.toLowerCase().includes('hello') ||
                         userInput.toLowerCase().includes('hi');
    
    const isMeaningful = userInput.length > 10 && aiResponse.length > 20;
    
    return !isTestMessage && isMeaningful;
  }
}

/**
 * Factory function to create the OpenAI AI service
 */
export function createAIService(): AIService {
  const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
  const model = process.env.NEXT_PUBLIC_OPENAI_MODEL || 'gpt-3.5-turbo';
  const baseUrl = process.env.NEXT_PUBLIC_OPENAI_BASE_URL || 'https://api.openai.com/v1';

  if (!apiKey) {
    throw new Error('OpenAI API key is required. Please set NEXT_PUBLIC_OPENAI_API_KEY in your environment variables.');
  }

  return new OpenAIService(apiKey, model, baseUrl);
}

// Export singleton instance - lazy initialization
let _aiService: AIService | null = null;

export function getAIService(): AIService {
  if (!_aiService) {
    _aiService = createAIService();
  }
  return _aiService;
}

// For backward compatibility
export const aiService = {
  generateResponse: async (userInput: string, previousMessages: any[]) => {
    return getAIService().generateResponse(userInput, previousMessages);
  }
};
