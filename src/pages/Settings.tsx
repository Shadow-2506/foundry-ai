import React, { useState, useEffect } from 'react';
import {
  Zap,
  RefreshCw,
  AlertTriangle,
  Eye,
  EyeOff,
  Save,
  Trash2,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { parcleService } from '@/services/parcleService';
import { settingsService, AIProvider } from '@/services/settingsService';
import { verifyProviderConnection } from '@/services/aiClient';
import { useToast } from '@/hooks/use-toast';
import { APP_VERSION, APP_BUILD } from '@/lib/version';

export default function SettingsPage() {
  const { toast } = useToast();
  const [parcleStatus, setParcleStatus] = useState<'Connected' | 'Disconnected'>('Disconnected');
  const [parcleSyncedCount, setParcleSyncedCount] = useState<number>(0);
  const [parcleLastSync, setParcleLastSync] = useState<string>('Never');
  const [parcleError, setParcleError] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isSavingProvider, setIsSavingProvider] = useState(false);
  const [isDeletingProvider, setIsDeletingProvider] = useState(false);
  const [isSavingParcle, setIsSavingParcle] = useState(false);
  const [isDeletingParcle, setIsDeletingParcle] = useState(false);

  // AI Providers & API Keys
  const [providers, setProviders] = useState<AIProvider[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<string>('Google');
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({
    Google: '',
    OpenAI: '',
    Anthropic: '',
    DeepSeek: '',
    OpenRouter: '',
    Perplexity: '',
    Parcle: ''
  });

  // Which provider (if any) is currently active AND has a verified working key.
  const [connectedProviderName, setConnectedProviderName] = useState<string | null>(null);

  const loadSettings = async () => {
    setIsLoading(true);
    try {
      // Load AI Providers
      const provs = await settingsService.getAIProviders();
      setProviders(provs);

      const activeProv = provs.find(p => p.is_active);
      if (activeProv) {
        setSelectedProvider(activeProv.provider_name);
      }

      const activeWithKey = provs.find(p => p.is_active && p.api_key && p.api_key.trim().length > 0);
      setConnectedProviderName(activeWithKey ? activeWithKey.provider_name : null);

      // Load App Settings
      const appSettings = await settingsService.getAppSettings();
      const keys = { ...apiKeys };

      provs.forEach(p => {
        keys[p.provider_name] = p.api_key || (p.provider_name === 'Google' ? import.meta.env.VITE_GEMINI_API_KEY : '') || '';
      });

      appSettings.forEach(s => {
        if (s.setting_name in keys) {
          keys[s.setting_name] = s.setting_value;
        }
      });

      // Fallback to .env for Parcle if not set
      if (!keys['Parcle']) {
        keys['Parcle'] = import.meta.env.VITE_PARCLE_API_KEY || '';
      }

      setApiKeys(keys);

      // Check connections
      const parcle = await parcleService.getStatus();
      setParcleStatus(parcle.connected ? 'Connected' : 'Disconnected');
      setParcleSyncedCount(parcle.syncedCount);
      setParcleLastSync(parcle.lastSyncTime);
      setParcleError(parcle.error || null);

    } catch (error) {
      console.error('Error loading settings:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSaveProvider = async () => {
    const key = (apiKeys[selectedProvider] || '').trim();

    if (!key) {
      toast({
        title: "API Key Required",
        description: `Enter a valid ${selectedProvider} API key before saving.`,
        variant: "destructive"
      });
      return;
    }

    setIsSavingProvider(true);
    try {
      // Verify the key actually works against the real provider before activating it.
      const verification = await verifyProviderConnection({
        id: 'temp',
        provider_name: selectedProvider,
        api_key: key,
        is_active: true
      });

      if (!verification.success) {
        toast({
          title: "Connection Failed",
          description: verification.error || `Could not verify ${selectedProvider} API key.`,
          variant: "destructive"
        });
        // Save it but keep it inactive, so the user can see it stored without it being treated as a live connection.
        await settingsService.saveAIProvider(selectedProvider, key, false);
        await loadSettings();
        return;
      }

      await settingsService.saveAIProvider(selectedProvider, key, true);
      toast({
        title: "Provider Connected",
        description: `${selectedProvider} API key verified and activated successfully.`
      });
      await loadSettings();
    } catch (err) {
      toast({
        title: "Save Failed",
        description: "Failed to save provider settings.",
        variant: "destructive"
      });
    } finally {
      setIsSavingProvider(false);
    }
  };

  const handleDeleteProviderKey = async () => {
    setIsDeletingProvider(true);
    try {
      await settingsService.deleteAIProviderKey(selectedProvider);
      setApiKeys(prev => ({ ...prev, [selectedProvider]: '' }));
      toast({
        title: "Key Deleted",
        description: `Successfully deleted API key for ${selectedProvider}.`
      });
      await loadSettings();
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: `Failed to delete API key for ${selectedProvider}.`,
        variant: "destructive"
      });
    } finally {
      setIsDeletingProvider(false);
    }
  };

  const handleSaveParcle = async () => {
    setIsSavingParcle(true);
    try {
      await settingsService.saveAppSetting('Parcle', apiKeys['Parcle'] || '');
      toast({
        title: "Configuration Saved",
        description: "Parcle API key has been successfully saved."
      });
      await loadSettings();
    } catch (err) {
      toast({
        title: "Save Failed",
        description: "Failed to save Parcle configuration.",
        variant: "destructive"
      });
    } finally {
      setIsSavingParcle(false);
    }
  };

  const handleDeleteParcle = async () => {
    setIsDeletingParcle(true);
    try {
      await settingsService.deleteAppSetting('Parcle');
      setApiKeys(prev => ({ ...prev, Parcle: '' }));
      toast({
        title: "Key Deleted",
        description: "Successfully deleted Parcle API key."
      });
      await loadSettings();
    } catch (err) {
      toast({
        title: "Delete Failed",
        description: "Failed to delete Parcle API key.",
        variant: "destructive"
      });
    } finally {
      setIsDeletingParcle(false);
    }
  };

  const toggleShowKey = (name: string) => {
    setShowKeys(prev => ({ ...prev, [name]: !prev[name] }));
  };

  const handleKeyChange = (name: string, val: string) => {
    setApiKeys(prev => ({ ...prev, [name]: val }));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
          <p className="text-muted-foreground">Manage your organizational intelligence preferences and integrations.</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadSettings} disabled={isLoading} className="gap-2">
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh Status
        </Button>
      </div>

      {/* AI Providers Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="font-semibold">AI Reasoning Engine</h3>
          <p className="text-sm text-muted-foreground">
            Configure and select your active AI reasoning engine. A key must be verified and connected here
            before the Project Generator can be used.
          </p>
          {connectedProviderName ? (
            <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 mt-2 gap-1.5">
              <CheckCircle2 className="w-3 h-3" />
              {connectedProviderName} Connected
            </Badge>
          ) : (
            <Badge variant="outline" className="mt-2 gap-1.5 border-destructive/30 text-destructive">
              <AlertTriangle className="w-3 h-3" />
              No AI Provider Connected
            </Badge>
          )}
        </div>
        <div className="md:col-span-2 space-y-4">
          <Card className="glass-card border-primary">
            <CardContent className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="ai-provider-select">Select AI Provider</Label>
                <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                  <SelectTrigger id="ai-provider-select" className="bg-secondary/30 border-none">
                    <SelectValue placeholder="Select provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Google">Google (Gemini)</SelectItem>
                    <SelectItem value="OpenAI">OpenAI</SelectItem>
                    <SelectItem value="Anthropic">Anthropic</SelectItem>
                    <SelectItem value="DeepSeek">DeepSeek</SelectItem>
                    <SelectItem value="OpenRouter">OpenRouter</SelectItem>
                    <SelectItem value="Perplexity">Perplexity</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys[selectedProvider] ? 'text' : 'password'}
                      placeholder={`Enter ${selectedProvider} API Key`}
                      value={apiKeys[selectedProvider] || ''}
                      onChange={(e) => handleKeyChange(selectedProvider, e.target.value)}
                      className="bg-secondary/30 border-none focus-visible:ring-primary pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey(selectedProvider)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys[selectedProvider] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button onClick={handleSaveProvider} disabled={isSavingProvider} className="gap-2">
                    {isSavingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSavingProvider ? 'Verifying...' : 'Save'}
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDeleteProviderKey}
                    disabled={isDeletingProvider || !apiKeys[selectedProvider]}
                    aria-label={`Delete ${selectedProvider} API key`}
                  >
                    {isDeletingProvider ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Saving will make a real request to {selectedProvider} to verify the key works before it becomes active.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* Manual API Key Management & Integration Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="font-semibold">Integrations & Pipelines</h3>
          <p className="text-sm text-muted-foreground">Manage keys and monitor real-time synchronization statistics.</p>
        </div>
        <div className="md:col-span-2 space-y-6">
          {/* Parcle Pipeline */}
          <Card className="glass-card">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-bold flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                Parcle Pipeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Parcle API Key</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      type={showKeys['Parcle'] ? 'text' : 'password'}
                      placeholder="Enter Parcle API Key"
                      value={apiKeys['Parcle'] || ''}
                      onChange={(e) => handleKeyChange('Parcle', e.target.value)}
                      className="bg-secondary/30 border-none focus-visible:ring-primary pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => toggleShowKey('Parcle')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showKeys['Parcle'] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <Button onClick={handleSaveParcle} disabled={isSavingParcle} className="gap-2">
                    {isSavingParcle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleDeleteParcle}
                    disabled={isDeletingParcle || !apiKeys['Parcle']}
                    aria-label="Delete Parcle API key"
                  >
                    {isDeletingParcle ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-2 border-t border-border/50">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={parcleStatus === 'Connected' ? 'secondary' : 'outline'} className={
                    parcleStatus === 'Connected' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20 mt-1' : 'mt-1'
                  }>
                    {parcleStatus}
                  </Badge>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Memories Synced</p>
                  <p className="text-lg font-bold mt-1">{parcleSyncedCount}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Last Sync</p>
                  <p className="text-sm font-medium mt-1.5">{parcleLastSync}</p>
                </div>
              </div>

              {parcleError && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-2 text-xs text-destructive">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold">Connection Failure Reason:</p>
                    <p className="mt-0.5 opacity-90">{parcleError}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="h-px bg-border" />

      {/* About / Version Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-1">
          <h3 className="font-semibold">About</h3>
          <p className="text-sm text-muted-foreground">Application version and build information.</p>
        </div>
        <div className="md:col-span-2">
          <Card className="glass-card">
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-sm">FoundryAI</p>
                <p className="text-xs text-muted-foreground mt-1">Organizational memory & decision intelligence</p>
              </div>
              <div className="text-right space-y-1">
                <Badge variant="outline" className="text-xs">v{APP_VERSION}</Badge>
                <p className="text-xs text-muted-foreground/60">Build {APP_BUILD}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
