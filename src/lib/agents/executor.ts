// Core AI Agent Framework for Dracanus
// Supports multiple LLM providers: Ollama, Plus Coder, OpenAI

export type LLMProvider = 'ollama' | 'plus-coder' | 'openai';

export interface AgentConfig {
  id: string;
  name: string;
  category: string;
  systemPrompt: string;
  modelPreference: LLMProvider;
  capabilities: string[];
}

export interface AgentInput {
  goal: string;
  context?: Record<string, any>;
  parameters?: Record<string, any>;
}

export interface AgentOutput {
  success: boolean;
  result?: any;
  error?: string;
  metadata: {
    provider: LLMProvider;
    model: string;
    tokensUsed?: number;
    durationMs: number;
    cost?: number;
  };
}

export class AIAgentExecutor {
  private providers: Map<LLMProvider, LLMProviderInterface>;

  constructor() {
    this.providers = new Map();
    this.initializeProviders();
  }

  private initializeProviders() {
    // Ollama (free, local)
    this.providers.set('ollama', new OllamaProvider());
    
    // Plus Coder (free tier)
    this.providers.set('plus-coder', new PlusCoderProvider());
    
    // OpenAI (fallback)
    if (process.env.OPENAI_API_KEY) {
      this.providers.set('openai', new OpenAIProvider());
    }
  }

  async execute(
    agent: AgentConfig,
    input: AgentInput
  ): Promise<AgentOutput> {
    const startTime = Date.now();
    
    try {
      // Try primary provider
      const provider = this.providers.get(agent.modelPreference);
      if (!provider) {
        throw new Error(`Provider ${agent.modelPreference} not available`);
      }

      const result = await provider.complete({
        systemPrompt: agent.systemPrompt,
        userPrompt: this.buildPrompt(agent, input),
        temperature: 0.7,
        maxTokens: 2000,
      });

      const durationMs = Date.now() - startTime;

      return {
        success: true,
        result: result.content,
        metadata: {
          provider: agent.modelPreference,
          model: result.model,
          tokensUsed: result.tokensUsed,
          durationMs,
          cost: this.calculateCost(agent.modelPreference, result.tokensUsed || 0),
        },
      };
    } catch (error: any) {
      // Try fallback providers
      return await this.executeWithFallback(agent, input, startTime, error);
    }
  }

  private async executeWithFallback(
    agent: AgentConfig,
    input: AgentInput,
    startTime: number,
    originalError: Error
  ): Promise<AgentOutput> {
    const fallbackOrder: LLMProvider[] = ['ollama', 'plus-coder', 'openai'];
    
    for (const providerName of fallbackOrder) {
      if (providerName === agent.modelPreference) continue;
      
      const provider = this.providers.get(providerName);
      if (!provider) continue;

      try {
        const result = await provider.complete({
          systemPrompt: agent.systemPrompt,
          userPrompt: this.buildPrompt(agent, input),
          temperature: 0.7,
          maxTokens: 2000,
        });

        const durationMs = Date.now() - startTime;

        return {
          success: true,
          result: result.content,
          metadata: {
            provider: providerName,
            model: result.model,
            tokensUsed: result.tokensUsed,
            durationMs,
            cost: this.calculateCost(providerName, result.tokensUsed || 0),
          },
        };
      } catch (fallbackError) {
        continue;
      }
    }

    // All providers failed
    const durationMs = Date.now() - startTime;
    return {
      success: false,
      error: `All providers failed. Original error: ${originalError.message}`,
      metadata: {
        provider: agent.modelPreference,
        model: 'none',
        durationMs,
      },
    };
  }

  private buildPrompt(agent: AgentConfig, input: AgentInput): string {
    let prompt = `Goal: ${input.goal}\n\n`;
    
    if (input.context) {
      prompt += `Context:\n${JSON.stringify(input.context, null, 2)}\n\n`;
    }
    
    if (input.parameters) {
      prompt += `Parameters:\n${JSON.stringify(input.parameters, null, 2)}\n\n`;
    }
    
    prompt += `Execute this task according to your capabilities: ${agent.capabilities.join(', ')}`;
    
    return prompt;
  }

  private calculateCost(provider: LLMProvider, tokens: number): number {
    // Cost in cents
    const pricing: Record<LLMProvider, number> = {
      'ollama': 0, // Free
      'plus-coder': 0, // Free tier
      'openai': (tokens / 1000) * 0.002, // $0.002 per 1K tokens
    };
    
    return pricing[provider] || 0;
  }
}

// Provider interfaces
interface CompletionRequest {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
}

interface CompletionResponse {
  content: string;
  model: string;
  tokensUsed?: number;
}

interface LLMProviderInterface {
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

// Ollama Provider
class OllamaProvider implements LLMProviderInterface {
  private baseUrl: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_API_URL || 'http://localhost:11434';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'llama3.2', // or configurable
        prompt: `${request.systemPrompt}\n\nUser: ${request.userPrompt}`,
        stream: false,
        options: {
          temperature: request.temperature || 0.7,
          num_predict: request.maxTokens || 2000,
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.response,
      model: data.model || 'llama3.2',
      tokensUsed: data.eval_count || undefined,
    };
  }
}

// Plus Coder Provider (hypothetical - adjust based on actual API)
class PlusCoderProvider implements LLMProviderInterface {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.PLUS_CODER_API_KEY || '';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('Plus Coder API key not configured');
    }

    const response = await fetch('https://api.pluscoder.example/v1/complete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        system: request.systemPrompt,
        prompt: request.userPrompt,
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`Plus Coder API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.completion,
      model: data.model || 'plus-coder-v1',
      tokensUsed: data.tokens_used,
    };
  }
}

// OpenAI Provider (fallback)
class OpenAIProvider implements LLMProviderInterface {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: request.systemPrompt },
          { role: 'user', content: request.userPrompt },
        ],
        temperature: request.temperature || 0.7,
        max_tokens: request.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      model: data.model,
      tokensUsed: data.usage.total_tokens,
    };
  }
}
