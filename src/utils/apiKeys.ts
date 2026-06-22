import { settingsService } from '@/services/settingsService';

export async function getParcleApiKey(): Promise<string> {
  try {
    const settings = await settingsService.getAppSettings();
    const parcleSetting = settings.find(s => s.setting_name === 'Parcle');
    if (parcleSetting && parcleSetting.setting_value) {
      return parcleSetting.setting_value;
    }
  } catch (e) {
    console.warn('Failed to fetch Parcle key from settings, falling back to env:', e);
  }
  return import.meta.env.VITE_PARCLE_API_KEY || '';
}