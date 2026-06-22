import { GoogleGenerativeAI } from '@google/generative-ai';
import { settingsService, AIProvider } from '@/services/settingsService';

/**
 * Thrown whenever there is no properly configured & connected AI provider,
 * or the configured provider rejects the request (bad key, network error, etc).
 * The UI should surface this directly to the user and point them to Settings -
 * it must never be swallowed in favor of placeholder/default content.
 */
export class AIConnectionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AIConnectionError';
  }
}

/**
 * Returns the currently active AI provider, but only if it actually has an
 * API key configured. Returns null if nothing usable is configured.
 */
export async function getActiveConnectedProvider(): Promise<AIProvider | null> {
  const providers = await settingsService.getAIProviders();
  const active = providers.find(p => p.is_active && p.api_key && p.api_key.trim().length > 0);
  return active || null;
}

function stripJsonFormatting(text: string): string {
  return text
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();
}

/**
 * Calls the given provider with a prompt and returns the raw text response.
 * Throws AIConnectionError if the provider is unreachable, the key is invalid,
 * or the provider is not supported - it never returns a placeholder string.
 */
async function callProvider(provider: AIProvider, prompt: string): Promise<string> {
  const apiKey = provider.api_key;

  switch (provider.provider_name) {
    case 'Google': {
      try {
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const response = await model.generateContent(prompt);
        const text = response.response.text();
        if (!text || !text.trim()) {
          throw new Error('Empty response from Google Gemini.');
        }
        return text;
      } catch (err: any) {
        throw new AIConnectionError(
          `Google Gemini request failed: ${err?.message || 'Invalid API key or network error.'}`
        );
      }
    }

    case 'OpenAI': {
      try {
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
        }
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from OpenAI.');
        return text;
      } catch (err: any) {
        throw new AIConnectionError(`OpenAI request failed: ${err?.message || 'Invalid API key or network error.'}`);
      }
    }

    case 'Anthropic': {
      try {
        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01'
          },
          body: JSON.stringify({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: 2000,
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
        }
        const data = await res.json();
        const text = data?.content?.[0]?.text;
        if (!text) throw new Error('Empty response from Anthropic.');
        return text;
      } catch (err: any) {
        throw new AIConnectionError(`Anthropic request failed: ${err?.message || 'Invalid API key or network error.'}`);
      }
    }

    case 'DeepSeek': {
      try {
        const res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
        }
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from DeepSeek.');
        return text;
      } catch (err: any) {
        throw new AIConnectionError(`DeepSeek request failed: ${err?.message || 'Invalid API key or network error.'}`);
      }
    }

    case 'OpenRouter': {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'openai/gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
        }
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from OpenRouter.');
        return text;
      } catch (err: any) {
        throw new AIConnectionError(`OpenRouter request failed: ${err?.message || 'Invalid API key or network error.'}`);
      }
    }

    case 'Perplexity': {
      try {
        const res = await fetch('https://api.perplexity.ai/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
          },
          body: JSON.stringify({
            model: 'sonar',
            messages: [{ role: 'user', content: prompt }]
          })
        });
        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`HTTP ${res.status}: ${errText || res.statusText}`);
        }
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (!text) throw new Error('Empty response from Perplexity.');
        return text;
      } catch (err: any) {
        throw new AIConnectionError(`Perplexity request failed: ${err?.message || 'Invalid API key or network error.'}`);
      }
    }

    default:
      throw new AIConnectionError(`Unsupported AI provider: ${provider.provider_name}`);
  }
}

/**
 * Verifies that a provider's API key is actually valid by making a minimal
 * real request to its API. Used by Settings to validate a key on save,
 * and by anything that needs to confirm a "real" connection before proceeding.
 */
export async function verifyProviderConnection(provider: AIProvider): Promise<{ success: boolean; error?: string }> {
  if (!provider.api_key || !provider.api_key.trim()) {
    return { success: false, error: 'No API key provided.' };
  }
  try {
    await callProvider(provider, 'Reply with the single word: OK');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Connection failed.' };
  }
}

/**
 * Generates a JSON object using the active, connected AI provider.
 * Throws AIConnectionError if no provider is connected or the call fails -
 * callers must surface this to the user rather than substituting placeholder data.
 */
export async function generateJSON<T = any>(prompt: string): Promise<T> {
  const provider = await getActiveConnectedProvider();
  if (!provider) {
    throw new AIConnectionError(
      'No AI provider is connected. Add and save a valid API key in Settings before generating.'
    );
  }

  const rawText = await callProvider(provider, prompt);
  const cleaned = stripJsonFormatting(rawText);

  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new AIConnectionError(
      `The connected AI provider (${provider.provider_name}) returned a response that could not be parsed. Please try again.`
    );
  }
}

/**
 * Generates free-form text using the active, connected AI provider.
 * Throws AIConnectionError if no provider is connected or the call fails.
 */
export async function generateText(prompt: string): Promise<string> {
  const provider = await getActiveConnectedProvider();
  if (!provider) {
    throw new AIConnectionError(
      'No AI provider is connected. Add and save a valid API key in Settings before generating.'
    );
  }
  return callProvider(provider, prompt);
}
