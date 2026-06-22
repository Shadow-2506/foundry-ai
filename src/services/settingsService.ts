import { supabase } from '@/lib/supabase';

export interface AIProvider {
  id: string;
  provider_name: string;
  api_key: string;
  is_active: boolean;
  created_at?: string;
}

export interface AppSetting {
  id: string;
  setting_name: string;
  setting_value: string;
  created_at?: string;
}

const DEFAULT_PROVIDERS: AIProvider[] = [
  { id: 'prov-google', provider_name: 'Google', api_key: '', is_active: true },
  { id: 'prov-openai', provider_name: 'OpenAI', api_key: '', is_active: false },
  { id: 'prov-anthropic', provider_name: 'Anthropic', api_key: '', is_active: false },
  { id: 'prov-deepseek', provider_name: 'DeepSeek', api_key: '', is_active: false },
  { id: 'prov-openrouter', provider_name: 'OpenRouter', api_key: '', is_active: false },
  { id: 'prov-perplexity', provider_name: 'Perplexity', api_key: '', is_active: false },
];

async function getCurrentUserId(): Promise<string> {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.id || 'anonymous';
  } catch (e) {
    return 'anonymous';
  }
}

export const settingsService = {
  async getAIProviders(): Promise<AIProvider[]> {
    const userId = await getCurrentUserId();
    try {
      // Try to load from user-specific local storage first for absolute security and real-time sync
      const stored = localStorage.getItem(`foundry_ai_providers_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      // Fallback to Supabase if available
      const { data, error } = await supabase
        .from('ai_providers')
        .select('*')
        .order('provider_name', { ascending: true });

      if (!error && data && data.length > 0) {
        // Filter or map if needed, but local storage is preferred for user isolation
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch AI providers. Using fallback.');
    }
    return this.getFallbackProviders(userId);
  },

  getFallbackProviders(userId: string): AIProvider[] {
    try {
      const stored = localStorage.getItem(`foundry_ai_providers_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.error(e);
    }
    localStorage.setItem(`foundry_ai_providers_${userId}`, JSON.stringify(DEFAULT_PROVIDERS));
    return DEFAULT_PROVIDERS;
  },

  async saveAIProvider(providerName: string, apiKey: string, isActive: boolean): Promise<void> {
    const userId = await getCurrentUserId();
    const providers = await this.getAIProviders();

    const updated = providers.map(p => {
      if (p.provider_name === providerName) {
        return { ...p, api_key: apiKey, is_active: isActive };
      }
      return isActive ? { ...p, is_active: false } : p;
    });

    localStorage.setItem(`foundry_ai_providers_${userId}`, JSON.stringify(updated));

    try {
      // Also attempt to persist to Supabase
      if (isActive) {
        await supabase
          .from('ai_providers')
          .update({ is_active: false })
          .neq('provider_name', providerName);
      }

      const { data: existing } = await supabase
        .from('ai_providers')
        .select('id')
        .eq('provider_name', providerName)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('ai_providers')
          .update({ api_key: apiKey, is_active: isActive })
          .eq('provider_name', providerName);
      } else {
        await supabase
          .from('ai_providers')
          .insert({ provider_name: providerName, api_key: apiKey, is_active: isActive });
      }
    } catch (err) {
      console.warn('Supabase sync skipped, saved locally.');
    }
  },

  /**
   * Fully clears the stored API key for a provider and deactivates it,
   * so a deleted/empty key can never be mistaken for an active, usable connection.
   */
  async deleteAIProviderKey(providerName: string): Promise<void> {
    const userId = await getCurrentUserId();
    const providers = await this.getAIProviders();
    const updated = providers.map(p => {
      if (p.provider_name === providerName) {
        return { ...p, api_key: '', is_active: false };
      }
      return p;
    });
    localStorage.setItem(`foundry_ai_providers_${userId}`, JSON.stringify(updated));

    try {
      await supabase
        .from('ai_providers')
        .update({ api_key: '', is_active: false })
        .eq('provider_name', providerName);
    } catch (e) {
      console.warn('Supabase delete sync skipped:', e);
    }
  },

  async getAppSettings(): Promise<AppSetting[]> {
    const userId = await getCurrentUserId();
    try {
      const stored = localStorage.getItem(`foundry_app_settings_${userId}`);
      if (stored) {
        return JSON.parse(stored);
      }

      const { data, error } = await supabase
        .from('app_settings')
        .select('*');

      if (!error && data) {
        return data;
      }
    } catch (err) {
      console.warn('Failed to fetch app settings.');
    }
    return [];
  },

  async saveAppSetting(name: string, value: string): Promise<void> {
    const userId = await getCurrentUserId();
    const settings = await this.getAppSettings();
    const existingIdx = settings.findIndex(s => s.setting_name === name);

    if (existingIdx > -1) {
      settings[existingIdx].setting_value = value;
    } else {
      settings.push({ id: Math.random().toString(36).substr(2, 9), setting_name: name, setting_value: value });
    }
    localStorage.setItem(`foundry_app_settings_${userId}`, JSON.stringify(settings));

    try {
      const { data: existing } = await supabase
        .from('app_settings')
        .select('id')
        .eq('setting_name', name)
        .maybeSingle();

      if (existing) {
        await supabase
          .from('app_settings')
          .update({ setting_value: value })
          .eq('setting_name', name);
      } else {
        await supabase
          .from('app_settings')
          .insert({ setting_name: name, setting_value: value });
      }
    } catch (err) {
      console.warn('Supabase sync skipped, saved locally.');
    }
  },

  /**
   * Fully removes a stored app setting from both local storage and Supabase.
   */
  async deleteAppSetting(name: string): Promise<void> {
    const userId = await getCurrentUserId();
    const settings = await this.getAppSettings();
    const filtered = settings.filter(s => s.setting_name !== name);
    localStorage.setItem(`foundry_app_settings_${userId}`, JSON.stringify(filtered));

    try {
      await supabase
        .from('app_settings')
        .delete()
        .eq('setting_name', name);
    } catch (e) {
      console.warn('Supabase delete sync skipped:', e);
    }
  }
};
